import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeConsumptionDialogComponent } from './change-consumption-dialog.component';
import type { ChangeConsumptionDialogResult } from './change-consumption-dialog.component';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

describe('ChangeConsumptionDialogComponent', () => {
  let fixture: ComponentFixture<ChangeConsumptionDialogComponent>;
  let component: ChangeConsumptionDialogComponent;
  let confirmSpy: jasmine.Spy;
  let cancelSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeConsumptionDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeConsumptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    confirmSpy = jasmine.createSpy('confirm');
    cancelSpy  = jasmine.createSpy('cancel');
    component.confirm.subscribe(confirmSpy);
    component.cancel.subscribe(cancelSpy);
  });

  it('should emit confirm with current form values on submit', () => {
    component.form.patchValue({ consumptionValue: 120, consumptionUnit: EnergyUnit.MW });
    component.submit();

    expect(confirmSpy).toHaveBeenCalledOnceWith(
      jasmine.objectContaining<ChangeConsumptionDialogResult>({ consumptionValue: 120, consumptionUnit: EnergyUnit.MW }),
    );
  });

  it('should not emit when value is negative', () => {
    // Validators.min(0) — negative value makes form invalid
    component.form.patchValue({ consumptionValue: -1 });
    component.submit();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should allow zero consumption value', () => {
    // Validators.min(0) — zero is valid
    component.form.patchValue({ consumptionValue: 0 });
    component.submit();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit cancel when cancel button is clicked', () => {
    fixture.nativeElement.querySelector('button:first-of-type').click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should expose all energy units for selection', () => {
    expect(component.energyUnits).toContain(EnergyUnit.kW);
    expect(component.energyUnits).toContain(EnergyUnit.MW);
    expect(component.energyUnits).toContain(EnergyUnit.GW);
  });
});
