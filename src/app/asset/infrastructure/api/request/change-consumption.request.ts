import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

export interface ChangeConsumptionRequest {
  consumptionValue: number;
  consumptionUnit: EnergyUnit;
}
