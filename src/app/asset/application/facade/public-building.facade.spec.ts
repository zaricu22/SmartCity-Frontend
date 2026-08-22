import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PublicBuildingFacade } from './public-building.facade';
import { PublicBuildingAppService } from '../service/public-building-app.service';
import { PublicBuildingQueryService } from '../service/public-building-query.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { BuildingRealtimeGateway } from '../../domain/gateway/building-realtime.gateway';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { PublicBuildingDto } from '../dto/public-building.dto';
import { ApplicationException } from '../exception/application.exception';
import { AppHttpError } from '../../../shared/infrastructure/error/app-http-error';
import { DomainException } from '../../domain/exception/domain.exception';
import { ErrorCode } from '../../domain/shared/enums/error-code.enum';

describe('PublicBuildingFacade', () => {
  let facade: PublicBuildingFacade;
  let appService: jest.Mocked<PublicBuildingAppService>;
  let queryService: jest.Mocked<PublicBuildingQueryService>;
  let realtimeGateway: jest.Mocked<BuildingRealtimeGateway>;

  const stubDto: PublicBuildingDto = {
    id: 'b-1', name: 'Hall', location: 'Zone A',
    consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [], version: 3,
  };

  beforeEach(() => {
    appService = {
      create: jest.fn(),
      delete: jest.fn(),
      addDevice: jest.fn(),
      removeDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingAppService>;

    queryService = {
      getAll: jest.fn(),
      getById: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingQueryService>;

    realtimeGateway = {
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<BuildingRealtimeGateway>;

    TestBed.configureTestingModule({
      providers: [
        PublicBuildingFacade,
        { provide: PublicBuildingAppService, useValue: appService },
        { provide: PublicBuildingQueryService, useValue: queryService },
        { provide: PublicBuildingRepository, useValue: {} },
        { provide: BuildingRealtimeGateway, useValue: realtimeGateway },
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

  it('delete() delegates to appService', (done) => {
    appService.delete.mockReturnValue(of(void 0));
    facade.delete('b-1', 3).subscribe(() => {
      expect(appService.delete).toHaveBeenCalledWith('b-1', 3);
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

  it('removeDevice() delegates to appService', (done) => {
    appService.removeDevice.mockReturnValue(of(void 0));
    facade.removeDevice('b-1', 'd-1', 3).subscribe(() => {
      expect(appService.removeDevice).toHaveBeenCalledWith('b-1', 'd-1', 3);
      done();
    });
  });

  it('changeConsumption() delegates to appService', (done) => {
    appService.changeConsumption.mockReturnValue(of(void 0));
    const cmd = { consumptionValue: 50, consumptionUnit: EnergyUnit.kW, version: 3 };
    facade.changeConsumption('b-1', cmd).subscribe(() => {
      expect(appService.changeConsumption).toHaveBeenCalledWith('b-1', cmd);
      done();
    });
  });

  it('changeProduction() delegates to appService', (done) => {
    appService.changeProduction.mockReturnValue(of(void 0));
    const cmd = { productionValue: 30, productionUnit: EnergyUnit.kW, version: 3 };
    facade.changeProduction('b-1', 'd-1', cmd).subscribe(() => {
      expect(appService.changeProduction).toHaveBeenCalledWith('b-1', 'd-1', cmd);
      done();
    });
  });

  it('connectRealtime() delegates to realtimeGateway', () => {
    facade.connectRealtime('b-1');
    expect(realtimeGateway.connect).toHaveBeenCalledWith('b-1');
  });

  it('disconnectRealtime() delegates to realtimeGateway', () => {
    facade.disconnectRealtime();
    expect(realtimeGateway.disconnect).toHaveBeenCalled();
  });

  describe('error handling', () => {
    it('shows the domain-specific error code and message (e.g. capacity exceeded) instead of a generic one when a business rule blocks the operation', (done) => {
      appService.delete.mockReturnValue(throwError(() => new DomainException('Capacity exceeded', ErrorCode.PRODUCTION_RATE_EXCEEDED)));

      facade.delete('b-1', 3).subscribe({
        error: (err: ApplicationException) => {
          expect(err.message).toBe('Capacity exceeded');
          expect(err.errorCode).toBe(ErrorCode.PRODUCTION_RATE_EXCEEDED);
          done();
        },
      });
    });

    it('shows the server conflict code and retry message when the building was edited by someone else in the meantime', (done) => {
      appService.delete.mockReturnValue(
        throwError(() => new AppHttpError(409, 'CONCURRENT_MODIFICATION', 'The resource was modified by another request. Please retry.')),
      );

      facade.delete('b-1', 3).subscribe({
        error: (err: ApplicationException) => {
          expect(err.message).toBe('The resource was modified by another request. Please retry.');
          expect(err.errorCode).toBe('CONCURRENT_MODIFICATION');
          done();
        },
      });
    });

    it('falls back to a generic failed-to-delete message when the server error has no user-facing text', (done) => {
      // ?? only falls back on null/undefined, not falsy values like '' — AppHttpError.userMessage
      // is typed as a required string, so this state needs an unsafe cast to construct at all.
      appService.delete.mockReturnValue(
        throwError(() => new AppHttpError(500, 'SERVER_ERROR', undefined as unknown as string)),
      );

      facade.delete('b-1', 3).subscribe({
        error: (err: ApplicationException) => {
          expect(err.message).toBe('Failed to delete building.');
          expect(err.errorCode).toBe('SERVER_ERROR');
          done();
        },
      });
    });

    it('falls back to the operation-specific message for an unrecognized error', (done) => {
      appService.delete.mockReturnValue(throwError(() => new Error('boom')));

      facade.delete('b-1', 3).subscribe({
        error: (err: ApplicationException) => {
          expect(err.message).toBe('Failed to delete building.');
          expect(err.errorCode).toBeUndefined();
          done();
        },
      });
    });
  });
});
