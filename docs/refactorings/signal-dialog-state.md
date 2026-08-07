# Refactoring: `signal(false)` for dialog-visibility state

**Where:** `BuildingDetailComponent`, `BuildingListComponent`

## Before

```ts
showAddDeviceDialog = false;
// ...
this.showAddDeviceDialog = false;
// ...
hasUnsavedChanges(): boolean {
  return this.showAddDeviceDialog || this.showChangeConsumptionDialog;
}
```
```html
<button (click)="showAddDeviceDialog = true">Add Device</button>
@if (showAddDeviceDialog) {
  <app-add-device-dialog (cancelled)="showAddDeviceDialog = false" />
}
```

## After

```ts
showAddDeviceDialog = signal(false);
// ...
this.showAddDeviceDialog.set(false);
// ...
hasUnsavedChanges(): boolean {
  return this.showAddDeviceDialog() || this.showChangeConsumptionDialog();
}
```
```html
<button (click)="showAddDeviceDialog.set(true)">Add Device</button>
@if (showAddDeviceDialog()) {
  <app-add-device-dialog (cancelled)="showAddDeviceDialog.set(false)" />
}
```

## Why it matters

Under `OnPush` change detection, Angular only re-renders a component when specific things
happen — an `@Input()` changes, a template-bound event fires, an `AsyncPipe`'d Observable
emits, or a signal read in the template changes. A plain boolean mutation is none of those;
it's invisible to Angular. It only "worked" before because the assignment happened to sit
inside an RxJS `.subscribe()` callback for an HTTP response, and zone.js patches HTTP
calls — so the view updated as an *accidental side effect* of the network call finishing,
not because of the assignment itself. A signal write is picked up directly by Angular's
reactivity graph regardless of where in the code it happens, so it keeps working even if
that "accidental" trigger path ever goes away (e.g. under zoneless change detection).

## ADR

None needed — this corrects an already-flagged inconsistency (the code's own TODO comment)
to match the signal-based convention already used by sibling state (`isLoading`,
`errorMessage`) in the same classes, not a new decision.
