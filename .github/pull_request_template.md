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
- [ ] `area: frontend`
- [ ] `area: devops`
- [ ] `area: security`

---

## How to Test
<!-- Steps a reviewer should follow to verify this change locally -->
1. 
2. 
3. 

---

## DDD / Architecture Checklist
- [ ] Change is confined to the correct bounded context
- [ ] No domain logic leaked into application/infrastructure layer
- [ ] Domain events raised where appropriate

## Quality Checklist
- [ ] Tested locally
- [ ] New/updated tests included
- [ ] No lint or compiler warnings
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

---

## Screenshots / Notes