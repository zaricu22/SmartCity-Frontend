# ADR-0012: throttleTime Instead of debounceTime for Reload Trigger

**Status:** Accepted  
**Date:** 2026-06-13

## Context

`BuildingListComponent` merges a manual reload `Subject` with the `EventBus` stream
and needs to rate-limit how often the API is called when multiple events arrive in
quick succession (e.g. adding a device fires `DEVICE_ADDED`, which could trigger
a cascade of reloads).

Two standard RxJS operators handle rate-limiting:

- **`debounceTime(ms)`** — waits for a silent period of `ms` before emitting the last
  value; guarantees a trailing-edge emit after activity stops
- **`throttleTime(ms)`** — emits the first value, then silences for `ms`; guarantees
  an immediate leading-edge emit and then rate-limits subsequent signals

## Decision

Use **`throttleTime(300)` with leading-edge emission**:

```typescript
// building-list.component.ts
merge(this.reloadTrigger$, this.eventBus.on('BUILDING_UPDATED'))
  .pipe(
    throttleTime(300),   // leading edge — first event fires immediately
    switchMap(() => this.facade.getAll()),
    takeUntilDestroyed(this.destroyRef),
  )
  .subscribe(buildings => this.buildings = buildings);
```

`throttleTime` with default `{ leading: true, trailing: false }` fires immediately on
the first event, then ignores subsequent events for 300 ms. This means the UI refreshes
instantly when the user clicks Reload, rather than waiting 300 ms for the debounce
window to close.

**Testing note:** `throttleTime` requires `fakeAsync` + `tick(300)` in unit tests
to advance the virtual clock past the throttle window. Tests that call the trigger
and then assert immediately will see the leading emit, but a second call within 300 ms
will be swallowed unless the clock is advanced.

## Consequences

**Positive:**
- The first reload fires immediately — no perceived latency for the user
- Subsequent rapid-fire events (e.g. WebSocket burst) are suppressed for 300 ms
- Simpler reasoning than debounce: "fire now, ignore for a bit" vs "wait for quiet"

**Negative:**
- If two legitimate reloads arrive within 300 ms, the second is silently dropped
- `debounceTime` would be more appropriate if the source were a search input where the
  last value (not the first) is the one that matters
- The 300 ms window is a magic number — large enough to batch bursts, small enough to
  feel responsive, but not derived from a measurement
