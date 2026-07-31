# ADR-0025: STOMP over SockJS for Real-Time Building Updates

**Status:** Amended (2026-07-30)
**Date:** 2026-07-30

## Context

`BuildingWebSocketService` existed as a typed skeleton — three RxJS `Subject`s bridged
into `EventBusService` in the constructor, matching the EventBus reload pattern from
ADR-0005 — but `connect()` was fully commented-out pseudocode, `@stomp/stompjs` was not
installed, and nothing in the app ever called `connect()`. `BuildingDetailComponent`
already subscribed to `DEVICE_ADDED` / `CONSUMPTION_CHANGED` / `PRODUCTION_CHANGED` on the
EventBus, but only ever received events published locally after the app's own HTTP writes
(ADR-0006) — a second browser tab could never see another user's change.

The backend (`SmartCity-Backend`) already had the other side fully built:
`WebSocketConfig` registers `/ws` as a STOMP endpoint over SockJS, and
`BuildingWebSocketEventHandler` pushes all three domain events to
`/topic/buildings/{buildingId}/{consumption|devices|production}` via
`SimpMessagingTemplate` whenever `PublicBuildingAppService` publishes them. Only the
frontend transport was missing.

Two questions needed a decision: which client library to use, and how to authenticate
the connection given the app already sends a Bearer JWT on every HTTP call
(ADR-0003 — in-memory token, no cookies).

## Decision

Install `@stomp/stompjs` + `sockjs-client` and implement `connect(buildingId: string)` for
real:

```typescript
this.client = new Client({
  webSocketFactory: () => new SockJS(`${this.apiBaseUrl}/ws`),
  connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  reconnectDelay: 5000,
});
this.client.onConnect = () => {
  this.client.subscribe(`/topic/buildings/${buildingId}/consumption`, ...);
  this.client.subscribe(`/topic/buildings/${buildingId}/devices`, ...);
  this.client.subscribe(`/topic/buildings/${buildingId}/production`, ...);
};
this.client.activate();
```

Key choices:

- **SockJS, not raw `WebSocket`** — matches the backend's `.withSockJS()` registration and
  gets an HTTP-polling fallback for environments that block WebSocket upgrades.
- **`connectHeaders` for auth, not a query string token** — SockJS/STOMP's `CONNECT` frame
  can carry arbitrary headers (unlike a raw `new WebSocket(url)`, which cannot set
  `Authorization`). This is the only viable place to attach the existing in-memory JWT
  without changing the token storage model from ADR-0003. **The backend counterpart is
  not yet built** — there is no `ChannelInterceptor` reading this header on `CONNECT`, so
  the handshake will succeed unauthenticated today; this ADR covers the frontend
  transport only.
- **`connect(buildingId)` called from `BuildingDetailComponent.ngOnInit()`, not app-wide**
  — topics are scoped per building, and `BuildingWebSocketService` is provided in
  `ASSET_PROVIDERS` (route-level), so a fresh client is created on entering
  `/assets/:id` and torn down via `DestroyRef.onDestroy()` calling `disconnect()`
  (`client.deactivate()`) on leaving the route. `BuildingListComponent` is deliberately
  out of scope — it doesn't know in advance which building IDs are on the current page,
  so wiring it up would mean either N per-row subscriptions or a backend-side broadcast
  topic; that's a separate decision, not folded into this change.
- **`isPlatformBrowser` guard on `connect()`** — this app runs Angular Universal SSR
  (ADR-0016) with build-time prerender. SockJS depends on browser-only transports (XHR,
  native `WebSocket`) that don't exist in Node; connecting during SSR/prerender would
  throw. Follows the same guard pattern already used in `AppComponent`'s backend
  health-check ping.
- **Constructor Subject subscriptions now use `takeUntilDestroyed`** — previously a known
  gap (no teardown on the internal `consumptionUpdates$` / `deviceAdded$` /
  `productionUpdates$` subscriptions); fixed while rewriting the same constructor.

## Amendment (2026-07-30): backend auth/CORS confirmed matching; `onStompError` added

The original "Not yet done" list said the backend had no `ChannelInterceptor` for STOMP
`CONNECT` auth and no CORS origin patterns for the SockJS endpoint. Checked later the same day (read-only, no backend changes made): both now exist in
`SmartCity-Backend`, and both match this frontend implementation exactly, with no frontend
changes needed:

- `StompAuthChannelInterceptor` reads `accessor.getFirstNativeHeader("Authorization")` on
  the STOMP `CONNECT` frame and requires the exact `"Bearer <token>"` format — matching
  `connectHeaders: { Authorization: \`Bearer ${token}\` }` byte-for-byte.
- `WebSocketConfig`'s `ALLOWED_ORIGINS` (`http://localhost:4200`,
  `https://zaricu22.github.io`) match this app's two real origins (dev, GH Pages prod)
  exactly.
- `SecurityConfig` explicitly `permitAll()`s `/ws/**` at the HTTP layer with a comment
  pointing at `StompAuthChannelInterceptor` as where auth actually happens — confirming the
  `connectHeaders`-based design this ADR chose was the correct anticipation of the backend
  contract, not a guess that happened to work.

One real gap surfaced during this check and was fixed: the STOMP client had no
`onStompError` handler, so a rejected `CONNECT` (expired/revoked/missing token) failed
silently — `reconnectDelay: 5000` would just retry forever with zero user-visible
feedback. Added `client.onStompError` → `ToastService.show('Real-time updates
unavailable: ' + reason, 'error')`, guarded by a `hasShownConnectionErrorToast` flag reset
on each fresh `connect()` call, so a persistently failing connection surfaces one toast
per connection attempt rather than spamming one every 5 seconds.

`BuildingListComponent` real-time sync — listed as out of scope in the original Decision
— was completed separately; see ADR-0026's amendment for `/topic/buildings` wiring and a
connection-lifecycle bug it surfaced and fixed.

## Consequences

**Positive:**
- `BuildingDetailComponent` and `BuildingListComponent` both receive genuine cross-client
  real-time updates — confirmed working end-to-end, not just architecturally complete.
- No change to the EventBus bridge shape — `ConsumptionChangedEvent` /
  `DeviceAddedEvent` / `ProductionChangedEvent` are published identically whether they
  originated from a local write or a WebSocket push, so every existing subscriber
  (component reload logic, tests) needed no changes.
- SSR/prerender is unaffected — `ng build` produces a clean production build with no
  CommonJS bailout warnings (`sockjs-client` added to `allowedCommonJsDependencies` in
  `angular.json`).
- A rejected STOMP handshake (expired/invalid token) is now visible to the user instead of
  failing silently forever.

**Negative:**
- `reconnectDelay: 5000` is unconditional — there's no backoff cap or max-retry count; a
  page left open against a permanently unreachable backend keeps retrying every 5s
  indefinitely (though now at least the user sees one toast rather than nothing).
- The `onStompError` toast message surfaces the backend's raw STOMP error header
  (`frame.headers['message']`) directly — acceptable today since
  `StompAuthChannelInterceptor` only ever sends generic messages ("Missing Authorization
  header...", "Invalid or expired token", "Revoked token"), but would need sanitizing if
  the backend ever put anything more sensitive in that header.

**Fixed (2026-07-31):** Local dev `environment.ts` `apiBaseUrl` was `http://localhost:8080`,
missing the backend's `server.servlet.contextPath=/SmartCityREST` (active in all Spring
profiles including `dev`) — a pre-existing gap that predated this ADR and affected every
HTTP call against a locally-run backend, not just the WebSocket connection.
`environment.prod.ts` already carried the correct `/SmartCityREST` suffix; `environment.ts`
and the `setup:env` npm script that regenerates it (`package.json`) were updated to match.
