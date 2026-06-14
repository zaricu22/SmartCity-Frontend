# ADR-0018: TypeScript Architecture Tests for DDD Enforcement

**Status:** Accepted  
**Date:** 2026-06-14

## Context

Onion Architecture rules (domain has no outward dependencies, presentation does not access
domain types directly, etc.) are easy to violate accidentally — a wrong import compiles fine
but breaks the architecture. Code reviews alone are not reliable enough to catch these
violations consistently.

The backend solves this with **ArchUnit** (`DddArchitectureTest.java`, 21 rules) running in a
dedicated CI job — see backend ADR-0002. The frontend needed an equivalent.

Alternatives considered:

- **`eslint-plugin-boundaries`** — ESLint-based, integrates with `ng lint`; rules are
  configuration not code; cannot be structured as a test file mirroring the backend pattern
- **`ts-arch` (npm package)** — ArchUnit-style API for TypeScript; primarily Jest-based;
  not compatible with Karma/ChromeHeadless because filesystem analysis requires Node.js
- **Custom Node.js script** — uses TypeScript's `fs` + regex import analysis; zero
  third-party dependencies beyond `ts-node`; runs as a standalone Node.js process; mirrors
  the backend test file structure with `describe`/`rule` blocks
- **Skipping enforcement** — acceptable for a solo project where violations are unlikely;
  loses the machine-readable architecture document and CI gate

## Decision

Write `src/test/architecture/ddd-architecture.spec.ts` as a **standalone Node.js script**
run via `ts-node`, not through Karma/ChromeHeadless. The file uses Node.js `fs` to read
TypeScript source files, extracts import paths with a regex, and resolves relative imports
to absolute paths for layer boundary checking.

```typescript
// Core approach: resolve relative imports to absolute paths, then check layer membership
function resolveImport(file: string, imp: string): string {
  return imp.startsWith('.') ? path.resolve(path.dirname(file), imp) : imp;
}

function layerImports(sourceDir: string, targetDir: string): string[] {
  for (const file of getFiles(sourceDir))
    for (const imp of getImports(file))
      if (resolveImport(file, imp).startsWith(targetDir))  // violation
```

The script exits with code 1 if any rule is violated — CI fails fast.

A separate `tsconfig.arch.json` (CommonJS module, Node resolution) compiles the spec for
ts-node. The spec is excluded from `tsconfig.spec.json` so Karma does not try to run it
in ChromeHeadless (where `fs` is unavailable).

A dedicated **`architecture` CI job** (JOB 3) runs in parallel with `test` after security
jobs. `code-quality` depends on both `test` and `architecture`, mirroring the backend pipeline.

### All 21 enforced rules

| # | Group | Rule |
|---|---|---|
| 1 | Layer deps | `domain` must not import from `application` |
| 2 | Layer deps | `domain` must not import from `infrastructure` |
| 3 | Layer deps | `domain` must not import from `presentation` |
| 4 | Layer deps | `application` must not import from `infrastructure` |
| 5 | Layer deps | `application` must not import from `presentation` |
| 6 | Layer deps | `infrastructure` must not import from `presentation` |
| 7 | Layer deps | `presentation` must not import from `domain` directly |
| 8 | Layer deps | `presentation` must not import from `infrastructure` directly |
| 9 | Facade | `presentation` must not import from `application/service` (ADR-0008) |
| 10 | Facade | `presentation` must not import from `application/mapper` (ADR-0008) |
| 11 | Domain purity | `domain` must not import from `@angular/core` |
| 12 | Domain purity | `domain` must not import from `rxjs` |
| 13 | App isolation | `application` must not import `HttpClient` (ADR-0007) |
| 14 | Placement | `*Repository` only in `domain/repository` or `infrastructure` |
| 15 | Placement | `*Specification` only in `domain/specification` |
| 16 | Placement | `*Exception` only in `domain/exception` or `application/exception` |
| 17 | Placement | `*Command` only in `application/command` |
| 18 | Placement | `*Dto` only in `application/dto` |
| 19 | Placement | `*Event` classes only in `domain/event` |
| 20 | Naming | Classes in `application/service` must end with `Service` |
| 21 | Naming | Classes in `domain/specification` must end with `Specification` |

### Deliberate exceptions (mirrors backend `ignoreDependency`)

| Exception | Reason |
|---|---|
| `import type` skipped entirely | Type-only imports are erased at compile time — no runtime dependency exists. ArchUnit works on bytecode and never sees them; skipping `import type` aligns the behaviour. |
| `domain/repository` → `rxjs` | `Observable` is Angular's async contract for repository method signatures. No domain logic depends on rxjs. Same rationale as the backend's `webapi → domain.shared` exception for shared-kernel enums. |

### What cannot be enforced (not import-visible)

| Rule | Why |
|---|---|
| No public `set*()` methods in domain | Requires AST method-level analysis |
| `readonly` fields on value objects | Requires AST field modifier check |
| Composition over inheritance | `extends` and `uses` produce the same import — indistinguishable |

## Consequences

**Positive:**
- Layer violations are caught on every push, not in code review
- The comment block in `ddd-architecture.spec.ts` documents what the tests cannot enforce
  (same pattern as backend `DddArchitectureTest.java`) — living architecture document
- Zero runtime dependencies beyond `ts-node` and the already-installed `typescript`
- Architecture job runs in milliseconds — no browser startup, no HTTP, no DB

**Negative:**
- `ts-node` added as a devDependency — small overhead in `npm ci`
- The spec runs in Node.js, not Karma — it does not appear in coverage reports or
  Karma test result counts (149 unit tests + 21 arch rules are separate numbers)
- Import-regex approach cannot detect dynamic imports (`import()`) or barrel re-exports
  that hide the true origin of a symbol — a determined violator can work around it
- Violations in `shared/` are not checked — the rules are scoped to `asset/` only
