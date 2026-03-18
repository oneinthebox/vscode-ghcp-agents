import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval, map } from 'rxjs';
import { Quote, Instrument, MarketStatus } from '@fintech/shared-models';

@Injectable({ providedIn: 'root' })
export class MarketDataService implements OnDestroy {
  private readonly quotesSubject = new BehaviorSubject<Quote[]>(this.generateInitialQuotes());
  private tickSubscription: Subscription | null = null;

  ngOnDestroy(): void {
    this.stopLiveUpdates();
  }

  getQuotes(): Observable<Quote[]> {
    return this.quotesSubject.asObservable();
  }

  getQuoteByTicker(ticker: string): Observable<Quote | undefined> {
    return this.quotesSubject.pipe(map((quotes) => quotes.find((q) => q.ticker === ticker)));
  }

  startLiveUpdates(): void {
    if (this.tickSubscription) return;

    this.tickSubscription = interval(1500).subscribe(() => {
      const quotes = this.quotesSubject.value.map((q) => this.tickQuote(q));
      this.quotesSubject.next(quotes);
    });
  }

  stopLiveUpdates(): void {
    if (this.tickSubscription) {
      this.tickSubscription.unsubscribe();
      this.tickSubscription = null;
    }
  }

  getInstruments(): Observable<Instrument[]> {
    return new BehaviorSubject<Instrument[]>(this.generateInstruments()).asObservable();
  }

  getMarketStatus(): Observable<MarketStatus> {
    return new BehaviorSubject<MarketStatus>({
      exchange: 'NYSE',
      status: 'OPEN',
      timestamp: new Date(),
      nextEvent: 'Market Close',
      nextEventTime: new Date(new Date().setHours(16, 0, 0, 0)),
    }).asObservable();
  }

  getTopMovers(): Observable<Quote[]> {
    return this.quotesSubject.pipe(
      map((quotes) =>
        [...quotes]
          .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
          .slice(0, 5)
      )
    );
  }

  private tickQuote(quote: Quote): Quote {
    const delta = quote.lastPrice * (Math.random() * 0.004 - 0.002);
    const newPrice = parseFloat((quote.lastPrice + delta).toFixed(2));
    const change = parseFloat((newPrice - quote.prevClose).toFixed(2));
    const changePercent = parseFloat(((change / quote.prevClose) * 100).toFixed(2));
    const spread = parseFloat((quote.lastPrice * 0.0005).toFixed(2));

    return {
      ...quote,
      lastPrice: newPrice,
      bidPrice: parseFloat((newPrice - spread).toFixed(2)),
      askPrice: parseFloat((newPrice + spread).toFixed(2)),
      bidSize: Math.floor(Math.random() * 500) + 100,
      askSize: Math.floor(Math.random() * 500) + 100,
      change,
      changePercent,
      dayHigh: Math.max(quote.dayHigh, newPrice),
      dayLow: Math.min(quote.dayLow, newPrice),
      volume: quote.volume + Math.floor(Math.random() * 10000),
      vwap: parseFloat(((quote.vwap * 0.99 + newPrice * 0.01)).toFixed(2)),
      lastUpdated: new Date(),
    };
  }

  private generateInitialQuotes(): Quote[] {
    const instruments = [
      { ticker: 'AAPL', name: 'Apple Inc.', price: 191.24, prevClose: 189.84, exchange: 'NASDAQ', marketCap: 2.98e12, pe: 31.2, eps: 6.13, divYield: 0.52, hi52: 199.62, lo52: 164.08 },
      { ticker: 'MSFT', name: 'Microsoft Corp.', price: 417.88, prevClose: 415.50, exchange: 'NASDAQ', marketCap: 3.11e12, pe: 36.8, eps: 11.35, divYield: 0.72, hi52: 430.82, lo52: 309.45 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 175.98, prevClose: 174.20, exchange: 'NASDAQ', marketCap: 2.18e12, pe: 27.4, eps: 6.42, divYield: 0, hi52: 180.10, lo52: 120.21 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 186.49, prevClose: 185.10, exchange: 'NASDAQ', marketCap: 1.93e12, pe: 62.8, eps: 2.97, divYield: 0, hi52: 191.70, lo52: 118.35 },
      { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 878.36, prevClose: 871.30, exchange: 'NASDAQ', marketCap: 2.17e12, pe: 72.5, eps: 12.11, divYield: 0.02, hi52: 974.00, lo52: 373.56 },
      { ticker: 'JPM', name: 'JPMorgan Chase & Co.', price: 198.47, prevClose: 197.10, exchange: 'NYSE', marketCap: 571e9, pe: 11.8, eps: 16.82, divYield: 2.32, hi52: 205.88, lo52: 143.64 },
      { ticker: 'V', name: 'Visa Inc.', price: 279.08, prevClose: 277.90, exchange: 'NYSE', marketCap: 571e9, pe: 30.4, eps: 9.18, divYield: 0.76, hi52: 290.96, lo52: 227.79 },
      { ticker: 'JNJ', name: 'Johnson & Johnson', price: 156.74, prevClose: 157.80, exchange: 'NYSE', marketCap: 378e9, pe: 22.1, eps: 7.10, divYield: 3.04, hi52: 175.97, lo52: 143.13 },
      { ticker: 'UNH', name: 'UnitedHealth Group', price: 527.49, prevClose: 525.10, exchange: 'NYSE', marketCap: 487e9, pe: 21.9, eps: 24.09, divYield: 1.42, hi52: 554.70, lo52: 436.38 },
      { ticker: 'PG', name: 'Procter & Gamble', price: 164.42, prevClose: 163.80, exchange: 'NYSE', marketCap: 387e9, pe: 26.3, eps: 6.25, divYield: 2.40, hi52: 170.83, lo52: 141.45 },
      { ticker: 'XOM', name: 'Exxon Mobil Corp.', price: 107.83, prevClose: 106.90, exchange: 'NYSE', marketCap: 432e9, pe: 12.6, eps: 8.56, divYield: 3.48, hi52: 120.70, lo52: 95.77 },
      { ticker: 'BAC', name: 'Bank of America', price: 37.42, prevClose: 37.10, exchange: 'NYSE', marketCap: 296e9, pe: 12.4, eps: 3.02, divYield: 2.56, hi52: 38.60, lo52: 24.96 },
      { ticker: 'META', name: 'Meta Platforms Inc.', price: 505.18, prevClose: 502.30, exchange: 'NASDAQ', marketCap: 1.28e12, pe: 33.6, eps: 15.04, divYield: 0.40, hi52: 531.49, lo52: 274.38 },
      { ticker: 'TSLA', name: 'Tesla Inc.', price: 238.45, prevClose: 241.20, exchange: 'NASDAQ', marketCap: 758e9, pe: 62.1, eps: 3.84, divYield: 0, hi52: 299.29, lo52: 152.37 },
      { ticker: 'MA', name: 'Mastercard Inc.', price: 458.21, prevClose: 456.80, exchange: 'NYSE', marketCap: 426e9, pe: 34.2, eps: 13.40, divYield: 0.56, hi52: 479.40, lo52: 359.77 },
      { ticker: 'HD', name: 'Home Depot Inc.', price: 362.58, prevClose: 360.40, exchange: 'NYSE', marketCap: 361e9, pe: 24.8, eps: 14.62, divYield: 2.38, hi52: 396.87, lo52: 274.26 },
      { ticker: 'PFE', name: 'Pfizer Inc.', price: 27.18, prevClose: 27.45, exchange: 'NYSE', marketCap: 153e9, pe: 48.5, eps: 0.56, divYield: 5.92, hi52: 33.38, lo52: 25.20 },
      { ticker: 'ASML', name: 'ASML Holding NV', price: 912.45, prevClose: 905.60, exchange: 'NASDAQ', marketCap: 359e9, pe: 45.2, eps: 20.19, divYield: 0.68, hi52: 1024.88, lo52: 576.31 },
      { ticker: 'CRM', name: 'Salesforce Inc.', price: 298.74, prevClose: 296.50, exchange: 'NYSE', marketCap: 290e9, pe: 56.3, eps: 5.31, divYield: 0.54, hi52: 318.72, lo52: 211.76 },
      { ticker: 'AVGO', name: 'Broadcom Inc.', price: 1387.62, prevClose: 1379.40, exchange: 'NASDAQ', marketCap: 645e9, pe: 38.7, eps: 35.85, divYield: 1.52, hi52: 1438.00, lo52: 795.18 },
    ];

    return instruments.map((inst) => {
      const change = parseFloat((inst.price - inst.prevClose).toFixed(2));
      const spread = parseFloat((inst.price * 0.0005).toFixed(2));
      return {
        ticker: inst.ticker,
        companyName: inst.name,
        lastPrice: inst.price,
        bidPrice: parseFloat((inst.price - spread).toFixed(2)),
        askPrice: parseFloat((inst.price + spread).toFixed(2)),
        bidSize: Math.floor(Math.random() * 500) + 100,
        askSize: Math.floor(Math.random() * 500) + 100,
        volume: Math.floor(Math.random() * 20000000) + 1000000,
        avgVolume: Math.floor(Math.random() * 15000000) + 5000000,
        dayHigh: parseFloat((inst.price * 1.008).toFixed(2)),
        dayLow: parseFloat((inst.price * 0.992).toFixed(2)),
        openPrice: parseFloat((inst.prevClose + (Math.random() - 0.5) * 2).toFixed(2)),
        prevClose: inst.prevClose,
        change,
        changePercent: parseFloat(((change / inst.prevClose) * 100).toFixed(2)),
        vwap: parseFloat((inst.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2)),
        marketCap: inst.marketCap,
        peRatio: inst.pe,
        eps: inst.eps,
        dividendYield: inst.divYield,
        fiftyTwoWeekHigh: inst.hi52,
        fiftyTwoWeekLow: inst.lo52,
        exchange: inst.exchange,
        lastUpdated: new Date(),
      };
    });
  }

  private generateInstruments(): Instrument[] {
    const data: Array<{ t: string; n: string; ex: string; sec: string; ind: string }> = [
      { t: 'AAPL', n: 'Apple Inc.', ex: 'NASDAQ', sec: 'Technology', ind: 'Consumer Electronics' },
      { t: 'MSFT', n: 'Microsoft Corp.', ex: 'NASDAQ', sec: 'Technology', ind: 'Software' },
      { t: 'GOOGL', n: 'Alphabet Inc.', ex: 'NASDAQ', sec: 'Technology', ind: 'Internet Services' },
      { t: 'AMZN', n: 'Amazon.com Inc.', ex: 'NASDAQ', sec: 'Consumer Discretionary', ind: 'E-Commerce' },
      { t: 'NVDA', n: 'NVIDIA Corp.', ex: 'NASDAQ', sec: 'Technology', ind: 'Semiconductors' },
      { t: 'JPM', n: 'JPMorgan Chase & Co.', ex: 'NYSE', sec: 'Financials', ind: 'Banks' },
      { t: 'V', n: 'Visa Inc.', ex: 'NYSE', sec: 'Financials', ind: 'Payment Processing' },
      { t: 'JNJ', n: 'Johnson & Johnson', ex: 'NYSE', sec: 'Healthcare', ind: 'Pharmaceuticals' },
    ];

    return data.map((d) => ({
      ticker: d.t,
      companyName: d.n,
      exchange: d.ex,
      sector: d.sec,
      industry: d.ind,
      country: 'United States',
      currency: 'USD',
      isin: `US${Math.random().toString().substring(2, 12)}`,
      cusip: Math.random().toString(36).substring(2, 11).toUpperCase(),
      sedol: Math.random().toString(36).substring(2, 9).toUpperCase(),
      lotSize: 1,
      tickSize: 0.01,
      isActive: true,
    }));
  }
}
