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
   * @param {string} userId - The user ID to fetch trades for.
   * @param {string} symbol - Optional symbol filter.
   * @param {number} page - Page number for pagination.
   * @returns {Observable<Trade[]>} An observable of trade array.
   */
  getTrades(symbol?: string, page = 1): Observable<Trade[]> {
    const params: Record<string, string> = { page: String(page) };
    if (symbol) params['symbol'] = symbol;
    return this.http.get<Trade[]>(this.baseUrl, { params });
  }

  /**
   * Submits a new trade order to the backend.
   * @param {CreateTradeRequest} request - The trade request payload.
   * @returns {Trade} The created trade object.
   */
  submitTrade(request: CreateTradeRequest): Observable<Trade> {
    return this.http.post<Trade>(this.baseUrl, request);
  }
}
