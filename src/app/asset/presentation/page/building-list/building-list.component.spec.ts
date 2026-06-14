import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { BuildingListComponent } from './building-list.component';
import { PublicBuildingFacade } from '../../../application/facade/public-building.facade';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

describe('BuildingListComponent', () => {
  let fixture: ComponentFixture<BuildingListComponent>;
  let component: BuildingListComponent;
  let facade: jest.Mocked<PublicBuildingFacade>;

  const stubBuildings: PublicBuildingDto[] = [
    { id: 'b-1', name: 'City Hall', location: 'Zone A', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [] },
    { id: 'b-2', name: 'Library',   location: 'Zone B', consumptionValue: 0, consumptionUnit: EnergyUnit.kW, devices: [] },
  ];

  beforeEach(async () => {
    facade = {
      getAll: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      addDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingFacade>;
    facade.getAll.mockReturnValue(of(stubBuildings));

    await TestBed.configureTestingModule({
      imports: [BuildingListComponent],
      providers: [
        { provide: PublicBuildingFacade, useValue: facade },
        provideRouter([]),
      ],
    }).compileComponents();

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

  it('should call facade.create and trigger reload when dialog confirms', () => {
    facade.create.mockReturnValue(of('new-id'));
    component.showCreateDialog = true;
    fixture.detectChanges();

    component.onCreate({ name: 'School', location: 'Zone C' });

    expect(facade.create).toHaveBeenCalledWith({ name: 'School', location: 'Zone C' });
    expect(component.showCreateDialog).toBe(false);
    expect(facade.getAll).toHaveBeenCalledTimes(2); // initial trigger + reload trigger
  });
});
