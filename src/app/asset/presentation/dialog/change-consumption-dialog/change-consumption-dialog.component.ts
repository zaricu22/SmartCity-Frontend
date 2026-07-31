import { Component, OnInit, inject, input, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EnergyUnit } from '../../../domain/shared/enums/energy-unit.enum';

export interface ChangeConsumptionDialogResult {
  readonly consumptionValue: number;
  readonly consumptionUnit: EnergyUnit;
}

@Component({
  selector: 'app-change-consumption-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-consumption-dialog.component.html',
  styleUrl: './change-consumption-dialog.component.css',
})
export class ChangeConsumptionDialogComponent implements OnInit {
  readonly confirmed = output<ChangeConsumptionDialogResult>();
  readonly cancelled = output<void>();

  // Building's current consumption — pre-fills the form so the user edits from the
  // real value instead of starting from a misleading default of 0.
  readonly initialValue = input.required<number>();
  readonly initialUnit = input.required<EnergyUnit>();

  readonly energyUnits = Object.values(EnergyUnit);

  form = inject(FormBuilder).nonNullable.group({
    consumptionValue: [0,           [Validators.required, Validators.min(0)]],
    consumptionUnit:  [EnergyUnit.kW, [Validators.required]],
  });

  ngOnInit(): void {
    this.form.patchValue({
      consumptionValue: this.initialValue(),
      consumptionUnit: this.initialUnit(),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.confirmed.emit(this.form.getRawValue());
  }
}
