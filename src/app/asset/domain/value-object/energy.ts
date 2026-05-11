import { EnergyUnit, fromKW, toKW } from '../shared/enums/energy-unit.enum';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { ValidationException } from '../exception/validation.exception';

// This common class is enough for all kinds of energy (consumption, production, capacity, etc.)
// For potential further expansions we can make wrapper classes
export class Energy {
  private readonly _value: number;
  private readonly _unit: EnergyUnit;

  constructor(value: number, unit: EnergyUnit) {
    if (value == null) {
      throw new ValidationException('Energija mora imati vrednost!', ErrorCode.ENERGY_VALUE_REQUIRED);
    }
    if (unit == null) {
      throw new ValidationException('Energija mora imati jedinicu!', ErrorCode.ENERGY_UNIT_REQUIRED);
    }
    if (value < 0) {
      throw new ValidationException('Energija ne moze biti negativna!', ErrorCode.ENERGY_NEGATIVE);
    }

    this._value = value;
    this._unit = unit;
  }

  get value(): number {
    return this._value;
  }

  get unit(): EnergyUnit {
    return this._unit;
  }

  to(targetUnit: EnergyUnit): Energy {
    if (this._unit === targetUnit) return this;
    const kw = toKW(this._unit, this._value);
    const converted = fromKW(targetUnit, kw);
    return new Energy(converted, targetUnit);
  }

  greaterThan(other: Energy): boolean {
    return this.compareTo(other) > 0;
  }

  lessThan(other: Energy): boolean {
    return this.compareTo(other) < 0;
  }

  compareTo(other: Energy): number {
    const thisKw = toKW(this._unit, this._value);
    const otherKw = toKW(other._unit, other._value);
    return thisKw - otherKw;
  }

  equals(other: Energy): boolean {
    return this.compareTo(other) === 0;
  }
}
