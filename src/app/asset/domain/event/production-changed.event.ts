import { Energy } from '../value-object/energy';

export interface ProductionChangedEvent {
  readonly type: 'PRODUCTION_CHANGED';
  readonly buildingId: string;
  readonly deviceId: string;
  readonly newProduction: Energy;
}
