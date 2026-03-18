import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { HoldingsRoutingModule } from './holdings-routing.module';
import { HoldingsGridComponent } from './holdings-grid/holdings-grid.component';

@NgModule({
  declarations: [
    HoldingsGridComponent,
  ],
  imports: [
    SharedModule,
    HoldingsRoutingModule,
  ]
})
export class HoldingsModule { }
