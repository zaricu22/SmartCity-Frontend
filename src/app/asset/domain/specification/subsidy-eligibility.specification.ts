import { PublicBuilding } from '../aggregate/public-building';
import { EnergyUnit } from '../shared/enums/energy-unit.enum';
import { Energy } from '../value-object/energy';

/**
 * DDD Specification — encapsulates the business rule for government energy subsidy eligibility.
 *
 * A building is eligible if:
 *   - it has at least 2 energy devices
 *   - its consumption exceeds 50 kW
 *   - it is located in Zone A
 *
 * Purpose: centralizes this rule so it can be reused across multiple services without
 * duplication and complex if-logic. The rule is defined once, tested once, and injected wherever needed.
 */
export class SubsidyEligibilitySpecification {
  private static readonly MIN_CONSUMPTION = new Energy(50, EnergyUnit.kW);
  private static readonly MIN_DEVICES = 2;
  private static readonly ELIGIBLE_ZONE = 'Zone A';

  isSatisfiedBy(building: PublicBuilding): boolean {
    return (
      building.devices.length >= SubsidyEligibilitySpecification.MIN_DEVICES &&
      building.consumption.greaterThan(SubsidyEligibilitySpecification.MIN_CONSUMPTION) &&
      building.location.startsWith(SubsidyEligibilitySpecification.ELIGIBLE_ZONE)
    );
  }
}
