import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { BuildingListComponent } from './building-list.component';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { AuthService } from '../../../../auth/infrastructure/service/auth.service';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import type { Page } from '../../../shared/page';

describe('BuildingListComponent', () => {
  let fixture: ComponentFixture<BuildingListComponent>;
  let component: BuildingListComponent;
  let facade: jest.Mocked<PublicBuildingFacade>;
  let router: Router;

  const stubBuildings: PublicBuildingDto[] = [
    { id: 'b-1', name: 'City Hall', location: 'Zone A', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [] },
    { id: 'b-2', name: 'Library',   location: 'Zone B', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [] },
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

  it('should load and display buildings via async pipe', () => {
    expect(facade.getAll).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('app-building-card').length).toBe(2);
  });

  it('should show the create dialog when the button is clicked', () => {
    expect(fixture.nativeElement.querySelector('app-create-building-dialog')).toBeNull();
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

  it('should call facade.create and trigger reload when dialog confirms', () => {
    facade.create.mockReturnValue(of('new-id'));
    component.showCreateDialog = true;
    fixture.detectChanges();

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(facade.create).toHaveBeenCalledWith({ name: 'School', location: 'Zone C' });
    expect(component.showCreateDialog).toBe(false);
    expect(facade.getAll).toHaveBeenCalledTimes(2); // initial load + reload after create
  });

  it('should reset isSaving to false and keep dialog open on create error', () => {
    facade.create.mockReturnValue(throwError(() => new Error('Server error')));
    component.showCreateDialog = true;

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(component.isSaving()).toBe(false);
    expect(component.showCreateDialog).toBe(true);
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
    component.showCreateDialog = false;
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('should return true from hasUnsavedChanges when dialog is open', () => {
    component.showCreateDialog = true;
    expect(component.hasUnsavedChanges()).toBe(true);
  });
});
