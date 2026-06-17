import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { LucideZap, LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../../infrastructure/auth/auth.service';
import { AuthApiService } from '../../../infrastructure/auth/auth-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LucideZap, LucideLogOut],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
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
