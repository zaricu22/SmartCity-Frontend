import { SubsidyEligibilitySpecification } from './subsidy-eligibility.specification';
import { PublicBuilding } from '../aggregate/public-building';
import { EnergyDevice } from '../entity/energy-device';
import { Energy } from '../value-object/energy';
import { DeviceType } from '../shared/enums/device-type.enum';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';

describe('SubsidyEligibilitySpecification', () => {
  const spec = new SubsidyEligibilitySpecification();

  const makeBuilding = (location: string) => new PublicBuilding('b-1', 'Hall', location);
  const makeDevice = (id: string) =>
    new EnergyDevice(id, 'Test Device', DeviceType.SOLAR, new Energy(200, EnergyUnit.kW));
  // Adds a device and immediately sets its production rate to match its capacity — needed
  // since changeConsumption() checks production rate, not rated capacity.
  const addProducingDevice = (building: PublicBuilding, id: string) => {
    building.addDevice(makeDevice(id));
    building.changeDeviceProduction(id, new Energy(200, EnergyUnit.kW));
  };

  const eligibleBuilding = (): PublicBuilding => {
    const b = makeBuilding('Zone A - Downtown');
    addProducingDevice(b, 'd-1');
    addProducingDevice(b, 'd-2');
    b.pullEvents();
    b.changeConsumption(new Energy(51, EnergyUnit.kW));
    b.pullEvents();
    return b;
  };

  it('should be satisfied for an eligible building', () => {
    expect(spec.isSatisfiedBy(eligibleBuilding())).toBe(true);
  });

  it('should not be satisfied with fewer than 2 devices', () => {
    const b = makeBuilding('Zone A - Downtown');
    addProducingDevice(b, 'd-1');
    b.pullEvents();
    b.changeConsumption(new Energy(51, EnergyUnit.kW));
    b.pullEvents();
    expect(spec.isSatisfiedBy(b)).toBe(false);
  });

  it('should not be satisfied when consumption does not exceed 50 kW', () => {
    const b = makeBuilding('Zone A - Downtown');
    addProducingDevice(b, 'd-1');
    addProducingDevice(b, 'd-2');
    b.pullEvents();
    b.changeConsumption(new Energy(50, EnergyUnit.kW)); // exactly 50 — not strictly greater
    b.pullEvents();
    expect(spec.isSatisfiedBy(b)).toBe(false);
  });

  it('should not be satisfied when location is not Zone A', () => {
    const b = makeBuilding('Zone B - Suburb');
    addProducingDevice(b, 'd-1');
    addProducingDevice(b, 'd-2');
    b.pullEvents();
    b.changeConsumption(new Energy(51, EnergyUnit.kW));
    b.pullEvents();
    expect(spec.isSatisfiedBy(b)).toBe(false);
  });
});
