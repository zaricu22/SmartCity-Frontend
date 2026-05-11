import { Pipe, PipeTransform } from '@angular/core';
import { EnergyUnit } from '../../../asset/application/shared/enums/energy-unit.enum';

@Pipe({ name: 'energy', standalone: true })
export class EnergyPipe implements PipeTransform {
  transform(value: number, unit: EnergyUnit): string {
    return `${value} ${unit}`;
  }
}
