import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';
import { EnergyPipe } from '../../../../shared/presentation/pipe/energy.pipe';

@Component({
  selector: 'app-energy-display',
  standalone: true,
  imports: [EnergyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './energy-display.component.html',
})
export class EnergyDisplayComponent {
  value = input.required<number>();
  unit = input.required<EnergyUnit>();
}
