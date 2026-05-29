import { Component, inject, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

export interface CreateBuildingDialogResult {
  readonly name: string;
  readonly location: string;
}

@Component({
  selector: 'app-create-building-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-building-dialog.component.html',
})
export class CreateBuildingDialogComponent {
  readonly confirmed = output<CreateBuildingDialogResult>();
  readonly cancelled = output<void>();

  form = inject(FormBuilder).nonNullable.group({
    name:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    const { name, location } = this.form.getRawValue();
    this.confirmed.emit({ name: name.trim(), location: location.trim() });
  }
}
