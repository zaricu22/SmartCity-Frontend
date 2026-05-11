import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // OUTGOING
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const outgoing = token
    ? next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(req);

  // INCOMING 
  return outgoing.pipe(
    catchError((err: unknown) => {
      // 401 means the token is invalid or expired — clear it and send user to login
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
