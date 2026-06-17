import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideZap } from '@lucide/angular';
import { AuthService, UserRole } from '../../../infrastructure/auth/auth.service';
import { AuthApiService } from '../../../infrastructure/auth/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideZap, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  login(): void {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { username, password } = this.form.getRawValue();
    this.authApi.login(username, password).subscribe({
      next: (res) => {
        this.auth.setToken(res.token, res.role as UserRole, res.expiresInMs, res.refreshToken);
        // isLoading stays true — component is destroyed by the navigation; resetting it here
        // would briefly re-enable the button and could allow a double-submit during transition
        this.redirectAfterLogin();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Invalid username or password.');
      },
    });
  }

  private redirectAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.router.navigateByUrl(returnUrl);
  }
}
