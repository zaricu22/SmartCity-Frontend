# ADR-0004: ROLE_RANK Numeric Hierarchy for roleGuard

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The application has multiple user roles (currently `VIEWER` and `ADMIN`). Route protection
requires "minimum role" semantics: a route that requires `VIEWER` should also be accessible
to `ADMIN`. A guard must decide whether the current user's role satisfies the required role.

Alternatives considered:

- **Flat equality check** — `userRole === requiredRole`; ADMIN cannot access VIEWER routes
  without being explicitly listed; does not scale
- **Explicit allowed-roles array per route** — `canActivate: [roleGuard(['VIEWER', 'ADMIN'])]`;
  every route must enumerate all permitted roles; error-prone when a new role is added
- **Numeric rank map** — assign a number to each role; guard checks `>=`; higher rank
  satisfies all lower requirements automatically

## Decision

Define a `ROLE_RANK` map with numeric values and check `>=` in `roleGuard`:

```typescript
const ROLE_RANK: Record<UserRole, number> = { VIEWER: 1, ADMIN: 2 };

export const roleGuard = (required: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  return auth.hasRole(required) ? true : router.createUrlTree(['/forbidden']);
};

// AuthService
hasRole(required: UserRole): boolean {
  return this.role !== null && ROLE_RANK[this.role] >= ROLE_RANK[required];
}
```

A route that requires `VIEWER` is satisfied by a user with role `ADMIN` (rank 2 ≥ 1).

## Consequences

**Positive:**
- Routes specify a minimum role once — no need to enumerate all permitted roles
- Adding a new role requires only a new entry in `ROLE_RANK` and no route changes
- Mirrors the backend's role hierarchy without duplicating route configuration

**Negative:**
- Roles must form a strict linear order — the numeric model does not support
  multi-dimensional permissions (e.g. `EDITOR` and `AUDITOR` at the same level with
  different capabilities)
- The rank numbers are implicit — a developer must consult `ROLE_RANK` to understand
  the permission hierarchy
