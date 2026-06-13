import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

// Redirects unauthenticated users to /login, preserving the intended URL as a query param
export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // createUrlTree — synchronous; preferred over router.navigate() in guards as it participates in the router lifecycle
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Redirects already-authenticated users away from the login page
export const loggedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

// Requires a specific role — redirects to /forbidden if the user lacks it
export const roleGuard = (required: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.hasRole(required) ? true : router.createUrlTree(['/forbidden']);
};
