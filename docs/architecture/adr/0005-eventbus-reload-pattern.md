# ADR-0005: EventBus Reload Pattern

**Status:** Accepted  
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

`BuildingDetailComponent` subscribes to `EventBusService` for `DEVICE_ADDED`,
`CONSUMPTION_CHANGED`, and `PRODUCTION_CHANGED` events. It never reacts directly to
command completion:

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

## Consequences

**Positive:**
- A single reload path handles both local mutations and real-time backend pushes
- Component is decoupled from how or when the operation completed
- Straightforward to extend: any new publisher (e.g. a second WebSocket topic) triggers
  the reload without touching the component

**Negative:**
- Causality is indirect — a developer debugging a reload must trace from component back
  through EventBus to the publisher
- In tests, emitting the EventBus event (not completing the command Observable) is what
  triggers the reload — this is non-obvious without reading this ADR or the inline comments
