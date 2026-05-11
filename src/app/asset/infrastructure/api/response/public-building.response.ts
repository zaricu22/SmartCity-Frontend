import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { EnergyDeviceResponse } from './energy-device.response';

export interface PublicBuildingResponse {
  id: string;
  name: string;
  location: string;
  consumptionValue: number;
  consumptionUnit: EnergyUnit;
  devices: EnergyDeviceResponse[];
}
