import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { ResearchRoutingModule } from './research-routing.module';
import { CompanySearchComponent } from './company-search/company-search.component';
import { CompanyDetailComponent } from './company-detail/company-detail.component';

@NgModule({
  declarations: [
    CompanySearchComponent,
    CompanyDetailComponent,
  ],
  imports: [
    SharedModule,
    ResearchRoutingModule,
  ]
})
export class ResearchModule { }
