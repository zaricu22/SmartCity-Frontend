import { EnergyDevice } from '../../../domain/entity/energy-device';
import { PublicBuilding } from '../../../domain/aggregate/public-building';
import { Energy } from '../../../domain/value-object/energy';
import { PublicBuildingResponse } from '../response/public-building.response';

export class BuildingResponseMapper {
  private constructor() {}

  static toDomain(response: PublicBuildingResponse): PublicBuilding {
    const building = new PublicBuilding(response.id, response.name, response.location);

    response.devices.forEach(d => {
      const device = new EnergyDevice(d.id, d.type, new Energy(d.ratedCapacityValue, d.ratedCapacityUnit));
      // Constructor initialises productionRate to Energy(0, kW) — skip zero to avoid a redundant
      // changeProduction() call and domain validation firing during reconstruction.
      if (d.productionRateValue > 0) {
        device.changeProduction(new Energy(d.productionRateValue, d.productionRateUnit));
      }
      building.addDevice(device);
    });

    // Discard events accumulated during reconstruction — addDevice() registers DEVICE_ADDED events
    // that must not be published for objects loaded from the DB.
    building.pullEvents();

    // Constructor initialises consumption to Energy(0, kW) — skip zero to avoid the capacity check
    // (domain validation) firing against an empty device list during reconstruction.
    if (response.consumptionValue > 0) {
      // Bypass domain rule for reconstruction — directly set consumption via a raw cast
      // In a larger project this would be a static factory method: PublicBuilding.reconstitute(...)
      (building as any)['_consumption'] = new Energy(response.consumptionValue, response.consumptionUnit);
    }

    return building;
  }

  static toDomainList(responses: PublicBuildingResponse[]): PublicBuilding[] {
    return responses.map(BuildingResponseMapper.toDomain);
  }
}
