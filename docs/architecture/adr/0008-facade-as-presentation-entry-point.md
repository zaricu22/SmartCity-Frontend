# ADR-0008: Facade as Single Presentation Entry Point

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The application layer is split into `PublicBuildingAppService` (write) and
`PublicBuildingQueryService` (read) — see ADR-0009. Presentation components need access
to both. Without a facade, each component would inject two services and be aware of the
CQRS split.

Alternatives considered:

- **Inject AppService + QueryService directly in components** — components are aware of
  the CQRS split; changing the application layer structure requires updating all components
- **Single application service** — no CQRS split; simpler but loses the clarity of
  separating read and write responsibilities
- **Facade** — thin delegation layer that hides the split; components inject one class and
  call intention-revealing methods

## Decision

`PublicBuildingFacade` is the **only class that presentation components may inject**:

```typescript
// facade/public-building.facade.ts
@Injectable()
export class PublicBuildingFacade {
  constructor(
    private readonly appService: PublicBuildingAppService,
    private readonly queryService: PublicBuildingQueryService,
  ) {}

  // Queries
  getAll(): Observable<PublicBuildingDto[]> { return this.queryService.getAll(); }
  getById(id: string): Observable<PublicBuildingDto> { return this.queryService.getById(id); }

  // Commands
  addDevice(cmd: AddDeviceCommand): Observable<void> { return this.appService.addDevice(cmd); }
  // ...
}
```

The facade also centralises error mapping — `ApplicationException` domain errors are
preserved with their error code so the UI can react to specific violations.

## Consequences

**Positive:**
- Components are thin — they call `facade.addDevice()`, not `appService.addDevice()`
- The CQRS split is an implementation detail invisible to the presentation layer
- Adding a new use case requires only a new method on the facade, not changes to all
  consuming components

**Negative:**
- Extra indirection layer — a stack trace goes through facade → service → repository
- The facade is a delegation-only class; if it grows logic, it becomes a service itself
