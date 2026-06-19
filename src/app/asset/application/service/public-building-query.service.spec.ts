import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicBuildingQueryService } from './public-building-query.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { PublicBuilding } from '../../domain/aggregate/public-building';
import { DEFAULT_PAGE_REQUEST } from '../../shared/page-request';
import type { Page } from '../../shared/page';

describe('PublicBuildingQueryService', () => {
  let service: PublicBuildingQueryService;
  let repository: jest.Mocked<PublicBuildingRepository>;

  const makeBuilding = (id: string, name: string) => new PublicBuilding(id, name, 'Zone A');

  const pageOf = (buildings: PublicBuilding[]): Page<PublicBuilding> => ({
    content: buildings,
    totalElements: buildings.length,
    totalPages: Math.ceil(buildings.length / 10) || 1,
    page: 0,
    size: 10,
  });

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      addDevice: jest.fn(),
      changeConsumption: jest.fn(),
      changeProduction: jest.fn(),
    } as unknown as jest.Mocked<PublicBuildingRepository>;

    TestBed.configureTestingModule({
      providers: [
        PublicBuildingQueryService,
        { provide: PublicBuildingRepository, useValue: repository },
      ],
    });

    service = TestBed.inject(PublicBuildingQueryService);
  });

  describe('getById()', () => {
    it('should return a DTO mapped from the domain aggregate', (done) => {
      const building = makeBuilding('b-1', 'City Hall');
      repository.findById.mockReturnValue(of(building));

      service.getById('b-1').subscribe(dto => {
        expect(dto.id).toBe('b-1');
        expect(dto.name).toBe('City Hall');
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        done();
      });
    });
  });

  describe('getAll()', () => {
    it('should return a Page of DTOs mapped from domain aggregates', (done) => {
      const buildings = [makeBuilding('b-1', 'City Hall'), makeBuilding('b-2', 'Library')];
      repository.findAll.mockReturnValue(of(pageOf(buildings)));

      service.getAll(DEFAULT_PAGE_REQUEST).subscribe(page => {
        expect(page.content.length).toBe(2);
        expect(page.content[0].id).toBe('b-1');
        expect(page.content[1].id).toBe('b-2');
        expect(page.totalElements).toBe(2);
        expect(repository.findAll).toHaveBeenCalledWith(DEFAULT_PAGE_REQUEST);
        done();
      });
    });

    it('should return empty Page when there are no buildings', (done) => {
      repository.findAll.mockReturnValue(of(pageOf([])));

      service.getAll(DEFAULT_PAGE_REQUEST).subscribe(page => {
        expect(page.content).toEqual([]);
        expect(page.totalElements).toBe(0);
        done();
      });
    });
  });
});
