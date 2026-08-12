import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BuildingListComponent } from './building-list.component';
import { ASSET_PROVIDERS } from '../../../asset.providers';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../../../../shared/infrastructure/api/api.config';
import { AuthService } from '../../../../auth/infrastructure/service/auth.service';
import { ToastService } from '../../../../shared/presentation/service/toast.service';
import { requestIdInterceptor } from '../../../../shared/infrastructure/interceptor/request-id.interceptor';
import { authInterceptor } from '../../../../auth/infrastructure/interceptor/auth.interceptor';
import { httpErrorInterceptor } from '../../../../shared/infrastructure/interceptor/http-error.interceptor';
import { PublicBuildingResponse } from '../../../infrastructure/api/response/public-building.response';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';

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
      version: 3,
      devices: [
        { id: 'd-1', name: 'Roof Panel', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
      ],
    },
    {
      id: 'b-2',
      name: 'Library',
      location: 'Zone B - Oak Ave',
      consumptionValue: 0,
      consumptionUnit: EnergyUnit.kW,
      version: 3,
      devices: [],
    },
  ];

  // Wraps raw building array in the Spring Page envelope the API now returns
  const pageOf = (content: PublicBuildingResponse[], total = content.length) => ({
    content,
    totalElements: total,
    totalPages: Math.ceil(total / 10) || 1,
    pageNumber: 0,
    pageSize: 10,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingListComponent],
      providers: [
        ...ASSET_PROVIDERS,
        { provide: API_BASE_URL, useValue: DEFAULT_API_BASE_URL },
        { provide: AuthService, useValue: { hasRole: jest.fn().mockReturnValue(true), getToken: jest.fn().mockReturnValue(null) } },
        provideHttpClient(withInterceptors([requestIdInterceptor, authInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'assets/:id', component: BuildingListComponent }]),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BuildingListComponent);
  });

  afterEach(() => http.verify());

  it('should fetch /v1/buildings on init and render one card per building', fakeAsync(() => {
    fixture.detectChanges();

    // URL now includes pagination/sort query params — match on base URL only
    const req = http.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('sort')).toBe('name,asc');
    req.flush(pageOf(buildingResponses));

    tick();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-building-card');
    expect(cards.length).toBe(2);
  }));

  it('should render building names from the HTTP response', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(r => r.url === BASE).flush(pageOf(buildingResponses));
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('City Hall');
    expect(text).toContain('Library');
  }));

  it('should show empty state when the API returns no buildings', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(r => r.url === BASE).flush(pageOf([]));
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No buildings found.');
    expect(fixture.nativeElement.querySelectorAll('app-building-card').length).toBe(0);
  }));

  it('should show create dialog and POST to /v1/buildings on confirm', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(r => r.url === BASE).flush(pageOf(buildingResponses));
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

    // Should reload the list (already on page 0 — BUILDING_CREATED on the event bus triggers it)
    http.expectOne(r => r.url === BASE).flush(pageOf([...buildingResponses]));
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.showCreateDialog()).toBe(false);

    // throttleTime(2000) leaves a timer in the fakeAsync queue — discard it
    discardPeriodicTasks();
  }));

  it('should surface the backend message and keep the dialog open on a duplicate-building 409', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(r => r.url === BASE).flush(pageOf(buildingResponses));
    tick();
    fixture.detectChanges();

    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    fixture.componentInstance.onCreate({ name: 'City Hall', location: 'Zone A - Main St' });
    fixture.detectChanges();

    // Backend's BuildingAlreadyExistsException -> 409, ErrorCode.BUILDING_ALREADY_EXISTS
    const createReq = http.expectOne(BASE);
    createReq.flush(
      {
        errorCode: 'BUILDING_ALREADY_EXISTS',
        message: 'A building with this name and location already exists!',
        status: 409,
        timestamp: new Date().toISOString(),
        requestId: 'test-request-id',
      },
      { status: 409, statusText: 'Conflict' },
    );
    tick();
    fixture.detectChanges();

    expect(showSpy).toHaveBeenCalledWith('A building with this name and location already exists!', 'error');
    // Dialog stays open (unlike the success path) so the user can retry with a different name/location
    expect(fixture.componentInstance.showCreateDialog()).toBe(true);
    expect(fixture.componentInstance.isSaving()).toBe(false);

    discardPeriodicTasks();
  }));

  it('should filter buildings by name/location shortly after typing stops, and show a no-results message when none match', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(r => r.url === BASE).flush(pageOf(buildingResponses));
    tick();
    fixture.detectChanges();

    fixture.componentInstance.searchForm.controls.name.setValue('Nonexistent');
    tick(300);
    fixture.detectChanges();

    const filteredReq = http.expectOne(r => r.url === BASE);
    expect(filteredReq.request.params.get('name')).toBe('Nonexistent');
    expect(filteredReq.request.params.get('page')).toBe('0');
    filteredReq.flush(pageOf([]));
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No buildings match your search.');
    expect(fixture.nativeElement.querySelector('.building-list-page__clear')).not.toBeNull();
  }));
});
