// Example output from /angular-generate-route — see SKILL.md for usage
import { Routes } from '@angular/router';
import { tradeGuard } from './trade-auth.guard';
import { tradeDetailResolver } from './trade-detail.resolver';

/**
 * Trade module routes with lazy-loaded components.
 *
 * @remarks
 * All routes are protected by {@link tradeGuard} and pre-fetch
 * detail data via {@link tradeDetailResolver} before activation.
 */
export const routes: Routes = [
  {
    path: 'trade',
    loadComponent: () =>
      import('./trade-blotter.component').then((m) => m.TradeBlotterComponent),
    canActivate: [tradeGuard],
    title: 'Trade Blotter',
  },
  {
    path: 'trade/:id',
    loadComponent: () =>
      import('./trade-detail.component').then((m) => m.TradeDetailComponent),
    canActivate: [tradeGuard],
    resolve: { detail: tradeDetailResolver },
    title: 'Trade Detail',
  },
];
