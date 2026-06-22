import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../../infrastructure/service/auth.service';
import { AuthApiService } from '../../../infrastructure/service/auth-api.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideLogOut],
  styleUrl: './logout-button.component.css',
  template: `
    <button class="app-header__logout" (click)="logout()">
      <svg lucideLogOut class="app-header__logout-icon"></svg>
      Logout
    </button>
  `,
})
export class LogoutButtonComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  logout(): void {
    const refreshToken = this.auth.getRefreshToken();
    const clearAndRedirect = () => {
      this.auth.logout();
      this.router.navigate(['/login']);
    };

    if (!refreshToken) {
      clearAndRedirect();
      return;
    }

    // Best-effort: revoke both tokens server-side, then clear local state regardless of outcome.
    // finalize() runs on both complete and error so a network failure still logs the user out.
    this.authApi.logout(refreshToken)
      .pipe(finalize(clearAndRedirect))
      .subscribe();
  }
}
