# ADR-0024: Server-Side Eligibility Filtering via `eligible` Query Param

**Status:** Accepted
**Date:** 2026-07-29

## Context

`SubsidyEligibilitySpecification` (domain layer) encapsulates the business rule for
government energy subsidy eligibility (≥ 2 devices, > 50 kW consumption, Zone A location).
The rule already existed as a client-side specification, but nothing invoked it — the
building list always showed every building, with no way to narrow it to only the ones
that qualify for the subsidy.

The backend added a mirrored specification, `SubsidyEligibilityJpaSpecification`, and
exposed it on the collection endpoint as `GET /v1/buildings?eligible=true`. Two ways to
surface this on the frontend were considered:

- **Client-side filtering** — fetch the full unfiltered page, run each `PublicBuilding`
  through `SubsidyEligibilitySpecification.isSatisfiedBy()`, filter in memory. Keeps a
  single source of truth for the rule, but breaks pagination (page 2 could look
  incomplete or empty even though matching buildings exist further out) and pulls
  building data the user didn't ask to see.
- **Server-side filtering via query param** — add `eligible?: boolean` to `PageRequest`,
  forward it as `?eligible=true` on the existing paginated `GET /v1/buildings` call. The
  database does the filtering before pagination is applied, so `totalElements` /
  `totalPages` stay correct for the filtered set.

## Decision

Extend `PageRequest` with an optional `eligible` flag and forward it as an HTTP query
param in `PublicBuildingApiService.findAll()`:

```typescript
// page-request.ts
export interface PageRequest {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly direction: 'asc' | 'desc';
  readonly eligible?: boolean;
}

// public-building-api.service.ts
if (req.eligible !== undefined) {
  params = params.set('eligible', String(req.eligible));
}
```

The business rule now exists in two places — `SubsidyEligibilitySpecification` (frontend
domain) and `SubsidyEligibilityJpaSpecification` (backend) — deliberately, not as
drift. The frontend specification stays the reference definition of the rule and is
available for per-aggregate checks against an already-loaded `PublicBuilding` (e.g. an
eligibility badge on the detail page); the backend specification is what actually filters
the list query, since only the database can apply the rule before pagination without
loading every row.

## Consequences

**Positive:**
- Pagination metadata (`totalElements`, `totalPages`) is correct for the filtered set —
  the database applies the rule, not the client
- No extra bytes transferred for buildings the user filtered out
- `PageRequest` stays extensible for future filters (e.g. `location`, `deviceType`) noted
  as a gap before this change

**Negative:**
- The eligibility rule now has two implementations that must be kept in sync manually;
  a change to the rule (e.g. lowering the consumption threshold) requires editing both
  `SubsidyEligibilitySpecification` and `SubsidyEligibilityJpaSpecification`
- No test currently guards that the two specifications agree — divergence would only
  surface as a user-visible discrepancy between list filtering and detail-page display

**Not yet done:**
- No UI control (checkbox/toggle) sets `eligible` on the URL query params yet;
  `BuildingListComponent.parseParams()` does not read it from the route. This ADR covers
  the repository/API plumbing only — see `api-gaps` for the UI wiring gap.
