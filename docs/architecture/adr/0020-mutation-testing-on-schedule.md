# ADR-0020: Mutation Testing on Schedule, Not Every Push

**Status:** Accepted
**Date:** 2026-06-15

## Context

Code coverage (Karma/Istanbul) reports which lines were *executed* by tests. It does not
verify that tests would actually *catch a bug* if the logic changed. A test that calls a
method but asserts nothing contributes to coverage without providing any protection.

Mutation testing fills this gap: Stryker introduces small logic changes (mutants) into the
source — flipping `>` to `>=`, negating a condition, changing a return value — and verifies
that at least one test fails for each mutant. A surviving mutant means a bug of that shape
would go undetected by the current test suite.

The backend solves this with **PIT** (`mutation-testing.yml`, ADR-0011). The frontend needed
an equivalent for the same domain layer classes.

The problem: Stryker re-runs the test suite once per surviving mutant. Running it on every
push (inside the main CI pipeline) would add several minutes of overhead to every build,
blocking fast developer feedback.

## Decision

Mutation testing runs in a **dedicated workflow** (`.github/workflows/mutation-testing.yml`),
separate from the main CI/CD pipeline, triggered in two ways:
- **Scheduled:** weekly on Monday at 02:00 UTC (`cron: '0 2 * * 1'`) — same cadence as backend
- **Manual:** `workflow_dispatch` for on-demand runs before a release or after major domain refactors

**Tool:** **Stryker** (`@stryker-mutator/core`) with `testRunner: 'jest'`
(`@stryker-mutator/jest-runner`) — the direct JavaScript/TypeScript equivalent of PIT.

### Runner choice — Karma evaluated and rejected

`@stryker-mutator/karma-runner` was evaluated first and rejected for Angular 18: Stryker's
internal `stryker-karma.conf.cjs` only sets `frameworks: ['jasmine']` and never adds
`@angular-devkit/build-angular`, so Angular's webpack never compiles spec files and Karma
runs with 0 tests regardless of `projectType` or `configFile` settings.

`testRunner: 'command'` (`ng test --browsers=ChromeHeadless`) was evaluated next. This
works but forces `coverageAnalysis: 'off'` (no IPC hooks available with a subprocess
runner), meaning all tests run for every mutant. It also requires `inPlace: true` to keep
Angular CLI context, which in turn forces `concurrency: 1` to prevent parallel mutants from
corrupting shared source files.

`testRunner: 'jest'` was chosen: Jest runs in Node.js via jsdom (no browser process),
exposes Istanbul IPC hooks enabling `coverageAnalysis: 'perTest'`, and uses isolated
sandboxes per run (no shared file corruption, no port conflicts).

### Technical blockers encountered during implementation

All blockers below were hit in order during local testing of the first working configuration.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | `No tests found, exiting with code 0` | `testMatch: ['<rootDir>/src/**/*.spec.ts']` in `jest.config.js` resolves `<rootDir>` to the Stryker sandbox path (`C:\...\sandbox-xxx`); on Windows, joining a backslash path with a forward-slash suffix produces a mixed-separator glob (`...\sandbox-xxx/src/**/*.spec.ts`) that matches 0 files | Override `testMatch` in the Stryker jest config with relative patterns (`**/asset/domain/**/*.spec.ts`) resolved against `roots` without path concatenation |
| 2 | `No tests found` despite relative testMatch | `enableFindRelatedTests` defaults to `true`; Stryker uses Jest's `--findRelatedTests` to trace TypeScript import graphs from source files to spec files in the sandbox; graph resolution fails over symlinked `node_modules` | `enableFindRelatedTests: false` — redundant with `coverageAnalysis: 'perTest'` which uses the Istanbul coverage map for the same purpose |
| 3 | `NG0200: Circular dependency in DI` / `document is not defined` in all Angular TestBed tests | Stryker reads `jest.config.js` with `readInitialOptions` before the Jest preset is resolved; `testEnvironment: 'jsdom'` is only in the `jest-preset-angular` preset, not in the raw config file; Stryker's `jest-environment-generic.cjs` wrapper falls back to Node.js, so `document` is never defined | Add explicit `testEnvironment: 'jsdom'` to `jest.config.js`; preset defaults are not visible to Stryker's config reader |
| 4 | Estimated runtime 3h 19min | `testMatch` matched all 149 spec files; presentation and shared component tests use Angular `TestBed` which reloads zone.js + jsdom per Jest invocation (~3–5 s each); static mutants (enums) cannot use `coverageAnalysis: 'perTest'` and run the full suite — 13 static mutants accounted for 43% of estimated runtime | Scope `testMatch` to domain + application specs only; add `ignoreStatic: true` |

### Test exclusions — mirrors backend `<excludedTestClasses>`

The backend explicitly excludes slow integration tests from PIT (`*IntegrationTest`,
`*TransactionalTest`, etc.) because they start a Spring context per mutant. The frontend
equivalent is presentation and shared component tests — they use Angular `TestBed` which
reloads zone.js + jsdom on every per-mutant Jest invocation.

Restricting `testMatch` to domain and application specs only eliminates this overhead and
matches the scope of the mutated source files exactly:

```js
testMatch: [
  '**/asset/domain/**/*.spec.ts',
  '**/asset/application/**/*.spec.ts',
]
```

| Backend exclusion pattern | Frontend equivalent |
|---|---|
| `*IntegrationTest`, `*TransactionalTest` | presentation layer (Angular TestBed, full platform) |
| `*APITest`, `*WireMockTest` | infrastructure layer (HTTP client, interceptors) |
| `*ApplicationTests` | shared component tests (dialog, empty-state) |

### Static mutants — `ignoreStatic: true`

Static mutants are mutations in code that executes at module-load time: enum member values
and top-level `const` initializers. `coverageAnalysis: 'perTest'` cannot apply to them
because the mutation fires before any test runs — there is no "covering test" in the Istanbul
map. Each static mutant forces a full-suite run.

Before `ignoreStatic: true`, 13 static mutants (all in `domain/shared/enums/`) accounted
for an estimated 43% of total runtime despite being 8% of mutants.

Enum member identities are data declarations, not branching logic. Skipping them mirrors
PIT's built-in behaviour of not generating mutants for enum constant declarations.

### Target scope — mirrors backend `<targetClasses>`

| Layer | Paths |
|---|---|
| `domain.aggregate` | `src/app/asset/domain/aggregate/**/*.ts` |
| `domain.entity` | `src/app/asset/domain/entity/**/*.ts` |
| `domain.valueobject` | `src/app/asset/domain/value-object/**/*.ts` |
| `domain.specification` | `src/app/asset/domain/specification/**/*.ts` |
| `domain.shared` | `src/app/asset/domain/shared/**/*.ts` |
| `application.service` | `src/app/asset/application/service/**/*.ts` |
| `application.query` | `src/app/asset/application/query/**/*.ts` |

### Excluded from mutation — mirrors backend `<excludedClasses>`

| Path | Reason |
|---|---|
| `domain/event/` | Pure data carriers — no branching logic |
| `domain/exception/` | Exception constructors only; no invariants |
| `domain/repository/` | Abstract interface; no implementation to mutate |
| `presentation/` | UI rendering; not domain correctness |
| `shared/` | Infrastructure wiring; not domain logic |

### Thresholds — intentionally match backend ADR-0011 values

| Threshold | Value | Meaning |
|---|---|---|
| `break` | 65% | CI exits non-zero below this — same as backend `mutationThreshold` |
| `low` | 65% | Yellow in HTML report (warning zone) |
| `high` | 80% | Green in HTML report (healthy) |

These are a minimum quality floor, not a target ceiling. They match the backend so both
projects share a common baseline. Raise them as the test suite matures.

### Performance — Jest vs Karma for mutation testing

Jest is faster than Karma for regular test runs. For mutation testing the comparison is
more nuanced:

| Dimension | Karma command runner | Jest runner |
|---|---|---|
| Startup model | Browser stays warm; re-runs tests in existing session | Module registry reset per mutant; Angular modules re-initialized |
| Per-test filtering | None — `coverageAnalysis: 'off'` | `coverageAnalysis: 'perTest'` — only covering tests run per mutant |
| Test scope | All tests every mutant | Only domain/application tests; ~2–5 covering tests per domain mutant |

The `coverageAnalysis: 'perTest'` gain only materialises when the per-mutant test subset is
meaningfully smaller than the full suite. Restricting `testMatch` to domain/application specs
ensures this.

## Consequences

**Positive:**
- No browser process in CI — no ChromeHeadless setup step needed
- `coverageAnalysis: 'perTest'` reduces per-mutant test execution to only covering tests
- Scoped `testMatch` eliminates Angular TestBed overhead from mutation runs entirely
- `ignoreStatic: true` removes the dominant runtime bottleneck (43% of estimated time)
- Scope limited to domain + application service — the classes with real invariants to protect

**Negative:**
- A PR that weakens mutation coverage will not fail CI immediately — detected on next
  scheduled run (Monday 02:00 UTC at the latest)
- `ignoreStatic: true` means enum value mutations are not scored
- `testEnvironment: 'jsdom'` must be explicit in `jest.config.js` to prevent Stryker's
  preset-unaware config reader from falling back to Node.js — a hidden coupling between
  the two config files not obvious without reading both together
