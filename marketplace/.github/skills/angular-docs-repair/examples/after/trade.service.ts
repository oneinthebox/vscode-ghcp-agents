import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trade, CreateTradeRequest } from '../models/trade.model';

@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v2/trades';

  /**
   * Fetches all trades for the current user with optional filtering.
   * @param symbol - Optional symbol to filter trades by (e.g. `"AAPL"`).
   * @param page - Page number for pagination (defaults to 1).
   * @returns An observable emitting the paginated trade array.
   */
  getTrades(symbol?: string, page = 1): Observable<Trade[]> {
    const params: Record<string, string> = { page: String(page) };
    if (symbol) params['symbol'] = symbol;
    return this.http.get<Trade[]>(this.baseUrl, { params });
  }

  /**
   * Submits a new trade order to the backend.
   * @param request - The trade creation payload containing symbol, side, and quantity.
   * @returns An observable emitting the created trade with server-assigned ID and status.
   */
  submitTrade(request: CreateTradeRequest): Observable<Trade> {
    return this.http.post<Trade>(this.baseUrl, request);
  }
}
