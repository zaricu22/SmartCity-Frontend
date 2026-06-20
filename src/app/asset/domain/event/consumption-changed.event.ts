import { Energy } from '../value-object/energy';
import type { DomainEvent } from './domain-event';

export interface ConsumptionChangedEvent extends DomainEvent {
  readonly type: 'CONSUMPTION_CHANGED';
  readonly buildingId: string;
  readonly oldConsumption: Energy;
  readonly newConsumption: Energy;
}
