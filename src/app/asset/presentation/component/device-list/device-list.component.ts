import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideSun, LucideBatteryCharging, LucideWaves, LucideCpu, LucideTrash2 } from '@lucide/angular';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { EnergyPipe } from '../../../../shared/presentation/pipe/energy.pipe';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [EnergyPipe, LucideSun, LucideBatteryCharging, LucideWaves, LucideCpu, LucideTrash2],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.component.html',
  styleUrl: './device-list.component.css',
})
export class DeviceListComponent {
  devices = input<EnergyDeviceDto[]>([]);
  readonly removeDevice = output<string>();
}
