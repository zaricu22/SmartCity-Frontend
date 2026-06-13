# ADR-0015: APP_INITIALIZER for Auth State Restoration

**Status:** Accepted  
**Date:** 2026-06-13

## Context

On a hard refresh (F5), the browser discards JavaScript memory. If the auth token is
stored in memory (see ADR-0003), the user appears unauthenticated even though their
session may still be valid on the server.

The application must attempt to restore auth state before any routing or rendering
happens, so that:

1. Protected routes correctly redirect unauthenticated users to `/login`
2. The navigation bar renders the correct logged-in/logged-out state immediately
3. An authenticated user refreshing on a protected page does not see a flash of the
   login redirect before auth state is restored

Options for when to run the auth-check:

- **In the component** — `AppComponent.ngOnInit()` calls the auth endpoint; too late —
  the router has already activated the route and guards have already run
- **In the router guard** — guard calls the auth endpoint on every navigation; correct
  for initial navigation but adds latency on every route change; logic must be in every
  guard
- **`APP_INITIALIZER`** — Angular hook that runs before bootstrapping completes;
  guards and routing start only after all initializers resolve

## Decision

Register an `APP_INITIALIZER` factory in `app.config.ts` that calls `AuthService.restoreSession()`:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => () => authService.restoreSession(),
      deps: [AuthService],
      multi: true,
    },
  ],
};

// auth.service.ts
restoreSession(): Observable<void> | Promise<void> {
  return this.http.get<AuthResponse>('/v1/auth/me').pipe(
    tap(response => this.setToken(response.token)),
    catchError(() => of(undefined)), // session expired or no session — not an error
    map(() => undefined),
  );
}
```

The `useFactory` receives `deps` as arguments and must return a **function** (the
initializer), not the Observable directly. Angular calls this function and waits for
the returned Observable or Promise to complete before continuing.

`catchError` ensures a failed `/auth/me` call (e.g. 401) does not block bootstrap —
an unauthenticated user is a valid application state, not an initialization failure.

## Consequences

**Positive:**
- Auth state is always resolved before the first route guard runs — no flash of
  redirect for authenticated users on refresh
- Centralised: one place handles session restoration for the entire application
- `APP_INITIALIZER` is Angular's official boot-time hook — no lifecycle hack needed

**Negative:**
- Every bootstrap is blocked by an HTTP round-trip to `/auth/me` — adds latency to
  the initial page load even for unauthenticated routes
- If the auth server is slow or unavailable, the entire application is blocked until
  the timeout or error; the `catchError` mitigates this but adds a UX delay
- The `useFactory` factory-of-a-factory syntax is unintuitive and commonly mis-implemented
