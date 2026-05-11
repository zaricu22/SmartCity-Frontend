import { Energy } from '../value-object/energy';

export interface ConsumptionChangedEvent {
  readonly type: 'CONSUMPTION_CHANGED';
  readonly buildingId: string;
  readonly oldConsumption: Energy;
  readonly newConsumption: Energy;
}
