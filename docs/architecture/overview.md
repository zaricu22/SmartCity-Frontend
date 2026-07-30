# Architecture Overview

## Purpose

SmartCity Frontend manages energy consumption and production across public buildings.
Domain: browsing buildings, their energy devices, real-time consumption, and production data.
Built as an architectural reference for **Domain-Driven Design (DDD) with Onion Architecture** applied to Angular 18 standalone components and Signals.

---

## Bounded Contexts

Two bounded contexts:

**asset** — energy domain (DDD/Onion)
```
src/app/asset/
├── domain/          — pure TypeScript, zero Angular/RxJS imports
├── application/     — CQRS, commands, DTOs, facade
├── infrastructure/  — HttpClient adapters, STOMP/SockJS WebSocket bridge (ADR-0025)
└── presentation/    — Angular components, pages, dialogs, routes
```

**auth** — identity and access (flat, no domain layer)
```
src/app/auth/
├── infrastructure/  — AuthService, AuthApiService, authInterceptor, guards
└── presentation/   — LoginComponent, RegisterComponent, CallbackComponent, LogoutButtonComponent
```

```
┌─────────────────────────────────────────────────────┐   ┌─────────────────────────────────────────────────────┐
│           «Bounded Context»                          │   │           «Bounded Context»                          │
│                asset                                 │   │                auth                                  │
│                                                      │   │                                                      │
│  Full DDD / Onion Architecture                       │   │  Flat — no domain model                              │
│                                                      │   │                                                      │
│  Domain:                                             │   │  AuthService  (in-memory token storage)              │
│    PublicBuilding  (Aggregate Root)                  │   │  AuthApiService  (login / register / refresh)        │
│    EnergyDevice    (Entity)                          │   │  authInterceptor  (Bearer + silent refresh)          │
│    Energy          (Value Object)                    │   │  authGuard · loggedInGuard · roleGuard               │
│    SubsidyEligibilitySpecification                   │   │                                                      │
│    Domain Events (3)                                 │   │  Pages:                                              │
│                                                      │   │    /login · /register · /callback                    │
│  Application:                                        │   │                                                      │
│    PublicBuildingAppService  (writes)                │   │                                                      │
│    PublicBuildingQueryService  (reads)               │   │                                                      │
│    PublicBuildingFacade  (single UI entry point)     │   │                                                      │
│                                                      │   │                                                      │
│  Routes:  /assets · /assets/:id                      │   │                                                      │
│                                                      │   │                                                      │
└──────────────────────┬───────────────────────────────┘   └──────────────────────┬───────────────────────────────┘
                       │                                                            │
                       └───────────────── shared ───────────────────────────────────┘
                                  EventBusService  ·  GlobalErrorHandler
                               requestIdInterceptor  ·  httpErrorInterceptor
                                     ToastService  ·  ConfirmDialogService
                                      ShellComponent  ·  Header  ·  Footer
                                       (single Angular deployable — GitHub Pages)
```

Additional bounded contexts (e.g. `balancing`) would be sibling packages under `src/app/` with their own layer structure and ts-arch rules.

---

## Layer Map

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    Infrastructure  ·  Presentation                       ║
║                                                                          ║
║   PublicBuildingApiService      BuildingListComponent                    ║
║   BuildingResponseMapper        BuildingDetailComponent                  ║
║   BuildingWebSocketService      AddDeviceDialogComponent                 ║
║   Request types (4)             ChangeConsumptionDialogComponent         ║
║   Response types                CreateBuildingDialogComponent            ║
║                                 BuildingCardComponent                    ║
║                                 DeviceListComponent                      ║
║                                 EnergyDisplayComponent                   ║
║                                 asset.routes.ts  ·  ASSET_PROVIDERS      ║
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                          Application                                │  ║
║  │                                                                     │  ║
║  │   PublicBuildingAppService  (writes — addDevice, changeConsumption) │  ║
║  │   PublicBuildingQueryService  (reads — getById, getAll)             │  ║
║  │   PublicBuildingFacade  (single injection point for presentation)   │  ║
║  │   AddDeviceCommand  ·  CreateBuildingCommand  (plain interfaces)    │  ║
║  │   ChangeConsumptionCommand  ·  ChangeProductionCommand              │  ║
║  │   PublicBuildingDto  ·  EnergyDeviceDto  ·  BuildingDtoMapper       │  ║
║  │   ApplicationException                                              │  ║
║  │                                                                     │  ║
║  │  ┌───────────────────────────────────────────────────────────────┐  │  ║
║  │  │                           Domain                               │  │  ║
║  │  │                                                                │  │  ║
║  │  │   PublicBuilding  (Aggregate Root)                             │  │  ║
║  │  │   EnergyDevice  (Entity)                                       │  │  ║
║  │  │   Energy  (Value Object)                                       │  │  ║
║  │  │   DeviceAddedEvent  ·  ConsumptionChangedEvent                 │  │  ║
║  │  │   ProductionChangedEvent  ·  DomainEvent  (marker interface)   │  │  ║
║  │  │   PublicBuildingRepository  (abstract class — DI token)        │  │  ║
║  │  │   SubsidyEligibilitySpecification                              │  │  ║
║  │  │   DomainException hierarchy                                    │  │  ║
║  │  └───────────────────────────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════╝
                  Dependencies always point inward  →
```

Dependency rule: outer layers depend on inner layers, never the reverse.
Enforced structurally by ts-arch — see [ADR-0018](adr/0018-ts-arch-ddd-enforcement.md).

---

## Key Domain Concepts

| Concept | Class | Role |
|---|---|---|
| Aggregate root | `PublicBuilding` | Building identity, device collection, consumption invariant |
| Entity | `EnergyDevice` | Unique identity within building, mutable production rate |
| Value object | `Energy` | Immutable value + unit pair, cross-unit comparison via normalization |
| Domain event | `BuildingCreatedEvent`, `DeviceAddedEvent`, `ConsumptionChangedEvent`, `ProductionChangedEvent` | Published after write succeeds, consumed by EventBus → component reload. All four also bridge from backend WebSocket pushes (ADR-0025, ADR-0026) |
| Specification | `SubsidyEligibilitySpecification` | Encapsulates eligibility business rule (≥ 2 devices, > 50 kW, Zone A location); mirrored server-side by `SubsidyEligibilityJpaSpecification` to filter `GET /v1/buildings?eligible=true` (ADR-0024) |

---

## Aggregate Boundary

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           «Aggregate Root»                                    ║
║                            PublicBuilding                                     ║
║                                                                               ║
║   _id: string             _name: string             _location: string         ║
║                                                                               ║
║   _consumption: ───────── «Value Object» ──────────────────────────────────┐ ║
║                            Energy                                           │ ║
║                            _value: number  (validated ≥ 0)                 │ ║
║                            _unit: EnergyUnit  (kW / MW / GW)               │ ║
║                            to(unit) · greaterThan() · lessThan()           │ ║
║                            compareTo() · equals() ─────────────────────────┘ ║
║                                                                               ║
║   _devices: EnergyDevice[]  (getter returns defensive copy)                   ║
║   │                                                                           ║
║   └─── «Entity» ───────────────────────────────────────────────────────────┐ ║
║          EnergyDevice                                                       │ ║
║          _id: string                                                        │ ║
║          _type: DeviceType  (SOLAR · PUMP · BATTERY)                       │ ║
║          _deviceRatedCapacity: Energy  (immutable after creation)           │ ║
║          _productionRate: Energy                                            │ ║
║          changeProduction() — enforces productionRate ≤ ratedCapacity      │ ║
║          equals() on _id only ─────────────────────────────────────────────┘ ║
║                                                                               ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  Invariants enforced at aggregate boundary:                                   ║
║  · addDevice()              — total capacity across all devices ≤ limit       ║
║  · changeConsumption()      — new value must be ≥ 0                          ║
║  · changeDeviceProduction() — productionRate must not exceed ratedCapacity   ║
║                                                                               ║
║  Domain Events (collected, published after HTTP write — never before):        ║
║    DeviceAddedEvent · ConsumptionChangedEvent · ProductionChangedEvent        ║
║    pullEvents() → copy then clear — prevents re-publish  (ADR-0006)          ║
║                                                                               ║
║  Reconstitution bypass  (ADR-0010):                                           ║
║    BuildingResponseMapper uses (building as any)['_field'] cast              ║
║    to populate private fields from HTTP response without triggering           ║
║    constructor validation (database objects are already valid)                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                  │
                  │  PublicBuildingRepository  (abstract class — Angular DI token, ADR-0002)
                  │  implemented by PublicBuildingApiService  (infrastructure)
                  ▼
         HTTP: GET /v1/buildings/{id}   ·   POST /v1/buildings/{id}/devices   ·   PATCH ...
         (never touches a database directly — all state lives on the backend)
```

---

## Route Map

```
/login        LoginComponent       canActivate: loggedInGuard   (lazy chunk)
/register     RegisterComponent    canActivate: loggedInGuard   (lazy chunk)
/callback     CallbackComponent    (none — OAuth2 fragment endpoint)  (lazy chunk)
/forbidden    ForbiddenComponent   (none)  (lazy chunk)
**            NotFoundComponent    (none)  (lazy chunk)

/  ShellComponent — canActivate: authGuard — unauthenticated → /login?returnUrl=<url>
│
├── ""  → redirect to /assets  (pathMatch: full)
│
└── assets/   ASSET_ROUTES  —  providers: ASSET_PROVIDERS  (route-scoped, destroyed on leave)
      │
      ├── ""      BuildingListComponent    canActivate: roleGuard('VIEWER')
      │                                   canDeactivate: unsavedChangesGuard
      │                                   (lazy chunk)
      │
      └── :id     BuildingDetailComponent  canActivate: roleGuard('ADMIN')
                                           canDeactivate: unsavedChangesGuard
                                           (lazy chunk)

Guards:
  authGuard       — unauthenticated → /login?returnUrl=<current>
  loggedInGuard   — already authenticated → /
  roleGuard(role) — ROLE_RANK check: VIEWER=1, ADMIN=2 — insufficient → /forbidden  (ADR-0004)
  unsavedChangesGuard — canDeactivate: calls component.hasUnsavedChanges() → ConfirmDialog  (ADR-0013)
```

---

## Component Tree

```
AppComponent
└── RouterOutlet
    │
    ├── ShellComponent  (/  —  authGuard)
    │   ├── HeaderComponent
    │   │   └── LogoutButtonComponent
    │   ├── RouterOutlet  (child routes)
    │   │   │
    │   │   ├── BuildingListComponent  (/assets  —  roleGuard VIEWER)
    │   │   │   ├── BuildingCardComponent  [building]  × N
    │   │   │   ├── EmptyStateComponent  (when list is empty)
    │   │   │   └── CreateBuildingDialogComponent  (conditional — @if showCreateDialog)
    │   │   │
    │   │   └── BuildingDetailComponent  (/assets/:id  —  roleGuard ADMIN)
    │   │       ├── EnergyDisplayComponent  [value] [unit]
    │   │       ├── DeviceListComponent  [devices]
    │   │       ├── AddDeviceDialogComponent        (conditional — @if showAddDeviceDialog)
    │   │       └── ChangeConsumptionDialogComponent (conditional — @if showChangeConsumptionDialog)
    │   │
    │   └── FooterComponent
    │
    ├── LoginComponent     (/login)
    ├── RegisterComponent  (/register)
    ├── CallbackComponent  (/callback)
    ├── ForbiddenComponent (/forbidden)
    └── NotFoundComponent  (**)

Global overlays (portal-rendered inside ShellComponent via services — outside the router):
    ToastComponent          ← reads ToastService.toasts signal  (auto-dismiss 5 s)
    ConfirmDialogComponent  ← opened by ConfirmDialogService.open() cold Observable  (ADR-0013)
```

---

## Architecture Decisions

All non-obvious design choices are captured as ADRs in [`adr/`](adr/).

| ADR | Decision |
|---|---|
| [0001](adr/0001-ddd-onion-architecture.md) | DDD + Onion Architecture |
| [0002](adr/0002-abstract-class-as-di-token.md) | Abstract class as Angular DI token |
| [0003](adr/0003-in-memory-token-storage.md) | In-memory token storage (never Web Storage) |
| [0004](adr/0004-role-rank-numeric-hierarchy.md) | ROLE_RANK numeric hierarchy for guards |
| [0005](adr/0005-eventbus-reload-pattern.md) | EventBus reload pattern (local + WebSocket → same path) |
| [0006](adr/0006-synchronous-domain-events.md) | Synchronous domain events — published after repository write |
| [0007](adr/0007-granular-repository-methods.md) | Granular repository methods — 1:1 with HTTP endpoints |
| [0008](adr/0008-facade-as-presentation-entry-point.md) | Facade as single presentation entry point |
| [0009](adr/0009-cqrs-split-app-service-query-service.md) | CQRS split — AppService (writes) + QueryService (reads) |
| [0010](adr/0010-reconstitution-bypass-in-response-mapper.md) | Reconstitution bypass in response mapper |
| [0011](adr/0011-domain-enums-shared-across-layers.md) | Domain enums shared across layers (arch-rule exception) |
| [0012](adr/0012-throttletime-instead-of-debouncetime.md) | throttleTime instead of debounceTime for reload triggers |
| [0013](adr/0013-confirm-dialog-cold-observable-pattern.md) | Confirm dialog cold Observable pattern |
| [0014](adr/0014-standalone-components-no-ngmodules.md) | Standalone components — no NgModules |
| [0015](adr/0015-app-initializer-auth-state-restoration.md) | APP_INITIALIZER for auth state restoration |
| [0016](adr/0016-ssr-csp-headers-server-ts.md) | SSR and CSP headers in server.ts |
| [0017](adr/0017-provide-router-testbed-provider-ordering.md) | provideRouter first in TestBed provider ordering |
| [0018](adr/0018-ts-arch-ddd-enforcement.md) | TypeScript architecture tests for DDD enforcement |
| [0019](adr/0019-jest-migration-from-karma.md) | Jest migration from Karma |
| [0020](adr/0020-mutation-testing-on-schedule.md) | Mutation testing on schedule (not every push) |
| [0021](adr/0021-e2e-testing-not-implemented.md) | E2E testing not implemented (Cypress removed) |
| [0022](adr/0022-jwt-refresh-rotating-tokens.md) | JWT refresh with rotating tokens |
| [0023](adr/0023-oauth2-full-page-redirect-and-fragment-callback.md) | OAuth2 full-page redirect and fragment callback |
| [0024](adr/0024-eligible-query-param-server-side-filtering.md) | Server-side eligibility filtering via `eligible` query param |
| [0025](adr/0025-stomp-sockjs-websocket-transport.md) | STOMP over SockJS for real-time building updates |
| [0026](adr/0026-building-created-event-local-only.md) | BuildingCreatedEvent modeled as domain event + `/topic/buildings` WebSocket bridge |
