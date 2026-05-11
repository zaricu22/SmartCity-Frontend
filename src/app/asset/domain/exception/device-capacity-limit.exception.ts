import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class DeviceCapacityLimitException extends DomainException {
  constructor() {
    super('Produkcija premasuje kapacitet uredjaja!', ErrorCode.DEVICE_CAPACITY_OUT_OF_RANGE);
    this.name = 'DeviceCapacityLimitException';
  }
}
