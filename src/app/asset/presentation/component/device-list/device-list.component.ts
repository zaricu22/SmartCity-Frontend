import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideSun, LucideBatteryCharging, LucideWaves, LucideCpu } from '@lucide/angular';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { EnergyPipe } from '../../../../shared/presentation/pipe/energy.pipe';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [EnergyPipe, LucideSun, LucideBatteryCharging, LucideWaves, LucideCpu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.component.html',
  styleUrl: './device-list.component.css',
})
export class DeviceListComponent {
  devices = input<EnergyDeviceDto[]>([]);
}
