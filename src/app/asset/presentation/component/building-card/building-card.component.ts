import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideZap } from '@lucide/angular';
import { PublicBuildingDto } from '../../../application/dto/public-building.dto';
import { EnergyDisplayComponent } from '../energy-display/energy-display.component';

@Component({
  selector: 'app-building-card',
  standalone: true,
  imports: [RouterLink, EnergyDisplayComponent, LucideZap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './building-card.component.html',
  styleUrl: './building-card.component.css',
})
export class BuildingCardComponent {
  building = input.required<PublicBuildingDto>();

  // computed() — memoized; recalculates only when the building signal changes, not on every render
  deviceSummary = computed(() => {
    const count = this.building().devices.length;
    return count === 1 ? '1 device' : `${count} devices`;
  });
}
