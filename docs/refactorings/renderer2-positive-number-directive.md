# Refactoring: `Renderer2` instead of direct DOM access

**Where:** `PositiveNumberDirective`

## Before

```ts
export class PositiveNumberDirective {
  private readonly el = inject(ElementRef);

  @HostListener('input')
  onInput(): void {
    const invalid = Number(this.el.nativeElement.value) <= 0;
    this.el.nativeElement.style.borderColor = invalid ? 'red' : '';
  }
}
```

## After

```ts
export class PositiveNumberDirective {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  @HostListener('input')
  onInput(): void {
    const invalid = Number(this.el.nativeElement.value) <= 0;
    this.renderer.setStyle(this.el.nativeElement, 'borderColor', invalid ? 'red' : '');
  }
}
```

## Why it matters

`nativeElement.style.borderColor = ...` assumes a real browser DOM exists. `Renderer2` is
Angular's platform-agnostic abstraction over DOM manipulation, built specifically so
component/directive code doesn't hard-code that assumption — it keeps working under
server-side rendering (no `document`/`window` on the server) or any other non-browser
Angular render target. The directive's own inline comment already flagged this before the
change.

Side effect of touching this file: it had zero test coverage before this change. Added a
spec (4 tests, 100% coverage) while making the fix.

## ADR

None needed — using `Renderer2` over direct DOM access isn't a two-valid-options judgment
call, it's the unambiguous correct practice, and **ADR-0016** already covers this
codebase's general SSR-safety reasoning.
