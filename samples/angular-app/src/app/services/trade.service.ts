import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Trade, TradeBlotter, OrderRequest } from '../models/trade.model';

@Injectable({
  providedIn: 'root'
})
export class TradeService {

  private apiUrl = 'https://api.fundresearch.internal.corp/v2/trades';

  private mockTrades: Trade[] = [
    { id: 'T001', fundId: 'GEF001', ticker: 'APEX', companyName: 'Apex Technologies Inc.', side: 'BUY', orderType: 'LIMIT', quantity: 15000, price: 338.50, limitPrice: 340.00, status: 'EXECUTED', filledQuantity: 15000, avgFillPrice: 338.72, commission: 12.50, createdAt: '2024-12-10T09:30:00Z', executedAt: '2024-12-10T09:32:15Z', notes: 'Adding to core tech position', broker: 'Goldman Sachs' },
    { id: 'T002', fundId: 'GEF001', ticker: 'CTL', companyName: 'Citadel Energy Partners', side: 'SELL', orderType: 'MARKET', quantity: 25000, price: 57.20, status: 'EXECUTED', filledQuantity: 25000, avgFillPrice: 57.18, commission: 8.75, createdAt: '2024-12-10T10:15:00Z', executedAt: '2024-12-10T10:15:02Z', notes: 'Trimming energy exposure', broker: 'Morgan Stanley' },
    { id: 'T003', fundId: 'FIP002', ticker: 'MRD', companyName: 'Meridian Holdings Corp.', side: 'BUY', orderType: 'LIMIT', quantity: 30000, price: 88.90, limitPrice: 89.50, status: 'PENDING', filledQuantity: 0, avgFillPrice: 0, commission: 0, createdAt: '2024-12-11T08:45:00Z', notes: 'Building financial sector allocation', broker: 'JP Morgan' },
    { id: 'T004', fundId: 'EMF003', ticker: 'SLR', companyName: 'Solaris Semiconductor', side: 'BUY', orderType: 'MARKET', quantity: 10000, price: 265.40, status: 'EXECUTED', filledQuantity: 10000, avgFillPrice: 265.55, commission: 15.00, createdAt: '2024-12-11T11:20:00Z', executedAt: '2024-12-11T11:20:03Z', notes: 'AI semiconductor thesis', broker: 'Goldman Sachs' },
    { id: 'T005', fundId: 'GEF001', ticker: 'VTX', companyName: 'Vertex Pharmaceuticals Ltd.', side: 'BUY', orderType: 'STOP', quantity: 8000, price: 195.00, stopPrice: 190.00, status: 'PENDING', filledQuantity: 0, avgFillPrice: 0, commission: 0, createdAt: '2024-12-11T14:00:00Z', notes: 'Buy on dip - gene therapy catalyst', broker: 'Morgan Stanley' },
    { id: 'T006', fundId: 'GEF001', ticker: 'EVG', companyName: 'Evergreen Consumer Brands', side: 'SELL', orderType: 'LIMIT', quantity: 50000, price: 79.00, limitPrice: 78.50, status: 'CANCELLED', filledQuantity: 0, avgFillPrice: 0, commission: 0, createdAt: '2024-12-09T13:30:00Z', notes: 'Cancelled - reassessing defensive allocation', broker: 'JP Morgan' },
    { id: 'T007', fundId: 'EMF003', ticker: 'QNT', companyName: 'Quantum Networks Inc.', side: 'BUY', orderType: 'LIMIT', quantity: 45000, price: 44.80, limitPrice: 45.00, status: 'EXECUTED', filledQuantity: 45000, avgFillPrice: 44.92, commission: 9.25, createdAt: '2024-12-10T15:45:00Z', executedAt: '2024-12-10T15:47:30Z', notes: 'Networking infrastructure play', broker: 'Goldman Sachs' },
    { id: 'T008', fundId: 'GEF001', ticker: 'NVW', companyName: 'Northview Capital Group', side: 'BUY', orderType: 'MARKET', quantity: 20000, price: 144.50, status: 'EXECUTED', filledQuantity: 20000, avgFillPrice: 144.67, commission: 11.00, createdAt: '2024-12-12T09:31:00Z', executedAt: '2024-12-12T09:31:02Z', notes: 'IB sector rotation', broker: 'Morgan Stanley' },
    { id: 'T009', fundId: 'FIP002', ticker: 'APEX', companyName: 'Apex Technologies Inc.', side: 'SELL', orderType: 'LIMIT', quantity: 5000, price: 345.00, limitPrice: 344.00, status: 'PENDING', filledQuantity: 0, avgFillPrice: 0, commission: 0, createdAt: '2024-12-12T10:00:00Z', notes: 'Taking partial profits on tech rally', broker: 'Goldman Sachs' },
    { id: 'T010', fundId: 'GEF001', ticker: 'ATL', companyName: 'Atlas Real Estate Trust', side: 'SELL', orderType: 'MARKET', quantity: 100000, price: 34.50, status: 'REJECTED', filledQuantity: 0, avgFillPrice: 0, commission: 0, createdAt: '2024-12-12T11:15:00Z', notes: 'Rejected - exceeds daily volume limit', broker: 'JP Morgan' },
  ];

  constructor(private http: HttpClient) {
    console.log('TradeService initialized');
  }

  getTradeBlotter(fundId?: string): Observable<TradeBlotter> {
    console.log('Loading trade blotter for fund:', fundId);
    let trades = this.mockTrades;
    if (fundId) {
      trades = trades.filter(t => t.fundId === fundId);
    }
    const blotter: TradeBlotter = {
      trades: trades,
      totalCount: trades.length,
      totalValue: trades.reduce((sum, t) => sum + (t.quantity * t.price), 0),
      buyCount: trades.filter(t => t.side === 'BUY').length,
      sellCount: trades.filter(t => t.side === 'SELL').length
    };
    return of(blotter).pipe(delay(350));
  }

  getTradesByStatus(status: string): Observable<Trade[]> {
    const filtered = this.mockTrades.filter(t => t.status === status);
    return of(filtered).pipe(delay(200));
  }

  submitOrder(order: any): Observable<any> {
    console.log('Submitting order:', JSON.stringify(order));
    const newTrade: any = {
      id: 'T' + (this.mockTrades.length + 1).toString().padStart(3, '0'),
      fundId: order.fundId,
      ticker: order.ticker,
      companyName: order.companyName || 'Unknown',
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      price: order.price || 0,
      limitPrice: order.limitPrice,
      status: 'PENDING',
      filledQuantity: 0,
      avgFillPrice: 0,
      commission: 0,
      createdAt: new Date().toISOString(),
      notes: order.notes || '',
      broker: 'Auto-Routed'
    };
    this.mockTrades.push(newTrade);
    return of(newTrade).pipe(delay(500));
  }

  cancelOrder(tradeId: string): Observable<any> {
    console.log('Cancelling order:', tradeId);
    const trade = this.mockTrades.find(t => t.id === tradeId);
    if (trade && trade.status === 'PENDING') {
      trade.status = 'CANCELLED';
      return of({ success: true, trade: trade }).pipe(delay(200));
    }
    return of({ success: false, error: 'Trade not found or not cancellable' }).pipe(delay(200));
  }

  getTradeHistory(ticker: string): Observable<any[]> {
    console.log('Fetching trade history for:', ticker);
    const trades = this.mockTrades.filter(t => t.ticker === ticker);
    return of(trades).pipe(delay(250));
  }

  calculateTradeMetrics(trades: any[]): any {
    let totalVolume = 0;
    let totalCommissions = 0;
    let executedCount = 0;

    trades.forEach((t: any) => {
      totalVolume += t.quantity * t.price;
      totalCommissions += t.commission;
      if (t.status === 'EXECUTED') executedCount++;
    });

    return {
      totalVolume,
      totalCommissions,
      executedCount,
      fillRate: trades.length > 0 ? (executedCount / trades.length) * 100 : 0
    };
  }
}
