import { EnergyDevice } from '../entity/energy-device';
import { ConsumptionChangedEvent } from '../event/consumption-changed.event';
import { DeviceAddedEvent } from '../event/device-added.event';
import { ProductionChangedEvent } from '../event/production-changed.event';
import { BuildingTotalCapacityExceededException } from '../exception/building-total-capacity-exceeded.exception';
import { DeviceAlreadyExistsException } from '../exception/device-already-exists.exception';
import { DeviceNotFoundException } from '../exception/device-not-found.exception';
import { ValidationException } from '../exception/validation.exception';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { EnergyUnit, toKW } from '../shared/enums/energy-unit.enum';
import { Energy } from '../value-object/energy';

export class PublicBuilding {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _location: string;
  private _consumption: Energy;
  private readonly _devices: EnergyDevice[];
  private readonly _domainEvents: (DeviceAddedEvent | ConsumptionChangedEvent | ProductionChangedEvent)[] = [];

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
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get location(): string { return this._location; }
  get consumption(): Energy { return this._consumption; }
  // Defensive copy — callers cannot mutate the aggregate's internal device list.
  get devices(): readonly EnergyDevice[] { return [...this._devices]; }

  pullEvents(): (DeviceAddedEvent | ConsumptionChangedEvent | ProductionChangedEvent)[] {
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
      deviceType: newDevice.type,
    } satisfies DeviceAddedEvent);
  }

  changeConsumption(newConsumptionRate: Energy): void {
    if (newConsumptionRate.greaterThan(this.calculateTotalCapacity())) {
      throw new BuildingTotalCapacityExceededException();
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
    device.changeProduction(production);
    this._domainEvents.push({
      type: 'PRODUCTION_CHANGED',
      buildingId: this._id,
      deviceId,
      newProduction: production,
    } satisfies ProductionChangedEvent);
  }

  private calculateTotalCapacity(): Energy {
    const totalKw = this._devices
      .map(d => toKW(d.deviceRatedCapacity.unit, d.deviceRatedCapacity.value))
      .reduce((sum, kw) => sum + kw, 0);

    return new Energy(totalKw, EnergyUnit.kW);
  }
}
