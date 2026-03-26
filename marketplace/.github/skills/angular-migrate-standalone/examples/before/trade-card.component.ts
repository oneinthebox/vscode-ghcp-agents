// Example input for /angular-migrate-standalone — see SKILL.md for usage
// BEFORE: component declared inside TradeCardModule, no standalone flag
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { Trade } from '@shared/models/trade.model';

@Component({
  selector: 'app-trade-card',
  templateUrl: './trade-card.component.html',
  styleUrls: ['./trade-card.component.scss'],
})
export class TradeCardComponent {
  @Input() trade!: Trade;
  @Input() showActions = true;
  @Output() tradeSelected = new EventEmitter<Trade>();

  get statusClass(): string {
    return `badge-${this.trade.status}`;
  }

  onSelect(): void {
    this.tradeSelected.emit(this.trade);
  }
}
