export interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  peRatio: number;
  eps: number;
  dividend: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  description: string;
  exchange: string;
  country: string;
}

export interface CompanyFinancials {
  companyId: string;
  revenue: QuarterlyData[];
  netIncome: QuarterlyData[];
  operatingMargin: QuarterlyData[];
  debtToEquity: number;
  currentRatio: number;
  returnOnEquity: number;
  freeCashFlow: number;
}

export interface QuarterlyData {
  quarter: string;
  value: number;
  yoyChange: number;
}

export interface CompanySearchResult {
  companies: Company[];
  totalResults: number;
  page: number;
  pageSize: number;
}
