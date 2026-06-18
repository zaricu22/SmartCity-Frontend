import { PublicBuilding } from './public-building';
import { EnergyDevice } from '../entity/energy-device';
import { Energy } from '../value-object/energy';
import { DeviceType } from '../shared/enums/device-type.enum';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { ValidationException } from '../exception/validation.exception';
import { DeviceAlreadyExistsException } from '../exception/device-already-exists.exception';
import { DeviceNotFoundException } from '../exception/device-not-found.exception';
import { BuildingTotalCapacityExceededException } from '../exception/building-total-capacity-exceeded.exception';

describe('PublicBuilding', () => {
  const makeBuilding = () => new PublicBuilding('b-1', 'City Hall', 'Zone A - Main St');
  const makeDevice = (id: string, capacityKw: number) =>
    new EnergyDevice(id, DeviceType.SOLAR, new Energy(capacityKw, EnergyUnit.kW));

  describe('constructor', () => {
    it('should create with valid arguments', () => {
      const b = makeBuilding();
      expect(b.id).toBe('b-1');
      expect(b.name).toBe('City Hall');
      expect(b.location).toBe('Zone A - Main St');
      expect(b.devices.length).toBe(0);
      expect(b.consumption.value).toBe(0);
    });

    it('should throw ValidationException when name is empty', () => {
      let error: unknown;
      try { new PublicBuilding('id', '', 'Zone A'); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_NAME_EMPTY);
    });

    it('should throw ValidationException when name is whitespace', () => {
      let error: unknown;
      try { new PublicBuilding('id', '   ', 'Zone A'); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_NAME_EMPTY);
    });

    it('should throw ValidationException when location is empty', () => {
      let error: unknown;
      try { new PublicBuilding('id', 'Hall', ''); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_ADDRESS_EMPTY);
    });
  });

  describe('addDevice()', () => {
    it('should add a device', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      expect(b.devices.length).toBe(1);
    });

    it('should emit DeviceAddedEvent', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect((events[0] as any).deviceId).toBe('d-1');
    });

    it('should throw DeviceAlreadyExistsException when adding duplicate id', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      expect(() => b.addDevice(makeDevice('d-1', 50))).toThrow(DeviceAlreadyExistsException);
    });

    it('should return immutable devices array', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      const devices = b.devices;
      // modifying the returned array should not affect the aggregate
      (devices as any[]).push(makeDevice('d-2', 50));
      expect(b.devices.length).toBe(1);
    });
  });

  describe('changeConsumption()', () => {
    it('should update consumption within total capacity', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeConsumption(new Energy(80, EnergyUnit.kW));
      expect(b.consumption.value).toBe(80);
    });

    it('should allow consumption equal to total capacity', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(100, EnergyUnit.kW))).not.toThrow();
    });

    it('should throw BuildingTotalCapacityExceededException when consumption exceeds capacity', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(101, EnergyUnit.kW))).toThrow(BuildingTotalCapacityExceededException);
    });

    it('should aggregate capacity across multiple devices', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.addDevice(makeDevice('d-2', 200));
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(300, EnergyUnit.kW))).not.toThrow();
    });

    it('should aggregate capacity across different units', () => {
      const b = makeBuilding();
      b.addDevice(new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(1, EnergyUnit.MW))); // 1000 kW
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(1000, EnergyUnit.kW))).not.toThrow();
    });

    it('should emit ConsumptionChangedEvent', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeConsumption(new Energy(50, EnergyUnit.kW));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect((events[0] as any).newConsumption.value).toBe(50);
    });
  });

  describe('changeDeviceProduction()', () => {
    it('should delegate to the correct device', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeDeviceProduction('d-1', new Energy(60, EnergyUnit.kW));
      expect(b.devices[0].productionRate.value).toBe(60);
    });

    it('should throw DeviceNotFoundException for unknown deviceId', () => {
      const b = makeBuilding();
      expect(() => b.changeDeviceProduction('unknown', new Energy(10, EnergyUnit.kW))).toThrow(DeviceNotFoundException);
    });

    it('should emit ProductionChangedEvent with deviceId and newProduction', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeDeviceProduction('d-1', new Energy(60, EnergyUnit.kW));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('PRODUCTION_CHANGED');
      expect((events[0] as any).deviceId).toBe('d-1');
      expect((events[0] as any).newProduction.value).toBe(60);
    });
  });

  describe('pullEvents()', () => {
    it('should clear events after pulling', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      expect(b.pullEvents().length).toBe(0);
    });

    it('should return all accumulated events', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.addDevice(makeDevice('d-2', 50));
      expect(b.pullEvents().length).toBe(2);
    });
  });
});
