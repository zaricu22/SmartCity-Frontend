import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';
import { EnergyDeviceDto } from './energy-device.dto';

// Application-layer read model for a public building.
// Returned by PublicBuildingQueryService — contains no web or infrastructure types.
export interface PublicBuildingDto {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly consumptionValue: number;
  readonly consumptionUnit: EnergyUnit;
  readonly devices: EnergyDeviceDto[];
}
