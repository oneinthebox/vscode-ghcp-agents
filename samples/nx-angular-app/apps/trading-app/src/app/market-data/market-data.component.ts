import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MarketDataService } from '@fintech/data-access';
import { Quote } from '@fintech/shared-models';
import { NumberFormatPipe } from '@fintech/shared-ui';

/**
 * MarketDataComponent — intentionally uses OLD patterns:
 * - Constructor injection (not inject())
 * - Manual .subscribe() with subscription tracking
 * - Template uses *ngFor and *ngIf (old control flow syntax)
 *
 * An ORCH migration tool should flag these for modernization.
 */
@Component({
  selector: 'app-market-data',
  standalone: true,
  imports: [CommonModule, NumberFormatPipe],
  templateUrl: './market-data.component.html',
})
export class MarketDataComponent implements OnInit, OnDestroy {
  quotes: Quote[] = [];
  topMovers: Quote[] = [];
  selectedQuote: Quote | null = null;
  isLive = false;

  private subscriptions: Subscription[] = [];

  // OLD pattern: constructor injection instead of inject()
  constructor(private readonly marketDataService: MarketDataService) {}

  ngOnInit(): void {
    // OLD pattern: manual .subscribe()
    const quotesSub = this.marketDataService.getQuotes().subscribe((quotes) => {
      this.quotes = quotes;
    });
    this.subscriptions.push(quotesSub);

    const moversSub = this.marketDataService.getTopMovers().subscribe((movers) => {
      this.topMovers = movers;
    });
    this.subscriptions.push(moversSub);
  }

  ngOnDestroy(): void {
    this.stopLiveData();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  toggleLiveData(): void {
    if (this.isLive) {
      this.stopLiveData();
    } else {
      this.startLiveData();
    }
  }

  startLiveData(): void {
    this.marketDataService.startLiveUpdates();
    this.isLive = true;
  }

  stopLiveData(): void {
    this.marketDataService.stopLiveUpdates();
    this.isLive = false;
  }

  selectQuote(quote: Quote): void {
    this.selectedQuote = this.selectedQuote?.ticker === quote.ticker ? null : quote;
  }

  getChangeClass(value: number): string {
    return value >= 0 ? 'text-success' : 'text-danger';
  }

  getChangeArrow(value: number): string {
    return value >= 0 ? '\u25B2' : '\u25BC';
  }

  formatVolume(vol: number): string {
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
    return vol.toString();
  }

  formatMarketCap(cap: number): string {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toLocaleString()}`;
  }
}
