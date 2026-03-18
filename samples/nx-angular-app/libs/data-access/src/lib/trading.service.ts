import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, interval, map, tap } from 'rxjs';
import {
  Order,
  Trade,
  Execution,
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  ExecutionVenue,
  OrderEntryForm,
} from '@fintech/shared-models';

@Injectable({ providedIn: 'root' })
export class TradingService {
  private readonly ordersSubject = new BehaviorSubject<Order[]>(this.generateMockOrders());
  private readonly tradesSubject = new BehaviorSubject<Trade[]>(this.generateMockTrades());
  private orderSequence = 1000;

  getOrders(): Observable<Order[]> {
    return this.ordersSubject.asObservable();
  }

  getTrades(): Observable<Trade[]> {
    return this.tradesSubject.asObservable();
  }

  getTradesWithSimulatedUpdates(): Observable<Trade[]> {
    return interval(5000).pipe(
      tap(() => {
        const trades = [...this.tradesSubject.value];
        const newTrade = this.generateSingleTrade();
        trades.unshift(newTrade);
        if (trades.length > 100) trades.pop();
        this.tradesSubject.next(trades);
      }),
      map(() => this.tradesSubject.value)
    );
  }

  getActiveOrders(): Observable<Order[]> {
    return this.ordersSubject.pipe(
      map((orders) =>
        orders.filter((o) => ['NEW', 'PENDING', 'PARTIAL_FILL'].includes(o.status))
      )
    );
  }

  submitOrder(form: OrderEntryForm): Observable<Order> {
    const order = this.createOrderFromForm(form);
    const currentOrders = this.ordersSubject.value;
    this.ordersSubject.next([order, ...currentOrders]);

    return new Observable<Order>((subscriber) => {
      setTimeout(() => {
        order.status = 'PENDING';
        this.ordersSubject.next([...this.ordersSubject.value]);
        subscriber.next(order);
        subscriber.complete();
      }, 500);
    });
  }

  cancelOrder(orderId: string): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      const orders = this.ordersSubject.value.map((o) => {
        if (o.orderId === orderId && ['NEW', 'PENDING', 'PARTIAL_FILL'].includes(o.status)) {
          return { ...o, status: 'CANCELLED' as OrderStatus, updatedAt: new Date() };
        }
        return o;
      });
      this.ordersSubject.next(orders);
      subscriber.next(true);
      subscriber.complete();
    });
  }

  getDailyTradeStats(): Observable<{ totalTrades: number; totalVolume: number; totalNotional: number; avgPrice: number }> {
    return this.tradesSubject.pipe(
      map((trades) => ({
        totalTrades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + t.quantity, 0),
        totalNotional: trades.reduce((sum, t) => sum + t.notional, 0),
        avgPrice: trades.length > 0
          ? trades.reduce((sum, t) => sum + t.price, 0) / trades.length
          : 0,
      }))
    );
  }

  private createOrderFromForm(form: OrderEntryForm): Order {
    this.orderSequence++;
    return {
      orderId: `ORD-${this.orderSequence}`,
      portfolioId: 'PTF-001',
      ticker: form.ticker,
      companyName: this.getCompanyName(form.ticker),
      side: form.side,
      orderType: form.orderType,
      quantity: form.quantity ?? 0,
      filledQuantity: 0,
      remainingQuantity: form.quantity ?? 0,
      limitPrice: form.limitPrice ?? undefined,
      stopPrice: form.stopPrice ?? undefined,
      status: 'NEW',
      timeInForce: form.timeInForce,
      submittedAt: new Date(),
      updatedAt: new Date(),
      account: form.account || 'GEA-789456',
      broker: 'Goldman Sachs',
      notes: form.notes,
    };
  }

  private getCompanyName(ticker: string): string {
    const map: Record<string, string> = {
      AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.',
      AMZN: 'Amazon.com Inc.', NVDA: 'NVIDIA Corp.', JPM: 'JPMorgan Chase & Co.',
      V: 'Visa Inc.', JNJ: 'Johnson & Johnson', UNH: 'UnitedHealth Group',
      PG: 'Procter & Gamble', MA: 'Mastercard Inc.', HD: 'Home Depot Inc.',
      XOM: 'Exxon Mobil Corp.', BAC: 'Bank of America', PFE: 'Pfizer Inc.',
      META: 'Meta Platforms Inc.', TSLA: 'Tesla Inc.', BRK: 'Berkshire Hathaway',
    };
    return map[ticker] || ticker;
  }

  private generateMockOrders(): Order[] {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'JPM', 'V', 'META', 'TSLA', 'XOM'];
    const sides: OrderSide[] = ['BUY', 'SELL', 'BUY', 'BUY', 'SELL'];
    const types: OrderType[] = ['MARKET', 'LIMIT', 'LIMIT', 'STOP_LIMIT', 'MARKET'];
    const statuses: OrderStatus[] = ['NEW', 'PENDING', 'PARTIAL_FILL', 'FILLED', 'CANCELLED', 'FILLED', 'FILLED'];
    const tifs: TimeInForce[] = ['DAY', 'GTC', 'DAY', 'IOC', 'DAY'];

    return Array.from({ length: 25 }, (_, i) => {
      const ticker = tickers[i % tickers.length];
      const qty = Math.floor(Math.random() * 2000) + 100;
      const status = statuses[i % statuses.length];
      const filledQty = status === 'FILLED' ? qty : status === 'PARTIAL_FILL' ? Math.floor(qty * 0.6) : 0;

      return {
        orderId: `ORD-${900 + i}`,
        portfolioId: 'PTF-001',
        ticker,
        companyName: this.getCompanyName(ticker),
        side: sides[i % sides.length],
        orderType: types[i % types.length],
        quantity: qty,
        filledQuantity: filledQty,
        remainingQuantity: qty - filledQty,
        limitPrice: types[i % types.length] !== 'MARKET' ? parseFloat((150 + Math.random() * 300).toFixed(2)) : undefined,
        stopPrice: types[i % types.length] === 'STOP_LIMIT' ? parseFloat((140 + Math.random() * 280).toFixed(2)) : undefined,
        avgFillPrice: filledQty > 0 ? parseFloat((150 + Math.random() * 300).toFixed(2)) : undefined,
        status,
        timeInForce: tifs[i % tifs.length],
        submittedAt: new Date(Date.now() - Math.random() * 86400000),
        updatedAt: new Date(Date.now() - Math.random() * 3600000),
        account: 'GEA-789456',
        broker: i % 2 === 0 ? 'Goldman Sachs' : 'Morgan Stanley',
      };
    });
  }

  private generateMockTrades(): Trade[] {
    return Array.from({ length: 40 }, () => this.generateSingleTrade());
  }

  private generateSingleTrade(): Trade {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'JPM', 'V', 'UNH', 'XOM', 'BAC', 'META', 'TSLA'];
    const sides: OrderSide[] = ['BUY', 'SELL'];
    const venues: ExecutionVenue[] = ['NYSE', 'NASDAQ', 'ARCA', 'BATS', 'IEX', 'DARK'];
    const ticker = tickers[Math.floor(Math.random() * tickers.length)];
    const price = parseFloat((50 + Math.random() * 800).toFixed(2));
    const qty = Math.floor(Math.random() * 1500) + 50;
    const notional = price * qty;
    const commission = parseFloat((notional * 0.0002).toFixed(2));
    const fees = parseFloat((notional * 0.00005).toFixed(2));

    return {
      tradeId: `TRD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      orderId: `ORD-${Math.floor(Math.random() * 200) + 800}`,
      ticker,
      companyName: this.getCompanyName(ticker),
      side: sides[Math.floor(Math.random() * sides.length)],
      quantity: qty,
      price,
      notional: parseFloat(notional.toFixed(2)),
      commission,
      fees,
      netAmount: parseFloat((notional + commission + fees).toFixed(2)),
      venue: venues[Math.floor(Math.random() * venues.length)],
      executedAt: new Date(Date.now() - Math.random() * 86400000),
      settlementDate: new Date(Date.now() + 2 * 86400000),
      account: 'GEA-789456',
      counterparty: ['Citadel Securities', 'Virtu Financial', 'Jane Street', 'Two Sigma'][Math.floor(Math.random() * 4)],
      status: 'CONFIRMED',
    };
  }
}
