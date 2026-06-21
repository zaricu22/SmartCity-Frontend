# ADR-0023: OAuth2 Authorization with Full-Page Redirect and Fragment Callback

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Adding Google OAuth2 as a second authentication path introduced three distinct decisions:
how to initiate the authorization flow, how the backend hands the resulting JWT back to
the SPA, and how the SPA reads that token from the callback URL.

**Initiating the flow:**
The OAuth2 authorization endpoint (`/oauth2/authorization/google`) is served by the backend,
not the Angular app. Angular Router's `navigate()` and `navigateByUrl()` match paths against
the declared `Routes` array — they cannot resolve an external URL and would silently fail or
throw. A mechanism that hands control to the browser's navigation engine is required.

**Token handoff to the SPA:**
After Google redirects the browser back, the backend must pass the JWT to Angular. Three options:

- **Query parameter** (`/callback?token=JWT`) — the token appears in the URL bar, is recorded
  in server access logs, and leaks via the `Referer` header on subsequent navigations.
- **POST to a short-lived code endpoint** — the SPA exchanges a one-time code for a token;
  adds a round-trip and requires ephemeral code storage on the backend.
- **URL fragment** (`/callback#token=JWT`) — the browser never sends the fragment to any
  server (not in the HTTP request, not in `Referer`); proxies and access logs never see it.

**Reading the fragment inside Angular:**
Two options once `/callback` activates:

- **`inject(ActivatedRoute).fragment`** — emits as an Observable; designed for components
  that need to react to the fragment changing across multiple navigation events.
- **`window.location.hash`** — a synchronous, imperative read available immediately in
  `ngOnInit`; no subscription, no teardown needed.

## Decision

**1. `window.location.href` to initiate the OAuth2 flow**

`LoginComponent.loginWithGoogle()` assigns `window.location.href` directly to the
backend authorization URL (`{API_BASE_URL}/oauth2/authorization/google`). This triggers a
full browser navigation — the only mechanism that can reach an external URL outside the
Angular router.

**2. URL fragment for token handoff**

The backend `OAuth2SuccessHandler` redirects to:

```
{frontendCallbackUrl}#token=JWT&role=VIEWER&expiresInMs=3600000&refreshToken=...
```

The fragment is chosen because the browser guarantees that fragment data is never included
in HTTP requests. No server, proxy, or CDN log ever sees the token. The `role`, `expiresInMs`,
and `refreshToken` are included alongside `token` so `CallbackComponent` can call
`AuthService.setToken()` with the same signature as a regular credential login — no
additional HTTP call required after the redirect lands.

**3. `window.location.hash` for synchronous fragment parsing**

`CallbackComponent.ngOnInit()` reads `window.location.hash.slice(1)` and parses it with
`URLSearchParams`. `ActivatedRoute.fragment` is an Observable suited for components that
react to fragment changes over time. `CallbackComponent` reads the hash exactly once and
immediately navigates away — a synchronous read avoids a subscription with a corresponding
teardown and is sufficient for a component with a single one-shot responsibility.

**4. No route guard on `/callback`**

`/callback` carries neither `authGuard` nor `loggedInGuard`. The OAuth2 redirect arrives
with no valid in-memory access token: the browser has left and returned, discarding all
JavaScript state (see ADR-0003). `loggedInGuard` would redirect a user with an active
session to `/` before the new token is processed; `authGuard` would redirect an
unauthenticated user to `/login`, breaking re-authentication via OAuth2 for users whose
previous session expired. The component's own validation (non-null token, role, expiresInMs)
is the only gate needed.

## Consequences

**Positive:**
- The JWT never appears in server access logs, browser history query strings, or `Referer`
  headers — stronger transport security than a query parameter approach.
- `CallbackComponent` is stateless and synchronous — minimal surface area, easy to audit.
- The OAuth2 authentication path produces the same in-memory token state as credential
  login; no divergence in `AuthService` or downstream interceptors.

**Negative:**
- `window.location.href` causes a full page reload, discarding all in-memory state
  (including any in-flight HTTP requests). This is unavoidable for the OAuth2 flow given
  ADR-0003's in-memory storage: the access token is always lost during the redirect.
- `window.location.hash` bypasses Angular's routing layer. If `HashLocationStrategy` were
  ever adopted (routes expressed as `/#/path`), the router's own use of `#` would conflict
  with the fragment token parsing in `CallbackComponent`.
- The `/callback` route is publicly reachable with no guard. A user who navigates to
  `/callback` directly (no fragment) is redirected to `/login` by the component's null
  check, but the route itself cannot be locked down at the routing layer.
