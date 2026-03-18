import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HoldingsGridComponent } from './holdings-grid/holdings-grid.component';

const routes: Routes = [
  { path: '', component: HoldingsGridComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HoldingsRoutingModule { }
