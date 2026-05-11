import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnergyDisplayComponent } from './energy-display.component';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

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
});
