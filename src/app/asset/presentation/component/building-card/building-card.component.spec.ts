import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BuildingCardComponent } from './building-card.component';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

describe('BuildingCardComponent', () => {
  let fixture: ComponentFixture<BuildingCardComponent>;

  const stubBuilding: PublicBuildingDto = {
    id: 'b-1',
    name: 'City Hall',
    location: 'Zone A',
    consumptionValue: 50,
    consumptionUnit: EnergyUnit.kW,
    devices: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BuildingCardComponent);
    fixture.componentRef.setInput('building', stubBuilding);
    fixture.detectChanges();
  });

  it('should display building name', () => {
    expect(fixture.nativeElement.textContent).toContain('City Hall');
  });

  it('should display building location', () => {
    expect(fixture.nativeElement.textContent).toContain('Zone A');
  });

  it('should render a routerLink pointing to /assets/:id', () => {
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('/assets/b-1');
  });

  it('should show device summary via computed()', () => {
    expect(fixture.nativeElement.textContent).toContain('0 devices');
  });
});
