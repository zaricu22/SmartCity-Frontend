# ADR-0009: CQRS Split — AppService and QueryService

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The application layer must handle both state-changing operations (create building,
add device, change consumption, change production) and read operations (get by ID, get all).
These have fundamentally different responsibilities and failure modes.

Alternatives considered:

- **Single service class** — one `PublicBuildingService` handles all commands and queries;
  simpler but mixes write concerns (domain validation, event publishing) with read concerns
  (DTO mapping, query delegation)
- **Service-level CQRS split** — two classes: one for commands, one for queries; no
  separate read model or event sourcing
- **Full CQRS** — separate read model, separate read-side repository, eventual consistency;
  unjustified complexity for a single bounded context

## Decision

Use a **service-level CQRS split** with two classes:

- `PublicBuildingAppService` — write side; handles `create`, `addDevice`,
  `changeConsumption`, `changeProduction`; loads the aggregate, runs domain validation,
  calls granular repository methods, publishes domain events
- `PublicBuildingQueryService` — read side; handles `getById`, `getAll`; delegates to
  repository and maps results to DTOs via `BuildingDtoMapper`

This is **lightweight CQRS** — the split is at the service class level only. There is no
separate read model, no separate data store, and no eventual consistency. Both services
use the same `PublicBuildingRepository`.

The split is hidden from the presentation layer by `PublicBuildingFacade` — see ADR-0008.
This mirrors the backend implementation — see backend ADR-0015.

## Consequences

**Positive:**
- Each class has a single axis of change: `AppService` changes when commands change;
  `QueryService` changes when read requirements change
- Both services can be tested independently — `AppService` tests verify domain event
  publishing; `QueryService` tests verify DTO mapping
- Read operations are clearly separated from write operations with their domain validation

**Negative:**
- Two classes to navigate instead of one
- If a command needs to return enriched data (e.g. the created building), it must
  either delegate to `QueryService` internally or duplicate mapping logic — the current
  design returns only the ID from `create()`, consistent with CQRS convention
