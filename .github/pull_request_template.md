## Summary
<!-- One paragraph: what changed and why. -->

Closes #<!-- issue number -->

---

## Type of Change
- [ ] `type: bug` — fix
- [ ] `type: feature` — new functionality
- [ ] `type: refactor` — no functional change
- [ ] `type: chore` — dependency update, tooling, cleanup
- [ ] `type: docs` — documentation only
- [ ] `type: release` — version tag, deployment

## Area
- [ ] `area: backend`
- [ ] `area: config`
- [ ] `area: database`
- [ ] `area: devops`
- [ ] `area: docs`
- [ ] `area: frontend`
- [ ] `area: security`
- [ ] `area: testing`

---

## How to Test
<!-- Steps a reviewer should follow to verify this change locally -->
1. 
2. 
3. 

---

## DDD / Architecture Checklist *(delete if devops / docs / config PR)*
- [ ] Change is confined to the correct bounded context
- [ ] No domain logic leaked into application/infrastructure layer
- [ ] Domain events raised where appropriate
- [ ] Facade is the only entry point from presentation to the application layer — no direct `AppService` or `QueryService` imports in presentation (ADR-0008)
- [ ] Domain events emitted only after repository operation succeeds, not before
- [ ] `HttpClient` used only in infrastructure layer — not in application or domain (ADR-0007)

## Quality Checklist
- [ ] Tested locally
- [ ] New/updated tests included
- [ ] Architecture tests pass locally (`npm run test:arch`)
- [ ] No lint or compiler warnings
- [ ] No `console.log` statements left in code
- [ ] No secrets committed

## Backend *(delete if frontend PR)*
- [ ] DB migrations are backward-compatible
- [ ] API contract unchanged or versioned

## Frontend *(delete if backend PR)*
- [ ] Renders correctly on mobile and desktop
- [ ] Change detection strategy respected (OnPush + signals — no plain booleans for mutable state)
- [ ] All subscriptions cleaned up with `takeUntilDestroyed`
- [ ] No new `any` casts (or documented if unavoidable, e.g. reconstitution bypass)
- [ ] Lazy loading not broken — no new components imported eagerly in `app.config.ts`
- [ ] SSR-safe — no direct `window`/`document` access without `isPlatformBrowser` guard
- [ ] Auth token not stored in `localStorage`/`sessionStorage` — use `AuthService.setToken()` only
- [ ] `inject()` used instead of constructor DI

---

## Screenshots / Notes