import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideZap } from '@lucide/angular';
import { AuthApiService } from '../../../infrastructure/service/auth-api.service';

// Module-level (not a class method) — Angular validators receive AbstractControl as their
// only argument; a plain function is cleaner than a bound method. Group-level (not on the
// confirmPassword control) because both sibling fields must be in scope simultaneously.
// The error key lands on form.errors, not form.get('confirmPassword').errors — see template.
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideZap, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  register(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    this.authApi.register(email, password).subscribe({
      next: () => {
        // POST /register returns 201 void — no JWT is issued. Registration and authentication
        // are separate: the user must log in explicitly after creating an account.
        this.router.navigateByUrl('/login');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 409
            ? 'This email is already registered.'
            : 'Registration failed. Please try again.',
        );
      },
    });
  }
}
