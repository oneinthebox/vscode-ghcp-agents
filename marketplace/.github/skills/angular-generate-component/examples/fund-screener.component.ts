// Example output from /angular-generate-component — see SKILL.md for usage
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { FundService } from '@core/services/fund.service';
import { LoggingService } from '@core/services/logging.service';
import { Fund, FundFilter } from '@shared/models/fund.model';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';

/**
 * Displays a filterable list of funds and emits the user's selection.
 *
 * @remarks
 * Uses signal-based inputs/outputs and OnPush change detection.
 * All state is managed through Angular signals — no manual subscriptions.
 */
@Component({
  selector: 'app-fund-screener',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './fund-screener.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundScreenerComponent {
  private readonly fundService = inject(FundService);
  private readonly logger = inject(LoggingService);

  /** The asset-class category to filter funds by. */
  readonly category = input.required<string>();

  /** Optional minimum AUM threshold in millions. */
  readonly minAum = input<number>(0);

  /** Emits when the user selects a fund from the list. */
  readonly fundSelected = output<Fund>();

  /** Internal loading flag. */
  readonly loading = signal(false);

  /** Master fund list fetched from the API. */
  readonly funds = signal<Fund[]>([]);

  /** Search term entered by the user. */
  readonly searchTerm = signal('');

  /** Funds filtered by category, AUM threshold, and search term. */
  readonly filteredFunds = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.funds().filter(
      (f) =>
        f.category === this.category() &&
        f.aum >= this.minAum() &&
        (f.name.toLowerCase().includes(term) || f.ticker.toLowerCase().includes(term))
    );
  });

  /** Summary line shown above the results table. */
  readonly resultSummary = computed(() => {
    const count = this.filteredFunds().length;
    return `${count} fund${count !== 1 ? 's' : ''} matching "${this.searchTerm() || '*'}"`;
  });

  /** Loads the fund list for the current category. */
  loadFunds(): void {
    this.loading.set(true);
    this.fundService.getByCategory(this.category()).subscribe({
      next: (data) => {
        this.funds.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.logger.error('FundScreenerComponent', `Load failed: ${err.message}`);
        this.loading.set(false);
      },
    });
  }

  /** Handles row click — emits the selected fund. */
  selectFund(fund: Fund): void {
    this.logger.info('FundScreenerComponent', `Selected: ${fund.ticker}`);
    this.fundSelected.emit(fund);
  }
}
