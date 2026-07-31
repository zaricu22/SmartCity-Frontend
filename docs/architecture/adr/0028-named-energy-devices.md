# ADR-0028: EnergyDevice Gains a Required `name` Field

**Status:** Accepted (2026-07-31)
**Date:** 2026-07-31

## Context

`EnergyDevice` had no identifying label beyond its `type` (`SOLAR` / `BATTERY` / `PUMP`) and
generated UUID. Two devices of the same type in the same building were visually
indistinguishable in the UI — `DeviceListComponent` rendered only the type icon, rated
capacity, and production rate, so a user with three `SOLAR` panels could not tell them
apart, and WS/toast messages describing device add/remove could only say "A SOLAR device
was added," not which one.

The backend (`SmartCity-Backend`) added a required `name: String` to `EnergyDevice`
(constructor `EnergyDevice(UUID id, String name, DeviceType type, Energy
ratedCapacity)`, validated non-blank via `ValidationException`/`ErrorCode
.DEVICE_NAME_EMPTY`) and threaded it through every layer: `AddDeviceCommand`,
`DeviceAddedEvent`/`DeviceRemovedEvent`, the `AddDeviceRequest`/`EnergyDeviceResponse` REST
DTOs, the JPA entity/mapper, and the WebSocket `DeviceAddedMessage`/`DeviceRemovedMessage`.
This was done directly in the backend repository (explicit user override of the
frontend-only-scope default — see [[feedback-frontend-only-scope]] — same override already
used for ADR-0027's event enrichment).

## Decision

Mirror the backend exactly, field-for-field, so the two repositories' contracts stay in
sync:

- **Domain:** `EnergyDevice` constructor becomes `(id, name, type, ratedCapacity)` —
  matching the backend's parameter order — validated the same way `PublicBuilding`/
  `AddDeviceRequest` validate their own required strings (non-null, non-blank after
  `trim()`), raising `ValidationException` with a new `ErrorCode.DEVICE_NAME_EMPTY`.
- **Application:** `AddDeviceCommand` gains `name`; `DeviceAddedEvent`/`DeviceRemovedEvent`
  gain `deviceName`; `PublicBuilding.addDevice()`/`removeDevice()` (aggregate) push
  `deviceName` into the events they raise, same pattern as `deviceType`.
- **Infrastructure:** `AddDeviceRequest`/`EnergyDeviceResponse` (REST DTOs),
  `EnergyDeviceDto` (application read model), and `BuildingResponseMapper`/
  `BuildingDtoMapper` all thread `name` through, so it survives the full
  domain → HTTP → domain round trip. `BuildingWebSocketService`'s
  `DeviceAddedMessage`/`DeviceRemovedMessage` gain `deviceName`, bridged into the
  corresponding domain events exactly like `deviceType` already was.
- **Presentation:** `AddDeviceDialogComponent` gains a required `name` text input (first
  field in the form, `Validators.required`); `DeviceListComponent` renders
  `device.name` alongside the type icon. Toasts for add/remove — both the local
  (`BuildingDetailComponent.onAddDevice()`/`onRemoveDevice()`) and WS-received
  (`BuildingWebSocketService`) paths — now read `Device "X" (SOLAR) added.` /
  `Device "X" removed.` instead of `SOLAR device added.` / `Device removed.`.
  `onRemoveDevice()` looks the name up from the currently-loaded `building()` signal
  before the device disappears from state, since the remove command only takes a
  `deviceId`.

No change to the repository interface shape (`addDevice(buildingId, device)`,
`removeDevice(buildingId, deviceId)`) — `name` travels inside the `EnergyDevice` object
itself, not as a separate parameter, consistent with how `type`/capacity already worked.

## Consequences

**Positive:**
- Devices are now individually identifiable in the UI and in real-time notifications —
  closes the actual UX gap (indistinguishable same-type devices) that prompted this change.
- Full parity with the backend's `EnergyDevice`, `AddDeviceCommand`,
  `DeviceAddedEvent`/`DeviceRemovedEvent`, and both WS messages — verified field name and
  order match exactly (Jackson serializes Java records by component name, matching the
  TypeScript interface property names one-for-one).
- Every layer that already threaded `type` through (mapper, DTO, WS bridge) needed the
  identical change for `name` — no new architectural seam, just one more field along an
  existing path.

**Negative:**
- `EnergyDevice`'s constructor argument order changed (`name` inserted as the 2nd
  parameter) — a breaking change for any code still calling the 3-argument form; all
  in-repo call sites and specs were updated in this same change, but this is a reminder
  that domain entity constructors are not a stable public API across changes.
- Existing devices already persisted in a database before this change (if any) would need
  a backfill for the new `NOT NULL name` column — a backend/persistence concern, not
  addressed here since this ADR covers the frontend mirror only.

**Related:** ADR-0002, ADR-0006, ADR-0007, ADR-0027.
