# ADR-0013: Confirm Dialog Cold Observable Pattern

**Status:** Accepted  
**Date:** 2026-06-13

## Context

`ConfirmDialogComponent` needs to signal the user's Yes/No response back to the
caller. The caller (a component method) needs to react to the response in a
RxJS pipeline (e.g. `switchMap(() => this.facade.deleteBuilding(id))`).

Options for bridging an imperative button click to an Observable:

- **Promise** — simple; `async/await` is readable; but the caller is already in an
  RxJS pipeline and mixing Promise + Observable requires `from()` or `.then()` chains
- **Subject** — hot Observable; stays open after the first emit; caller must
  `take(1)` or `first()` to complete the stream after one response
- **`new Observable(subscriber => ...)` wrapping a Subject** — cold Observable that
  completes automatically after one emit; no `take(1)` needed at the call site

## Decision

`ConfirmDialogService.open()` returns a **cold Observable** that emits exactly once
and then completes:

```typescript
// confirm-dialog.service.ts
open(message: string): Observable<boolean> {
  return new Observable<boolean>(subscriber => {
    this.dialogRef = this.dialog.open(ConfirmDialogComponent, { data: { message } });
    this.resolve = (result: boolean) => {    // resolve is the bridge
      subscriber.next(result);
      subscriber.complete();                 // completes after first emit
    };
  });
}

// ConfirmDialogComponent — button click calls resolve()
confirm(): void { this.dialogService.resolve(true); }
cancel():  void { this.dialogService.resolve(false); }
```

The `resolve` function stored on the service is the bridge between the button click
(imperative) and the subscriber (declarative). The Observable is cold — it only
creates the dialog when subscribed; subscribing twice would open two dialogs.

Callers compose naturally in RxJS:

```typescript
this.confirmDialog.open('Delete building?').pipe(
  filter(Boolean),
  switchMap(() => this.facade.delete(id)),
).subscribe();
```

## Consequences

**Positive:**
- The Observable completes after one emit — no `take(1)` required at call sites
- Fits naturally into RxJS pipelines without Promise/Observable bridging
- The dialog is lazy — it is only opened when the returned Observable is subscribed

**Negative:**
- `resolve` is stored as a mutable field on the service — opening two dialogs
  simultaneously would overwrite `resolve`, breaking the first dialog's subscriber
- The cold Observable pattern is unfamiliar to developers used to Promises for dialogs
- If the dialog is closed programmatically (e.g. route change) without clicking a
  button, `resolve` is never called and the Observable never completes — potential leak
  if the subscription is not cleaned up by `takeUntilDestroyed`
