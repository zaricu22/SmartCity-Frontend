import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class BuildingProductionRateExceededException extends DomainException {
  constructor() {
    super('Potrosnja premasuje ukupnu proizvodnju ustanove!', ErrorCode.PRODUCTION_RATE_EXCEEDED);
    this.name = 'BuildingProductionRateExceededException';
  }
}
