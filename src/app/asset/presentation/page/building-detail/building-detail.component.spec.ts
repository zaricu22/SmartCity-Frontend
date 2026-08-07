import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { BuildingDetailComponent } from './building-detail.component';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { ApplicationException } from '../../../application/exception/application.exception';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import { ToastService } from '../../../../shared/presentation/service/toast.service';
import { ConfirmDialogService } from '../../../../shared/presentation/service/confirm-dialog.service';

describe('BuildingDetailComponent', () => {
  let fixture: ComponentFixture<BuildingDetailComponent>;
  let component: BuildingDetailComponent;
  let facade: jest.Mocked<PublicBuildingFacade>;

  const stubDevice: EnergyDeviceDto = {
    id: 'd-1', name: 'Roof Panel', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW,
    productionRateValue: 0, productionRateUnit: EnergyUnit.kW,
  };
  const stubBuilding: PublicBuildingDto = {
    id: 'b-1', name: 'City Hall', location: 'Zone A',
    consumptionValue: 50, consumptionUnit: EnergyUnit.kW, devices: [stubDevice], version: 3,
  };

  beforeEach(async () => {
    facade = {
      getById: jest.fn(),
      delete: jest.fn(),
      addDevice: jest.fn(),
      removeDevice: jest.fn(),
      changeConsumption: jest.fn(),
      getAll: jest.fn(),
      create: jest.fn(),
      changeProduction: jest.fn(),
      connectRealtime: jest.fn(),
      disconnectRealtime: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingFacade>;
    facade.getById.mockReturnValue(of(stubBuilding));

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

  it('should connect real-time updates for this building on init', () => {
    expect(facade.connectRealtime).toHaveBeenCalledWith('b-1');
  });

  it('should disconnect real-time updates when the component is destroyed', () => {
    fixture.destroy();
    expect(facade.disconnectRealtime).toHaveBeenCalled();
  });

  it('should reflect hasDevices computed signal', () => {
    expect(component.hasDevices()).toBe(true);
  });

  describe('consumptionPercent', () => {
    it('should compute consumption as a percent of total device capacity', () => {
      // stubBuilding: consumptionValue 50 kW; stubDevice: ratedCapacityValue 100 kW
      expect(component.consumptionPercent()).toBeCloseTo(50);
    });

    it('should convert mismatched units to kW before dividing', () => {
      facade.getById.mockReturnValue(of({
        ...stubBuilding,
        consumptionValue: 0.5,
        consumptionUnit: EnergyUnit.MW, // 500 kW
        devices: [{ ...stubDevice, ratedCapacityValue: 1, ratedCapacityUnit: EnergyUnit.MW }], // 1000 kW
      }));
      component.load();
      fixture.detectChanges();

      expect(component.consumptionPercent()).toBeCloseTo(50);
    });

    it('should return 0 when the building has no devices (zero total capacity)', () => {
      facade.getById.mockReturnValue(of({ ...stubBuilding, devices: [] }));
      component.load();
      fixture.detectChanges();

      expect(component.consumptionPercent()).toBe(0);
    });

    it('should return 0 if read while the building has not loaded yet', () => {
      facade.getById.mockReturnValue(EMPTY);
      const freshFixture = TestBed.createComponent(BuildingDetailComponent);
      freshFixture.detectChanges();

      expect(freshFixture.componentInstance.consumptionPercent()).toBe(0);
    });
  });

  it('should show add device dialog when button is clicked', () => {
    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).toBeNull();
    fixture.nativeElement.querySelector('.building-detail-page__devices button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).not.toBeNull();
  });

  it('should call facade.addDevice and reload when DEVICE_ADDED event arrives', () => {
    facade.addDevice.mockReturnValue(of(void 0));
    const eventBus = TestBed.inject(EventBusService);
    component.showAddDeviceDialog.set(true);
    fixture.detectChanges();

    const result = { name: 'Backup Battery', type: DeviceType.BATTERY, ratedCapacityValue: 50, ratedCapacityUnit: EnergyUnit.kW };
    component.onAddDevice(result);
    eventBus.publish({ type: 'DEVICE_ADDED', buildingId: 'b-1', deviceId: 'd-test', deviceName: 'Backup Battery', deviceType: DeviceType.BATTERY } as any);

    expect(facade.addDevice).toHaveBeenCalledWith({ ...result, buildingId: 'b-1', version: 3 });
    expect(component.showAddDeviceDialog()).toBe(false);
    expect(facade.getById).toHaveBeenCalledTimes(2);
  });

  it('should call facade.changeConsumption and reload when CONSUMPTION_CHANGED event arrives', () => {
    facade.changeConsumption.mockReturnValue(of(void 0));
    const eventBus = TestBed.inject(EventBusService);
    component.showChangeConsumptionDialog.set(true);
    fixture.detectChanges();

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });
    eventBus.publish({ type: 'CONSUMPTION_CHANGED', buildingId: 'b-1', oldConsumption: null, newConsumption: null } as any);

    expect(facade.changeConsumption).toHaveBeenCalledWith('b-1', {
      consumptionValue: 80,
      consumptionUnit: EnergyUnit.kW,
      version: 3,
    });
    expect(component.showChangeConsumptionDialog()).toBe(false);
    expect(facade.getById).toHaveBeenCalledTimes(2);
  });

  it('should show a success toast when a device is added', () => {
    facade.addDevice.mockReturnValue(of(void 0));
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');

    component.onAddDevice({ name: 'Backup Battery', type: DeviceType.BATTERY, ratedCapacityValue: 50, ratedCapacityUnit: EnergyUnit.kW });

    expect(showSpy).toHaveBeenCalledWith(`Device "Backup Battery" (${DeviceType.BATTERY}) added.`, 'success');
  });

  it('should show an error toast when adding a device fails', () => {
    facade.addDevice.mockReturnValue(throwError(() => new Error('Capacity exceeded')));
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');

    component.onAddDevice({ name: 'Backup Battery', type: DeviceType.BATTERY, ratedCapacityValue: 50, ratedCapacityUnit: EnergyUnit.kW });

    expect(showSpy).toHaveBeenCalledWith('Capacity exceeded', 'error');
    expect(component.errorMessage()).toBe('Capacity exceeded');
  });

  it('should show a success toast when consumption is changed', () => {
    facade.changeConsumption.mockReturnValue(of(void 0));
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });

    expect(showSpy).toHaveBeenCalledWith('Consumption updated.', 'success');
  });

  it('should show an error toast when changing consumption fails', () => {
    facade.changeConsumption.mockReturnValue(throwError(() => new Error('Server error')));
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });

    expect(showSpy).toHaveBeenCalledWith('Server error', 'error');
    expect(component.errorMessage()).toBe('Server error');
  });

  it('should reload the building when a mutation fails with CONCURRENT_MODIFICATION', () => {
    facade.changeConsumption.mockReturnValue(
      throwError(() => new ApplicationException('The resource was modified by another request. Please retry.', 'CONCURRENT_MODIFICATION')),
    );

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });

    // initial load on init + the reload triggered by the conflict
    expect(facade.getById).toHaveBeenCalledTimes(2);
  });

  it('should not reload the building when a mutation fails with a non-conflict error', () => {
    facade.changeConsumption.mockReturnValue(throwError(() => new ApplicationException('Server error')));

    component.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });

    expect(facade.getById).toHaveBeenCalledTimes(1);
  });

  it('should report unsaved changes when a dialog is open', () => {
    expect(component.hasUnsavedChanges()).toBe(false);
    component.showAddDeviceDialog.set(true);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  describe('onDeleteBuilding()', () => {
    it('should delete the building, show a toast, and navigate to the list when confirmed', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(true));
      facade.delete.mockReturnValue(of(void 0));
      const toastService = TestBed.inject(ToastService);
      const showSpy = jest.spyOn(toastService, 'show');
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onDeleteBuilding();

      expect(facade.delete).toHaveBeenCalledWith('b-1', 3);
      expect(showSpy).toHaveBeenCalledWith('Building "City Hall" deleted.', 'success');
      expect(navigateSpy).toHaveBeenCalledWith(['/assets']);
    });

    it('should not delete when the confirmation is declined', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(false));

      component.onDeleteBuilding();

      expect(facade.delete).not.toHaveBeenCalled();
    });

    it('should show an error toast when delete fails', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(true));
      facade.delete.mockReturnValue(throwError(() => new Error('Server error')));
      const toastService = TestBed.inject(ToastService);
      const showSpy = jest.spyOn(toastService, 'show');

      component.onDeleteBuilding();

      expect(showSpy).toHaveBeenCalledWith('Server error', 'error');
    });

    it('should fall back to a generic name in the confirm prompt when the building has not loaded yet', () => {
      facade.getById.mockReturnValue(EMPTY);
      const freshFixture = TestBed.createComponent(BuildingDetailComponent);
      freshFixture.detectChanges(); // ngOnInit → load() → getById() never emits, so building() stays null

      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      const confirmSpy = jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(false));

      freshFixture.componentInstance.onDeleteBuilding();

      expect(confirmSpy).toHaveBeenCalledWith(
        'Delete "this building"? This cannot be undone.',
        { confirmLabel: 'Delete', danger: true },
      );
    });
  });

  describe('onRemoveDevice()', () => {
    it('should remove the device and show a toast when confirmed', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(true));
      facade.removeDevice.mockReturnValue(of(void 0));
      const toastService = TestBed.inject(ToastService);
      const showSpy = jest.spyOn(toastService, 'show');

      component.onRemoveDevice('d-1');

      expect(facade.removeDevice).toHaveBeenCalledWith('b-1', 'd-1', 3);
      expect(showSpy).toHaveBeenCalledWith('Device "Roof Panel" removed.', 'success');
    });

    it('should fall back to a generic name in the toast when the device is not in the loaded building', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(true));
      facade.removeDevice.mockReturnValue(of(void 0));
      const toastService = TestBed.inject(ToastService);
      const showSpy = jest.spyOn(toastService, 'show');

      component.onRemoveDevice('unknown-device-id');

      expect(showSpy).toHaveBeenCalledWith('Device "Device" removed.', 'success');
    });

    it('should not remove the device when the confirmation is declined', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(false));

      component.onRemoveDevice('d-1');

      expect(facade.removeDevice).not.toHaveBeenCalled();
    });

    it('should show an error toast and set errorMessage when removal fails', () => {
      const confirmDialogService = TestBed.inject(ConfirmDialogService);
      jest.spyOn(confirmDialogService, 'confirm').mockReturnValue(of(true));
      facade.removeDevice.mockReturnValue(throwError(() => new Error('Device not found')));
      const toastService = TestBed.inject(ToastService);
      const showSpy = jest.spyOn(toastService, 'show');

      component.onRemoveDevice('d-1');

      expect(showSpy).toHaveBeenCalledWith('Device not found', 'error');
      expect(component.errorMessage()).toBe('Device not found');
    });

    it('should reload when DEVICE_REMOVED event arrives for this building', () => {
      const eventBus = TestBed.inject(EventBusService);

      eventBus.publish({ type: 'DEVICE_REMOVED', buildingId: 'b-1', deviceId: 'd-1', deviceName: 'Roof Panel', deviceType: 'SOLAR' } as any);

      expect(facade.getById).toHaveBeenCalledTimes(2);
    });
  });
});
