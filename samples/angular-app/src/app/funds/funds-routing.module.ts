import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FundListComponent } from './fund-list/fund-list.component';
import { FundDetailComponent } from './fund-detail/fund-detail.component';

const routes: Routes = [
  { path: '', component: FundListComponent },
  { path: ':id', component: FundDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FundsRoutingModule { }
