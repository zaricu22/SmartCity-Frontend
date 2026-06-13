# ADR-0016: Angular SSR and CSP Headers in server.ts

**Status:** Accepted  
**Date:** 2026-06-13

## Context

The project includes `server.ts` (Angular Universal / `@angular/ssr`), which adds
server-side rendering. SSR pre-renders the initial HTML on the server, improving
Time-to-First-Contentful-Paint and enabling search-engine indexing of dynamic content.

Beyond rendering, `server.ts` is also the entry point for setting HTTP security headers
that browsers cannot set from client-side JavaScript. The most important is
`Content-Security-Policy` (CSP), which restricts which scripts, styles, and connections
the browser will allow.

Alternatives for where to set CSP headers:

- **Reverse proxy (nginx/Caddy)** — correct production approach; headers are set by the
  infrastructure layer; the Angular app has no responsibility; requires deployment config
- **`server.ts` Express middleware** — headers are set in Node.js before SSR; works for
  development and containerized deployments where Express is the outermost server
- **`index.html` `<meta http-equiv="Content-Security-Policy">`** — `<meta>` CSP does not
  support all directives (e.g. `frame-ancestors`) and is a fallback, not a substitute

## Decision

Set CSP and other security headers in **`server.ts` via Express `res.setHeader()`** as
a middleware applied before the Angular Universal engine:

```typescript
// server.ts
server.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +   // unsafe-inline needed for Angular Material styles
    "connect-src 'self' ws://localhost:8080;" // WebSocket for STOMP dev endpoint
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

`'unsafe-inline'` for `style-src` is required because Angular Material and component
encapsulation inject styles dynamically. Removing it would require nonce-based CSP,
which needs SSR cooperation to inject the nonce into both the `<style>` tags and the
CSP header on every request.

**SSR-safety note:** Code that accesses browser APIs (`window`, `document`, `localStorage`)
must be guarded with `isPlatformBrowser()` or run only in `ngOnInit`/event handlers.
`APP_INITIALIZER` runs on both server and browser — the `restoreSession()` HTTP call
uses Angular's `HttpClient`, which is SSR-safe (uses a Node.js fetch polyfill on the
server).

## Consequences

**Positive:**
- Security headers are enforced from the first request — no gap between static file
  serving and the Angular app loading
- CSP is set in source-controlled code alongside the application, not in separate
  deployment config
- SSR also enables meta tag management (`Title`, `Meta` services) for SEO

**Negative:**
- `server.ts` is Node.js / Express code in an Angular project — developers unfamiliar
  with Node.js must maintain it
- `'unsafe-inline'` for `style-src` weakens the CSP; the long-term fix is nonce-based
  CSP with SSR nonce injection, which is more complex
- In production, a reverse proxy should be the authoritative source of security headers;
  `server.ts` headers may be overridden or duplicated if a proxy is added later
