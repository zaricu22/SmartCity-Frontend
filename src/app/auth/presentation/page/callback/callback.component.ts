import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../../infrastructure/service/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class CallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // During SSR prerendering window does not exist — skip silently; the browser render
    // handles the actual token exchange when the user lands on /callback.
    if (!isPlatformBrowser(this.platformId)) return;

    // window.location.hash over ActivatedRoute.fragment: the fragment Observable suits
    // components that react to repeated navigation events. Here the hash is read exactly
    // once and the component immediately navigates away — a synchronous read is simpler.
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const role = params.get('role') as UserRole | null;
    const expiresInMs = Number(params.get('expiresInMs'));
    // null (missing param) → undefined so setToken treats it as "no refresh token provided"
    // rather than receiving null, which TypeScript would reject at the call site.
    const refreshToken = params.get('refreshToken') ?? undefined;

    if (!token || !role || !expiresInMs) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.auth.setToken(token, role, expiresInMs, refreshToken);
    this.router.navigateByUrl('/');
  }
}
