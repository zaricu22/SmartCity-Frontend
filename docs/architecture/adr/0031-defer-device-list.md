# ADR-0031: `@defer` for the Device List on Building Detail

**Status:** Accepted (2026-08-07)
**Date:** 2026-08-07

## Context

`DeviceListComponent` was eagerly bundled into `BuildingDetailComponent`'s chunk. Angular
17 added `@defer`, which splits a template fragment into its own lazy-loaded chunk and only
renders it once a trigger condition fires. This was the first use of `@defer` anywhere in
the codebase, so two things needed deciding: which trigger, and how to test it (deferred
content doesn't render synchronously under `fixture.detectChanges()` the way everything
else in this codebase does).

## Decision

**Trigger: `on viewport`.** The device list isn't below a long scroll — on a typical
building detail page it's already in or near the initial viewport — so this doesn't defer
loading by much wall-clock time in the common case. What it does buy: the
`DeviceListComponent` JS is no longer in `building-detail-component`'s eager chunk at all,
confirmed via `ng build`:
```
building-detail-component   15.45 kB   (down from 17.71 kB before this change)
device-list-component        3.16 kB   (new, separate lazy chunk)
```
`on idle` was considered and rejected — the device list is core content for this page, not
a truly deferrable nice-to-have, so waiting for browser idle time (which can be arbitrarily
delayed under load) is the wrong signal. `on viewport` at least ties loading to the user
actually being on this page and this section being relevant.

`@placeholder` reserves layout space (`min-height: 80px`) to avoid a layout jump when the
real content resolves. `@loading (minimum 100ms)` only appears if the chunk genuinely takes
a moment to fetch, avoiding a flash of "Loading…" on fast connections where the chunk is
already cached or resolves near-instantly.

**Testing: explicit resolution via `fixture.getDeferBlocks()`, not real trigger
evaluation.** Angular's `on viewport` trigger polls for `IntersectionObserver` on every
change-detection cycle — and jsdom (this project's test environment) doesn't implement
`IntersectionObserver` at all. Left unhandled, this throws
`ReferenceError: IntersectionObserver is not defined` (caught internally by Angular's
`ErrorHandler`, so tests still pass, but every test that renders `BuildingDetailComponent`
would log this error). Two changes were needed together:

- `setup-jest.ts` gained a minimal `IntersectionObserverStub` (no-op `observe`/`unobserve`/
  `disconnect`) registered on `globalThis` — same pattern already used there for
  `crypto.randomUUID`, which jsdom also doesn't implement. This only silences the internal
  polling; it does **not** make defer blocks resolve.
- The one test that actually asserts on rendered device-list content
  (`building-detail.component.integration.spec.ts`, "should render device list from the
  HTTP response") now explicitly resolves the block:
  ```ts
  const [deviceListBlock] = await fixture.getDeferBlocks();
  await deviceListBlock.render(DeferBlockState.Complete);
  fixture.detectChanges();
  ```
  This is the officially supported Angular testing API for `@defer` — it bypasses whatever
  the real trigger condition is entirely, so it works the same regardless of which trigger
  type a given block uses.

No other existing test needed this — none of them assert on device-list DOM content, only
on the page around it, so the placeholder state (which does render synchronously) was
already sufficient for them to keep passing unmodified.

## Consequences

**Positive:**
- `device-list-component` is now a genuinely separate lazy chunk, not just conceptually
  deferred — verified in the build output, not assumed.
- The `IntersectionObserver` stub is a one-time fix in `setup-jest.ts` — any future
  `@defer (on viewport)` block anywhere in the codebase gets this for free, no repeated
  discovery of the same jsdom gap.
- The explicit defer-block resolution pattern (`getDeferBlocks()` + `.render()`) is now
  precedent for the next test that needs to assert on deferred content.

**Negative:**
- One more thing a contributor needs to know when adding a new `@defer` block with content
  a test asserts on: the placeholder/loading states render for free, but the actual deferred
  content needs the explicit resolution call shown above, or the assertion silently sees
  the placeholder instead and fails with a confusing "0 elements found."
- `on viewport`'s real-world benefit here is modest — this page section is rarely far below
  the fold — so the win is mostly "one fewer component in the eager chunk," not a dramatic
  loading-time improvement. Worth remembering if `@defer` gets reached for again on content
  that's genuinely off-screen, where the benefit would be larger.

**Related:** none — first use of `@defer` in this codebase.
