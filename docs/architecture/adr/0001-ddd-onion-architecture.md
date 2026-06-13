# ADR-0001: DDD + Onion Architecture

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The project serves as both a working Angular application and an educational DDD reference.
The architecture needed to enforce domain purity, make business rules explicit, and
demonstrate correct layer separation in a way that mirrors the backend structure.

Alternatives considered:

- **Plain layered architecture** — `components → services → HTTP` — simple, but domain logic
  leaks into services and components; no clear boundary between business rules and framework code
- **Hexagonal (ports and adapters)** — explicit ports and adapters; more boilerplate than needed
  for a single bounded context
- **Feature-folder structure** — groups by feature, not responsibility; business rules and HTTP
  calls end up in the same folder

## Decision

Apply **Domain-Driven Design (DDD)** with **Onion Architecture**:

```
domain → application → infrastructure
                     → presentation
```

- `domain` — pure TypeScript, zero Angular dependencies; holds all business rules, value
  objects, entities, aggregate root, domain events, specifications, and repository interface
- `application` — orchestrates domain objects, implements use cases; pragmatic CQRS with a
  dedicated `QueryService` for reads and `AppService` for writes; exposes a `Facade` to
  the presentation layer
- `infrastructure` — Angular `HttpClient`-based repository implementation, response mappers
  (Anti-Corruption Layer), WebSocket service
- `presentation` — Angular components, dialogs, pipes, directives; depends only on the Facade

Dependencies point inward only. `domain` knows nothing about Angular, HTTP, or the DOM.

Package structure follows **package-by-bounded-context**: the `asset` context owns its full
vertical slice of all four layers under `src/app/asset/`. Shared infrastructure
(auth, interceptors, EventBus, Toast) lives in `src/app/shared/`.

## Consequences

**Positive:**
- Domain logic is testable without Angular `TestBed`, HTTP mocks, or DOM setup
- Business rules are portable — no framework lock-in at the core
- Clear ownership: adding a feature touches domain → application → infrastructure/presentation
  in sequence
- A second bounded context adds a sibling package, not new modules

**Negative:**
- More files and indirection than a plain Angular service-based app
- Mappers required at every layer boundary (HTTP response ↔ domain, domain ↔ DTO)
- Developers unfamiliar with DDD face a steeper initial learning curve

**Enforcement:** Layer dependency rules can be verified with a static analysis tool — the
backend uses ArchUnit for this; the frontend equivalent would be an ESLint boundary rule.
