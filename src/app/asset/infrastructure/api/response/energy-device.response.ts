import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

export interface EnergyDeviceResponse {
  id: string;
  name: string;
  type: DeviceType;
  ratedCapacityValue: number;
  ratedCapacityUnit: EnergyUnit;
  productionRateValue: number;
  productionRateUnit: EnergyUnit;
}
