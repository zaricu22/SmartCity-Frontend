import { ErrorCode } from '../shared/enums/error-code.enum';
import { DomainException } from './domain.exception';

export class BuildingTotalCapacityExceededException extends DomainException {
  constructor() {
    super('Potrosnja premasuje ukupni kapacitet ustanove!', ErrorCode.TOTAL_CAPACITY_EXCEEDED);
    this.name = 'BuildingTotalCapacityExceededException';
  }
}
