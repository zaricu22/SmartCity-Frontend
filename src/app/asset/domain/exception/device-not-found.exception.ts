import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class DeviceNotFoundException extends DomainException {
  constructor() {
    super('Uredjaj nije pronadjen!', ErrorCode.DEVICE_NOT_FOUND);
    this.name = 'DeviceNotFoundException';
  }
}
