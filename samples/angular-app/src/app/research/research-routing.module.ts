import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanySearchComponent } from './company-search/company-search.component';
import { CompanyDetailComponent } from './company-detail/company-detail.component';

const routes: Routes = [
  { path: '', component: CompanySearchComponent },
  { path: 'company/:id', component: CompanyDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResearchRoutingModule { }
