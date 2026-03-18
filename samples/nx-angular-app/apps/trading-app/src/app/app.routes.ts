import { Routes } from '@angular/router';
import { OrderEntryComponent } from './order-entry/order-entry.component';

export const appRoutes: Routes = [
  {
    path: 'order-entry',
    // NgModule-based component — NOT lazy loaded (intentional old pattern)
    component: OrderEntryComponent,
  },
  {
    path: 'blotter',
    loadComponent: () =>
      import('./blotter/blotter.component').then((m) => m.BlotterComponent),
  },
  {
    path: 'market-data',
    loadComponent: () =>
      import('./market-data/market-data.component').then((m) => m.MarketDataComponent),
  },
  {
    path: '',
    redirectTo: 'order-entry',
    pathMatch: 'full',
  },
];
