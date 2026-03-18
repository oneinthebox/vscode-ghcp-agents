import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { DataCardComponent } from './components/data-card/data-card.component';
import { NumberFormatPipe } from './pipes/number-format.pipe';

/**
 * SharedUiModule - intentionally kept as NgModule (NOT standalone).
 * This represents a partially-migrated library where the module wrapper
 * still exists even though individual components are standalone.
 * An ORCH migration tool should detect this and suggest removing the NgModule.
 */
@NgModule({
  imports: [
    CommonModule,
    HeaderComponent,
    DataCardComponent,
    NumberFormatPipe,
  ],
  exports: [
    HeaderComponent,
    DataCardComponent,
    NumberFormatPipe,
  ],
})
export class SharedUiModule {}
