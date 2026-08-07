# ADR-0032: Name/Location Filtering on the Building List

**Status:** Accepted (2026-08-07)
**Date:** 2026-08-07

## Context

Backend added optional `?name=` and `?location=` query params to `GET /v1/buildings`
(case-insensitive "contains", combined with AND, not applied when `eligible=true` — that
path uses a separate subsidy-eligibility query). The frontend needed a search UI wired to
these params.

`BuildingListComponent` already treats the URL as the single source of truth for `page`
and `sort` — `parseParams()` reads them off `route.queryParamMap`, and `goToPage()`/
`onSortChange()` write back via `router.navigate()`. Extending that same pattern to
`name`/`location` was the natural fit, not a separate mechanism: they're now two more
fields `parseParams()` reads, which makes URL-shareable/bookmarkable/refresh-safe filtered
views a side effect of the existing design rather than extra work.

This is also the **first place in the codebase that subscribes to a reactive form's
`valueChanges` directly** — every other form (login, register, change-consumption,
add-device, create-building) only ever calls `.getRawValue()` inside a submit handler.
That surfaced a real, non-obvious Angular typed-forms pitfall.

## Decision

**Debounced, URL-synced search form:**
```ts
readonly searchForm = inject(FormBuilder).nonNullable.group({
  name: [this.route.snapshot.queryParamMap.get('name') ?? ''],
  location: [this.route.snapshot.queryParamMap.get('location') ?? ''],
});
```
Pre-filled from the current URL so a shared/bookmarked/refreshed filtered link restores
correctly — matching how `sortKey` already reads its initial state.

`searchForm.valueChanges` piped through `debounceTime(300)` +
`distinctUntilChanged((a, b) => a.name === b.name && a.location === b.location)` before
navigating, so typing doesn't fire a request per keystroke. Every filter-driven navigation
includes `page: 0`, since a stale page number from before the filter could point past the
end of the new, smaller result set. Empty values are passed as `null` in `queryParams`,
which Angular's router removes from the URL entirely rather than leaving a bare `?name=`.

**The `Partial<T>` pitfall:** `FormGroup.value` and `.valueChanges` are typed
`Partial<RawValue>` by Angular **even for a `nonNullable.group()`** — the type system
can't rule out a control being `.disable()`d later, which excludes it from `.value`
(though not from `.getRawValue()`, which is always the full, non-optional type
regardless of disabled state). Destructuring straight from the `valueChanges` emission —
```ts
.subscribe(({ name, location }) => this.navigateWithFilters(name, location));
```
— fails `ng build`'s AOT compile with `Argument of type 'string | undefined' is not
assignable to parameter of type 'string'`. **`tsc --noEmit -p tsconfig.spec.json` did not
catch this** — it only surfaced when running the actual production build, since Angular's
template/AOT compiler does stricter checking than a plain TS project check. Fixed by
reading the form's current state inside the callback instead of trusting the emission:
```ts
.subscribe(() => {
  const { name, location } = this.searchForm.getRawValue();
  this.navigateWithFilters(name, location);
});
```
This is also more correct on its own merits, not just a type-error workaround — it reads
the form's actual current values rather than whatever partial diff `valueChanges` happened
to carry for that particular emission.

## Consequences

**Positive:**
- Filtering reuses the exact same URL-as-truth mechanism already established for page/sort
  — no new state-management approach introduced.
- Filtered views are shareable/bookmarkable/refresh-safe as a side effect of that reuse,
  not extra implementation work.
- The `getRawValue()` pattern is now precedent for the next component that needs to react
  to `valueChanges` directly (none currently do, but if one starts to, this gotcha won't
  need rediscovering).

**Negative:**
- Anyone touching a reactive form's `.valueChanges` in this codebase needs to know this
  pitfall — `tsc --noEmit` alone will not catch it during development; only `ng build`
  (or an editor with the full Angular Language Service) will. Mitigated by writing it down
  here and in an inline comment at the call site, but it's still a footgun a plain
  type-check pass won't warn about.

**Related:** none for the URL-sync design (extends the existing page/sort pattern, not a
new one). First documented instance of the `valueChanges` `Partial<T>` pitfall.
