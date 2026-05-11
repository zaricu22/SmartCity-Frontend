import { EnergyUnit, fromKW, toKW } from './energy-unit.enum';

describe('EnergyUnit helpers', () => {
  describe('toKW', () => {
    it('should return the same value for kW', () => {
      expect(toKW(EnergyUnit.kW, 5)).toBe(5);
    });

    it('should convert MW to kW', () => {
      expect(toKW(EnergyUnit.MW, 2)).toBe(2000);
    });

    it('should convert GW to kW', () => {
      expect(toKW(EnergyUnit.GW, 1)).toBe(1_000_000);
    });
  });

  describe('fromKW', () => {
    it('should return the same value for kW', () => {
      expect(fromKW(EnergyUnit.kW, 5)).toBe(5);
    });

    it('should convert kW to MW', () => {
      expect(fromKW(EnergyUnit.MW, 2000)).toBe(2);
    });

    it('should convert kW to GW', () => {
      expect(fromKW(EnergyUnit.GW, 1_000_000)).toBe(1);
    });
  });

  it('toKW and fromKW should be inverse operations', () => {
    const value = 42;
    expect(fromKW(EnergyUnit.MW, toKW(EnergyUnit.MW, value))).toBe(value);
    expect(fromKW(EnergyUnit.GW, toKW(EnergyUnit.GW, value))).toBe(value);
  });
});
