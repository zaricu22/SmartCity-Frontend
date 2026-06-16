import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PublicBuilding } from '../../../domain/aggregate/public-building';
import { PublicBuildingRepository } from '../../../domain/repository/public-building.repository';
import { EnergyDevice } from '../../../domain/entity/energy-device';
import { Energy } from '../../../domain/value-object/energy';
import { PublicBuildingResponse } from '../response/public-building.response';
import { BuildingResponseMapper } from '../mapper/building-response.mapper';
import { CreateBuildingRequest } from '../request/create-building.request';
import { AddDeviceRequest } from '../request/add-device.request';
import { ChangeConsumptionRequest } from '../request/change-consumption.request';
import { ChangeProductionRequest } from '../request/change-production.request';
import { API_BASE_URL } from '../../../../shared/infrastructure/api/api.config';

// Infrastructure implementation of the domain repository — depends on HttpClient
@Injectable()
export class PublicBuildingApiService extends PublicBuildingRepository {
  private readonly base: string;

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) apiBaseUrl: string,
  ) {
    super();
    this.base = `${apiBaseUrl}/v1/buildings`;
  }

  findById(id: string): Observable<PublicBuilding> {
    return this.http
      .get<PublicBuildingResponse>(`${this.base}/${id}`)
      .pipe(map(BuildingResponseMapper.toDomain));
  }

  findAll(): Observable<PublicBuilding[]> {
    return this.http
      .get<PublicBuildingResponse[]>(this.base)
      .pipe(map(BuildingResponseMapper.toDomainList));
  }

  save(building: PublicBuilding): Observable<void> {
    const request: CreateBuildingRequest = { name: building.name, location: building.location };
    return this.http.post<void>(this.base, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addDevice(buildingId: string, device: EnergyDevice): Observable<void> {
    const request: AddDeviceRequest = {
      type: device.type,
      ratedCapacityValue: device.deviceRatedCapacity.value,
      ratedCapacityUnit: device.deviceRatedCapacity.unit,
    };
    return this.http.post<void>(`${this.base}/${buildingId}/devices`, request);
  }

  changeConsumption(buildingId: string, consumption: Energy): Observable<void> {
    const request: ChangeConsumptionRequest = {
      consumptionValue: consumption.value,
      consumptionUnit: consumption.unit,
    };
    return this.http.patch<void>(`${this.base}/${buildingId}/consumption`, request);
  }

  changeProduction(buildingId: string, deviceId: string, production: Energy): Observable<void> {
    const request: ChangeProductionRequest = {
      productionValue: production.value,
      productionUnit: production.unit,
    };
    return this.http.patch<void>(`${this.base}/${buildingId}/devices/${deviceId}/production`, request);
  }
}
