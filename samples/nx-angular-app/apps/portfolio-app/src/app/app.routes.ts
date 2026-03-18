import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'holdings',
    loadComponent: () =>
      import('./holdings/holdings.component').then((m) => m.HoldingsComponent),
  },
  {
    path: 'allocation',
    loadComponent: () =>
      import('./allocation/allocation.component').then((m) => m.AllocationComponent),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
