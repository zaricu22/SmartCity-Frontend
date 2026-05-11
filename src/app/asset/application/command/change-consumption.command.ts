import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

export interface ChangeConsumptionCommand {
  readonly consumptionValue: number;
  readonly consumptionUnit: EnergyUnit;
}
