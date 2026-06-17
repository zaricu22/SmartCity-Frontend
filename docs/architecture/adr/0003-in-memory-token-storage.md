# ADR-0003: In-Memory Token Storage

**Status:** Accepted  
**Date:** 2026-06-13

## Context

After a successful login the application must store the JWT token so that `AuthInterceptor`
can attach it to every outgoing request. The storage location is a security-critical decision.

Alternatives considered:

- **`localStorage`** — survives page refresh; readable by any JavaScript on the page —
  a single XSS vulnerability exposes the token permanently
- **`sessionStorage`** — scoped to the browser tab; same XSS exposure as `localStorage`
- **HTTP-only cookie** — set by the server, not readable by JavaScript; the strongest
  option but requires backend `Set-Cookie` support and CSRF protection
- **In-memory (private field)** — not accessible to injected scripts; lost on page refresh;
  no backend changes required

## Decision

Store the JWT access token **and the rotating refresh token** in private fields of
`AuthService`, never written to any Web Storage API:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private role: UserRole | null = null;
  private expiresAt: number | null = null;
  private refreshToken: string | null = null;
}
```

`APP_INITIALIZER` clears any expired session on page load so the auth guard redirects
cleanly to `/login` on refresh. This is an intentional trade-off: the user must log in
again after a page refresh.

The refresh token (UUID, single-use) is stored by the same in-memory rule. See ADR-0022
for the full rotating-token refresh flow.

## Consequences

**Positive:**
- XSS attacks cannot read the token — it is not accessible via `document.cookie`,
  `localStorage`, or `sessionStorage`
- No backend changes required to implement

**Negative:**
- Both tokens (access + refresh) are lost on page refresh — the user is redirected to
  `/login` every time the page reloads; not acceptable for a production application
- The correct long-term solution is HTTP-only cookies managed by the backend (see backend
  security gaps); this decision is a pragmatic choice for a showcase project
