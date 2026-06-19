import { BuildingResponseMapper } from './building-response.mapper';
import { PublicBuildingResponse } from '../response/public-building.response';
import { PageResponse } from '../response/page.response';
import { DeviceType } from '../../../domain/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

describe('BuildingResponseMapper', () => {
  const buildingResponse: PublicBuildingResponse = {
    id: 'b-1',
    name: 'City Hall',
    location: 'Zone A',
    consumptionValue: 50,
    consumptionUnit: EnergyUnit.kW,
    devices: [
      { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
      { id: 'd-2', type: DeviceType.PUMP, ratedCapacityValue: 200, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 0, productionRateUnit: EnergyUnit.kW },
    ],
  };

  describe('toDomain()', () => {
    it('should map id, name, and location', () => {
      const building = BuildingResponseMapper.toDomain(buildingResponse);
      expect(building.id).toBe('b-1');
      expect(building.name).toBe('City Hall');
      expect(building.location).toBe('Zone A');
    });

    it('should map devices', () => {
      const building = BuildingResponseMapper.toDomain(buildingResponse);
      expect(building.devices.length).toBe(2);
      expect(building.devices[0].id).toBe('d-1');
      expect(building.devices[0].type).toBe(DeviceType.SOLAR);
      expect(building.devices[0].deviceRatedCapacity.value).toBe(100);
      expect(building.devices[1].id).toBe('d-2');
    });

    it('should map consumption', () => {
      const building = BuildingResponseMapper.toDomain(buildingResponse);
      expect(building.consumption.value).toBe(50);
      expect(building.consumption.unit).toBe(EnergyUnit.kW);
    });

    it('should leave consumption at 0 when consumptionValue is 0', () => {
      const response: PublicBuildingResponse = { ...buildingResponse, consumptionValue: 0, devices: [] };
      const building = BuildingResponseMapper.toDomain(response);
      expect(building.consumption.value).toBe(0);
    });

    it('should produce no pending domain events after reconstruction', () => {
      const building = BuildingResponseMapper.toDomain(buildingResponse);
      expect(building.pullEvents().length).toBe(0);
    });

    it('should set productionRate when productionRateValue > 0', () => {
      const response: PublicBuildingResponse = {
        ...buildingResponse,
        devices: [
          { id: 'd-1', type: DeviceType.SOLAR, ratedCapacityValue: 100, ratedCapacityUnit: EnergyUnit.kW, productionRateValue: 75, productionRateUnit: EnergyUnit.kW },
        ],
      };
      const building = BuildingResponseMapper.toDomain(response);
      expect(building.devices[0].productionRate.value).toBe(75);
      expect(building.devices[0].productionRate.unit).toBe(EnergyUnit.kW);
    });
  });

  describe('toDomainList()', () => {
    it('should map a list of responses', () => {
      const second: PublicBuildingResponse = { ...buildingResponse, id: 'b-2', name: 'Library', devices: [] };
      const buildings = BuildingResponseMapper.toDomainList([buildingResponse, second]);
      expect(buildings.length).toBe(2);
      expect(buildings[0].id).toBe('b-1');
      expect(buildings[1].id).toBe('b-2');
    });

    it('should return empty array for empty input', () => {
      expect(BuildingResponseMapper.toDomainList([])).toEqual([]);
    });
  });

  describe('toPage()', () => {
    it('should map Spring Page envelope to Page<PublicBuilding>', () => {
      const response: PageResponse<PublicBuildingResponse> = {
        content: [buildingResponse],
        totalElements: 5,
        totalPages: 3,
        pageNumber: 1,
        pageSize: 2,
      };
      const page = BuildingResponseMapper.toPage(response);
      expect(page.content.length).toBe(1);
      expect(page.content[0].id).toBe('b-1');
      expect(page.totalElements).toBe(5);
      expect(page.totalPages).toBe(3);
      expect(page.page).toBe(1);
      expect(page.size).toBe(2);
    });

    it('should return empty content for an empty page', () => {
      const response: PageResponse<PublicBuildingResponse> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: 0,
        pageSize: 10,
      };
      const page = BuildingResponseMapper.toPage(response);
      expect(page.content).toEqual([]);
      expect(page.totalElements).toBe(0);
    });
  });
});
