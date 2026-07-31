import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnergyDisplayComponent } from './energy-display.component';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

describe('EnergyDisplayComponent', () => {
  let fixture: ComponentFixture<EnergyDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnergyDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnergyDisplayComponent);
  });

  it('should render value and unit', () => {
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('unit', EnergyUnit.kW);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('42');
    expect(text).toContain('kW');
  });

  it('should render MW unit', () => {
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('unit', EnergyUnit.MW);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('MW');
  });

  it('should return the full circumference if ringOffset is read while percent is unbound', () => {
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('unit', EnergyUnit.kW);
    fixture.detectChanges();

    expect(fixture.componentInstance.ringOffset()).toBe(fixture.componentInstance.ringCircumference);
  });

  describe('progress ring', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('value', 42);
      fixture.componentRef.setInput('unit', EnergyUnit.kW);
    });

    it('should not render a ring when percent is not bound', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.energy-display__ring')).toBeNull();
    });

    it('should render a ring when percent is bound, including 0', () => {
      fixture.componentRef.setInput('percent', 0);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.energy-display__ring')).not.toBeNull();
    });

    it('should offset the full circumference at 0 percent (empty ring)', () => {
      fixture.componentRef.setInput('percent', 0);
      fixture.detectChanges();
      expect(fixture.componentInstance.ringOffset()).toBeCloseTo(fixture.componentInstance.ringCircumference);
    });

    it('should offset to 0 at 100 percent (full ring)', () => {
      fixture.componentRef.setInput('percent', 100);
      fixture.detectChanges();
      expect(fixture.componentInstance.ringOffset()).toBeCloseTo(0);
    });

    it('should offset to half the circumference at 50 percent', () => {
      fixture.componentRef.setInput('percent', 50);
      fixture.detectChanges();
      expect(fixture.componentInstance.ringOffset()).toBeCloseTo(fixture.componentInstance.ringCircumference / 2);
    });

    it('should clamp percent above 100 to a full ring', () => {
      fixture.componentRef.setInput('percent', 150);
      fixture.detectChanges();
      expect(fixture.componentInstance.ringOffset()).toBeCloseTo(0);
    });

    it('should clamp negative percent to an empty ring', () => {
      fixture.componentRef.setInput('percent', -20);
      fixture.detectChanges();
      expect(fixture.componentInstance.ringOffset()).toBeCloseTo(fixture.componentInstance.ringCircumference);
    });
  });
});
