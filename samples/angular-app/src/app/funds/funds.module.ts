import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { FundsRoutingModule } from './funds-routing.module';
import { FundListComponent } from './fund-list/fund-list.component';
import { FundDetailComponent } from './fund-detail/fund-detail.component';

@NgModule({
  declarations: [
    FundListComponent,
    FundDetailComponent,
  ],
  imports: [
    SharedModule,
    FundsRoutingModule,
  ]
})
export class FundsModule { }
