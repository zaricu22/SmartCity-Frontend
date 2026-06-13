# ADR-0002: Abstract Class as Angular DI Token

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The Dependency Inversion Principle requires that the application layer depend on an
abstraction for the repository, not on the concrete HTTP implementation. In Java/Spring,
an `interface` is the natural choice. In TypeScript, interfaces are erased at runtime —
Angular's dependency injection system cannot use them as tokens.

Alternatives considered:

- **`InjectionToken<PublicBuildingRepository>`** — works at runtime but requires a separate
  token constant and a `useClass` provider; the type system does not enforce that the
  provided class satisfies the contract
- **Concrete class as token** — presentation/application would depend directly on
  `PublicBuildingApiService`; violates DIP and couples the domain to Angular's `HttpClient`
- **Abstract class as token** — TypeScript emits a real constructor for abstract classes,
  making them valid Angular DI tokens; methods can be declared abstract to enforce the contract

## Decision

Declare `PublicBuildingRepository` as an **abstract class** in the domain layer:

```typescript
// domain/repository/public-building.repository.ts
export abstract class PublicBuildingRepository {
  abstract findAll(): Observable<PublicBuilding[]>;
  abstract findById(id: string): Observable<PublicBuilding>;
  // ...
}
```

The infrastructure layer provides the implementation:

```typescript
// infrastructure/api/service/public-building-api.service.ts
@Injectable()
export class PublicBuildingApiService extends PublicBuildingRepository { ... }
```

The provider wires them:

```typescript
{ provide: PublicBuildingRepository, useClass: PublicBuildingApiService }
```

Application services and the facade inject `PublicBuildingRepository` — they never import
`PublicBuildingApiService` or any infrastructure type.

## Consequences

**Positive:**
- Dependency inversion is enforced at compile time — TypeScript will error if the
  implementation does not satisfy all abstract method signatures
- Angular DI resolves the token correctly at runtime without a separate `InjectionToken`
- Application layer remains free of Angular and HTTP dependencies

**Negative:**
- Abstract class is a slightly unusual pattern for a "repository interface" — developers
  expect a TypeScript `interface`, not a class
- Extending a class couples the implementation to the abstract class's constructor chain;
  this is harmless here since the abstract class has no constructor logic
