import { Energy } from './energy';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { ValidationException } from '../exception/validation.exception';
import { ErrorCode } from '../shared/enums/error-code.enum';

describe('Energy', () => {
  describe('constructor', () => {
    it('should create with valid value and unit', () => {
      const e = new Energy(10, EnergyUnit.kW);
      expect(e.value).toBe(10);
      expect(e.unit).toBe(EnergyUnit.kW);
    });

    it('should allow zero value', () => {
      expect(() => new Energy(0, EnergyUnit.kW)).not.toThrow();
    });

    it('should throw ValidationException for null value', () => {
      expect(() => new Energy(null as any, EnergyUnit.kW))
        .toThrowMatching(e => e instanceof ValidationException && e.errorCode === ErrorCode.ENERGY_VALUE_REQUIRED);
    });

    it('should throw ValidationException for null unit', () => {
      expect(() => new Energy(10, null as any))
        .toThrowMatching(e => e instanceof ValidationException && e.errorCode === ErrorCode.ENERGY_UNIT_REQUIRED);
    });

    it('should throw ValidationException for negative value', () => {
      expect(() => new Energy(-1, EnergyUnit.kW))
        .toThrowMatching(e => e instanceof ValidationException && e.errorCode === ErrorCode.ENERGY_NEGATIVE);
    });
  });

  describe('to()', () => {
    it('should return the same instance when target unit equals current unit', () => {
      const e = new Energy(10, EnergyUnit.kW);
      expect(e.to(EnergyUnit.kW)).toBe(e);
    });

    it('should convert kW to MW', () => {
      const converted = new Energy(1000, EnergyUnit.kW).to(EnergyUnit.MW);
      expect(converted.value).toBe(1);
      expect(converted.unit).toBe(EnergyUnit.MW);
    });

    it('should convert MW to kW', () => {
      const converted = new Energy(2, EnergyUnit.MW).to(EnergyUnit.kW);
      expect(converted.value).toBe(2000);
      expect(converted.unit).toBe(EnergyUnit.kW);
    });

    it('should convert GW to kW', () => {
      const converted = new Energy(1, EnergyUnit.GW).to(EnergyUnit.kW);
      expect(converted.value).toBe(1_000_000);
    });
  });

  describe('compareTo()', () => {
    it('should return 0 for equal energies in same unit', () => {
      expect(new Energy(10, EnergyUnit.kW).compareTo(new Energy(10, EnergyUnit.kW))).toBe(0);
    });

    it('should return 0 for equal energies in different units', () => {
      expect(new Energy(1, EnergyUnit.MW).compareTo(new Energy(1000, EnergyUnit.kW))).toBe(0);
    });

    it('should return positive when this is greater', () => {
      expect(new Energy(20, EnergyUnit.kW).compareTo(new Energy(10, EnergyUnit.kW))).toBeGreaterThan(0);
    });

    it('should return negative when this is less', () => {
      expect(new Energy(5, EnergyUnit.kW).compareTo(new Energy(10, EnergyUnit.kW))).toBeLessThan(0);
    });
  });

  describe('greaterThan()', () => {
    it('should return true when greater', () => {
      expect(new Energy(20, EnergyUnit.kW).greaterThan(new Energy(10, EnergyUnit.kW))).toBeTrue();
    });

    it('should return false when equal', () => {
      expect(new Energy(10, EnergyUnit.kW).greaterThan(new Energy(10, EnergyUnit.kW))).toBeFalse();
    });

    it('should return false when less', () => {
      expect(new Energy(5, EnergyUnit.kW).greaterThan(new Energy(10, EnergyUnit.kW))).toBeFalse();
    });

    it('should compare across units correctly', () => {
      // 1 MW > 999 kW
      expect(new Energy(1, EnergyUnit.MW).greaterThan(new Energy(999, EnergyUnit.kW))).toBeTrue();
    });
  });

  describe('lessThan()', () => {
    it('should return true when less', () => {
      expect(new Energy(5, EnergyUnit.kW).lessThan(new Energy(10, EnergyUnit.kW))).toBeTrue();
    });

    it('should return false when equal', () => {
      expect(new Energy(10, EnergyUnit.kW).lessThan(new Energy(10, EnergyUnit.kW))).toBeFalse();
    });
  });

  describe('equals()', () => {
    it('should return true for same value and unit', () => {
      expect(new Energy(10, EnergyUnit.kW).equals(new Energy(10, EnergyUnit.kW))).toBeTrue();
    });

    it('should return true for equivalent values in different units', () => {
      expect(new Energy(1, EnergyUnit.MW).equals(new Energy(1000, EnergyUnit.kW))).toBeTrue();
    });

    it('should return false for different values', () => {
      expect(new Energy(10, EnergyUnit.kW).equals(new Energy(20, EnergyUnit.kW))).toBeFalse();
    });
  });
});
