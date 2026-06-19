import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { BuildingDtoMapper } from '../mapper/building-dto.mapper';
import { PublicBuildingDto } from '../dto/public-building.dto';
import { Page } from '../../shared/page';
import { PageRequest } from '../../shared/page-request';

@Injectable()
export class PublicBuildingQueryService {
  constructor(private readonly repository: PublicBuildingRepository) {}

  getById(id: string): Observable<PublicBuildingDto> {
    return this.repository.findById(id).pipe(map(BuildingDtoMapper.toDto));
  }

  getAll(req: PageRequest): Observable<Page<PublicBuildingDto>> {
    return this.repository.findAll(req).pipe(
      map(page => ({ ...page, content: page.content.map(BuildingDtoMapper.toDto) })),
    );
  }
}
