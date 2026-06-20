import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

// Application-layer read model for a single energy device.
// Returned by PublicBuildingQueryService — contains no web or infrastructure types.
export interface EnergyDeviceDto {
  readonly id: string;
  readonly type: DeviceType;
  readonly ratedCapacityValue: number;
  readonly ratedCapacityUnit: EnergyUnit;
  readonly productionRateValue: number;
  readonly productionRateUnit: EnergyUnit;
}
