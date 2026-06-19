import { Observable } from 'rxjs';
import { PublicBuilding } from '../aggregate/public-building';
import { EnergyDevice } from '../entity/energy-device';
import { Energy } from '../value-object/energy';
import { Page } from '../../shared/page';
import { PageRequest } from '../../shared/page-request';

// Abstract class used as Angular DI token — mirrors the domain repository interface from the backend
export abstract class PublicBuildingRepository {
  abstract findById(id: string): Observable<PublicBuilding>;
  abstract findAll(req: PageRequest): Observable<Page<PublicBuilding>>;
  abstract save(building: PublicBuilding): Observable<void>;
  abstract delete(id: string): Observable<void>;
  abstract addDevice(buildingId: string, device: EnergyDevice): Observable<void>;
  abstract changeConsumption(buildingId: string, consumption: Energy): Observable<void>;
  abstract changeProduction(buildingId: string, deviceId: string, production: Energy): Observable<void>;
}
