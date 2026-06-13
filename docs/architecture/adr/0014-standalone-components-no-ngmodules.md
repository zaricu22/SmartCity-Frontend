# ADR-0014: Standalone Components Without NgModules

**Status:** Accepted  
**Date:** 2026-06-13

## Context

Angular 14 introduced standalone components as a way to declare components, directives,
and pipes without belonging to an `NgModule`. Angular 15 made this stable; Angular 17
made it the recommended default; Angular 18 (used in this project) does not generate
NgModules for new projects at all.

The project started from scratch on Angular 18 — there was no legacy NgModule structure
to migrate from.

Alternatives considered:

- **NgModule-based architecture** — traditional approach; every component, directive,
  and pipe belongs to an `NgModule`; shared items go in `SharedModule`; explicit
  import/export declarations
- **Standalone components** — Angular 18 default; each component declares its own
  `imports` directly; no NgModules; tree-shakeable by default; simpler for lazy loading

## Decision

All components, directives, and pipes in this project use `standalone: true` (or
omit `standalone` since `true` is the default in Angular 18):

```typescript
@Component({
  selector: 'app-building-card',
  standalone: true,
  imports: [CommonModule, RouterModule, EnergyPipe],
  templateUrl: './building-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildingCardComponent { ... }
```

There are **no NgModules** in the project. Lazy loading is handled via routes:

```typescript
// app.routes.ts
{
  path: 'buildings',
  loadChildren: () => import('./asset/asset.routes').then(m => m.ASSET_ROUTES),
}
```

Providers scoped to a feature are declared on the route object via `providers: [...]`
(see ADR-0001 for route-scoped providers).

## Consequences

**Positive:**
- No `SharedModule` that grows to include every shared component — each component
  imports only what it actually uses
- Lazy loading with `loadChildren` is straightforward — no NgModule wrapper needed
- Angular 18 tooling (schematics, `ng generate`) defaults to standalone; no flags needed
- Tree-shaking is more precise — unused components are not pulled in via NgModule imports

**Negative:**
- Each component's `imports` array must include every dependency explicitly — verbose
  compared to a `SharedModule` that re-exports common Angular modules
- Developers familiar with NgModules face a learning curve; `imports` on the component
  vs `imports` in `NgModule` are visually similar but semantically different
- Some third-party libraries still document NgModule-based setup; standalone integration
  may require `importProvidersFrom()` for compatibility
