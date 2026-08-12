import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { BuildingListComponent } from './building-list.component';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { AuthService } from '../../../../auth/infrastructure/service/auth.service';
import { EventBusService } from '../../../../shared/infrastructure/messaging/event-bus.service';
import { ToastService } from '../../../../shared/presentation/service/toast.service';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import type { Page } from '../../../shared/page';

describe('BuildingListComponent', () => {
  let fixture: ComponentFixture<BuildingListComponent>;
  let component: BuildingListComponent;
  let facade: jest.Mocked<PublicBuildingFacade>;
  let router: Router;

  const stubBuildings: PublicBuildingDto[] = [
    { id: 'b-1', name: 'City Hall', location: 'Zone A', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [], version: 3 },
    { id: 'b-2', name: 'Library',   location: 'Zone B', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [], version: 3 },
  ];

  const stubPage: Page<PublicBuildingDto> = {
    content: stubBuildings,
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 10,
  };

  let adminAuth: { hasRole: jest.Mock };

  beforeEach(async () => {
    adminAuth = { hasRole: jest.fn().mockReturnValue(true) };

    facade = {
      getAll: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      addDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
      connectRealtime: jest.fn(),
      disconnectRealtime: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingFacade>;
    facade.getAll.mockReturnValue(of(stubPage));

    await TestBed.configureTestingModule({
      imports: [BuildingListComponent],
      providers: [
        { provide: PublicBuildingFacade, useValue: facade },
        { provide: AuthService, useValue: adminAuth },
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(BuildingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and display the building list on page load', () => {
    expect(facade.getAll).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('app-building-card').length).toBe(2);
  });

  it('should connect real-time updates with no buildingId on construction', () => {
    expect(facade.connectRealtime).toHaveBeenCalledWith();
  });

  it('should disconnect real-time updates when the component is destroyed', () => {
    fixture.destroy();
    expect(facade.disconnectRealtime).toHaveBeenCalled();
  });

  it('should show the create dialog when the button is clicked', () => {
    expect(fixture.nativeElement.querySelector('app-create-building-dialog')).toBeNull();
    // Unscoped `button` selector is safe only because "New Building" is the sole rendered
    // <button> in this component's default (no filters, ADMIN) state.
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-create-building-dialog')).not.toBeNull();
  });

  it('should hide the New Building button for non-ADMIN users', () => {
    adminAuth.hasRole.mockReturnValue(false);
    // OnPush: detectChanges() on the component's own CDR forces a re-check of this subtree
    fixture.debugElement.injector.get(ChangeDetectorRef).detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('should save the new building and refresh the list to include it once creation succeeds', () => {
    facade.create.mockReturnValue(of('new-id'));
    const eventBus = TestBed.inject(EventBusService);
    component.showCreateDialog.set(true);
    fixture.detectChanges();

    component.onCreate({ name: 'School', location: 'Zone C' });
    // Real AppService.create() publishes this after the save succeeds — facade is mocked here,
    // so simulate what production code does, same pattern as building-detail.component.spec.ts.
    eventBus.publish({ type: 'BUILDING_CREATED', buildingId: 'new-id', name: 'School', location: 'Zone C' });

    expect(facade.create).toHaveBeenCalledWith({ name: 'School', location: 'Zone C' });
    expect(component.showCreateDialog()).toBe(false);
    expect(facade.getAll).toHaveBeenCalledTimes(2); // initial load + reload after BUILDING_CREATED
  });

  it('should refresh the current page when a building is deleted, e.g. from another tab or by another user', () => {
    const eventBus = TestBed.inject(EventBusService);

    eventBus.publish({ type: 'BUILDING_DELETED', buildingId: 'b-1', name: 'City Hall' });

    expect(facade.getAll).toHaveBeenCalledTimes(2); // initial load + reload after BUILDING_DELETED
  });

  it('should show an error and recover so a later refresh still works, instead of getting stuck after a failed load', () => {
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');
    facade.getAll.mockReturnValue(throwError(() => new Error('Failed to load buildings.')));
    const eventBus = TestBed.inject(EventBusService);

    eventBus.publish({ type: 'BUILDING_CREATED', buildingId: 'b-2', name: 'Library', location: 'Zone B' });
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Failed to load buildings.');
    expect(showSpy).toHaveBeenCalledWith('Failed to load buildings.', 'error');
    expect(component.buildings()).toEqual([]);

    // The outer stream must survive the error — a later reload should still work.
    facade.getAll.mockReturnValue(of(stubPage));
    eventBus.publish({ type: 'BUILDING_CREATED', buildingId: 'b-3', name: 'Depot', location: 'Zone C' });
    fixture.detectChanges();

    expect(component.errorMessage()).toBeNull();
    expect(component.buildings().length).toBe(2);
  });

  it('should navigate to page 0 when creating a building while on a later page', () => {
    const eventBus = TestBed.inject(EventBusService);
    facade.getAll.mockReturnValue(of({ ...stubPage, page: 2 }));
    // Force a reload with the new stub so currentPage() reflects page 2 — any event
    // in the merge works, this one just happens to be convenient.
    eventBus.publish({ type: 'DEVICE_ADDED', buildingId: 'b-1', deviceId: 'd-1', deviceType: 'SOLAR' } as any);
    fixture.detectChanges();

    facade.create.mockReturnValue(of('new-id'));
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { page: 0 },
      queryParamsHandling: 'merge',
    });
  });

  it('should reset isSaving to false and keep dialog open on create error', () => {
    facade.create.mockReturnValue(throwError(() => new Error('Server error')));
    component.showCreateDialog.set(true);

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(component.isSaving()).toBe(false);
    expect(component.showCreateDialog()).toBe(true);
  });

  it('should show a success toast when a building is created', () => {
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');
    facade.create.mockReturnValue(of('new-id'));

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(showSpy).toHaveBeenCalledWith('Building "School" created.', 'success');
  });

  it('should show an error toast when create fails', () => {
    const toastService = TestBed.inject(ToastService);
    const showSpy = jest.spyOn(toastService, 'show');
    facade.create.mockReturnValue(throwError(() => new Error('Server error')));

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(showSpy).toHaveBeenCalledWith('Server error', 'error');
  });

  it('should navigate to the given page keeping existing query params', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToPage(2);

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { page: 2 },
      queryParamsHandling: 'merge',
    });
  });

  it('should navigate with new sort/dir and reset page to 0 on sort change', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSortChange('location,desc');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { sort: 'location', dir: 'desc', page: 0 },
      queryParamsHandling: 'merge',
    });
  });

  it('should return false from hasUnsavedChanges when dialog is closed', () => {
    component.showCreateDialog.set(false);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('should return true from hasUnsavedChanges when dialog is open', () => {
    component.showCreateDialog.set(true);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  describe('search filters', () => {
    it('should debounce filter changes instead of navigating per keystroke', fakeAsync(() => {
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.searchForm.controls.name.setValue('H');
      tick(100);
      component.searchForm.controls.name.setValue('Ha');
      tick(100);
      component.searchForm.controls.name.setValue('Hall');
      // Still within 300ms of the last keystroke — nothing should have navigated yet
      expect(navigateSpy).not.toHaveBeenCalled();

      tick(300);

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { name: 'Hall', location: null, page: 0 },
        queryParamsHandling: 'merge',
      });
    }));

    it('should not navigate again when the emitted value is unchanged', fakeAsync(() => {
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.searchForm.controls.name.setValue('Hall');
      tick(300);
      expect(navigateSpy).toHaveBeenCalledTimes(1);

      component.searchForm.controls.name.setValue('Hall');
      tick(300);
      expect(navigateSpy).toHaveBeenCalledTimes(1);
    }));

    it('should trim and reset to page 0 on filter change', fakeAsync(() => {
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.searchForm.controls.location.setValue('  Zone A  ');
      tick(300);

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { name: null, location: 'Zone A', page: 0 },
        queryParamsHandling: 'merge',
      });
    }));

    it('should reload the list immediately (not after 300ms) when Clear filters is clicked', fakeAsync(() => {
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      component.searchForm.setValue({ name: 'Hall', location: 'Zone A' });
      tick(300);
      navigateSpy.mockClear();

      component.onClearFilters();

      expect(component.searchForm.getRawValue()).toEqual({ name: '', location: '' });
      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { name: null, location: null, page: 0 },
        queryParamsHandling: 'merge',
      });

      // The reset itself must not also trigger a second, debounced navigation
      navigateSpy.mockClear();
      tick(300);
      expect(navigateSpy).not.toHaveBeenCalled();
    }));
  });
});
