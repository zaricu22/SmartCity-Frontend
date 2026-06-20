import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceListComponent } from './device-list.component';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

describe('DeviceListComponent', () => {
  let fixture: ComponentFixture<DeviceListComponent>;

  const stubDevices: EnergyDeviceDto[] = [
    { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
    { id: 'd-2', type: DeviceType.PUMP,  ratedCapacityValue: 50,  ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceListComponent);
  });

  it('should render a list item for each device', () => {
    fixture.componentRef.setInput('devices', stubDevices);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.device-list__item').length).toBe(2);
  });

  it('should show the empty message when there are no devices', () => {
    fixture.componentRef.setInput('devices', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No devices added yet.');
  });

  it('should display device type', () => {
    fixture.componentRef.setInput('devices', stubDevices);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SOLAR');
  });

});
