import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Fund, Holding, SectorAllocation } from '../models/fund.model';

@Injectable({
  providedIn: 'root'
})
export class FundService {

  private apiUrl = 'https://api.fundresearch.internal.corp/v2/funds';

  private mockHoldings: Holding[] = [
    { id: 'H001', fundId: 'GEF001', ticker: 'APEX', companyName: 'Apex Technologies Inc.', shares: 450000, avgCost: 298.50, currentPrice: 342.67, marketValue: 154201500, weight: 15.8, unrealizedPnl: 19876500, unrealizedPnlPercent: 14.79, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-03-15' },
    { id: 'H002', fundId: 'GEF001', ticker: 'SLR', companyName: 'Solaris Semiconductor', shares: 320000, avgCost: 212.30, currentPrice: 267.89, marketValue: 85724800, weight: 8.8, unrealizedPnl: 17788800, unrealizedPnlPercent: 26.18, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-06-22' },
    { id: 'H003', fundId: 'GEF001', ticker: 'MRD', companyName: 'Meridian Holdings Corp.', shares: 680000, avgCost: 76.45, currentPrice: 89.34, marketValue: 60751200, weight: 6.2, unrealizedPnl: 8765200, unrealizedPnlPercent: 16.86, sector: 'Financials', assetClass: 'Equity', region: 'North America', dateAdded: '2022-11-08' },
    { id: 'H004', fundId: 'GEF001', ticker: 'VTX', companyName: 'Vertex Pharmaceuticals Ltd.', shares: 280000, avgCost: 165.20, currentPrice: 198.45, marketValue: 55566000, weight: 5.7, unrealizedPnl: 9310000, unrealizedPnlPercent: 20.12, sector: 'Healthcare', assetClass: 'Equity', region: 'North America', dateAdded: '2023-01-19' },
    { id: 'H005', fundId: 'GEF001', ticker: 'NVW', companyName: 'Northview Capital Group', shares: 350000, avgCost: 128.90, currentPrice: 145.23, marketValue: 50830500, weight: 5.2, unrealizedPnl: 5715500, unrealizedPnlPercent: 12.66, sector: 'Financials', assetClass: 'Equity', region: 'North America', dateAdded: '2023-04-10' },
    { id: 'H006', fundId: 'GEF001', ticker: 'PRM', companyName: 'Paramount Industries', shares: 420000, avgCost: 98.40, currentPrice: 112.56, marketValue: 47275200, weight: 4.8, unrealizedPnl: 5947200, unrealizedPnlPercent: 14.39, sector: 'Industrials', assetClass: 'Equity', region: 'North America', dateAdded: '2023-02-14' },
    { id: 'H007', fundId: 'GEF001', ticker: 'CTL', companyName: 'Citadel Energy Partners', shares: 550000, avgCost: 48.90, currentPrice: 56.78, marketValue: 31229000, weight: 3.2, unrealizedPnl: 4334000, unrealizedPnlPercent: 16.11, sector: 'Energy', assetClass: 'Equity', region: 'North America', dateAdded: '2023-07-05' },
    { id: 'H008', fundId: 'GEF001', ticker: 'EVG', companyName: 'Evergreen Consumer Brands', shares: 380000, avgCost: 72.10, currentPrice: 78.92, marketValue: 29989600, weight: 3.1, unrealizedPnl: 2591600, unrealizedPnlPercent: 9.45, sector: 'Consumer Staples', assetClass: 'Equity', region: 'North America', dateAdded: '2022-09-20' },
    { id: 'H009', fundId: 'GEF001', ticker: 'QNT', companyName: 'Quantum Networks Inc.', shares: 600000, avgCost: 38.25, currentPrice: 45.67, marketValue: 27402000, weight: 2.8, unrealizedPnl: 4452000, unrealizedPnlPercent: 19.41, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-08-30' },
    { id: 'H010', fundId: 'GEF001', ticker: 'ATL', companyName: 'Atlas Real Estate Trust', shares: 480000, avgCost: 31.50, currentPrice: 34.21, marketValue: 16420800, weight: 1.7, unrealizedPnl: 1300800, unrealizedPnlPercent: 8.60, sector: 'Real Estate', assetClass: 'Equity', region: 'North America', dateAdded: '2023-05-17' },
    { id: 'H011', fundId: 'FIP002', ticker: 'APEX', companyName: 'Apex Technologies Inc.', shares: 120000, avgCost: 310.20, currentPrice: 342.67, marketValue: 41120400, weight: 4.2, unrealizedPnl: 3896400, unrealizedPnlPercent: 10.47, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-09-12' },
    { id: 'H012', fundId: 'FIP002', ticker: 'MRD', companyName: 'Meridian Holdings Corp.', shares: 450000, avgCost: 82.30, currentPrice: 89.34, marketValue: 40203000, weight: 4.1, unrealizedPnl: 3168000, unrealizedPnlPercent: 8.55, sector: 'Financials', assetClass: 'Equity', region: 'North America', dateAdded: '2023-02-28' },
    { id: 'H013', fundId: 'EMF003', ticker: 'SLR', companyName: 'Solaris Semiconductor', shares: 200000, avgCost: 195.40, currentPrice: 267.89, marketValue: 53578000, weight: 12.5, unrealizedPnl: 14498000, unrealizedPnlPercent: 37.10, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-04-25' },
    { id: 'H014', fundId: 'EMF003', ticker: 'QNT', companyName: 'Quantum Networks Inc.', shares: 850000, avgCost: 32.80, currentPrice: 45.67, marketValue: 38819500, weight: 9.1, unrealizedPnl: 10939500, unrealizedPnlPercent: 39.23, sector: 'Technology', assetClass: 'Equity', region: 'North America', dateAdded: '2023-01-10' },
    { id: 'H015', fundId: 'EMF003', ticker: 'VTX', companyName: 'Vertex Pharmaceuticals Ltd.', shares: 180000, avgCost: 148.60, currentPrice: 198.45, marketValue: 35721000, weight: 8.3, unrealizedPnl: 8973000, unrealizedPnlPercent: 33.55, sector: 'Healthcare', assetClass: 'Equity', region: 'North America', dateAdded: '2023-06-08' },
  ];

  private mockFunds: Fund[] = [
    {
      id: 'GEF001', name: 'Global Equity Fund', ticker: 'GQEQX', type: 'Equity', strategy: 'Long-Only Global Equity',
      aum: 975000000, nav: 156.78, navChange: 1.23, navChangePercent: 0.79, inceptionDate: '2018-01-15',
      expenseRatio: 0.65, benchmark: 'MSCI World Index', manager: 'Sarah Chen', ytdReturn: 14.2,
      oneYearReturn: 18.5, threeYearReturn: 12.8, fiveYearReturn: 15.1, sharpeRatio: 1.42,
      standardDeviation: 14.5, holdings: this.mockHoldings.filter(h => h.fundId === 'GEF001'), status: 'Active'
    },
    {
      id: 'FIP002', name: 'Fixed Income Plus', ticker: 'FIPLX', type: 'Fixed Income', strategy: 'Multi-Sector Bond',
      aum: 620000000, nav: 98.45, navChange: -0.12, navChangePercent: -0.12, inceptionDate: '2019-06-01',
      expenseRatio: 0.45, benchmark: 'Bloomberg US Aggregate', manager: 'Michael Torres', ytdReturn: 5.8,
      oneYearReturn: 7.2, threeYearReturn: 4.1, fiveYearReturn: 5.5, sharpeRatio: 0.95,
      standardDeviation: 6.2, holdings: this.mockHoldings.filter(h => h.fundId === 'FIP002'), status: 'Active'
    },
    {
      id: 'EMF003', name: 'Emerging Markets Growth', ticker: 'EMGFX', type: 'Equity', strategy: 'Emerging Market Equity',
      aum: 428000000, nav: 72.34, navChange: 2.45, navChangePercent: 3.51, inceptionDate: '2020-03-10',
      expenseRatio: 0.85, benchmark: 'MSCI Emerging Markets', manager: 'Raj Patel', ytdReturn: 22.1,
      oneYearReturn: 28.4, threeYearReturn: 9.5, fiveYearReturn: 0, sharpeRatio: 1.15,
      standardDeviation: 21.3, holdings: this.mockHoldings.filter(h => h.fundId === 'EMF003'), status: 'Active'
    },
    {
      id: 'DVF004', name: 'Dividend Value Strategy', ticker: 'DVSFX', type: 'Equity', strategy: 'Dividend Growth',
      aum: 340000000, nav: 45.67, navChange: 0.34, navChangePercent: 0.75, inceptionDate: '2017-09-22',
      expenseRatio: 0.55, benchmark: 'S&P 500 Dividend Aristocrats', manager: 'James Wright', ytdReturn: 8.9,
      oneYearReturn: 11.2, threeYearReturn: 10.4, fiveYearReturn: 12.8, sharpeRatio: 1.28,
      standardDeviation: 10.8, holdings: [], status: 'Active'
    },
    {
      id: 'TAF005', name: 'Tactical Allocation Fund', ticker: 'TACFX', type: 'Multi-Asset', strategy: 'Dynamic Asset Allocation',
      aum: 185000000, nav: 112.90, navChange: -0.56, navChangePercent: -0.49, inceptionDate: '2021-01-05',
      expenseRatio: 0.75, benchmark: '60/40 Blended Benchmark', manager: 'Elena Vasquez', ytdReturn: 10.4,
      oneYearReturn: 13.7, threeYearReturn: 0, fiveYearReturn: 0, sharpeRatio: 1.05,
      standardDeviation: 12.1, holdings: [], status: 'Active'
    },
    {
      id: 'SCG006', name: 'Small Cap Growth Opportunities', ticker: 'SCGOX', type: 'Equity', strategy: 'Small Cap Growth',
      aum: 95000000, nav: 28.45, navChange: 0.89, navChangePercent: 3.23, inceptionDate: '2022-06-15',
      expenseRatio: 0.95, benchmark: 'Russell 2000 Growth', manager: 'David Kim', ytdReturn: 19.8,
      oneYearReturn: 24.6, threeYearReturn: 0, fiveYearReturn: 0, sharpeRatio: 0.88,
      standardDeviation: 24.7, holdings: [], status: 'Active'
    }
  ];

  constructor(private http: HttpClient) {
    console.log('FundService initialized, loading fund data from:', this.apiUrl);
  }

  getAllFunds(): Observable<Fund[]> {
    console.log('Fetching all funds');
    return of(this.mockFunds).pipe(delay(300));
  }

  getFundById(id: string): Observable<Fund | undefined> {
    console.log('Fetching fund:', id);
    const fund = this.mockFunds.find(f => f.id === id);
    return of(fund).pipe(delay(200));
  }

  getFundHoldings(fundId: string): Observable<Holding[]> {
    console.log('Fetching holdings for fund:', fundId);
    const holdings = this.mockHoldings.filter(h => h.fundId === fundId);
    return of(holdings).pipe(delay(250));
  }

  getAllHoldings(): Observable<Holding[]> {
    console.log('Fetching all holdings across funds');
    return of(this.mockHoldings).pipe(delay(300));
  }

  getSectorAllocations(fundId: string): Observable<SectorAllocation[]> {
    const holdings = this.mockHoldings.filter(h => h.fundId === fundId);
    const sectorMap = new Map<string, SectorAllocation>();

    holdings.forEach(h => {
      const existing = sectorMap.get(h.sector);
      if (existing) {
        existing.weight += h.weight;
        existing.marketValue += h.marketValue;
        existing.holdingCount += 1;
      } else {
        sectorMap.set(h.sector, {
          sector: h.sector,
          weight: h.weight,
          marketValue: h.marketValue,
          holdingCount: 1
        });
      }
    });

    return of(Array.from(sectorMap.values())).pipe(delay(200));
  }

  getFundsByType(type: string): Observable<Fund[]> {
    const filtered = this.mockFunds.filter(f => f.type === type);
    return of(filtered).pipe(delay(200));
  }

  getTotalAum(): Observable<number> {
    const total = this.mockFunds.reduce((sum, f) => sum + f.aum, 0);
    return of(total).pipe(delay(100));
  }
}
