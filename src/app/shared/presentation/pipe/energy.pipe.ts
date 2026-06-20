import { Pipe, PipeTransform } from '@angular/core';
import { EnergyUnit } from '../../../asset/domain/shared/enums/energy-unit.enum';

@Pipe({ name: 'energy', standalone: true })
export class EnergyPipe implements PipeTransform {
  transform(value: number, unit: EnergyUnit): string {
    return `${value} ${unit}`; // no locale formatting or rounding by design — add DecimalPipe here if display precision matters
  }
}
