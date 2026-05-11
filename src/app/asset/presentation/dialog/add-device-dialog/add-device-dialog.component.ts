import { Component, inject, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PositiveNumberDirective } from '../../../../shared/presentation/directive/positive-number.directive';
import { DeviceType } from '../../../application/shared/enums/device-type.enum';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';
import { AddDeviceCommand } from '../../../application/command/add-device.command';

export type AddDeviceDialogResult = Omit<AddDeviceCommand, 'buildingId'>;

@Component({
  selector: 'app-add-device-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, PositiveNumberDirective],
  templateUrl: './add-device-dialog.component.html',
})
export class AddDeviceDialogComponent {
  readonly confirm = output<AddDeviceDialogResult>();
  readonly cancel = output<void>();

  readonly deviceTypes = Object.values(DeviceType);
  readonly energyUnits = Object.values(EnergyUnit);

  form = inject(FormBuilder).nonNullable.group({
    type:               [DeviceType.SOLAR,  [Validators.required]],
    ratedCapacityValue: [0,                 [Validators.required, Validators.min(0.01)]],
    ratedCapacityUnit:  [EnergyUnit.kW,     [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.confirm.emit(this.form.getRawValue());
  }
}
