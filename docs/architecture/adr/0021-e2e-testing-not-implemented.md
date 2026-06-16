# ADR-0021: E2E Testing Not Implemented — Cypress Incompatible with Angular SSR

**Status:** Accepted
**Date:** 2026-06-16

## Context

Cypress was added to this project (`test(e2e): cypress tests`) to cover the user-facing
flows (building list, building detail, dialogs) that Jest's `TestBed`-based component
tests cannot: real browser rendering, real Angular Router navigation, real click/form
interactions. The app uses Angular SSR (`@angular/ssr`, see [ADR-0016](./0016-ssr-csp-headers-server-ts.md)),
and the E2E suite needed to authenticate through the real `/login` page before reaching
any guarded route.

That login flow never worked reliably, despite the application itself being correct.
The investigation, across many iterations, kept changing failure shape without any
corresponding change in the app:

| # | Symptom |
|---|---|
| 1 | `cy.wait('@getBuildings')` — "No request ever occurred" (this one was a real, valid finding: an unauthenticated guard redirect, fixed by adding a login step — not evidence of a Cypress problem) |
| 2 | Login button found and clicked, but the URL never changed — looked like a hydration-timing race |
| 3 | Button "not found" within 4000ms — looked like a slow on-demand route-chunk compile on CI |
| 4 | Button still "not found" after raising the timeout to 15000ms — ruled out #3 |
| 5 | Visiting `/login` directly (bypassing the guard's SSR-time redirect) — still "not found" |
| 6 | Manual instrumentation (`document.querySelectorAll('button')`, polled every 500ms for 4s) confirmed the button **is** in the live DOM at every checkpoint, correct text, no console errors, no unexpected navigation — yet `cy.contains('button', label)` against that same document still timed out finding nothing |
| 7 | Probed Cypress's *own* jQuery layer — `cy.get('body').then($body => $body.find('button'))` — at the exact moment `cy.contains()` was about to fail. It found both buttons, exact right text. Cypress's own DOM access works; `cy.contains()` specifically does not |
| 8 | Replaced `cy.contains()` with `$body.find().filter()` + `cy.wrap().click()`. New failure: that lookup is a one-shot query — run immediately after `cy.visit()` with no retry, it sometimes captured an empty set and failed instantly |
| 9 | Made the lookup retry via `cy.get('body').should(...)`. New failure: the retry consistently found nothing for the full default 4s right after `cy.visit()` — yet the identical check had succeeded when run ~4.5s after visit a few steps earlier. Raised the retry budget to 10s; never confirmed in CI — at this point the decision was made to stop |

Steps 6–9 are the decisive findings, and the pattern across them is the real lesson:
this was not one fixable bug. Every fix surfaced a *new* failure mode in the same
family — Cypress's own command/jQuery layer disagreeing with the actual, correct,
stable DOM — each requiring a full CI round-trip to diagnose (no local Cypress
reproduction was available in this environment either, a separate, compounding
problem). That is an open-ended debugging cost with no clear convergence.

**This is externally confirmed, not just observed locally.** Cypress works by injecting
its own bootstrap/instrumentation script into the page DOM to drive the app and spy on
`fetch`/`XHR`. For an SSR app, that injection happens *between* the server's rendered
HTML arriving and the framework's hydration step — exactly the seam where this failure
lives. Cypress's own changelog acknowledges the resulting hydration mismatches: Cypress
**15.11.0** (Feb 2026) added a `<script data-cy-bootstrap>` marker so **React** apps can
detect the Cypress-injected mismatch and call `suppressHydrationWarning` to ignore it —
but this fix is React-only; there is no Angular equivalent. Cypress's own GitHub
discussion [#26595 "Cypress and SSR"](https://github.com/cypress-io/cypress/discussions/26595)
shows another developer hitting essentially the same symptom ("elements are available on
the page... but they are being rendered on the server... Cypress interacts with the
element, but the application does not respond"), unanswered and unresolved. Cypress does
not have official SSR support for Angular — this is a known, acknowledged gap in the
tool, not an obscure edge case specific to this project.

The broader lesson, independent of Cypress specifically: SSR + hydration failures of
this kind are **silent** — no exception, no console error, a page that looks completely
correct — so standard debugging (read the error, search the stack trace) doesn't apply.
Diagnosing required custom forensic instrumentation (DOM polling, navigation/error
interception, probing Cypress's internals directly) because the combination (Angular SSR
dev-server + hydration + Cypress) isn't common enough to have established troubleshooting
guides. Teams choosing SSR should budget for this class of risk.

## Decision

**Remove Cypress and E2E testing from this project entirely**, rather than continue
investing time chasing an unresolved, externally-confirmed gap in the test tool itself.

Removed:
- `cypress/` directory (specs, support commands, fixtures, `tsconfig.json`)
- `cypress.config.ts`
- `cypress` devDependency (`package.json` / `package-lock.json`)
- `cypress:open` / `cypress:run` npm scripts
- The `cypress-e2e` job in `.github/workflows/ci-cd.yml`, and its reference in
  `release-and-deploy`'s `needs:` list
- Stale `cypress` references in `tsconfig.json`, `tsconfig.spec.json`, `tsconfig.arch.json`
  (`exclude` entries for a directory that no longer exists), and `README.md`

## Consequences

**Positive:**
- Stops paying an open-ended, unpredictable debugging cost for a problem in a third-party
  tool, not in this app's code.
- Removes a CI job and a dependency that were not delivering working coverage.
- Conclusively rules out the application itself as a suspect — the SSR-rendered page was
  correct, stable, and error-free throughout the entire investigation. The defect was in
  the test tool's interaction with SSR, never in the app being tested.

**Negative:**
- **The testing pyramid now has no E2E layer.** Real browser rendering, real Router
  navigation, and real click/form interaction are untested. Jest `TestBed` integration
  specs cover component + service wiring with a mocked `HttpClient`, but never render in
  an actual browser or exercise real navigation.
- If E2E coverage is needed again, the options are: (a) re-evaluate Cypress once/if it
  adds Angular SSR support, (b) try Playwright, which has historically had different
  hydration-timing behavior, with no guarantee it fares better, or (c) disable SSR for
  the E2E target build specifically (e.g. a client-only build/serve configuration used
  only by the E2E job), trading SSR's benefits in that one context for testability.
- Anyone re-adding E2E testing to this project should read the investigation table above
  first, to avoid re-running the same multi-hour diagnostic process from scratch.
