// Example output from /angular-migrate-standalone — see SKILL.md for usage
// AFTER: standalone component, no module needed, direct imports, OnPush
import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Trade } from '@shared/models/trade.model';

@Component({
  selector: 'app-trade-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatIconModule, MatTooltipModule],
  templateUrl: './trade-card.component.html',
  styleUrls: ['./trade-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeCardComponent {
  readonly trade = input.required<Trade>();
  readonly showActions = input<boolean>(true);
  readonly tradeSelected = output<Trade>();

  readonly statusClass = computed(() => `badge-${this.trade().status}`);

  onSelect(): void {
    this.tradeSelected.emit(this.trade());
  }
}
