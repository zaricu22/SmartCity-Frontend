import { PublicBuilding } from './public-building';
import { EnergyDevice } from '../entity/energy-device';
import { Energy } from '../value-object/energy';
import { DeviceType } from '../shared/enums/device-type.enum';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { ErrorCode } from '../shared/enums/error-code.enum';
import { ValidationException } from '../exception/validation.exception';
import { DeviceAlreadyExistsException } from '../exception/device-already-exists.exception';
import { DeviceNotFoundException } from '../exception/device-not-found.exception';
import { BuildingProductionRateExceededException } from '../exception/building-production-rate-exceeded.exception';
import { DeviceInUseException } from '../exception/device-in-use-exception';

describe('PublicBuilding', () => {
  const makeBuilding = () => new PublicBuilding('b-1', 'City Hall', 'Zone A - Main St');
  const makeDevice = (id: string, capacityKw: number) =>
    new EnergyDevice(id, 'Test Device', DeviceType.SOLAR, new Energy(capacityKw, EnergyUnit.kW));
  // Adds a device and immediately sets its production rate to match its capacity — the
  // "fully producing" fixture shape every changeConsumption() test needs now that the
  // invariant checks production rate instead of rated capacity.
  const addProducingDevice = (building: PublicBuilding, id: string, capacityKw: number) => {
    building.addDevice(makeDevice(id, capacityKw));
    building.changeDeviceProduction(id, new Energy(capacityKw, EnergyUnit.kW));
  };

  describe('constructor', () => {
    it('should create with valid arguments', () => {
      const b = makeBuilding();
      expect(b.id).toBe('b-1');
      expect(b.name).toBe('City Hall');
      expect(b.location).toBe('Zone A - Main St');
      expect(b.devices.length).toBe(0);
      expect(b.consumption.value).toBe(0);
      expect(b.version).toBe(0);
    });

    it('rejects creating a building with an empty name', () => {
      let error: unknown;
      try { new PublicBuilding('id', '', 'Zone A'); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_NAME_EMPTY);
    });

    it('rejects creating a building whose name is only whitespace', () => {
      let error: unknown;
      try { new PublicBuilding('id', '   ', 'Zone A'); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_NAME_EMPTY);
    });

    it('rejects creating a building with an empty location', () => {
      let error: unknown;
      try { new PublicBuilding('id', 'Hall', ''); } catch(e) { error = e; }
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errorCode).toBe(ErrorCode.BUILDING_ADDRESS_EMPTY);
    });

    it('notifies listeners of the new building id, name, and location right after it is created', () => {
      const b = makeBuilding();
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      // pullEvents() returns the DomainEvent base type, not the specific event subtype, so
      // reading payload fields needs a cast — used throughout this file for the same reason.
      expect(events[0].type).toBe('BUILDING_CREATED');
      expect((events[0] as any).buildingId).toBe('b-1');
      expect((events[0] as any).name).toBe('City Hall');
      expect((events[0] as any).location).toBe('Zone A - Main St');
    });
  });

  describe('addDevice()', () => {
    it('should add a device', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      expect(b.devices.length).toBe(1);
    });

    it('notifies listeners which device was added to the building', () => {
      const b = makeBuilding();
      b.pullEvents(); // drain BUILDING_CREATED from construction
      b.addDevice(makeDevice('d-1', 100));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect((events[0] as any).deviceId).toBe('d-1');
    });

    it('rejects adding a device whose id is already used by another device in the building', () => {
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

  describe('removeDevice()', () => {
    it('should remove a device', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.removeDevice('d-1');
      expect(b.devices.length).toBe(0);
    });

    it('rejects removing a device that is not part of the building', () => {
      const b = makeBuilding();
      expect(() => b.removeDevice('unknown')).toThrow(DeviceNotFoundException);
    });

    it('notifies listeners which device was removed, including its name and type', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.removeDevice('d-1');
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('DEVICE_REMOVED');
      expect((events[0] as any).buildingId).toBe('b-1');
      expect((events[0] as any).deviceId).toBe('d-1');
      expect((events[0] as any).deviceName).toBe('Test Device');
      expect((events[0] as any).deviceType).toBe(DeviceType.SOLAR);
    });

    it('should only remove the matching device when multiple exist', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.addDevice(makeDevice('d-2', 50));
      b.pullEvents();
      b.removeDevice('d-1');
      expect(b.devices.length).toBe(1);
      expect(b.devices[0].id).toBe('d-2');
    });

    it('rejects removing a device whose production the current consumption still depends on', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      b.changeConsumption(new Energy(100, EnergyUnit.kW));
      b.pullEvents();
      expect(() => b.removeDevice('d-1')).toThrow(DeviceInUseException);
      expect(b.devices.length).toBe(1);
    });

    it('allows removing a producing device when the remaining devices still cover current consumption', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      addProducingDevice(b, 'd-2', 50);
      b.changeConsumption(new Energy(50, EnergyUnit.kW));
      b.pullEvents();
      b.removeDevice('d-1');
      expect(b.devices.length).toBe(1);
      expect(b.devices[0].id).toBe('d-2');
    });
  });

  describe('changeConsumption()', () => {
    it('should update consumption within total production rate', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      b.pullEvents();
      b.changeConsumption(new Energy(80, EnergyUnit.kW));
      expect(b.consumption.value).toBe(80);
    });

    it('should allow consumption equal to total production rate', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(100, EnergyUnit.kW))).not.toThrow();
    });

    it('rejects consumption that goes even 1 kW above the total production rate, unlike consumption exactly at the limit', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(101, EnergyUnit.kW))).toThrow(BuildingProductionRateExceededException);
    });

    it('should aggregate production rate across multiple devices', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      addProducingDevice(b, 'd-2', 200);
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(300, EnergyUnit.kW))).not.toThrow();
    });

    it('allows 1000 kW consumption against a single 1 MW device — production rate is unit-converted, not just summed as raw numbers', () => {
      const b = makeBuilding();
      b.addDevice(new EnergyDevice('d-1', 'Test Device', DeviceType.SOLAR, new Energy(1, EnergyUnit.MW))); // 1000 kW
      b.changeDeviceProduction('d-1', new Energy(1, EnergyUnit.MW));
      b.pullEvents();
      expect(() => b.changeConsumption(new Energy(1000, EnergyUnit.kW))).not.toThrow();
    });

    it('notifies listeners of the new consumption value after it changes', () => {
      const b = makeBuilding();
      addProducingDevice(b, 'd-1', 100);
      b.pullEvents();
      b.changeConsumption(new Energy(50, EnergyUnit.kW));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect((events[0] as any).newConsumption.value).toBe(50);
    });
  });

  describe('changeDeviceProduction()', () => {
    it('updates the production rate of the device matching the given id', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeDeviceProduction('d-1', new Energy(60, EnergyUnit.kW));
      expect(b.devices[0].productionRate.value).toBe(60);
    });

    it('rejects changing production for a device that is not part of the building', () => {
      const b = makeBuilding();
      expect(() => b.changeDeviceProduction('unknown', new Energy(10, EnergyUnit.kW))).toThrow(DeviceNotFoundException);
    });

    it('notifies listeners which device changed production and its old and new values', () => {
      const b = makeBuilding();
      b.addDevice(makeDevice('d-1', 100));
      b.pullEvents();
      b.changeDeviceProduction('d-1', new Energy(60, EnergyUnit.kW));
      const events = b.pullEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('PRODUCTION_CHANGED');
      expect((events[0] as any).deviceId).toBe('d-1');
      expect((events[0] as any).oldProduction.value).toBe(0);
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
      // BUILDING_CREATED (from construction) + 2x DEVICE_ADDED
      expect(b.pullEvents().length).toBe(3);
    });
  });
});
