# ADR-0017: provideRouter in TestBed Provider Ordering

**Status:** Accepted  
**Date:** 2026-06-13

## Context

Several components use `ActivatedRoute`, `Router`, or navigation links that require a
router to be present in the Angular testing module. When setting up `TestBed`, the order
and method of providing the router matters.

Issues encountered during test setup:

- Using `RouterTestingModule` (deprecated in Angular 17+): works but imports an NgModule,
  inconsistent with the standalone-component approach (see ADR-0014)
- Using `provideRouter([])` without routes: sufficient for components that only inject
  `Router` or `ActivatedRoute` for reading; fails if the test triggers actual navigation
- Using `provideRouter(routes)` with real routes: correct for integration tests but
  pulls in real guards and lazy-loaded modules — heavyweight for unit tests
- **Provider ordering**: Angular's `TestBed` processes providers in order; if `provideRouter`
  appears after a component provider that itself provides routes, conflicts can arise

## Decision

Use **`provideRouter([])` as the first provider in `TestBed.configureTestingModule`**
for unit tests, supplemented with `ActivatedRoute` stubs where needed:

```typescript
// building-detail.component.spec.ts
TestBed.configureTestingModule({
  imports: [BuildingDetailComponent],
  providers: [
    provideRouter([]),                        // must be first — sets up router infrastructure
    {
      provide: ActivatedRoute,
      useValue: { snapshot: { paramMap: convertToParamMap({ id: 'test-id' }) } },
    },
    { provide: PublicBuildingFacade, useValue: facadeSpy },
  ],
});
```

`provideRouter([])` is placed **first** because it registers `Router`, `UrlSerializer`,
and `ActivatedRoute` as a group. A custom `ActivatedRoute` stub placed after it
overrides the router's default `ActivatedRoute` for that test — correct order is:
router infrastructure first, then overrides.

For tests that need `routerLink` rendering in templates:

```typescript
imports: [ComponentUnderTest, RouterModule],  // RouterModule provides routerLink directive
providers: [provideRouter([])],
```

## Consequences

**Positive:**
- Consistent with standalone-component approach — no NgModules, no `RouterTestingModule`
- `provideRouter([])` is the Angular 17+ recommended approach for unit tests
- Empty route array keeps tests fast — no lazy module loading
- Provider ordering rule (router first, stubs after) is explicit and follows Angular's
  documented override semantics

**Negative:**
- Each spec file that uses routing must repeat the `provideRouter([])` + stub pattern
- `ActivatedRoute` stubs must be kept in sync with what the component actually reads —
  a silent gap (stub provides `id`, component reads `buildingId`) causes tests to pass
  against undefined
- For end-to-end navigation tests, `provideRouter([])` is insufficient; Cypress or
  real route configuration is needed instead
