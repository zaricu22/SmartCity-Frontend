import { Routes } from '@angular/router';
import { ASSET_PROVIDERS } from './asset/asset.providers';
import { authGuard, loggedInGuard } from './shared/infrastructure/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./shared/presentation/page/login/login.component').then(m => m.LoginComponent),
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
