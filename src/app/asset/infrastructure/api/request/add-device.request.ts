import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

export interface AddDeviceRequest {
  type: DeviceType;
  ratedCapacityValue: number;
  ratedCapacityUnit: EnergyUnit;
}
