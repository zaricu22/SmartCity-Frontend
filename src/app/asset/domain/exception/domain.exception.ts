import { ErrorCode } from '../shared/enums/error-code.enum';

export class DomainException extends Error {
  constructor(
    message: string,
    public readonly errorCode: ErrorCode,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
