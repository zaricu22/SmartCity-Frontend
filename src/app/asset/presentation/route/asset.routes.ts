import { Routes } from '@angular/router';
import { roleGuard } from '../../../shared/infrastructure/auth/auth.guard';
import { unsavedChangesGuard } from '../../../shared/infrastructure/auth/unsaved-changes.guard';

export const ASSET_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('VIEWER')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('../page/building-list/building-list.component').then(m => m.BuildingListComponent),
  },
  {
    path: ':id',
    canActivate: [roleGuard('ADMIN')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('../page/building-detail/building-detail.component').then(m => m.BuildingDetailComponent),
  },
];
