# ADR-0005: EventBus Reload Pattern

**Status:** Amended (2026-06-19)  
**Date:** 2026-06-13

## Context

After a command succeeds (e.g. `addDevice`), `BuildingDetailComponent` must reload the
building to reflect the change. The simplest approach is to call `facade.getById()` directly
in the `next` callback of the command's Observable.

Alternatives considered:

- **Direct reload in next()** — `next: () => facade.getById(id).subscribe(...)`;
  tightly couples the component to the command's completion; a WebSocket push from the
  backend would not trigger the same reload path
- **Output event from dialog** — dialog emits a result, parent reloads; only covers
  local user actions, not external pushes
- **EventBus subscription** — component subscribes to domain events; both local
  actions (AppService publishes after save) and external pushes (WebSocket bridge
  publishes on STOMP message) flow through the same channel

## Decision

Components subscribe to `EventBusService` for domain events. They never react directly
to command completion — the EventBus is the single reload path for both local mutations
and real-time backend pushes:

```typescript
// AppService publishes after successful repository write
building.pullEvents().forEach(e => this.eventBus.publish(e));

// Component subscribes — same path for local action and WebSocket push
this.eventBus.on<DeviceAddedEvent>('DEVICE_ADDED')
  .pipe(filter(e => e.buildingId === this.buildingId), takeUntilDestroyed(this.destroyRef))
  .subscribe(() => this.load());
```

`BuildingWebSocketService` bridges STOMP messages into the same EventBus, so when the
backend pushes a real-time update, the component reloads via the identical code path.

## Amendment (2026-06-19): URL-driven pagination with EventBus merge

`BuildingListComponent` extends this pattern by merging EventBus events with URL query
param changes. Page and sort state live in the URL (`?page=0&size=10&sort=name,dir=asc`);
both URL changes and EventBus events trigger a new `facade.getAll()` call:

```typescript
private readonly pageResult = toSignal(
  merge(
    // Primary: URL param change drives page/sort
    this.route.queryParamMap.pipe(map(params => parseParams(params))),
    // Secondary: EventBus events and forced reloads re-read current URL snapshot
    merge(this.reload$, eventBus.on('DEVICE_ADDED'), ...)
      .pipe(map(() => parseParams(this.route.snapshot.queryParamMap))),
  ).pipe(switchMap(req => this.facade.getAll(req))),
  { initialValue: EMPTY_PAGE },
);
```

A private `reload$: Subject<void>` handles the edge case where the URL will not change
(post-create when already on page 0). In that case, navigating to `?page=0` would be a
no-op, so `reload$.next()` forces a re-emission without touching the URL.

```typescript
// After successful create — navigate only if not already on page 0
if (this.currentPage() === 0) {
  this.reload$.next();       // URL won't change — force re-emission
} else {
  this.goToPage(0);          // URL change triggers queryParamMap emission automatically
}
```

## Consequences

**Positive:**
- A single reload path handles both local mutations and real-time backend pushes
- Component is decoupled from how or when the operation completed
- URL-driven state makes pagination bookmarkable and browser-back compatible
- `reload$` is a minimal escape hatch — used only when the URL is already at the target state

**Negative:**
- Causality is indirect — a developer debugging a reload must trace from component back
  through EventBus to the publisher
- In tests, emitting the EventBus event (not completing the command Observable) is what
  triggers the reload — non-obvious without reading this ADR or the inline comments
- The `reload$` subject exists solely for the page-0 edge case — if pagination is removed,
  it becomes dead code
