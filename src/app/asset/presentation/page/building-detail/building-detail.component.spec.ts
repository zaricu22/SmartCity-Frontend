import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BuildingDetailComponent } from './building-detail.component';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { DeviceType } from '../../../application/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';

describe('BuildingDetailComponent', () => {
  let fixture: ComponentFixture<BuildingDetailComponent>;
  let component: BuildingDetailComponent;
  let facade: jasmine.SpyObj<PublicBuildingFacade>;

  const stubDevice: EnergyDeviceDto = {
    id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW,
  };
  const stubBuilding: PublicBuildingDto = {
    id: 'b-1', name: 'City Hall', location: 'Zone A',
    consumptionValue: 50, consumptionUnit: EnergyUnit.kW, devices: [stubDevice],
  };

  beforeEach(async () => {
    facade = jasmine.createSpyObj<PublicBuildingFacade>('PublicBuildingFacade', [
      'getById', 'addDevice', 'changeConsumption',
    ]);
    facade.getById.and.returnValue(of(stubBuilding));

    await TestBed.configureTestingModule({
      imports: [BuildingDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PublicBuildingFacade, useValue: facade },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b-1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BuildingDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load building via toSignal and display it', () => {
    expect(facade.getById).toHaveBeenCalledWith('b-1');
    expect(fixture.nativeElement.textContent).toContain('City Hall');
    expect(fixture.nativeElement.textContent).toContain('Zone A');
  });

  it('should reflect hasDevices computed signal', () => {
    expect(component.hasDevices()).toBeTrue();
  });

  it('should show add device dialog when button is clicked', () => {
    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).toBeNull();
    fixture.nativeElement.querySelector('.building-detail-page__devices button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).not.toBeNull();
  });

  it('should call facade.addDevice and reload when DEVICE_ADDED event arrives', () => {
    facade.addDevice.and.returnValue(of(void 0));
    const eventBus = TestBed.inject(EventBusService);
    component.showAddDeviceDialog = true;
    fixture.detectChanges();

    const result = { type: DeviceType.BATTERY, ratedCapacityValue: 50, ratedCapacityUnit: EnergyUnit.kW };
    component.onAddDevice(result);
    eventBus.publish({ type: 'DEVICE_ADDED', buildingId: 'b-1', deviceId: 'd-test', deviceType: DeviceType.BATTERY } as any);

    expect(facade.addDevice).toHaveBeenCalledWith({ ...result, buildingId: 'b-1' });
    expect(component.showAddDeviceDialog).toBeFalse();
    expect(facade.getById).toHaveBeenCalledTimes(2);
  });

  it('should call facade.changeConsumption and reload when CONSUMPTION_CHANGED event arrives', () => {
    facade.changeConsumption.and.returnValue(of(void 0));
    const eventBus = TestBed.inject(EventBusService);
    component.showChangeConsumptionDialog = true;
    fixture.detectChanges();

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });
    eventBus.publish({ type: 'CONSUMPTION_CHANGED', buildingId: 'b-1', oldConsumption: null, newConsumption: null } as any);

    expect(facade.changeConsumption).toHaveBeenCalledWith('b-1', {
      consumptionValue: 80,
      consumptionUnit: EnergyUnit.kW,
    });
    expect(component.showChangeConsumptionDialog).toBeFalse();
    expect(facade.getById).toHaveBeenCalledTimes(2);
  });

  it('should report unsaved changes when a dialog is open', () => {
    expect(component.hasUnsavedChanges()).toBeFalse();
    component.showAddDeviceDialog = true;
    expect(component.hasUnsavedChanges()).toBeTrue();
  });
});
