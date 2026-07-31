import { DeviceType } from '../shared/enums/device-type.enum';
import type { DomainEvent } from './domain-event';

export interface DeviceAddedEvent extends DomainEvent {
  readonly type: 'DEVICE_ADDED';
  readonly buildingId: string;
  readonly deviceId: string;
  readonly deviceName: string;
  readonly deviceType: DeviceType;
}
