import { DeviceType } from '../shared/enums/device-type.enum';
import type { DomainEvent } from './domain-event';

export interface DeviceRemovedEvent extends DomainEvent {
  readonly type: 'DEVICE_REMOVED';
  readonly buildingId: string;
  readonly deviceId: string;
  readonly deviceType: DeviceType;
}
