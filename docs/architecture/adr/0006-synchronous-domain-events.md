# ADR-0006: Synchronous Domain Events via pullEvents()

**Status:** Accepted  
**Date:** 2026-06-13

## Context

After aggregate state changes (`addDevice`, `changeConsumption`), the EventBus must be
notified so that components and the WebSocket bridge can react. The question is when and
how domain events are emitted.

Alternatives considered:

- **Emit event before persist** — event is published optimistically; if the HTTP request
  fails, the UI reacts to a change that never happened on the server
- **Emit directly in domain method** — `PublicBuilding.addDevice()` injects EventBus and
  publishes immediately; domain layer gains a dependency on infrastructure
- **pullEvents() after persist** — aggregate accumulates events internally;
  AppService calls `pullEvents()` only after the repository write confirms success

## Decision

The aggregate root accumulates domain events in a private list. `AppService` calls
`pullEvents()` and publishes to `EventBusService` only after the repository write
Observable completes successfully:

```typescript
// PublicBuilding — aggregate accumulates events
addDevice(newDevice: EnergyDevice): void {
  this._devices.push(newDevice);
  this._domainEvents.push({ type: 'DEVICE_ADDED', ... });
}

// AppService — publish only after persist
return this.repository.addDevice(buildingId, device).pipe(
  tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
);
```

**Only the aggregate root raises domain events.** `EnergyDevice` (a domain entity inside
the aggregate) never raises events directly — entities delegate state-change notifications
to the aggregate root, which keeps event responsibility centralised.

This mirrors the backend implementation — see backend ADR-0005.

## Consequences

**Positive:**
- Events are never published for operations that failed on the server
- Domain layer has no dependency on EventBus or any infrastructure type
- Event ordering is deterministic — events are published in the order they were accumulated

**Negative:**
- If the HTTP request succeeds but event publishing throws, the aggregate is saved but
  subscribers are not notified — there is no retry mechanism
- `pullEvents()` must be called on the same aggregate instance that was mutated;
  loading a fresh copy from the repository after save would lose the events
