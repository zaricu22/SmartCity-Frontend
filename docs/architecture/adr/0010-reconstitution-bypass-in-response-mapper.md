# ADR-0010: Reconstitution Bypass in Response Mapper

**Status:** Accepted (Technical Debt)  
**Date:** 2026-06-13

## Context

When loading a building from the API, `BuildingResponseMapper` must reconstruct a
`PublicBuilding` domain object from the HTTP response. The problem is that the only
public way to set devices and consumption on `PublicBuilding` is through its domain
methods (`addDevice`, `changeConsumption`), which:

1. Run business rule validation (e.g. consumption cannot exceed total device capacity)
2. Accumulate domain events (`DEVICE_ADDED`, `CONSUMPTION_CHANGED`) that must not be
   published for objects loaded from the database

The backend solves this cleanly with a `PublicBuilding.reconstitute()` static factory
that bypasses validation and event accumulation — data from the DB is already valid
because it was validated on write.

Alternatives considered:

- **`reconstitute()` static factory** — the correct DDD approach; bypasses validation
  and does not accumulate events; requires making private fields settable from the factory
  or using a private constructor overload
- **Public setters** — expose setters for `_consumption` and `_devices`; breaks
  aggregate encapsulation permanently for all callers, not just the mapper
- **Bypass via `any` cast** — directly assign private fields using TypeScript's type
  system escape hatch; works but is fragile

## Decision

Use a **`(building as any)['_consumption'] = ...` cast** combined with `pullEvents()` to
drain accumulated events:

```typescript
// BuildingResponseMapper.toDomain()
response.devices.forEach(d => {
  const device = new EnergyDevice(d.id, d.type, new Energy(d.ratedCapacityValue, d.ratedCapacityUnit));
  if (d.productionRateValue > 0) device.changeProduction(new Energy(d.productionRateValue, d.productionRateUnit));
  building.addDevice(device); // accumulates DEVICE_ADDED events
});
building.pullEvents(); // drain — these events must not be published

if (response.consumptionValue > 0) {
  (building as any)['_consumption'] = new Energy(response.consumptionValue, response.consumptionUnit);
  // bypass capacity check — data from DB is already valid
}
```

This is an intentional **technical debt** accepted for the showcase scope. The correct
fix is to add a `PublicBuilding.reconstitute()` static factory, matching the backend
implementation.

## Consequences

**Positive:**
- No changes to `PublicBuilding` required — aggregate encapsulation is nominally preserved
- Works correctly for all current test scenarios

**Negative:**
- Relies on the private field name `_consumption` — a rename breaks the mapper silently
  at runtime, not at compile time
- `any` cast bypasses TypeScript's type safety
- `addDevice()` still runs duplicate-device validation during reconstruction, which is
  unnecessary and could theoretically throw if the DB somehow contains duplicate IDs
- **Should be replaced** with `PublicBuilding.reconstitute()` in a follow-up refactor
