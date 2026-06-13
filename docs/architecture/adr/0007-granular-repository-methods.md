# ADR-0007: Granular Repository Methods Instead of Generic save()

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The backend REST API exposes separate endpoints per operation:
- `POST /v1/buildings/:id/devices` — add a device
- `PATCH /v1/buildings/:id/consumption` — change consumption
- `PATCH /v1/buildings/:id/devices/:deviceId/production` — change production rate

A typical DDD repository has a single `save(aggregate)` method. Implementing `save()` here
would require either sending the entire aggregate on every write, or implementing a diff
mechanism to determine which endpoint to call.

Alternatives considered:

- **Generic `save(aggregate)`** — unified interface; requires diff logic or full-aggregate
  PUT; the backend does not expose a full-aggregate PUT endpoint
- **Separate HTTP calls in AppService directly** — bypasses the repository abstraction;
  infrastructure concerns leak into the application layer
- **Granular repository methods** — each operation has a dedicated method that maps to a
  single HTTP endpoint; no diff logic needed

## Decision

`PublicBuildingRepository` declares one method per write operation in addition to the
standard query methods:

```typescript
abstract class PublicBuildingRepository {
  abstract findAll(): Observable<PublicBuilding[]>;
  abstract findById(id: string): Observable<PublicBuilding>;
  abstract save(building: PublicBuilding): Observable<void>;    // POST /buildings (create)
  abstract delete(id: string): Observable<void>;
  abstract addDevice(buildingId: string, device: EnergyDevice): Observable<void>;
  abstract changeConsumption(buildingId: string, energy: Energy): Observable<void>;
  abstract changeProduction(buildingId: string, deviceId: string, energy: Energy): Observable<void>;
}
```

Each method in `PublicBuildingApiService` makes exactly one HTTP call to the corresponding
endpoint. `AppService` still loads the aggregate via `findById()` to run domain validation
before calling the granular method.

## Consequences

**Positive:**
- Each repository method has a 1:1 mapping to a backend endpoint — no diff logic
- Intent is explicit: `changeConsumption()` is more readable than inferring the operation
  from a generic `save()` call
- No risk of accidentally overwriting unrelated fields with a stale aggregate snapshot

**Negative:**
- Repository interface grows with each new operation — not a classic DDD repository
- `findById()` is called before every write solely for domain validation, not for
  the purpose of saving — see ADR-0006 and inline comments in `PublicBuildingAppService`
