# ADR-0026: BuildingCreatedEvent Modeled as a Domain Event

**Status:** Amended (2026-07-30)
**Date:** 2026-07-30

## Context

Backend's `PublicBuilding` aggregate raises `BuildingCreatedEvent(buildingId, name, location)`
on construction and publishes it via `ApplicationEventPublisher` after
`PublicBuildingAppService.create()` persists successfully — confirmed working, same
`pullEvents()`-after-save pattern as the other three domain events (ADR-0006). The only
consumer was `AuditLogEventHandler` (audit logging); `BuildingWebSocketEventHandler` had
no `onBuildingCreated` method, so nothing was ever pushed to WebSocket clients.

On the frontend, `BuildingCreatedEvent` didn't exist at all. `PublicBuilding`'s
constructor never added anything to `_domainEvents`, so `PublicBuildingAppService.create()`'s
`building.pullEvents().forEach(e => this.eventBus.publish(e))` (existing code, written
speculatively for this future event) was a silent no-op — a fixed-but-unreachable code
path, the same category of bug as `BuildingWebSocketService.connect()` before ADR-0025.
`BuildingListComponent`'s post-create reload worked through a separate, ad-hoc path
instead: `submitCreate()`'s own subscribe callback called `reload$.next()` directly (or
navigated to page 0), bypassing the EventBus/domain-event architecture entirely.

Three scopes were considered for closing this gap:
1. **Local domain event only** — model `BuildingCreatedEvent` on the frontend, have the
   aggregate raise it, and replace the ad-hoc reload with the same EventBus-driven path
   `DEVICE_ADDED` / `CONSUMPTION_CHANGED` / `PRODUCTION_CHANGED` already use. No WebSocket
   involved.
2. **Local event + speculative WS client** — also add a WS bridge on
   `BuildingWebSocketService` for a building-creation topic, before the backend push
   existed — same trap as before ADR-0025 (frontend listening for a message nobody sends).
3. **Full stack** — also implement the backend push handler.

Scope 1 was chosen initially specifically because the backend had no WS handler for this
event. The backend handler (`BuildingWebSocketEventHandler.onBuildingCreated`,
publishing `BuildingCreatedMessage` to `/topic/buildings`) was added afterward in the same
change — but the frontend still does **not** subscribe to that topic; this ADR only
covers the local/EventBus half.

## Decision

`PublicBuilding`'s constructor pushes `BuildingCreatedEvent` into `_domainEvents`,
identically to how `changeConsumption()` / `changeDeviceProduction()` push their events:

```typescript
constructor(id: string, name: string, location: string) {
  // ...validation, field assignment...
  this._domainEvents.push({
    type: 'BUILDING_CREATED',
    buildingId: id,
    name,
    location,
  } satisfies BuildingCreatedEvent);
}
```

No `AppService` change was needed — `create()` already called
`building.pullEvents().forEach(publish)` after save; it just had nothing to pull before.

`BuildingResponseMapper.toDomain()` (reconstitution from HTTP responses) already calls
`building.pullEvents()` unconditionally after building the aggregate, specifically to
discard events accumulated during reconstruction (previously only `DEVICE_ADDED` from the
`addDevice()` loop; ADR-0010). The new `BUILDING_CREATED` event from the constructor falls
into that same drain — reconstituting a building loaded from the backend does **not**
spuriously publish a creation event.

`BuildingListComponent` now subscribes to `BUILDING_CREATED` in the same `merge()` as the
other three events, and `submitCreate()`'s success callback lost its manual
`reload$.next()` call — the `already on page 0` case is now handled by the EventBus
subscription reacting to the event `AppService.create()` publishes before the subscribe
callback runs, exactly like the other three events. The `reload$` Subject itself was
removed as dead code once nothing published to it anymore. Navigating to page 0 (the
`currentPage() !== 0` branch) remains explicit — the EventBus merge reloads with
*current* URL params, so it can't by itself decide to navigate away from a non-zero page.

## Amendment (2026-07-30): WebSocket bridge for `/topic/buildings`

Initially this ADR stopped at the local/EventBus half deliberately — the backend had no
`onBuildingCreated` WS handler at the time scope was decided, and building one
speculatively on the frontend would repeat the exact mistake ADR-0025 fixed (a client
listening for a message nobody sends). The backend handler
(`BuildingWebSocketEventHandler.onBuildingCreated`, pushing `BuildingCreatedMessage` to
`/topic/buildings`) was added in a separate, later change. Once it existed, the frontend
side was completed too:

- `BuildingWebSocketService` gained a `BuildingCreatedMessage` interface and
  `buildingCreated$` Subject, bridged into `EventBusService` exactly like the other three
  message types.
- `connect(buildingId?: string)` — the parameter became optional. `/topic/buildings` is
  collection-level (no building exists to scope a subscriber to before it's created), so
  it's always subscribed regardless of whether a `buildingId` is passed. The 3 per-building
  topics remain conditional on `buildingId` being present.
- `BuildingListComponent` now calls `connect()` (no argument — it has no single building to
  scope to) and `BuildingDetailComponent` continues calling `connect(buildingId)` — both
  get the collection-level topic; only the detail page also gets the per-building ones.

**Lifecycle correction made in the same change:** implementing this exposed a real bug in
ADR-0025's original design. `BuildingWebSocketService` is provided once for the whole
`/assets` route subtree — `providers: ASSET_PROVIDERS` sits on the parent `assets` route in
`app.routes.ts:38-42`, shared by both the list and detail child routes, not recreated per
page. ADR-0025 had the service tear itself down via its own `DestroyRef.onDestroy()`,
which only fires when the entire `/assets` subtree is left (e.g. navigating to `/login`) —
not when moving between building detail pages within `/assets`. In practice this meant
`connect('A')` then later `connect('B')` (same shared service instance) would overwrite
`this.client` without ever deactivating the first connection — a real leaked WebSocket per
building visited. Fixed two ways: `connect()` now calls `this.disconnect()` unconditionally
before creating a new client (safe regardless of call order), and the service no longer
owns its own teardown — each component that calls `connect()` registers its own
`destroyRef.onDestroy(() => this.webSocketService.disconnect())`, so disconnection is tied
to the page's own lifetime, not the shared service's.

## Consequences

**Positive:**
- Fixes a real dead-code bug — `create()`'s event-publish call now actually publishes
  something.
- `BuildingListComponent`'s reload-on-create behavior is now consistent with
  device/consumption/production reloads — one EventBus-driven path, not two (see ADR-0005
  amendment).
- Domain layer parity with the backend aggregate — `PublicBuilding` now raises the same
  four events on both sides.
- Cross-client building-list sync now genuinely works end-to-end: a building created in
  one tab/session appears in another tab's list without a manual refresh.
- Fixed a real connection-leak bug in `BuildingWebSocketService`'s lifecycle that predates
  this change (see Amendment) — each page now owns disconnecting its own connection.

**Negative:**
- `BuildingListComponent` and `BuildingDetailComponent` can never be connected
  simultaneously with this design (one `client` field, `connect()` always tears down the
  previous one) — acceptable today since they're mutually exclusive routes, but would need
  revisiting if a future page needed to observe both a list and a specific building's
  topics at once.
