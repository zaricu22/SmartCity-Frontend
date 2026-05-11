import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

export interface ChangeProductionCommand {
  readonly productionValue: number;
  readonly productionUnit: EnergyUnit;
}
