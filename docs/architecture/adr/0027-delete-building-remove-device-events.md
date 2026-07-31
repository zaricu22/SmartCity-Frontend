# ADR-0027: Delete Building / Remove Device — Domain Events and Real-Time Wiring

**Status:** Amended (2026-07-31)
**Date:** 2026-07-31

## Context

The backend already exposed two ADMIN-only endpoints — `DELETE /v1/buildings/{id}` and
`DELETE /v1/buildings/{buildingId}/devices/{deviceId}` — and raised
`BuildingDeletedEvent` / `DeviceRemovedEvent` domain events on success, but nothing on the
frontend called either endpoint. A prior change added the full frontend stack for both
operations, following the exact pattern `addDevice()` established (ADR-0006):

- Domain: `BuildingDeletedEvent`, `DeviceRemovedEvent` (mirroring the backend's own event
  shapes); `PublicBuilding.removeDevice(deviceId)` mirroring the backend aggregate exactly
  (throws if the device doesn't exist, raises `DEVICE_REMOVED`).
- Application: `PublicBuildingRepository.removeDevice()` (new abstract method);
  `PublicBuildingAppService.delete()` — fire-and-forget, no aggregate load, matching the
  backend's own `service.delete()` which only checks existence — and `.removeDevice()`
  (load → mutate → persist → publish, same shape as `addDevice()`).
- Infrastructure: `PublicBuildingApiService.removeDevice()` → `DELETE
  /v1/buildings/{buildingId}/devices/{deviceId}`.
- Presentation: a delete-building button and a per-device remove button, both behind
  `ConfirmDialogService`, wired through `PublicBuildingFacade`.

At that point `BuildingWebSocketEventHandler` (backend) had no handlers for either event,
so both operations worked end-to-end only for the acting user's own session — the same
gap ADR-0026 documented for `BuildingCreatedEvent` before its WS handler existed. The
backend has since gained both handlers (read-only check, not implemented as part of this
change — see [[reference-backend]] / frontend-only-scope in project memory):

- `BuildingWebSocketEventHandler.onBuildingDeleted` → `BuildingDeletedMessage(buildingId)`
  pushed to `/topic/buildings/deleted` — a separate collection-level topic from
  `/topic/buildings`, kept distinct so each topic carries exactly one message shape.
- `BuildingWebSocketEventHandler.onDeviceRemoved` →
  `DeviceRemovedMessage(buildingId, deviceId)` pushed to
  `/topic/buildings/{buildingId}/devices/removed` — per-building, parallel to
  `/topic/buildings/{buildingId}/devices` for `DeviceAddedEvent`.

This closes the gap the same way ADR-0026's amendment did: the frontend can now safely
subscribe to messages the backend genuinely sends.

## Decision

`BuildingWebSocketService` gains two more Subjects (`buildingDeleted$`, `deviceRemoved$`),
bridged into `EventBusService` identically to the existing four:

- `/topic/buildings/deleted` is subscribed unconditionally in `connect()`, same as
  `/topic/buildings` — collection-level, no `buildingId` needed. `BuildingListComponent`
  merges `BUILDING_DELETED` into its reload stream next to `BUILDING_CREATED`, so a
  building deleted in one tab disappears from another tab's list without a manual refresh.
- `/topic/buildings/{buildingId}/devices/removed` is subscribed only when a `buildingId`
  is passed, alongside the other 3 per-building topics.

No change was needed in `BuildingDetailComponent`: it already subscribes to
`DEVICE_REMOVED` on the EventBus and reloads (`this.load()`), written to treat local writes
and WebSocket pushes identically from the start (same single-path design as
`DEVICE_ADDED`) — once the WS bridge publishes the same event shape, cross-client sync for
device removal works with zero component changes.

`BuildingDetailComponent` deliberately does **not** subscribe to `BUILDING_DELETED` to
navigate away if another user deletes the building being viewed. Unlike the other four
events, deletion has no "reload this page" outcome — the building is gone. Handling this
would also risk a double toast/navigate for the deleting user's own action: `AppService
.delete()` publishes `BUILDING_DELETED` locally in the same tick the HTTP response resolves,
and the backend's own WS push can echo back to the same connected client shortly after
(the same self-echo behavior already accepted for `BUILDING_CREATED` under ADR-0026,
unresolved there and not addressed here either). Left as a known gap: a user with another
session's building-detail page open when it's deleted elsewhere will only notice on their
next explicit action (e.g. `findById` 404s, surfacing `errorMessage`).

## Consequences

**Positive:**
- Cross-client sync for building deletion and device removal now works end-to-end, closing
  the gap called out in the delete-feature's original review.
- No new component logic needed for `DEVICE_REMOVED` — validates the "publish once,
  consume the same way regardless of origin" design from ADR-0005/ADR-0025 continues to
  pay off as more events are added.
- Topic and Subject naming stays parallel to the existing four (`.../deleted` next to
  `/topic/buildings`, `.../devices/removed` next to `.../devices`), so the pattern is easy
  to extend again.

**Negative:**
- Same self-echo double-notification risk as `BUILDING_CREATED` (ADR-0026): a user who
  deletes their own building may see two toasts if their socket is still connected when the
  backend's WS push arrives. Not addressed here, consistent with the existing accepted gap.
- A building-detail page left open on a building deleted by another user does not
  proactively redirect — it silently goes stale until the next reload or navigation.

## Amendment (2026-07-31): payloads enriched with `name`/`deviceType`

Initial toasts for WS-received deletions were generic ("A building was deleted.", "A device
was removed.") because `BuildingDeletedEvent`/`BuildingDeletedMessage` only carried
`buildingId`, and `DeviceRemovedEvent`/`DeviceRemovedMessage` only carried `buildingId` +
`deviceId` — unlike `BuildingCreatedEvent`/`DeviceAddedEvent`, which carry `name`/
`deviceType` and already produced specific toasts. The gap wasn't necessary: the backend's
`PublicBuildingAppService.delete()` already calls `repository.findById(buildingId)` to
check existence before deleting, and `.removeDevice()` already loads the full aggregate
(with the target device's type) before removing it — both discarded data they already had
in hand.

Closed on both sides (backend edit explicitly authorized by the user for this task,
overriding the frontend-only-scope default — see [[feedback-frontend-only-scope]]):

- **Backend:** `BuildingDeletedEvent` gained `name`; `DeviceRemovedEvent` gained
  `deviceType`. `PublicBuildingAppService.delete()` now loads the aggregate (previously
  just an `isEmpty()` check) purely to read `building.getName()` before publishing the
  event — the delete call itself is still fire-and-forget, unchanged. `PublicBuilding
  .removeDevice()` (aggregate) captures `device.getType()` before removing it from the
  list. `BuildingDeletedMessage`/`DeviceRemovedMessage` and `BuildingWebSocketEventHandler`
  thread the new fields through to the WS payload; `AuditLogEventHandler`'s log lines were
  updated to include them too.
- **Frontend:** `BuildingDeletedEvent`/`DeviceRemovedEvent` (domain), `BuildingDeletedMessage`/
  `DeviceRemovedMessage` (WS DTOs), and `BuildingWebSocketService`'s bridging/toasts were
  updated to match. `PublicBuildingAppService.delete()` was changed the same way as its
  backend counterpart — `findById(id)` first, purely to capture `building.name` for the
  event, still no aggregate mutation. `PublicBuilding.removeDevice()` (frontend aggregate)
  now captures the removed device's `type` the same way the backend aggregate does. Toasts
  became `Building "${name}" was deleted.` and `A ${deviceType} device was removed.`

No API contract change (still `DELETE /v1/buildings/{id}` and `DELETE
/v1/buildings/{buildingId}/devices/{deviceId}`, both 204) — only the domain event and WS
message payloads gained fields, so this is additive and backward compatible with any other
consumer of those two REST endpoints.

**Related:** ADR-0005, ADR-0006, ADR-0025, ADR-0026.
