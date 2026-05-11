import { Directive, ElementRef, HostListener, inject } from '@angular/core';

// Marks an input border red while its numeric value is not strictly positive
@Directive({ selector: '[appPositiveNumber]', standalone: true })
export class PositiveNumberDirective {
  private readonly el = inject(ElementRef);

  @HostListener('input')
  onInput(): void {
    const invalid = Number(this.el.nativeElement.value) <= 0;
    this.el.nativeElement.style.borderColor = invalid ? 'red' : '';
  }
}
