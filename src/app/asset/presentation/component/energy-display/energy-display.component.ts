import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';
import { EnergyPipe } from '../../../../shared/presentation/pipe/energy.pipe';

@Component({
  selector: 'app-energy-display',
  standalone: true,
  imports: [EnergyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './energy-display.component.html',
  styleUrl: './energy-display.component.css',
})
export class EnergyDisplayComponent {
  value = input.required<number>();
  unit = input.required<EnergyUnit>();
  // Optional — when bound, renders an SVG progress ring instead of the plain
  // static badge (see building-detail.component.css). Left unbound (undefined)
  // wherever this component is used inline (e.g. building-card), which keeps
  // the plain-text/static-border look unchanged there.
  percent = input<number>();

  readonly ringRadius = 42;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;

  // Clamped to [0, 100] — consumption can theoretically exceed total device
  // capacity if devices are removed after consumption was set (the domain only
  // validates against capacity at the moment changeConsumption() is called),
  // so this guards the ring from visually overflowing rather than reflecting
  // that edge case as fact.
  readonly ringOffset = computed(() => {
    const pct = this.percent();
    if (pct === undefined || !isFinite(pct)) return this.ringCircumference;
    const clamped = Math.min(100, Math.max(0, pct));
    return this.ringCircumference * (1 - clamped / 100);
  });
}
