import { Routes } from '@angular/router';
import { ASSET_PROVIDERS } from './asset/asset.providers';
import { authGuard, loggedInGuard } from './auth/infrastructure/guard/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./auth/presentation/page/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./auth/presentation/page/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'callback',
    // No guard: the OAuth2 redirect arrives with no in-memory auth state. loggedInGuard
    // would redirect to / for an active session, or block re-authentication for an expired one.
    loadComponent: () =>
      import('./auth/presentation/page/callback/callback.component').then(m => m.CallbackComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./shared/presentation/page/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/presentation/layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'assets', pathMatch: 'full' },
      {
        path: 'assets',
        // Scoped to this route — providers are created on activation and destroyed on deactivation, not kept alive at root level.
        providers: ASSET_PROVIDERS,
        loadChildren: () =>
          import('./asset/presentation/route/asset.routes').then(m => m.ASSET_ROUTES),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/presentation/page/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
