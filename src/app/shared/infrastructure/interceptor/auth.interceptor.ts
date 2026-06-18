import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService, UserRole } from '../auth/auth.service';
import { AuthApiService } from '../auth/auth-api.service';

// HttpRequest is immutable — clone() is the only way to add headers without mutating the original
const addBearer = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  const token = auth.getToken();
  // No token → forward unmodified; the request targets a public route (login, refresh, actuator)
  const outgoing = token ? next(addBearer(req, token)) : next(req);

  // 401 is handled here, not in GlobalErrorHandler, because it is an HTTP transport concern:
  // an expired or revoked token must trigger a silent refresh before the error reaches the domain layer
  return outgoing.pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      const refreshToken = auth.getRefreshToken();
      if (!refreshToken) {
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => err);
      }

      // Silent refresh: exchange refresh token for new access + refresh token, then retry.
      // Note: concurrent 401s (multiple requests expiring at the same time) are not protected
      // against a refresh storm — the rotating token design means only the first refresh succeeds
      // and the rest will 401 on refresh → logout. Acceptable for a showcase; fix with a
      // shared BehaviorSubject lock in a production app.
      return authApi.refresh(refreshToken).pipe(
        switchMap((res) => {
          auth.setToken(res.token, res.role as UserRole, res.expiresInMs, res.refreshToken);
          return next(addBearer(req, res.token));
        }),
        catchError(() => {
          // Refresh failed (token expired or already consumed) — implicit logout.
          // We do NOT call POST /v1/auth/logout here: the access token is already invalid
          // so the backend would reject the revocation request with another 401.
          auth.logout();
          router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
