import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class DeviceInUseException extends DomainException {
  constructor() {
    super('Aktivan uredjaj ne moze biti uklonjen!', ErrorCode.DEVICE_IN_USE);
    this.name = 'DeviceInUseException';
  }
}