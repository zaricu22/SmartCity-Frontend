import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

export interface AddDeviceCommand {
  readonly buildingId: string;
  readonly type: DeviceType;
  readonly ratedCapacityValue: number;
  readonly ratedCapacityUnit: EnergyUnit;
}
