// Example input for /angular-docs-generate — see SKILL.md for usage
// BEFORE: no TSDoc — service works but has zero documentation
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, timer, retry, shareReplay } from 'rxjs';

import { ConfigService } from '@core/services/config.service';
import { LoggingService } from '@core/services/logging.service';
import { Quote, PriceTick } from '@shared/models/market.model';

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly logger = inject(LoggingService);

  private get baseUrl(): string {
    return `${this.config.getApiBaseUrl()}/api/v1/market`;
  }

  getQuote(symbol: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/quotes/${symbol}`).pipe(
      retry({ count: 2, delay: 500 }),
    );
  }

  subscribePrices(symbol: string, intervalMs: number = 5000): Observable<PriceTick> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.http.get<PriceTick>(`${this.baseUrl}/prices/${symbol}`)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

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
