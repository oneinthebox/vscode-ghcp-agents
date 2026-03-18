export interface Portfolio {
  id: string;
  name: string;
  accountNumber: string;
  currency: string;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  ytdReturn: number;
  inceptionReturn: number;
  cashBalance: number;
  positions: Position[];
  lastUpdated: Date;
}

export interface Position {
  id: string;
  portfolioId: string;
  ticker: string;
  companyName: string;
  sector: string;
  region: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  weight: number;
  beta: number;
  sharpeRatio: number;
}

export interface SectorAllocation {
  sector: string;
  marketValue: number;
  weight: number;
  positionCount: number;
  pnl: number;
  pnlPercent: number;
}

export interface GeographyAllocation {
  region: string;
  country: string;
  marketValue: number;
  weight: number;
  positionCount: number;
}

export interface PortfolioSummary {
  totalAUM: number;
  totalPositions: number;
  totalSecurities: number;
  longMarketValue: number;
  shortMarketValue: number;
  netExposure: number;
  grossExposure: number;
  cashPercent: number;
}
