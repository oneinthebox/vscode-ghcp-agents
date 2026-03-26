// Example output from /angular-docs-generate — see SKILL.md for usage
// AFTER: full TSDoc with @remarks, @param, @returns, @throws, and @example
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, timer, retry, shareReplay } from 'rxjs';

import { ConfigService } from '@core/services/config.service';
import { LoggingService } from '@core/services/logging.service';
import { Quote, PriceTick } from '@shared/models/market.model';

/**
 * Provides real-time and on-demand market data for equities and derivatives.
 *
 * @remarks
 * All endpoints are resolved via {@link ConfigService} and automatically retry
 * on transient failures. Price subscriptions use `shareReplay` so multiple
 * consumers share a single polling stream.
 */
@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly logger = inject(LoggingService);

  private get baseUrl(): string {
    return `${this.config.getApiBaseUrl()}/api/v1/market`;
  }

  /**
   * Fetches the latest quote snapshot for the given symbol.
   *
   * @param symbol - Ticker symbol (e.g. `"AAPL"`, `"SPY"`).
   * @returns Observable emitting a single {@link Quote} with bid, ask, and mid prices.
   * @throws HttpErrorResponse on 404 (unknown symbol) or network failure after 2 retries.
   */
  getQuote(symbol: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/quotes/${symbol}`).pipe(
      retry({ count: 2, delay: 500 }),
    );
  }

  /**
   * Opens a polling subscription for live price ticks on the given symbol.
   *
   * @param symbol - Ticker symbol to subscribe to.
   * @param intervalMs - Polling interval in milliseconds. Defaults to `5000`.
   * @returns Observable emitting {@link PriceTick} values at the specified interval.
   *   The stream is reference-counted and shared across subscribers.
   *
   * @example
   * ```ts
   * marketData.subscribePrices('AAPL', 3000).subscribe((tick) => {
   *   console.log(`${tick.symbol}: ${tick.last}`);
   * });
   * ```
   */
  subscribePrices(symbol: string, intervalMs: number = 5000): Observable<PriceTick> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.http.get<PriceTick>(`${this.baseUrl}/prices/${symbol}`)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  /**
   * Calculates the mid-price spread between two symbols.
   *
   * @param symbolA - The first ticker symbol (minuend).
   * @param symbolB - The second ticker symbol (subtrahend).
   * @returns Observable emitting the numeric spread (`quoteA.mid - quoteB.mid`).
   * @throws HttpErrorResponse if either quote request fails.
   */
  calculateSpread(symbolA: string, symbolB: string): Observable<number> {
    return this.getQuote(symbolA).pipe(
      switchMap((quoteA) =>
        this.getQuote(symbolB).pipe(
          map((quoteB) => quoteA.mid - quoteB.mid),
        )
      ),
    );
  }
}
