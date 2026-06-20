import { Energy } from '../value-object/energy';
import type { DomainEvent } from './domain-event';

export interface ProductionChangedEvent extends DomainEvent {
  readonly type: 'PRODUCTION_CHANGED';
  readonly buildingId: string;
  readonly deviceId: string;
  readonly newProduction: Energy;
}
