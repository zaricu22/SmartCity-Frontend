# ADR-0022: JWT Refresh with Rotating Tokens and HttpBackend Bypass

**Status:** Accepted  
**Date:** 2026-06-17

## Context

ADR-0003 established that the access token is stored in an `AuthService` private field to
prevent XSS exposure. That decision carried a known trade-off: the token is lost on page
refresh and the user must re-authenticate.

A second problem remained: the access token expires after 1 hour. Without a renewal
mechanism, the user is hard-logged-out mid-session when it does, even if they are actively
using the application.

Two strategies were considered:

- **Silent refresh via a refresh token** — a longer-lived opaque token issued alongside the
  JWT. When the access token expires (HTTP 401), the interceptor exchanges the refresh token
  for a new access + refresh token pair, then retries the original request transparently.
- **Silent re-login with stored credentials** — store username/password and re-authenticate
  automatically. Ruled out: storing credentials in memory is a higher-severity risk than
  storing a refresh token.

For the refresh token itself, two sub-strategies:

- **Static refresh token** — issued once, valid until an absolute expiry. Simpler, but a
  stolen token can be replayed for its entire lifetime.
- **Rotating refresh token** — each use issues a new token and invalidates the old one
  (single-use). A replayed stolen token is detected at the next legitimate refresh.

## Decision

**1. Rotating refresh tokens stored in memory**

The backend issues a `refreshToken` (UUID, long-lived) alongside every access token. The
frontend stores it in `AuthService` alongside `token`, `role`, and `expiresAt` — in the same
private field pattern as the access token, subject to the same XSS trade-off from ADR-0003.

Every successful refresh issues a new `{ token, refreshToken }` pair; `AuthService.setToken()`
updates both atomically. The old refresh token is consumed and cannot be reused.

**2. Silent refresh in `authInterceptor`**

On HTTP 401, `authInterceptor` attempts a silent refresh before surfacing the error. This is
handled at the interceptor layer, not in `GlobalErrorHandler`, because it is an HTTP transport
concern: the domain layer should never see a 401 caused by token expiry.

**3. `HttpBackend` for the refresh request**

`AuthApiService.refresh()` uses `new HttpClient(HttpBackend)` to bypass all Angular HTTP
interceptors. If it used the normal `HttpClient`, the call would re-enter `authInterceptor`,
which would see no valid access token, attach no Bearer header, get another 401, and attempt
another refresh — an infinite loop.

`AuthApiService.logout()` uses the normal `HttpClient` because `POST /v1/auth/logout`
requires a valid JWT (the backend must know which JTI to revoke).

**4. Best-effort logout via `finalize()`**

`HeaderComponent.logout()` calls `POST /v1/auth/logout` to revoke both tokens server-side,
then unconditionally clears local state via `finalize()`. A network failure during logout
still logs the user out locally — the user is never stuck in a half-authenticated state.

Implicit logout (failed refresh in `authInterceptor`) does **not** call the backend: the
access token is already invalid, so a revocation request would be rejected with another 401.

## Consequences

**Positive:**
- Users are not interrupted mid-session by token expiry
- Rotating tokens detect replay attacks: a stolen refresh token can only be used once
- Refresh token shares the same XSS-safe in-memory storage as the access token

**Negative:**
- Token state (access + refresh) is lost on page refresh — the user must log in again; same
  trade-off as ADR-0003
- Concurrent 401s (multiple requests expiring simultaneously) are not protected against a
  refresh storm: the rotating token is consumed by the first successful refresh, subsequent
  refreshes fail, and the user is logged out. A production fix requires a shared
  `BehaviorSubject` lock in the interceptor
- `new HttpClient(HttpBackend)` instantiates a second `HttpClient` outside DI — necessary
  to break the circular dependency but slightly non-standard
