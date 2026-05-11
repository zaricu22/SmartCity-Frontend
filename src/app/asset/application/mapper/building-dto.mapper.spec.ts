import { BuildingDtoMapper } from './building-dto.mapper';
import { PublicBuilding } from '../../domain/aggregate/public-building';
import { EnergyDevice } from '../../domain/entity/energy-device';
import { Energy } from '../../domain/value-object/energy';
import { DeviceType } from '../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../domain/shared/enums/energy-unit.enum';

describe('BuildingDtoMapper', () => {
  describe('toDto()', () => {
    it('should map a building with no devices', () => {
      const building = new PublicBuilding('b-1', 'City Hall', 'Zone A');
      const dto = BuildingDtoMapper.toDto(building);

      expect(dto.id).toBe('b-1');
      expect(dto.name).toBe('City Hall');
      expect(dto.location).toBe('Zone A');
      expect(dto.consumptionValue).toBe(0);
      expect(dto.consumptionUnit).toBe(EnergyUnit.kW);
      expect(dto.devices).toEqual([]);
    });

    it('should map devices correctly', () => {
      const building = new PublicBuilding('b-1', 'City Hall', 'Zone A');
      building.addDevice(new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(100, EnergyUnit.kW)));
      building.pullEvents();
      const dto = BuildingDtoMapper.toDto(building);

      expect(dto.devices.length).toBe(1);
      expect(dto.devices[0].id).toBe('d-1');
      expect(dto.devices[0].type).toBe(DeviceType.SOLAR);
      expect(dto.devices[0].ratedCapacityValue).toBe(100);
      expect(dto.devices[0].ratedCapacityUnit).toBe(EnergyUnit.kW);
    });

    it('should map current consumption', () => {
      const building = new PublicBuilding('b-1', 'City Hall', 'Zone A');
      building.addDevice(new EnergyDevice('d-1', DeviceType.SOLAR, new Energy(200, EnergyUnit.kW)));
      building.pullEvents();
      building.changeConsumption(new Energy(50, EnergyUnit.kW));
      building.pullEvents();

      const dto = BuildingDtoMapper.toDto(building);
      expect(dto.consumptionValue).toBe(50);
    });
  });
});
