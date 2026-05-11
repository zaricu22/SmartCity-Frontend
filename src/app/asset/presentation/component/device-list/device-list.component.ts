import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EnergyDeviceDto } from '../../../application/dto/energy-device.dto';
import { EnergyPipe } from '../../../../shared/presentation/pipe/energy.pipe';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [EnergyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.component.html',
})
export class DeviceListComponent {
  devices = input<EnergyDeviceDto[]>([]);
}
