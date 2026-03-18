import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrderEntryComponent } from './order-entry.component';

/**
 * OrderEntryModule — intentionally kept as NgModule (NOT standalone).
 * This is a legacy pattern that an ORCH migration tool should detect.
 * The component uses *ngIf instead of @if, constructor injection,
 * and is declared via NgModule rather than standalone: true.
 */
@NgModule({
  declarations: [OrderEntryComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [OrderEntryComponent],
})
export class OrderEntryModule {}
