import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'research', pathMatch: 'full' },
  {
    path: 'research',
    loadChildren: () => import('./research/research.module').then(m => m.ResearchModule)
  },
  {
    path: 'funds',
    loadChildren: () => import('./funds/funds.module').then(m => m.FundsModule)
  },
  {
    path: 'holdings',
    loadChildren: () => import('./holdings/holdings.module').then(m => m.HoldingsModule)
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
