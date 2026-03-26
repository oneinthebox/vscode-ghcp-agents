// Example input for /angular-migrate-standalone — see SKILL.md for usage
// BEFORE: NgModule wrapping a single component with shared imports
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TradeCardComponent } from './trade-card.component';
import { SharedPipesModule } from '@shared/pipes/shared-pipes.module';

@NgModule({
  declarations: [TradeCardComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    SharedPipesModule,
  ],
  exports: [TradeCardComponent],
})
export class TradeCardModule {}
