import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class DeviceInUseException extends DomainException {
  constructor() {
    super('Uredjaj ne moze biti uklonjen jer trenutna potrosnja zavisi od njega!', ErrorCode.DEVICE_IN_USE);
    this.name = 'DeviceInUseException';
  }
}