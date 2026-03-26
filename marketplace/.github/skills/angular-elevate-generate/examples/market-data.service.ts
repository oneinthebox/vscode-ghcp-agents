// Example output from /angular-elevate-generate — see SKILL.md for usage
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  Subject,
  catchError,
  filter,
  map,
  retry,
  shareReplay,
  takeUntil,
  throwError,
} from 'rxjs';

import { LoggingService } from '@elevate/logging';
import { ConfigService } from '@elevate/config';
import { ElevateAuthService } from '@elevate/auth';
import {
  MarketQuote,
  MarketSnapshot,
  TickerSubscription,
} from '@shared/models/market-data.model';

/**
 * Provides real-time and on-demand market data using Elevate platform services.
 *
 * @remarks
 * - All logging uses {@link LoggingService} with structured context for log aggregation.
 * - API base URLs are resolved through {@link ConfigService}, never hardcoded.
 * - Authentication tokens are managed by {@link ElevateAuthService}.
 * - Errors are captured with full context before propagating to the caller.
 */
@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggingService);
  private readonly config = inject(ConfigService);
  private readonly auth = inject(ElevateAuthService);

  private readonly destroy$ = new Subject<void>();
  private ws: WebSocket | null = null;

  private get baseUrl(): string {
    return `${this.config.get<string>('api.baseUrl')}/api/v2/market`;
  }

  private get wsUrl(): string {
    return this.config.get<string>('ws.marketDataUrl');
  }

  /**
   * Retrieves the latest snapshot for a given ticker symbol.
   *
   * @param symbol - Ticker symbol (e.g., 'AAPL', 'EUR/USD').
   * @returns Observable emitting the market snapshot.
   */
  getSnapshot(symbol: string): Observable<MarketSnapshot> {
    this.logger.info('MarketDataService', 'Fetching snapshot', { symbol });

    return this.http
      .get<MarketSnapshot>(`${this.baseUrl}/snapshot/${symbol}`)
      .pipe(
        retry({ count: 2, delay: 500 }),
        catchError((err: HttpErrorResponse) =>
          this.handleError('getSnapshot', err, { symbol }),
        ),
      );
  }

  /**
   * Retrieves quotes for multiple symbols in a single batch request.
   *
   * @param symbols - Array of ticker symbols.
   * @returns Observable emitting an array of market quotes.
   */
  getBatchQuotes(symbols: string[]): Observable<MarketQuote[]> {
    this.logger.info('MarketDataService', 'Fetching batch quotes', {
      count: symbols.length,
    });

    return this.http
      .post<MarketQuote[]>(`${this.baseUrl}/quotes/batch`, { symbols })
      .pipe(
        map((quotes) =>
          quotes.sort((a, b) => a.symbol.localeCompare(b.symbol)),
        ),
        catchError((err: HttpErrorResponse) =>
          this.handleError('getBatchQuotes', err, { symbols }),
        ),
      );
  }

  /**
   * Opens a WebSocket connection for real-time market data streaming.
   * Authenticates using the Elevate auth token.
   *
   * @param subscription - Ticker subscription configuration.
   * @returns Observable emitting real-time market quotes.
   */
  streamQuotes(subscription: TickerSubscription): Observable<MarketQuote> {
    return new Observable<MarketQuote>((observer) => {
      const token = this.auth.getAccessToken();

      this.logger.info('MarketDataService', 'Opening WebSocket stream', {
        symbols: subscription.symbols,
      });

      this.ws = new WebSocket(`${this.wsUrl}?token=${token}`);

      this.ws.onopen = () => {
        this.logger.info('MarketDataService', 'WebSocket connected');
        this.ws?.send(JSON.stringify({ action: 'subscribe', ...subscription }));
      };

      this.ws.onmessage = (event) => {
        try {
          const quote: MarketQuote = JSON.parse(event.data);
          observer.next(quote);
        } catch (err) {
          this.logger.warn('MarketDataService', 'Failed to parse WS message', {
            error: (err as Error).message,
          });
        }
      };

      this.ws.onerror = (event) => {
        this.logger.error('MarketDataService', 'WebSocket error', { event });
        observer.error(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        this.logger.info('MarketDataService', 'WebSocket closed', {
          code: event.code,
          reason: event.reason,
        });
        observer.complete();
      };

      // Cleanup on unsubscribe
      return () => {
        this.ws?.close();
        this.ws = null;
      };
    }).pipe(
      filter((quote) => subscription.symbols.includes(quote.symbol)),
      takeUntil(this.destroy$),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  /**
   * Closes any active WebSocket connections and cleans up resources.
   * Should be called from the host component's OnDestroy lifecycle.
   */
  disconnect(): void {
    this.logger.info('MarketDataService', 'Disconnecting streams');
    this.destroy$.next();
    this.destroy$.complete();
    this.ws?.close();
    this.ws = null;
  }

  private handleError(
    method: string,
    error: HttpErrorResponse,
    context?: Record<string, unknown>,
  ): Observable<never> {
    this.logger.error('MarketDataService', `${method} failed`, {
      status: error.status,
      message: error.message,
      ...context,
    });
    return throwError(() => error);
  }
}
