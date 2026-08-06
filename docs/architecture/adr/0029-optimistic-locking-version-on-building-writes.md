# ADR-0029: Optimistic-Locking `version` on Building Writes

**Status:** Accepted (2026-08-06)
**Date:** 2026-08-06

## Context

The backend added a `@Version` column to `PublicBuildingJpaEntity` and, on top of
Hibernate's own flush-time optimistic-lock check, an explicit `checkVersion()` guard in
`PublicBuildingAppService` — every mutating command (`addDevice`, `removeDevice`,
`changeConsumption`, `changeProduction`, `delete`) now requires the caller to submit the
`version` it last read, and rejects the write with `409 CONCURRENT_MODIFICATION`
(`ObjectOptimisticLockingFailureException`) if it no longer matches the current row. This
closes a real gap Hibernate's flush-time check alone didn't cover: two requests racing in
the same instant were already caught, but a client editing from data it read minutes ago
silently overwrote whatever changed in between, since each command did its own fresh
`findById` and never compared against what the client had actually seen.

`PublicBuildingResponse` gained a `version: Long`; every write request DTO
(`AddDeviceRequest`, `ChangeConsumptionRequest`, `ChangeProductionRequest`, plus new
`DeleteBuildingRequest`/`RemoveDeviceRequest`, since the two `DELETE` endpoints previously
sent no body at all) gained a required `version: Long`. Done directly in the backend
repository (explicit user override of the frontend-only-scope default — see
[[feedback-frontend-only-scope]], same override already used for ADR-0027/ADR-0028).

Separately, while wiring this up, `http-error.interceptor.ts` was found to read `body.code`
from error responses, but the backend's `ErrorResponse` names that field `errorCode` — so
every backend-provided error code, including the new `CONCURRENT_MODIFICATION` one, was
silently dropped in favor of a generic fallback message. Fixed as part of the same change,
since the conflict toast depends on it.

## Decision

Mirror the backend field-for-field, threaded through all six layers:

- **Infrastructure (read):** `PublicBuildingResponse` gains `version: number`.
  `BuildingResponseMapper.toDomain()` sets it on the reconstructed aggregate via the same
  raw-cast reconstruction technique already used for `_consumption` (a
  `PublicBuilding.reconstitute()` factory would be the "correct" fix, per the comment
  already there — not introduced by this change).
- **Domain:** `PublicBuilding` gains a private `_version` field (default `0` for a
  not-yet-persisted building — never compared against anything until the aggregate
  round-trips through the backend) and a `version` getter.
- **Application (read):** `PublicBuildingDto` gains `readonly version: number`;
  `BuildingDtoMapper` passes it through.
- **Application (write) / Infrastructure (write):** `AddDeviceCommand`,
  `ChangeConsumptionCommand`, `ChangeProductionCommand` gain `version: number`; matching
  request DTOs gain `version`; two new request DTOs (`DeleteBuildingRequest`,
  `RemoveDeviceRequest`) were added since delete/removeDevice previously called
  `HttpClient.delete()` with no body argument at all — Angular's `HttpClient.delete()`
  requires an explicit `{ body: ... }` option to send one.
  `PublicBuildingRepository`/`PublicBuildingApiService.delete()`/`.removeDevice()` gain a
  `version: number` parameter.
- **Application service:** `PublicBuildingAppService`'s mutating methods (`delete`,
  `removeDevice`, `addDevice`, `changeConsumption`, `changeProduction`) already did
  `findById → mutate → repository call` for domain validation and event-pulling — the
  version passed to the repository call is the caller-supplied one (from the command, or an
  explicit parameter for `delete`/`removeDevice`), **not** `building.version` from the
  `findById` that just ran inside the same method. Re-fetching it there would make the check
  compare a version against itself, always match, and silently defeat the entire
  mechanism — the whole point is comparing what the client displayed against what's
  actually in the DB now.
- **Presentation:** `building-detail.component.ts`'s four mutating handlers (`onAddDevice`,
  `onChangeConsumption`, `onDeleteBuilding`, `onRemoveDevice`) read
  `this.building()!.version` — the value from the currently-loaded `PublicBuildingDto`
  signal — and pass it into the command/call at the point of submission. Dialog components
  (`AddDeviceDialogComponent`, `ChangeConsumptionDialogComponent`) do **not** know about
  `version` — `AddDeviceDialogResult` explicitly omits it
  (`Omit<AddDeviceCommand, 'buildingId' | 'version'>`) since the component, not the dialog,
  owns the currently-loaded building state.
- On a `409 CONCURRENT_MODIFICATION` response, `PublicBuildingFacade`'s `handleError()` now
  preserves `AppHttpError.code` onto `ApplicationException.errorCode` (previously dropped
  for the `AppHttpError` branch — only the `DomainException` branch preserved a code).
  `building-detail.component.ts`'s new `handleMutationError()` checks for that specific code
  and calls `this.load()` to refresh, so the next retry submits a current version instead of
  the same stale one.
- `http-error.interceptor.ts`: `body.code` → `body.errorCode`, matching the backend's actual
  `ErrorResponse` field name.

## Consequences

**Positive:**
- Closes a real lost-update window: a user editing from data displayed minutes ago now gets
  a specific, actionable conflict instead of silently overwriting someone else's change.
- The interceptor fix has value independent of this feature — every backend-provided error
  code was being dropped before this, not just the new conflict one.
- Auto-reload on conflict means the user doesn't have to manually refresh and re-open a
  dialog to retry — the next attempt just works.

**Negative:**
- `version` is now a required field threaded through every mutating command/request/DTO in
  this bounded context — any future write operation added to `PublicBuilding` needs to
  remember to carry it, with nothing at the type level forcing that discipline beyond the
  existing interfaces.
- The frontend does not itself validate the version before sending (no client-side
  "your version is X, this will conflict" preflight) — a stale write always costs a round
  trip to discover, by design (the backend is the single source of truth for whether a
  conflict exists).
- `PublicBuilding.reconstitute()` was not introduced despite the version field being another
  data point relying on the same raw-cast bypass as `_consumption` — deferred, consistent
  with the existing comment in `BuildingResponseMapper` flagging it as the "should be"
  approach without implementing it yet.

**Related:** ADR-0002, ADR-0006, ADR-0007, ADR-0012 (backend), ADR-0027, ADR-0028.
