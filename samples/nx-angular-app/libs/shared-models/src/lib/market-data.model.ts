export interface Quote {
  ticker: string;
  companyName: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  volume: number;
  avgVolume: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  prevClose: number;
  change: number;
  changePercent: number;
  vwap: number;
  marketCap: number;
  peRatio: number;
  eps: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  exchange: string;
  lastUpdated: Date;
}

export interface Instrument {
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  isin: string;
  cusip: string;
  sedol: string;
  lotSize: number;
  tickSize: number;
  isActive: boolean;
}

export interface MarketDepth {
  ticker: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  timestamp: Date;
}

export interface PriceLevel {
  price: number;
  size: number;
  orderCount: number;
}

export interface MarketStatus {
  exchange: string;
  status: 'PRE_MARKET' | 'OPEN' | 'CLOSED' | 'AFTER_HOURS' | 'HALTED';
  timestamp: Date;
  nextEvent: string;
  nextEventTime: Date;
}
