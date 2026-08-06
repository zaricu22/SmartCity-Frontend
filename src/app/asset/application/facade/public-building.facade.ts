import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { PublicBuildingAppService } from '../service/public-building-app.service';
import { PublicBuildingQueryService } from '../service/public-building-query.service';
import { AddDeviceCommand } from '../command/add-device.command';
import { ChangeConsumptionCommand } from '../command/change-consumption.command';
import { ChangeProductionCommand } from '../command/change-production.command';
import { CreateBuildingCommand } from '../command/create-building.command';
import { PublicBuildingDto } from '../dto/public-building.dto';
import { ApplicationException } from '../exception/application.exception';
import { AppHttpError } from '../../../shared/infrastructure/error/app-http-error';
import { DomainException } from '../../domain/exception/domain.exception';
import { BuildingRealtimeGateway } from '../../domain/gateway/building-realtime.gateway';
import { Page } from '../../shared/page';
import { PageRequest } from '../../shared/page-request';

// Single injection point for the asset bounded context — components never inject services directly
@Injectable()
export class PublicBuildingFacade {
  constructor(
    private readonly appService: PublicBuildingAppService,
    private readonly queryService: PublicBuildingQueryService,
    private readonly realtimeGateway: BuildingRealtimeGateway,
  ) {}

  private handleError(fallback: string) {
    return (err: unknown) => {
      if (err instanceof DomainException) {
        // Preserve the domain error code so the UI can react to specific violations
        return throwError(() => new ApplicationException(err.message, err.errorCode));
      }
      if (err instanceof AppHttpError) {
        // Preserve the HTTP error code too — e.g. CONCURRENT_MODIFICATION lets the UI
        // react to an optimistic-lock conflict instead of just showing a generic message.
        return throwError(() => new ApplicationException(err.userMessage ?? fallback, err.code));
      }
      return throwError(() => new ApplicationException(fallback));
    };
  }

  // Queries
  getAll(req: PageRequest): Observable<Page<PublicBuildingDto>> {
    return this.queryService.getAll(req).pipe(catchError(this.handleError('Failed to load buildings.')));
  }

  getById(id: string): Observable<PublicBuildingDto> {
    return this.queryService.getById(id).pipe(catchError(this.handleError('Failed to load building.')));
  }

  // Commands
  create(cmd: CreateBuildingCommand): Observable<string> {
    return this.appService.create(cmd).pipe(catchError(this.handleError('Failed to create building.')));
  }

  delete(id: string, version: number): Observable<void> {
    return this.appService.delete(id, version).pipe(catchError(this.handleError('Failed to delete building.')));
  }

  addDevice(cmd: AddDeviceCommand): Observable<void> {
    return this.appService.addDevice(cmd).pipe(catchError(this.handleError('Failed to add device.')));
  }

  removeDevice(buildingId: string, deviceId: string, version: number): Observable<void> {
    return this.appService.removeDevice(buildingId, deviceId, version).pipe(catchError(this.handleError('Failed to remove device.')));
  }

  changeConsumption(buildingId: string, cmd: ChangeConsumptionCommand): Observable<void> {
    return this.appService.changeConsumption(buildingId, cmd).pipe(catchError(this.handleError('Failed to update consumption.')));
  }

  changeProduction(buildingId: string, deviceId: string, cmd: ChangeProductionCommand): Observable<void> {
    return this.appService.changeProduction(buildingId, deviceId, cmd).pipe(catchError(this.handleError('Failed to update production.')));
  }

  // Real-time updates
  connectRealtime(buildingId?: string): void {
    this.realtimeGateway.connect(buildingId);
  }

  disconnectRealtime(): void {
    this.realtimeGateway.disconnect();
  }
}
