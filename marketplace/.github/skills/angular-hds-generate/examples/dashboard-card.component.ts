// Example output from /angular-hds-generate — see SKILL.md for usage
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';

import { LoggingService } from '@core/services/logging.service';
import { HdsCardComponent } from '@hds/components/card/card.component';
import { HdsBadgeComponent } from '@hds/components/badge/badge.component';
import { PortfolioSummary } from '@shared/models/portfolio.model';

/**
 * Dashboard card displaying a portfolio summary with HDS-compliant styling.
 *
 * @remarks
 * Uses HDS component wrappers and design tokens exclusively.
 * All colors, spacing, and typography reference var(--hds-*) tokens.
 */
@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, PercentPipe, HdsCardComponent, HdsBadgeComponent],
  templateUrl: './dashboard-card.component.html',
  styleUrls: ['./dashboard-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCardComponent {
  private readonly logger = inject(LoggingService);

  /** Portfolio summary data passed from the parent dashboard. */
  readonly portfolio = input.required<PortfolioSummary>();

  /** Emits when the user clicks the card to navigate to portfolio detail. */
  readonly cardClicked = output<string>();

  /** Whether the card is in a loading state. */
  readonly loading = signal(false);

  /** Computed badge variant based on daily P&L. */
  readonly pnlVariant = computed(() => {
    const pnl = this.portfolio().dailyPnl;
    if (pnl > 0) return 'success';
    if (pnl < 0) return 'error';
    return 'neutral';
  });

  /** Formatted daily P&L string for display. */
  readonly pnlDisplay = computed(() => {
    const pnl = this.portfolio().dailyPnl;
    const prefix = pnl >= 0 ? '+' : '';
    return `${prefix}${pnl.toFixed(2)}%`;
  });

  /** Handles card click interaction. */
  onCardClick(): void {
    const id = this.portfolio().portfolioId;
    this.logger.info('DashboardCardComponent', `Card clicked: ${id}`);
    this.cardClicked.emit(id);
  }
}
