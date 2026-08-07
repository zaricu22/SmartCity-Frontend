# ADR-0030: `@let` for Non-Conditional Repeated Reads — `as` Stays for `@if`-Scoped Values

**Status:** Accepted (2026-08-07)
**Date:** 2026-08-07

## Context

Several templates re-read the same signal call multiple times: `pending()` five times in
`ConfirmDialogComponent` (each with a `!` non-null assertion), `building()` five times in
`BuildingCardComponent`, `sortKey()` four times across sibling `<option>` elements in
`BuildingListComponent`, `errorMessage()` twice in `BuildingDetailComponent`, and
`isLoading()` twice in both `LoginComponent` and `RegisterComponent`. None of this was
broken — Angular signals are cheap to re-read — but it's repetitive, and for
`ConfirmDialogComponent` specifically it meant four `pending()!` non-null assertions
instead of one narrowed local.

Angular 17.2 added `@let` for template-local variables, usable anywhere in a template's
scope, not just inside a conditional block. The codebase already had an established idiom
for a *different* case — `@if (building(); as b)` — binding a value only within the
`@if`'s true branch, with automatic type narrowing.

The two features overlap for one case: a signal whose only uses are entirely inside a
single `@if` block gated on that same signal (e.g. `pending()`in `ConfirmDialogComponent`).
For that case either works, so a rule was needed to avoid arbitrarily mixing both for the
same kind of situation across the codebase.

## Decision

- **Use `@let`** when the repeated value is read outside any single `@if`'s scope, or when
  there's no natural conditional to hang an `as` off at all:
  - `BuildingCardComponent`: `building()` is a required input, always present — wrapping
    the whole card in `@if (building(); as b)` would misleadingly imply it could be absent.
    `@let b = building();` names it without pretending it's conditional.
  - `BuildingListComponent`: `sortKey()` is compared against four sibling `<option>`
    elements with no shared `@if` wrapper.
  - `LoginComponent`/`RegisterComponent`: `isLoading()` drives both a `[disabled]` binding
    and adjacent button text — two sibling bindings, no wrapping conditional.
- **Also use `@let` when the value is both the `@if` condition and needs narrowing inside
  the block** — `ConfirmDialogComponent`'s `pending()` and `BuildingDetailComponent`'s
  `errorMessage()` both fit this: `@let request = pending(); @if (request) { ... }`
  narrows `request` from `T | null` to `T` inside the block exactly like `as` would, but
  reads more naturally when the variable name differs meaningfully from the signal name
  (`request`, not `pending`) and keeps the `@if` condition itself simple to scan.
- **Keep `as`** for `@if (building(); as b)` in `BuildingDetailComponent` — unchanged. It's
  the narrower, correct tool when a value exists only to gate one block's rendering and
  nothing else in the template needs it before or outside that block. Not converted to
  `@let` for the sake of it; there's no duplication to remove there beyond what `as`
  already solves.

No behavior change anywhere — every conversion is template-syntax-only, verified via
`ng build` (AOT template type-checking, including that `@let`-based narrowing type-checks
identically to `as`-based narrowing) and the full Jest suite.

## Consequences

**Positive:**
- Six fewer repeated signal reads across three bounded contexts; four `pending()!`
  non-null assertions removed in `ConfirmDialogComponent`.
- A clear, written rule for the next time this comes up, instead of each contributor
  guessing whether `@let` or `as` is "more correct" for a given template.

**Negative:**
- Two idioms doing overlapping jobs (`@let` + `@if` vs `@if...as`) now coexist in the
  codebase instead of one. Mitigated by writing down the rule here rather than leaving it
  implicit.

**Related:** none — first use of `@let` in this codebase.
