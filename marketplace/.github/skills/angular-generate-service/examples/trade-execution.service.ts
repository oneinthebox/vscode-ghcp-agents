// Example output from /angular-generate-service — see SKILL.md for usage
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, retry, throwError } from 'rxjs';

import { LoggingService } from '@core/services/logging.service';
import { ConfigService } from '@core/services/config.service';
import { TradeOrder, TradeConfirmation, TradeStatus } from '@shared/models/trade.model';

/**
 * Handles trade execution lifecycle including order submission,
 * status polling, and confirmation retrieval.
 *
 * @remarks
 * All requests are routed through the environment-aware base URL
 * provided by {@link ConfigService}. Failures are logged via
 * {@link LoggingService} before propagating to the caller.
 */
@Injectable({ providedIn: 'root' })
export class TradeExecutionService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggingService);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return `${this.config.getApiBaseUrl()}/api/v1/trades`;
  }

  /**
   * Submits a new trade order for execution.
   *
   * @param order - The trade order containing symbol, quantity, and side.
   * @returns Observable emitting the server-assigned confirmation.
   * @throws HttpErrorResponse when the order is rejected or the API is unreachable.
   */
  submitOrder(order: TradeOrder): Observable<TradeConfirmation> {
    this.logger.info('TradeExecutionService', `Submitting order: ${order.symbol} ${order.side} x${order.quantity}`);
    return this.http.post<TradeConfirmation>(this.baseUrl, order).pipe(
      retry({ count: 1, delay: 1000 }),
      catchError((err: HttpErrorResponse) => this.handleError('submitOrder', err))
    );
  }

  /**
   * Retrieves the current status of an existing trade.
   *
   * @param tradeId - Unique identifier for the trade.
   * @returns Observable emitting the latest trade status.
   */
  getTradeStatus(tradeId: string): Observable<TradeStatus> {
    return this.http.get<TradeStatus>(`${this.baseUrl}/${tradeId}/status`).pipe(
      catchError((err: HttpErrorResponse) => this.handleError('getTradeStatus', err))
    );
  }

  /**
   * Cancels a pending trade order.
   *
   * @param tradeId - Unique identifier for the trade to cancel.
   * @returns Observable emitting the updated confirmation with cancelled status.
   */
  cancelOrder(tradeId: string): Observable<TradeConfirmation> {
    this.logger.info('TradeExecutionService', `Cancelling trade: ${tradeId}`);
    return this.http.delete<TradeConfirmation>(`${this.baseUrl}/${tradeId}`).pipe(
      catchError((err: HttpErrorResponse) => this.handleError('cancelOrder', err))
    );
  }

  /**
   * Lists all trades for the current session, optionally filtered by symbol.
   *
   * @param symbol - Optional ticker symbol to filter results.
   * @returns Observable emitting an array of trade confirmations.
   */
  listTrades(symbol?: string): Observable<TradeConfirmation[]> {
    const params = symbol ? { symbol } : {};
    return this.http.get<TradeConfirmation[]>(this.baseUrl, { params }).pipe(
      map((trades) => trades.sort((a, b) => b.timestamp - a.timestamp)),
      catchError((err: HttpErrorResponse) => this.handleError('listTrades', err))
    );
  }

  private handleError(method: string, error: HttpErrorResponse): Observable<never> {
    this.logger.error('TradeExecutionService', `${method} failed: ${error.status} ${error.message}`);
    return throwError(() => error);
  }
}
