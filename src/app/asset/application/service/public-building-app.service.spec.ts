import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicBuildingAppService } from './public-building-app.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { PublicBuilding } from '../../domain/aggregate/public-building';
import { EnergyDevice } from '../../domain/entity/energy-device';
import { Energy } from '../../domain/value-object/energy';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';
import type { BuildingCreatedEvent } from '../../domain/event/building-created.event';
import type { BuildingDeletedEvent } from '../../domain/event/building-deleted.event';
import type { DeviceRemovedEvent } from '../../domain/event/device-removed.event';

describe('PublicBuildingAppService', () => {
  let service: PublicBuildingAppService;
  let repository: jest.Mocked<PublicBuildingRepository>;

  const makeBuilding = () => new PublicBuilding('b-1', 'City Hall', 'Zone A');

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      addDevice: jest.fn(),
      removeDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingRepository>;

    TestBed.configureTestingModule({
      providers: [
        PublicBuildingAppService,
        { provide: PublicBuildingRepository, useValue: repository },
      ],
    });

    service = TestBed.inject(PublicBuildingAppService);
  });

  describe('create()', () => {
    it('should save a new building and return its id', (done) => {
      repository.save.mockReturnValue(of(void 0));

      service.create({ name: 'Library', location: 'Zone B' }).subscribe(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
        expect(repository.save).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('lets other open views learn a new building was created, including its name and location', (done) => {
      repository.save.mockReturnValue(of(void 0));
      const eventBus = TestBed.inject(EventBusService);

      eventBus.on<BuildingCreatedEvent>('BUILDING_CREATED').subscribe(event => {
        expect(event.name).toBe('Library');
        expect(event.location).toBe('Zone B');
        done();
      });

      service.create({ name: 'Library', location: 'Zone B' }).subscribe();
    });
  });

  describe('delete()', () => {
    it('should look up the building and delete via repository', (done) => {
      repository.findById.mockReturnValue(of(makeBuilding()));
      repository.delete.mockReturnValue(of(void 0));

      service.delete('b-1', 3).subscribe(() => {
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        expect(repository.delete).toHaveBeenCalledWith('b-1', 3);
        done();
      });
    });

    it('lets other open views learn a building was deleted, including its name', (done) => {
      repository.findById.mockReturnValue(of(makeBuilding()));
      repository.delete.mockReturnValue(of(void 0));
      const eventBus = TestBed.inject(EventBusService);

      eventBus.on<BuildingDeletedEvent>('BUILDING_DELETED').subscribe(event => {
        expect(event.buildingId).toBe('b-1');
        expect(event.name).toBe('City Hall');
        done();
      });

      service.delete('b-1', 3).subscribe();
    });
  });

  describe('addDevice()', () => {
    it('should fetch building, add device, and persist via repository', (done) => {
      const building = makeBuilding();
      building.pullEvents(); // drain BUILDING_CREATED from construction — this building represents a pre-existing one
      repository.findById.mockReturnValue(of(building));
      repository.addDevice.mockReturnValue(of(void 0));

      service.addDevice({
        buildingId: 'b-1',
        name: 'Roof Panel',
        type: DeviceType.SOLAR,
        ratedCapacityValue: 100,
        ratedCapacityUnit: EnergyUnit.kW,
        version: 3,
      }).subscribe(() => {
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        expect(building.devices.length).toBe(1);
        expect(repository.addDevice).toHaveBeenCalledWith('b-1', expect.any(EnergyDevice), 3);
        done();
      });
    });
  });

  describe('removeDevice()', () => {
    it('should fetch building, remove device, and persist via repository', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', 'Test Device', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.mockReturnValue(of(building));
      repository.removeDevice.mockReturnValue(of(void 0));

      service.removeDevice('b-1', 'd-1', 3).subscribe(() => {
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        expect(building.devices.length).toBe(0);
        expect(repository.removeDevice).toHaveBeenCalledWith('b-1', 'd-1', 3);
        done();
      });
    });

    it('lets other open views learn a device was removed, including its name and type', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', 'Test Device', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.mockReturnValue(of(building));
      repository.removeDevice.mockReturnValue(of(void 0));
      const eventBus = TestBed.inject(EventBusService);

      eventBus.on<DeviceRemovedEvent>('DEVICE_REMOVED').subscribe(event => {
        expect(event.buildingId).toBe('b-1');
        expect(event.deviceId).toBe('d-1');
        expect(event.deviceName).toBe('Test Device');
        expect(event.deviceType).toBe(DeviceType.SOLAR);
        done();
      });

      service.removeDevice('b-1', 'd-1', 3).subscribe();
    });
  });

  describe('changeConsumption()', () => {
    it('should fetch building, update consumption, and persist via repository', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', 'Test Device', DeviceType.SOLAR, new Energy(200, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.mockReturnValue(of(building));
      repository.changeConsumption.mockReturnValue(of(void 0));

      service.changeConsumption('b-1', { consumptionValue: 80, consumptionUnit: EnergyUnit.kW, version: 3 }).subscribe(() => {
        expect(building.consumption.value).toBe(80);
        expect(repository.changeConsumption).toHaveBeenCalledWith('b-1', expect.any(Energy), 3);
        done();
      });
    });
  });

  describe('changeProduction()', () => {
    it('should fetch building, update device production, and persist via repository', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', 'Test Device', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.mockReturnValue(of(building));
      repository.changeProduction.mockReturnValue(of(void 0));

      service.changeProduction('b-1', 'd-1', { productionValue: 60, productionUnit: EnergyUnit.kW, version: 3 }).subscribe(() => {
        expect(building.devices[0].productionRate.value).toBe(60);
        expect(repository.changeProduction).toHaveBeenCalledWith('b-1', 'd-1', expect.any(Energy), 3);
        done();
      });
    });
  });
});
