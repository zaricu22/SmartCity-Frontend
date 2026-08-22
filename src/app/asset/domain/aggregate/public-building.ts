import { EnergyDevice } from '../entity/energy-device';
import { BuildingCreatedEvent } from '../event/building-created.event';
import { ConsumptionChangedEvent } from '../event/consumption-changed.event';
import { DeviceAddedEvent } from '../event/device-added.event';
import { DeviceRemovedEvent } from '../event/device-removed.event';
import { ProductionChangedEvent } from '../event/production-changed.event';
import { BuildingProductionRateExceededException } from '../exception/building-production-rate-exceeded.exception';
import { DeviceAlreadyExistsException } from '../exception/device-already-exists.exception';
import { DeviceNotFoundException } from '../exception/device-not-found.exception';
import { ValidationException } from '../exception/validation.exception';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { EnergyUnit, toKW } from '../shared/enums/energy-unit.enum';
import { Energy } from '../value-object/energy';
import { DeviceInUseException } from '../exception/device-in-use-exception';

export class PublicBuilding {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _location: string;
  private _consumption: Energy;
  private readonly _devices: EnergyDevice[];
  // Mirrors the backend's optimistic-lock version. Defaults to 0 for a not-yet-persisted
  // building (never compared against anything until reconstructed from a fetched response).
  private _version = 0;
  private readonly _domainEvents: (BuildingCreatedEvent | DeviceAddedEvent | DeviceRemovedEvent | ConsumptionChangedEvent | ProductionChangedEvent)[] = [];

  constructor(id: string, name: string, location: string) {
    if (!name || name.trim() === '') {
      throw new ValidationException('Ustanova mora imati naziv!', ErrorCode.BUILDING_NAME_EMPTY);
    }
    if (!location || location.trim() === '') {
      throw new ValidationException('Ustanova mora imati adresu!', ErrorCode.BUILDING_ADDRESS_EMPTY);
    }

    this._id = id;
    this._name = name;
    this._location = location;
    this._devices = [];
    this._consumption = new Energy(0, EnergyUnit.kW);

    this._domainEvents.push({
      type: 'BUILDING_CREATED',
      buildingId: id,
      name,
      location,
    } satisfies BuildingCreatedEvent);
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get location(): string { return this._location; }
  get consumption(): Energy { return this._consumption; }
  get version(): number { return this._version; }
  // Defensive copy — callers cannot mutate the aggregate's internal device list.
  get devices(): readonly EnergyDevice[] { return [...this._devices]; }

  pullEvents(): (BuildingCreatedEvent | DeviceAddedEvent | DeviceRemovedEvent | ConsumptionChangedEvent | ProductionChangedEvent)[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0; // mutates in place — preserves the readonly array reference
    return events;
  }

  addDevice(newDevice: EnergyDevice): void {
    if (this._devices.some(d => d.equals(newDevice))) {
      throw new DeviceAlreadyExistsException();
    }

    this._devices.push(newDevice);

    this._domainEvents.push({
      type: 'DEVICE_ADDED',
      buildingId: this._id,
      deviceId: newDevice.id,
      deviceName: newDevice.name,
      deviceType: newDevice.type,
    } satisfies DeviceAddedEvent);
  }

  removeDevice(deviceId: string): void {
    const index = this._devices.findIndex(d => d.id === deviceId);
    if (index === -1) throw new DeviceNotFoundException();

    const device = this._devices[index];
    if (device.productionRate.value > 0) throw new DeviceInUseException();

    const [removed] = this._devices.splice(index, 1);

    this._domainEvents.push({
      type: 'DEVICE_REMOVED',
      buildingId: this._id,
      deviceId,
      deviceName: removed.name,
      deviceType: removed.type,
    } satisfies DeviceRemovedEvent);
  }

  changeConsumption(newConsumptionRate: Energy): void {
    if (newConsumptionRate.greaterThan(this.calculateTotalProductionRate())) {
      throw new BuildingProductionRateExceededException();
    }

    const old = this._consumption;
    this._consumption = newConsumptionRate;

    this._domainEvents.push({
      type: 'CONSUMPTION_CHANGED',
      buildingId: this._id,
      oldConsumption: old,
      newConsumption: newConsumptionRate,
    } satisfies ConsumptionChangedEvent);
  }

  changeDeviceProduction(deviceId: string, production: Energy): void {
    const device = this._devices.find(d => d.id === deviceId);
    if (!device) throw new DeviceNotFoundException();

    const old = device.productionRate;
    device.changeProduction(production);

    this._domainEvents.push({
      type: 'PRODUCTION_CHANGED',
      buildingId: this._id,
      deviceId,
      oldProduction: old,
      newProduction: production,
    } satisfies ProductionChangedEvent);
  }

  private calculateTotalProductionRate(): Energy {
    const totalKw = this._devices
      .map(d => toKW(d.productionRate.unit, d.productionRate.value))
      .reduce((sum, kw) => sum + kw, 0);

    return new Energy(totalKw, EnergyUnit.kW);
  }
}
