export interface Fund {
  id: string;
  name: string;
  ticker: string;
  type: string;
  strategy: string;
  aum: number;
  nav: number;
  navChange: number;
  navChangePercent: number;
  inceptionDate: string;
  expenseRatio: number;
  benchmark: string;
  manager: string;
  ytdReturn: number;
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
  sharpeRatio: number;
  standardDeviation: number;
  holdings: Holding[];
  status: string;
}

export interface Holding {
  id: string;
  fundId: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  sector: string;
  assetClass: string;
  region: string;
  dateAdded: string;
}

export interface SectorAllocation {
  sector: string;
  weight: number;
  marketValue: number;
  holdingCount: number;
}

export interface FundPerformance {
  date: string;
  nav: number;
  benchmarkValue: number;
  dailyReturn: number;
}
