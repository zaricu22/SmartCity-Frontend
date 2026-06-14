import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicBuildingFacade } from './public-building.facade';
import { PublicBuildingAppService } from '../service/public-building-app.service';
import { PublicBuildingQueryService } from '../service/public-building-query.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { PublicBuildingDto } from '../dto/public-building.dto';

describe('PublicBuildingFacade', () => {
  let facade: PublicBuildingFacade;
  let appService: jest.Mocked<PublicBuildingAppService>;
  let queryService: jest.Mocked<PublicBuildingQueryService>;

  const stubDto: PublicBuildingDto = {
    id: 'b-1', name: 'Hall', location: 'Zone A',
    consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [],
  };

  beforeEach(() => {
    appService = {
      create: jest.fn(),
      addDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingAppService>;

    queryService = {
      getAll: jest.fn(),
      getById: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingQueryService>;

    TestBed.configureTestingModule({
      providers: [
        PublicBuildingFacade,
        { provide: PublicBuildingAppService, useValue: appService },
        { provide: PublicBuildingQueryService, useValue: queryService },
        { provide: PublicBuildingRepository, useValue: {} },
      ],
    });

    facade = TestBed.inject(PublicBuildingFacade);
  });

  it('getAll() delegates to queryService', (done) => {
    queryService.getAll.mockReturnValue(of([stubDto]));
    facade.getAll().subscribe(dtos => {
      expect(queryService.getAll).toHaveBeenCalled();
      expect(dtos[0].id).toBe('b-1');
      done();
    });
  });

  it('getById() delegates to queryService', (done) => {
    queryService.getById.mockReturnValue(of(stubDto));
    facade.getById('b-1').subscribe(dto => {
      expect(queryService.getById).toHaveBeenCalledWith('b-1');
      expect(dto.id).toBe('b-1');
      done();
    });
  });

  it('create() delegates to appService', (done) => {
    appService.create.mockReturnValue(of('new-id'));
    facade.create({ name: 'Hall', location: 'Zone A' }).subscribe(id => {
      expect(appService.create).toHaveBeenCalled();
      expect(id).toBe('new-id');
      done();
    });
  });

  it('addDevice() delegates to appService', (done) => {
    appService.addDevice.mockReturnValue(of(void 0));
    const cmd = { buildingId: 'b-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW };
    facade.addDevice(cmd).subscribe(() => {
      expect(appService.addDevice).toHaveBeenCalledWith(cmd);
      done();
    });
  });

  it('changeConsumption() delegates to appService', (done) => {
    appService.changeConsumption.mockReturnValue(of(void 0));
    const cmd = { consumptionValue: 50, consumptionUnit: EnergyUnit.kW };
    facade.changeConsumption('b-1', cmd).subscribe(() => {
      expect(appService.changeConsumption).toHaveBeenCalledWith('b-1', cmd);
      done();
    });
  });

  it('changeProduction() delegates to appService', (done) => {
    appService.changeProduction.mockReturnValue(of(void 0));
    const cmd = { productionValue: 30, productionUnit: EnergyUnit.kW };
    facade.changeProduction('b-1', 'd-1', cmd).subscribe(() => {
      expect(appService.changeProduction).toHaveBeenCalledWith('b-1', 'd-1', cmd);
      done();
    });
  });
});
