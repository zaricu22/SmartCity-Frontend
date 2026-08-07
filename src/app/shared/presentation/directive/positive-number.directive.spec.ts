import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositiveNumberDirective } from './positive-number.directive';

@Component({
  standalone: true,
  imports: [PositiveNumberDirective],
  template: `<input type="number" appPositiveNumber />`,
})
class TestHostComponent {}

describe('PositiveNumberDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let input: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  function typeValue(value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should mark the border red when the value is zero', () => {
    typeValue('0');
    expect(input.style.borderColor).toBe('red');
  });

  it('should mark the border red when the value is negative', () => {
    typeValue('-5');
    expect(input.style.borderColor).toBe('red');
  });

  it('should clear the border color when the value is positive', () => {
    typeValue('10');
    expect(input.style.borderColor).toBe('');
  });

  it('should clear the border color after an invalid value becomes valid', () => {
    typeValue('-1');
    expect(input.style.borderColor).toBe('red');

    typeValue('5');
    expect(input.style.borderColor).toBe('');
  });
});
