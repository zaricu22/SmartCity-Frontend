import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddDeviceDialogComponent, AddDeviceDialogResult } from './add-device-dialog.component';
import { DeviceType } from '../../../application/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

describe('AddDeviceDialogComponent', () => {
  let fixture: ComponentFixture<AddDeviceDialogComponent>;
  let component: AddDeviceDialogComponent;
  let confirmSpy: jasmine.Spy;
  let cancelSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDeviceDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddDeviceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    confirmSpy = jasmine.createSpy('confirm');
    cancelSpy  = jasmine.createSpy('cancel');
    component.confirmed.subscribe(confirmSpy);
    component.cancel.subscribe(cancelSpy);
  });

  it('should disable submit button when capacity is 0', () => {
    // default ratedCapacityValue is 0, which fails Validators.min(0.01)
    const submitBtn = fixture.nativeElement.querySelector('button:last-of-type');
    expect(submitBtn.disabled).toBeTrue();
  });

  it('should enable submit button when capacity is positive', () => {
    component.form.patchValue({ ratedCapacityValue: 100 });
    fixture.detectChanges();
    const submitBtn = fixture.nativeElement.querySelector('button:last-of-type');
    expect(submitBtn.disabled).toBeFalse();
  });

  it('should emit confirm without buildingId on submit', () => {
    component.form.patchValue({ type: DeviceType.BATTERY, ratedCapacityValue: 200, ratedCapacityUnit: EnergyUnit.MW });
    component.submit();

    expect(confirmSpy).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ type: DeviceType.BATTERY, ratedCapacityValue: 200, ratedCapacityUnit: EnergyUnit.MW }),
    );
    const emitted: AddDeviceDialogResult = confirmSpy.calls.mostRecent().args[0];
    expect((emitted as any).buildingId).toBeUndefined();
  });

  it('should not emit when capacity is 0', () => {
    // default value is 0 — form invalid, submit() returns early
    component.submit();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should not emit when capacity is negative', () => {
    component.form.patchValue({ ratedCapacityValue: -5 });
    component.submit();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should emit cancel when cancel button is clicked', () => {
    fixture.nativeElement.querySelector('button:first-of-type').click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should expose all device types for selection', () => {
    expect(component.deviceTypes).toContain(DeviceType.SOLAR);
    expect(component.deviceTypes).toContain(DeviceType.PUMP);
    expect(component.deviceTypes).toContain(DeviceType.BATTERY);
  });

  it('should expose all energy units for selection', () => {
    expect(component.energyUnits).toContain(EnergyUnit.kW);
    expect(component.energyUnits).toContain(EnergyUnit.MW);
    expect(component.energyUnits).toContain(EnergyUnit.GW);
  });
});
