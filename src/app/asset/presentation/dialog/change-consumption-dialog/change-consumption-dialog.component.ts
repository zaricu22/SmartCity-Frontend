import { Component, inject, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EnergyUnit } from '../../../application/shared/enums/energy-unit.enum';

export interface ChangeConsumptionDialogResult {
  readonly consumptionValue: number;
  readonly consumptionUnit: EnergyUnit;
}

@Component({
  selector: 'app-change-consumption-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-consumption-dialog.component.html',
})
export class ChangeConsumptionDialogComponent {
  readonly confirm = output<ChangeConsumptionDialogResult>();
  readonly cancel = output<void>();

  readonly energyUnits = Object.values(EnergyUnit);

  form = inject(FormBuilder).nonNullable.group({
    consumptionValue: [0,           [Validators.required, Validators.min(0)]],
    consumptionUnit:  [EnergyUnit.kW, [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.confirm.emit(this.form.getRawValue());
  }
}
