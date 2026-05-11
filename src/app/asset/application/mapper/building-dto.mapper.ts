import { PublicBuilding } from '../../domain/aggregate/public-building';
import { EnergyDeviceDto } from '../dto/energy-device.dto';
import { PublicBuildingDto } from '../dto/public-building.dto';

export class BuildingDtoMapper {
  private constructor() {}

  static toDto(building: PublicBuilding): PublicBuildingDto {
    return {
      id: building.id,
      name: building.name,
      location: building.location,
      consumptionValue: building.consumption.value,
      consumptionUnit: building.consumption.unit,
      devices: building.devices.map(
        (d): EnergyDeviceDto => ({
          id: d.id,
          type: d.type,
          ratedCapacityValue: d.deviceRatedCapacity.value,
          ratedCapacityUnit: d.deviceRatedCapacity.unit,
          productionRateValue: d.productionRate.value,
          productionRateUnit: d.productionRate.unit,
        }),
      ),
    };
  }
}
