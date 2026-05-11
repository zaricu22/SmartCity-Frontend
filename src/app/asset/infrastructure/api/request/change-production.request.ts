import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

export interface ChangeProductionRequest {
  productionValue: number;
  productionUnit: EnergyUnit;
}
