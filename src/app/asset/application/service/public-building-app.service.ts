import { Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { EnergyDevice } from '../../domain/entity/energy-device';
import { PublicBuildingRepository } from '../../domain/repository/public-building.repository';
import { Energy } from '../../domain/value-object/energy';
import { AddDeviceCommand } from '../command/add-device.command';
import { ChangeConsumptionCommand } from '../command/change-consumption.command';
import { ChangeProductionCommand } from '../command/change-production.command';
import { CreateBuildingCommand } from '../command/create-building.command';
import { PublicBuilding } from '../../domain/aggregate/public-building';
import { EventBusService } from '../../../shared/infrastructure/messaging/event-bus.service';

@Injectable()
export class PublicBuildingAppService {
  constructor(
    private readonly repository: PublicBuildingRepository,
    private readonly eventBus: EventBusService,
  ) {}

  create(cmd: CreateBuildingCommand): Observable<string> {
    const id = crypto.randomUUID();
    const building = new PublicBuilding(id, cmd.name, cmd.location);
    return this.repository.save(building).pipe(
      tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
      switchMap(() => [id]),
    );
  }

  addDevice(cmd: AddDeviceCommand): Observable<void> {
    const device = new EnergyDevice(
      crypto.randomUUID(),
      cmd.type,
      new Energy(cmd.ratedCapacityValue, cmd.ratedCapacityUnit),
    );
    return this.repository.findById(cmd.buildingId).pipe(
      tap(building => building.addDevice(device)),
      switchMap(building =>
        this.repository.addDevice(cmd.buildingId, device).pipe(
          tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
        ),
      ),
    );
  }

  changeConsumption(buildingId: string, cmd: ChangeConsumptionCommand): Observable<void> {
    const consumption = new Energy(cmd.consumptionValue, cmd.consumptionUnit);
    return this.repository.findById(buildingId).pipe(
      tap(building => building.changeConsumption(consumption)),
      switchMap(building =>
        this.repository.changeConsumption(buildingId, consumption).pipe(
          tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
        ),
      ),
    );
  }

  changeProduction(buildingId: string, deviceId: string, cmd: ChangeProductionCommand): Observable<void> {
    const production = new Energy(cmd.productionValue, cmd.productionUnit);
    return this.repository.findById(buildingId).pipe(
      tap(building => building.changeDeviceProduction(deviceId, production)),
      switchMap(building =>
        this.repository.changeProduction(buildingId, deviceId, production).pipe(
          tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
        ),
      ),
    );
  }
}
