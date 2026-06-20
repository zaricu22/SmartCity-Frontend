import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { BuildingDetailComponent } from './building-detail.component';
import { ASSET_PROVIDERS } from '../../../asset.providers';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../../../../shared/infrastructure/api/api.config';
import { PublicBuildingResponse } from '../../../infrastructure/api/response/public-building.response';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';

/**
 * Integration tests — full DI chain is real:
 *   BuildingDetailComponent
 *     → PublicBuildingFacade
 *       → PublicBuildingQueryService / PublicBuildingAppService
 *         → PublicBuildingApiService
 *           → HttpClient  ← only this layer is mocked
 */
describe('BuildingDetailComponent (integration)', () => {
  let fixture: ComponentFixture<BuildingDetailComponent>;
  let http: HttpTestingController;

  const BASE = `${DEFAULT_API_BASE_URL}/v1/buildings`;
  const BUILDING_ID = 'b-1';

  const buildingResponse: PublicBuildingResponse = {
    id: BUILDING_ID,
    name: 'City Hall',
    location: 'Zone A - Main St',
    consumptionValue: 50,
    consumptionUnit: EnergyUnit.kW,
    devices: [
      { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
    ],
  };

  const flushGetBuilding = () =>
    http.expectOne(`${BASE}/${BUILDING_ID}`).flush(buildingResponse);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingDetailComponent],
      providers: [
        ...ASSET_PROVIDERS,
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => BUILDING_ID } } },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BuildingDetailComponent);
  });

  afterEach(() => http.verify());

  it('should fetch /v1/buildings/:id on init and render building details', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('City Hall');
    expect(text).toContain('Zone A - Main St');
  }));

  it('should render device list from the HTTP response', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.device-list__item').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('SOLAR');
  }));

  it('should display consumption from the HTTP response', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('50');
    expect(fixture.nativeElement.textContent).toContain('kW');
  }));

  it('should show add-device dialog when button is clicked', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).toBeNull();
    fixture.nativeElement.querySelector('.building-detail-page__devices button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-add-device-dialog')).not.toBeNull();
  }));

  it('should POST to /v1/buildings/:id/devices on addDevice and reload', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAddDevice({
      type: DeviceType.BATTERY,
      ratedCapacityValue: 200,
      ratedCapacityUnit: EnergyUnit.kW,
    });

    // addDevice first fetches the building (findById), then POSTs the device
    flushGetBuilding();
    tick();
    const addReq = http.expectOne(`${BASE}/${BUILDING_ID}/devices`);
    expect(addReq.request.method).toBe('POST');
    expect(addReq.request.body.type).toBe(DeviceType.BATTERY);
    addReq.flush(null);

    // EventBus publishes DEVICE_ADDED → component reloads
    tick();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.showAddDeviceDialog).toBe(false);
  }));

  it('should PATCH to /v1/buildings/:id/consumption on changeConsumption', fakeAsync(() => {
    fixture.detectChanges();
    flushGetBuilding();
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onChangeConsumption({ consumptionValue: 80, consumptionUnit: EnergyUnit.kW });

    // changeConsumption first fetches the building (findById), then PATCHes
    flushGetBuilding();
    tick();
    const putReq = http.expectOne(`${BASE}/${BUILDING_ID}/consumption`);
    expect(putReq.request.method).toBe('PATCH');
    expect(putReq.request.body.consumptionValue).toBe(80);
    putReq.flush(null);

    // EventBus publishes CONSUMPTION_CHANGED → component reloads
    tick();
    flushGetBuilding();
    tick();
    fixture.detectChanges();
  }));
});
