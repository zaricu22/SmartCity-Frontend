import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class DeviceAlreadyExistsException extends DomainException {
  constructor() {
    super('Uredjaj vec postoji!', ErrorCode.DEVICE_ALREADY_EXISTS);
    this.name = 'DeviceAlreadyExistsException';
  }
}
