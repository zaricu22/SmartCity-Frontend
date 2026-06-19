import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicBuildingApiService } from './public-building-api.service';
import { PublicBuildingRepository } from '../../../domain/repository/public-building.repository';
import { PublicBuildingResponse } from '../response/public-building.response';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { PublicBuilding } from '../../../domain/aggregate/public-building';
import { EnergyDevice } from '../../../domain/entity/energy-device';
import { Energy } from '../../../domain/value-object/energy';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../../../../shared/infrastructure/api/api.config';
import { DEFAULT_PAGE_REQUEST } from '../../../shared/page-request';

describe('PublicBuildingApiService', () => {
  let service: PublicBuildingApiService;
  let http: HttpTestingController;

  const BASE = `${DEFAULT_API_BASE_URL}/v1/buildings`;

  const buildingResponse: PublicBuildingResponse = {
    id: 'b-1',
    name: 'City Hall',
    location: 'Zone A',
    consumptionValue: 0,
    consumptionUnit: EnergyUnit.kW,
    devices: [
      { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PublicBuildingApiService,
        { provide: PublicBuildingRepository, useExisting: PublicBuildingApiService },
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
      ],
    });

    service = TestBed.inject(PublicBuildingApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('findById()', () => {
    it('should GET /v1/buildings/:id and return domain aggregate', (done) => {
      service.findById('b-1').subscribe(building => {
        expect(building.id).toBe('b-1');
        expect(building.name).toBe('City Hall');
        expect(building.devices.length).toBe(1);
        done();
      });

      const req = http.expectOne(`${BASE}/b-1`);
      expect(req.request.method).toBe('GET');
      req.flush(buildingResponse);
    });
  });

  describe('findAll()', () => {
    it('should GET /v1/buildings with page params and return Page of aggregates', (done) => {
      service.findAll(DEFAULT_PAGE_REQUEST).subscribe(page => {
        expect(page.content.length).toBe(1);
        expect(page.content[0].id).toBe('b-1');
        expect(page.totalElements).toBe(1);
        expect(page.totalPages).toBe(1);
        done();
      });

      const req = http.expectOne(r => r.url === BASE);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.get('sort')).toBe('name,asc');
      req.flush({ content: [buildingResponse], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 10 });
    });
  });

  describe('save()', () => {
    it('should POST /v1/buildings with name and location', (done) => {
      const building = new PublicBuilding('b-new', 'Library', 'Zone B');

      service.save(building).subscribe(() => done());

      const req = http.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.name).toBe('Library');
      expect(req.request.body.location).toBe('Zone B');
      req.flush(null);
    });
  });

  describe('delete()', () => {
    it('should DELETE /v1/buildings/:id', (done) => {
      service.delete('b-1').subscribe(() => done());

      const req = http.expectOne(`${BASE}/b-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('addDevice()', () => {
    it('should POST /v1/buildings/:id/devices', (done) => {
      const device = new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW));

      service.addDevice('b-1', device).subscribe(() => done());

      const req = http.expectOne(`${BASE}/b-1/devices`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW });
      req.flush(null);
    });
  });

  describe('changeConsumption()', () => {
    it('should PATCH /v1/buildings/:id/consumption', (done) => {
      const consumption = new Energy(80, EnergyUnit.kW);

      service.changeConsumption('b-1', consumption).subscribe(() => done());

      const req = http.expectOne(`${BASE}/b-1/consumption`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });
      req.flush(null);
    });
  });

  describe('changeProduction()', () => {
    it('should PATCH /v1/buildings/:buildingId/devices/:deviceId/production', (done) => {
      const production = new Energy(60, EnergyUnit.kW);

      service.changeProduction('b-1', 'd-1', production).subscribe(() => done());

      const req = http.expectOne(`${BASE}/b-1/devices/d-1/production`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ productionValue: 60, productionUnit: EnergyUnit.kW });
      req.flush(null);
    });
  });
});
