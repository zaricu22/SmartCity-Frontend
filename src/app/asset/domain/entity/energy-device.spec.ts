import { EnergyDevice } from './energy-device';
import { Energy } from '../value-object/energy';
import { DeviceType } from '../shared/enums/device-type.enum';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { ValidationException } from '../exception/validation.exception';
import { DeviceCapacityLimitException } from '../exception/device-capacity-limit.exception';
import { ErrorCode } from '../shared/enums/error-code.enum';

describe('EnergyDevice', () => {
  const capacity = new Energy(100, EnergyUnit.kW);

  describe('constructor', () => {
    it('should create with valid arguments', () => {
      const device = new EnergyDevice('id-1', DeviceType.SOLAR, capacity);
      expect(device.id).toBe('id-1');
      expect(device.type).toBe(DeviceType.SOLAR);
      expect(device.deviceRatedCapacity).toBe(capacity);
      expect(device.productionRate.value).toBe(0);
    });

    it('should throw when type is null', () => {
      let error: unknown;
      try { new EnergyDevice('id-1', null as any, capacity); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.DEVICE_TYPE_REQUIRED);
    });

    it('should throw when capacity is null', () => {
      let error: unknown;
      try { new EnergyDevice('id-1', DeviceType.SOLAR, null as any); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.DEVICE_CAPACITY_REQUIRED);
    });

    it('should initialise production rate to 0 kW', () => {
      const device = new EnergyDevice('id-1', DeviceType.BATTERY, capacity);
      expect(device.productionRate.value).toBe(0);
      expect(device.productionRate.unit).toBe(EnergyUnit.kW);
    });
  });

  describe('changeProduction()', () => {
    it('should update production rate within capacity', () => {
      const device = new EnergyDevice('id-1', DeviceType.SOLAR, capacity);
      device.changeProduction(new Energy(50, EnergyUnit.kW));
      expect(device.productionRate.value).toBe(50);
    });

    it('should allow production equal to rated capacity', () => {
      const device = new EnergyDevice('id-1', DeviceType.SOLAR, capacity);
      expect(() => device.changeProduction(new Energy(100, EnergyUnit.kW))).not.toThrow();
    });

    it('should throw DeviceCapacityLimitException when production exceeds capacity', () => {
      const device = new EnergyDevice('id-1', DeviceType.SOLAR, capacity);
      expect(() => device.changeProduction(new Energy(101, EnergyUnit.kW)))
        .toThrow(DeviceCapacityLimitException);
    });

    it('should throw when production in larger unit exceeds capacity', () => {
      const device = new EnergyDevice('id-1', DeviceType.SOLAR, capacity); // 100 kW
      expect(() => device.changeProduction(new Energy(1, EnergyUnit.MW))) // 1000 kW
        .toThrow(DeviceCapacityLimitException);
    });
  });

  describe('equals()', () => {
    it('should be equal when ids match', () => {
      const a = new EnergyDevice('same-id', DeviceType.SOLAR, capacity);
      const b = new EnergyDevice('same-id', DeviceType.PUMP, new Energy(200, EnergyUnit.kW));
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal when ids differ', () => {
      const a = new EnergyDevice('id-1', DeviceType.SOLAR, capacity);
      const b = new EnergyDevice('id-2', DeviceType.SOLAR, capacity);
      expect(a.equals(b)).toBe(false);
    });
  });
});
