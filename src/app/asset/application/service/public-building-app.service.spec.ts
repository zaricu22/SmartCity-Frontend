import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicBuildingAppService } from './public-building-app.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { PublicBuilding } from '../../domain/aggregate/public-building';
import { EnergyDevice } from '../../domain/entity/energy-device';
import { Energy } from '../../domain/value-object/energy';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

describe('PublicBuildingAppService', () => {
  let service: PublicBuildingAppService;
  let repository: jasmine.SpyObj<PublicBuildingRepository>;

  const makeBuilding = () => new PublicBuilding('b-1', 'City Hall', 'Zone A');

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicBuildingRepository>('PublicBuildingRepository', [
      'findById', 'findAll', 'save', 'delete', 'addDevice', 'changeConsumption', 'changeProduction',
    ]);

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
      repository.save.and.returnValue(of(void 0));

      service.create({ name: 'Library', location: 'Zone B' }).subscribe(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
        expect(repository.save).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe('addDevice()', () => {
    it('should fetch building, add device, and persist via repository', (done) => {
      const building = makeBuilding();
      repository.findById.and.returnValue(of(building));
      repository.addDevice.and.returnValue(of(void 0));

      service.addDevice({
        buildingId: 'b-1',
        type: DeviceType.SOLAR,
        ratedCapacityValue: 100,
        ratedCapacityUnit: EnergyUnit.kW,
      }).subscribe(() => {
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        expect(building.devices.length).toBe(1);
        expect(repository.addDevice).toHaveBeenCalledWith('b-1', jasmine.any(EnergyDevice));
        done();
      });
    });
  });

  describe('changeConsumption()', () => {
    it('should fetch building, update consumption, and persist via repository', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(200, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.and.returnValue(of(building));
      repository.changeConsumption.and.returnValue(of(void 0));

      service.changeConsumption('b-1', { consumptionValue: 80, consumptionUnit: EnergyUnit.kW }).subscribe(() => {
        expect(building.consumption.value).toBe(80);
        expect(repository.changeConsumption).toHaveBeenCalledWith('b-1', jasmine.any(Energy));
        done();
      });
    });
  });

  describe('changeProduction()', () => {
    it('should fetch building, update device production, and persist via repository', (done) => {
      const building = makeBuilding();
      building.addDevice(new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW)));
      building.pullEvents();

      repository.findById.and.returnValue(of(building));
      repository.changeProduction.and.returnValue(of(void 0));

      service.changeProduction('b-1', 'd-1', { productionValue: 60, productionUnit: EnergyUnit.kW }).subscribe(() => {
        expect(building.devices[0].productionRate.value).toBe(60);
        expect(repository.changeProduction).toHaveBeenCalledWith('b-1', 'd-1', jasmine.any(Energy));
        done();
      });
    });
  });
});
