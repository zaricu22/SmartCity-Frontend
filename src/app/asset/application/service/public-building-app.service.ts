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
import { BuildingDeletedEvent } from '../../domain/event/building-deleted.event';

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

  delete(id: string): Observable<void> {
    // Loads the aggregate only to capture its name for BuildingDeletedEvent — mirrors the
    // backend, which does the same findById-before-delete purely to enrich the event, not
    // to mutate anything (delete itself is still a fire-and-forget repository call).
    return this.repository.findById(id).pipe(
      switchMap(building => {
        const event: BuildingDeletedEvent = { type: 'BUILDING_DELETED', buildingId: id, name: building.name };
        return this.repository.delete(id).pipe(
          tap(() => this.eventBus.publish(event)),
        );
      }),
    );
  }

  removeDevice(buildingId: string, deviceId: string): Observable<void> {
    // Same pattern as addDevice: load for domain validation, persist via granular endpoint, emit events after.
    return this.repository.findById(buildingId).pipe(
      tap(building => building.removeDevice(deviceId)),
      switchMap(building =>
        this.repository.removeDevice(buildingId, deviceId).pipe(
          tap(() => building.pullEvents().forEach(e => this.eventBus.publish(e))),
        ),
      ),
    );
  }

  addDevice(cmd: AddDeviceCommand): Observable<void> {
    // findById loads the aggregate for domain validation only — never saved whole.
    // Granular repository method handles persistence; pullEvents() fires only after that write succeeds.
    // switchMap cancels any in-flight inner Observable on a new call — prevents duplicate-write race conditions.
    const device = new EnergyDevice(
      crypto.randomUUID(),
      cmd.name,
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
    // Same pattern as addDevice: load for domain validation, persist via granular endpoint, emit events after.
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
    // Same pattern as addDevice: load for domain validation, persist via granular endpoint, emit events after.
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
