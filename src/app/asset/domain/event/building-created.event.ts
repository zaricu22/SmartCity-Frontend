import type { DomainEvent } from './domain-event';

export interface BuildingCreatedEvent extends DomainEvent {
  readonly type: 'BUILDING_CREATED';
  readonly buildingId: string;
  readonly name: string;
  readonly location: string;
}
