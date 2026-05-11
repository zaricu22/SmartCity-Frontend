import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { BuildingDtoMapper } from '../mapper/building-dto.mapper';
import { PublicBuildingDto } from '../dto/public-building.dto';

@Injectable()
export class PublicBuildingQueryService {
  constructor(private readonly repository: PublicBuildingRepository) {}

  getById(id: string): Observable<PublicBuildingDto> {
    return this.repository.findById(id).pipe(map(BuildingDtoMapper.toDto));
  }

  getAll(): Observable<PublicBuildingDto[]> {
    return this.repository.findAll().pipe(
      map(buildings => buildings.map(BuildingDtoMapper.toDto)),
    );
  }
}
