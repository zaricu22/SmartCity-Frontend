# ADR-0011: Domain Enums Shared Across Layers

**Status:** Accepted  
**Date:** 2026-06-13

## Context

Several TypeScript enums are used both in the domain layer and in the infrastructure
(HTTP response types) and presentation (component templates) layers:

- `EnergyDeviceType` — used in `EnergyDevice` entity, `EnergyDeviceResponse`, `DeviceType` DTO
- `EnergyUnit` — used in `Energy` value object, `EnergyDeviceResponse`, `EnergyDto`

In strict DDD, the infrastructure and presentation layers should define their own
representations (DTOs, response types) and translate to/from domain types. This avoids
domain types leaking into outer layers and keeps the domain independent of serialization
concerns.

Alternatives considered:

- **Separate enums per layer** — domain has `EnergyUnit`, infrastructure has `ApiEnergyUnit`,
  application has `DtoEnergyUnit`; mappers translate between them; complete isolation but
  significant boilerplate for no behavioral difference
- **Single shared enum** — one enum definition referenced directly in all layers; no
  translation; values match the backend API exactly

## Decision

Use a **single shared enum** defined in the domain layer and imported directly by all
outer layers:

```typescript
// domain/value-object/energy.ts
export enum EnergyUnit { kW = 'kW', kWh = 'kWh' }
export enum EnergyDeviceType { SOLAR_PANEL = 'SOLAR_PANEL', BATTERY = 'BATTERY', WIND_TURBINE = 'WIND_TURBINE' }

// infrastructure/api/response/energy-device.response.ts
import { EnergyDeviceType, EnergyUnit } from '@domain/value-object/energy';
export interface EnergyDeviceResponse {
  type: EnergyDeviceType;  // domain enum used directly
  ratedCapacityUnit: EnergyUnit;
}
```

This is a **pragmatic DDD trade-off** — the enums are pure value types with no
behavior, their values are stable (match the backend API contract), and separate
definitions would add translation code with zero domain benefit.

## Consequences

**Positive:**
- No enum translation code in mappers
- Single source of truth — adding a new device type requires one change, not three
- IDE auto-complete works consistently across all layers

**Negative:**
- Infrastructure and presentation layers import from the domain layer — a strict onion
  architecture violation (outer layers may import inner layers, but this goes domain → infra)
- If the backend API ever changes an enum value name, the domain layer must change;
  domain purity requires that domain types change only for domain reasons
- A future requirement for a display-friendly label (e.g. `"Solar Panel"` instead of
  `"SOLAR_PANEL"`) would need to be added to the enum or handled in a separate map
