import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  constructor(message: string, errorCode: ErrorCode) {
    super(message, errorCode);
    this.name = 'ValidationException';
  }
}
