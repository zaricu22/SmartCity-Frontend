import { DeviceType } from '../shared/enums/device-type.enum';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { DeviceCapacityLimitException } from '../exception/device-capacity-limit.exception';
import { ValidationException } from '../exception/validation.exception';
import { Energy } from '../value-object/energy';

export class EnergyDevice {
  private readonly _id: string;
  private readonly _type: DeviceType;
  private readonly _deviceRatedCapacity: Energy;
  private _productionRate: Energy;

  constructor(id: string, type: DeviceType, deviceRatedCapacity: Energy) {
    if (!type) {
      throw new ValidationException('Tip je obavezan!', ErrorCode.DEVICE_TYPE_REQUIRED);
    }
    if (!deviceRatedCapacity) {
      throw new ValidationException('Instalirani kapacitet je obavezan!', ErrorCode.DEVICE_CAPACITY_REQUIRED);
    }

    this._id = id;
    this._type = type;
    this._deviceRatedCapacity = deviceRatedCapacity;
    this._productionRate = new Energy(0, EnergyUnit.kW);
  }

  get id(): string { return this._id; }
  get type(): DeviceType { return this._type; }
  get deviceRatedCapacity(): Energy { return this._deviceRatedCapacity; }
  get productionRate(): Energy { return this._productionRate; }

  changeProduction(newProductionRate: Energy): void {
    if (newProductionRate.greaterThan(this._deviceRatedCapacity)) {
      throw new DeviceCapacityLimitException();
    }
    this._productionRate = newProductionRate;
  }

  equals(other: EnergyDevice): boolean {
    return this._id === other._id;
  }
}
