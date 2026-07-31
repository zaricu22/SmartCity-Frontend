import type { DomainEvent } from './domain-event';

export interface BuildingDeletedEvent extends DomainEvent {
  readonly type: 'BUILDING_DELETED';
  readonly buildingId: string;
}
