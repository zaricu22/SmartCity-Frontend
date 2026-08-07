import { Directive, ElementRef, HostListener, Renderer2, inject } from '@angular/core';

// Marks an input border red while its numeric value is not strictly positive
@Directive({ selector: '[appPositiveNumber]', standalone: true })
export class PositiveNumberDirective {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  @HostListener('input')
  onInput(): void {
    const invalid = Number(this.el.nativeElement.value) <= 0;
    this.renderer.setStyle(this.el.nativeElement, 'borderColor', invalid ? 'red' : '');
  }
}
