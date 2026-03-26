// Example output from /angular-migrate-signals — see SKILL.md for usage
// AFTER: uses signal inputs/outputs, signal() state, computed(), no destroy$ needed
import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';

import { PortfolioService } from '@core/services/portfolio.service';
import { LoggingService } from '@core/services/logging.service';
import { Holding } from '@shared/models/holding.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  // template uses signal calls: {{ totalValue() | currency }}
  // template uses @if: @if (holdings().length > 0) { ... }
  templateUrl: './portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioComponent {
  private readonly portfolioService = inject(PortfolioService);
  private readonly logger = inject(LoggingService);

  readonly accountId = input.required<string>();
  readonly currency = input<string>('USD');
  readonly holdingSelected = output<Holding>();

  readonly holdings = signal<Holding[]>([]);
  readonly loading = signal(false);

  readonly totalValue = computed(() =>
    this.holdings().reduce((sum, h) => sum + h.marketValue, 0)
  );

  loadHoldings(): void {
    this.loading.set(true);
    this.portfolioService.getHoldings(this.accountId()).subscribe({
      next: (holdings) => {
        this.holdings.set(holdings);
        this.loading.set(false);
      },
      error: (err) => {
        this.logger.error('PortfolioComponent', `Load failed: ${err.message}`);
        this.loading.set(false);
      },
    });
  }

  selectHolding(holding: Holding): void {
    this.holdingSelected.emit(holding);
  }

  refreshPortfolio(): void {
    this.loadHoldings();
  }
}
