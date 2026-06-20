# ADR-0011: Domain Enums Shared Across Layers

**Status:** Amended (2026-06-19)  
**Date:** 2026-06-13

## Context

Several TypeScript enums are used by all four DDD layers — domain, application,
infrastructure, and presentation:

- `DeviceType` — used in `EnergyDevice` entity, `AddDeviceRequest`, `EnergyDeviceResponse`,
  `AddDeviceDialogComponent`
- `EnergyUnit` — used in `Energy` value object, HTTP requests/responses, `EnergyDisplayComponent`

In strict DDD, the infrastructure and presentation layers should define their own
representations and translate to/from domain types. In practice this would mean three
separate `EnergyUnit` enums (domain, infrastructure, presentation) and two mapper steps
for no behavioral difference — the values are identical and match the backend API contract.

## Decision

Use a **single shared enum** defined in `domain/shared/enums/` and imported directly by
all outer layers.

This is consistent with standard DDD and Clean Architecture: the dependency rule states
that **outer layers depend on inner layers**, not the reverse. Presentation and
infrastructure importing domain vocabulary types is the expected direction. What the rule
prohibits is **calling domain logic from outer layers** — instantiating aggregates,
invoking specifications, or bypassing the facade.

Separate enum definitions per layer would add translation boilerplate with zero domain
benefit and would require three coordinated changes every time a new device type or
energy unit is added.

## Amendment (2026-06-19)

The original implementation introduced a re-export workaround:

```
domain/shared/enums/energy-unit.enum.ts     ← definition
application/shared/enums/energy-unit.enum.ts ← export { EnergyUnit } from '../../domain/...'
```

Presentation imported from `application/shared/enums/` to avoid triggering the arch test
rule "presentation must not import from domain." This was unnecessary — the rule exists to
prevent presentation from calling domain logic, not to prevent it from using domain types.

**The workaround was removed.** The arch test rule 7 now carries an explicit exception:

```
presentation must not import from domain (except domain/shared/enums — ADR-0011)
```

Presentation now imports `EnergyUnit` and `DeviceType` directly from
`domain/shared/enums/`, the same as every other layer.

## Consequences

**Positive:**
- No enum translation code in mappers
- Single source of truth and single import path for all layers
- `application/shared/enums/` re-export folder eliminated
- Arch rule exception is explicit and documented rather than hidden in an indirection layer

**Negative:**
- If the backend API ever changes an enum value name, the domain layer must change;
  domain purity requires that domain types change only for domain reasons
- A future requirement for display-friendly labels (e.g. `"Solar Panel"` instead of
  `"SOLAR_PANEL"`) would need a separate display map rather than adding presentation
  concerns to the enum
