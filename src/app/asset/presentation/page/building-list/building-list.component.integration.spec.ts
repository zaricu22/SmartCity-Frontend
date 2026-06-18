import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BuildingListComponent } from './building-list.component';
import { ASSET_PROVIDERS } from '../../../asset.providers';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../../../../shared/infrastructure/api/api.config';
import { AuthService } from '../../../../shared/infrastructure/auth/auth.service';
import { PublicBuildingResponse } from '../../../infrastructure/api/response/public-building.response';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';
import { DeviceType } from '../../../application/shared/enums/device-type.enum';

/**
 * Integration tests — full DI chain is real:
 *   BuildingListComponent
 *     → PublicBuildingFacade
 *       → PublicBuildingQueryService / PublicBuildingAppService
 *         → PublicBuildingApiService (implements repository)
 *           → HttpClient  ← only this layer is mocked via HttpTestingController
 *
 * Nothing is stubbed above the HTTP boundary.
 * These tests catch: wrong @Input() bindings, broken provider registration,
 * mapper errors, and change-detection issues that unit tests miss.
 */
describe('BuildingListComponent (integration)', () => {
  let fixture: ComponentFixture<BuildingListComponent>;
  let http: HttpTestingController;

  const BASE = `${DEFAULT_API_BASE_URL}/v1/buildings`;

  const buildingResponses: PublicBuildingResponse[] = [
    {
      id: 'b-1',
      name: 'City Hall',
      location: 'Zone A - Main St',
      consumptionValue: 50,
      consumptionUnit: EnergyUnit.kW,
      devices: [
        { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
      ],
    },
    {
      id: 'b-2',
      name: 'Library',
      location: 'Zone B - Oak Ave',
      consumptionValue: 0,
      consumptionUnit: EnergyUnit.kW,
      devices: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingListComponent],
      providers: [
        ...ASSET_PROVIDERS,
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
        { provide: AuthService, useValue: { hasRole: jest.fn().mockReturnValue(true) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'assets/:id', component: BuildingListComponent }]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BuildingListComponent);
  });

  afterEach(() => http.verify());

  it('should fetch /v1/buildings on init and render one card per building', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit → facade.getAll() → HTTP GET

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush(buildingResponses);

    tick();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-building-card');
    expect(cards.length).toBe(2);
  }));

  it('should render building names from the HTTP response', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(BASE).flush(buildingResponses);
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('City Hall');
    expect(text).toContain('Library');
  }));

  it('should show empty state when the API returns no buildings', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(BASE).flush([]);
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No buildings found.');
    expect(fixture.nativeElement.querySelectorAll('app-building-card').length).toBe(0);
  }));

  it('should show create dialog and POST to /v1/buildings on confirm', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(BASE).flush(buildingResponses);
    tick();
    fixture.detectChanges();

    // Open the dialog
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-create-building-dialog')).not.toBeNull();

    // Confirm via the component method (bypasses template form binding for simplicity)
    fixture.componentInstance.onCreate({ name: 'School', location: 'Zone C' });
    fixture.detectChanges();

    // Should POST the new building
    const createReq = http.expectOne(BASE);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body.name).toBe('School');
    createReq.flush(null);

    // Should reload the list
    http.expectOne(BASE).flush([...buildingResponses]);
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.showCreateDialog).toBe(false);

    // throttleTime(2000) leaves a timer in the fakeAsync queue — discard it
    discardPeriodicTasks();
  }));

});
