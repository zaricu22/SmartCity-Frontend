# Refactoring: `@let` for repeated template reads

**Where:** `ConfirmDialogComponent`, `BuildingCardComponent`, `BuildingListComponent`,
`BuildingDetailComponent`, `LoginComponent`, `RegisterComponent`

## Before

```html
<!-- pending() read 5x, each with a non-null assertion -->
@if (pending()) {
  <div class="dialog confirm-dialog">
    <p>{{ pending()!.message }}</p>
    <button [class.btn--danger]="pending()!.danger" (click)="respond(true)">
      {{ pending()!.confirmLabel }}
    </button>
  </div>
}
```

## After

```html
@let request = pending();
@if (request) {
  <div class="dialog confirm-dialog">
    <p>{{ request.message }}</p>
    <button [class.btn--danger]="request.danger" (click)="respond(true)">
      {{ request.confirmLabel }}
    </button>
  </div>
}
```

## Why it matters

Re-reading the same signal repeatedly in a template is redundant, and when the value is
nullable it means repeating a `!` non-null assertion at every use site instead of narrowing
the type once. `@let` names the value a single time; everywhere after just uses the name.
It's Angular 17.2+ syntax — first use of it anywhere in this codebase.

The trickier part was knowing *when* to reach for `@let` versus the codebase's existing
`@if (x(); as y)` idiom, since they overlap for one case (a value that's both the `@if`
condition and needs narrowing inside it).

## ADR

**ADR-0030** — full reasoning for the `@let` vs `as` rule applied across all six templates.
