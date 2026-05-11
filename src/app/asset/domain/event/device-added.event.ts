import { DeviceType } from '../shared/enums/device-type.enum';

export interface DeviceAddedEvent {
  readonly type: 'DEVICE_ADDED';
  readonly buildingId: string;
  readonly deviceId: string;
  readonly deviceType: DeviceType;
}
