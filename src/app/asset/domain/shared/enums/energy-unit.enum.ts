// For bigger projects domain enums should not be used outside — every layer needs its own enum and mapper (pragmatic DDD)
export enum EnergyUnit {
  kW = 'kW',
  MW = 'MW',
  GW = 'GW',
}

const TO_KW_FACTOR: Record<EnergyUnit, number> = {
  [EnergyUnit.kW]: 1,
  [EnergyUnit.MW]: 1_000,
  [EnergyUnit.GW]: 1_000_000,
};

export function toKW(unit: EnergyUnit, value: number): number {
  return value * TO_KW_FACTOR[unit];
}

export function fromKW(unit: EnergyUnit, valueKW: number): number {
  return valueKW / TO_KW_FACTOR[unit];
}
