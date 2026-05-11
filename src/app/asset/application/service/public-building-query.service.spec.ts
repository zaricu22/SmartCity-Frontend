import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicBuildingQueryService } from './public-building-query.service';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { PublicBuilding } from '../../domain/aggregate/public-building';

describe('PublicBuildingQueryService', () => {
  let service: PublicBuildingQueryService;
  let repository: jasmine.SpyObj<PublicBuildingRepository>;

  const makeBuilding = (id: string, name: string) => new PublicBuilding(id, name, 'Zone A');

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicBuildingRepository>('PublicBuildingRepository', [
      'findById', 'findAll', 'save', 'delete',
    ]);

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
      repository.findById.and.returnValue(of(building));

      service.getById('b-1').subscribe(dto => {
        expect(dto.id).toBe('b-1');
        expect(dto.name).toBe('City Hall');
        expect(repository.findById).toHaveBeenCalledWith('b-1');
        done();
      });
    });
  });

  describe('getAll()', () => {
    it('should return a list of DTOs', (done) => {
      const buildings = [makeBuilding('b-1', 'City Hall'), makeBuilding('b-2', 'Library')];
      repository.findAll.and.returnValue(of(buildings));

      service.getAll().subscribe(dtos => {
        expect(dtos.length).toBe(2);
        expect(dtos[0].id).toBe('b-1');
        expect(dtos[1].id).toBe('b-2');
        done();
      });
    });

    it('should return empty list when there are no buildings', (done) => {
      repository.findAll.and.returnValue(of([]));

      service.getAll().subscribe(dtos => {
        expect(dtos).toEqual([]);
        done();
      });
    });
  });
});
