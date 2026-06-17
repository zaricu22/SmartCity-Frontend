import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideZap } from '@lucide/angular';
import { AuthService } from '../../../infrastructure/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideZap],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Stub login — replace with a real form + API call
  loginAsAdmin(): void {
    this.auth.setToken('stub-admin-token', 'ADMIN');
    this.redirectAfterLogin();
  }

  loginAsViewer(): void {
    this.auth.setToken('stub-viewer-token', 'VIEWER');
    this.redirectAfterLogin();
  }

  private redirectAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.router.navigateByUrl(returnUrl);
  }
}
