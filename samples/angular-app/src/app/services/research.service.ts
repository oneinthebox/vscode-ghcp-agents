import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { Company, CompanyFinancials, CompanySearchResult } from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class ResearchService {

  private apiUrl = 'https://api.fundresearch.internal.corp/v2/research';

  private mockCompanies: Company[] = [
    {
      id: 'APEX001', ticker: 'APEX', name: 'Apex Technologies Inc.', sector: 'Technology',
      industry: 'Cloud Infrastructure', marketCap: 285000000000, price: 342.67, change: 4.23,
      changePercent: 1.25, volume: 18500000, avgVolume: 15200000, peRatio: 35.4, eps: 9.68,
      dividend: 1.20, dividendYield: 0.35, beta: 1.18, fiftyTwoWeekHigh: 378.90,
      fiftyTwoWeekLow: 245.12, description: 'Leading provider of cloud infrastructure and enterprise software solutions.',
      exchange: 'NASDAQ', country: 'US'
    },
    {
      id: 'MRD002', ticker: 'MRD', name: 'Meridian Holdings Corp.', sector: 'Financials',
      industry: 'Asset Management', marketCap: 42000000000, price: 89.34, change: -1.56,
      changePercent: -1.72, volume: 5600000, avgVolume: 4800000, peRatio: 14.2, eps: 6.29,
      dividend: 3.40, dividendYield: 3.81, beta: 0.92, fiftyTwoWeekHigh: 102.50,
      fiftyTwoWeekLow: 71.80, description: 'Diversified financial services holding company with global asset management operations.',
      exchange: 'NYSE', country: 'US'
    },
    {
      id: 'VTX003', ticker: 'VTX', name: 'Vertex Pharmaceuticals Ltd.', sector: 'Healthcare',
      industry: 'Biotechnology', marketCap: 67000000000, price: 198.45, change: 7.82,
      changePercent: 4.10, volume: 9200000, avgVolume: 7100000, peRatio: 28.7, eps: 6.91,
      dividend: 0, dividendYield: 0, beta: 1.35, fiftyTwoWeekHigh: 215.00,
      fiftyTwoWeekLow: 142.30, description: 'Biopharmaceutical company focused on rare disease therapeutics and gene therapy.',
      exchange: 'NASDAQ', country: 'US'
    },
    {
      id: 'CTL004', ticker: 'CTL', name: 'Citadel Energy Partners', sector: 'Energy',
      industry: 'Oil & Gas E&P', marketCap: 31000000000, price: 56.78, change: -0.89,
      changePercent: -1.54, volume: 12400000, avgVolume: 11000000, peRatio: 8.9, eps: 6.38,
      dividend: 2.80, dividendYield: 4.93, beta: 1.45, fiftyTwoWeekHigh: 72.40,
      fiftyTwoWeekLow: 44.15, description: 'Independent energy company engaged in exploration and production of crude oil and natural gas.',
      exchange: 'NYSE', country: 'US'
    },
    {
      id: 'NVW005', ticker: 'NVW', name: 'Northview Capital Group', sector: 'Financials',
      industry: 'Investment Banking', marketCap: 58000000000, price: 145.23, change: 2.10,
      changePercent: 1.47, volume: 7800000, avgVolume: 6500000, peRatio: 11.8, eps: 12.31,
      dividend: 4.50, dividendYield: 3.10, beta: 1.08, fiftyTwoWeekHigh: 162.00,
      fiftyTwoWeekLow: 118.40, description: 'Global investment banking and financial advisory firm.',
      exchange: 'NYSE', country: 'US'
    },
    {
      id: 'SLR006', ticker: 'SLR', name: 'Solaris Semiconductor', sector: 'Technology',
      industry: 'Semiconductors', marketCap: 120000000000, price: 267.89, change: 12.45,
      changePercent: 4.87, volume: 22000000, avgVolume: 18500000, peRatio: 42.1, eps: 6.36,
      dividend: 0.80, dividendYield: 0.30, beta: 1.52, fiftyTwoWeekHigh: 290.00,
      fiftyTwoWeekLow: 178.50, description: 'Designs and manufactures advanced semiconductor chips for AI and data center applications.',
      exchange: 'NASDAQ', country: 'US'
    },
    {
      id: 'PRM007', ticker: 'PRM', name: 'Paramount Industries', sector: 'Industrials',
      industry: 'Aerospace & Defense', marketCap: 45000000000, price: 112.56, change: -0.34,
      changePercent: -0.30, volume: 3200000, avgVolume: 2800000, peRatio: 19.5, eps: 5.77,
      dividend: 2.20, dividendYield: 1.95, beta: 0.85, fiftyTwoWeekHigh: 128.90,
      fiftyTwoWeekLow: 96.20, description: 'Defense contractor and aerospace manufacturer with government and commercial contracts.',
      exchange: 'NYSE', country: 'US'
    },
    {
      id: 'EVG008', ticker: 'EVG', name: 'Evergreen Consumer Brands', sector: 'Consumer Staples',
      industry: 'Household Products', marketCap: 38000000000, price: 78.92, change: 0.45,
      changePercent: 0.57, volume: 4100000, avgVolume: 3600000, peRatio: 22.3, eps: 3.54,
      dividend: 2.60, dividendYield: 3.29, beta: 0.62, fiftyTwoWeekHigh: 85.40,
      fiftyTwoWeekLow: 68.10, description: 'Global consumer products company with portfolio of household and personal care brands.',
      exchange: 'NYSE', country: 'US'
    },
    {
      id: 'QNT009', ticker: 'QNT', name: 'Quantum Networks Inc.', sector: 'Technology',
      industry: 'Networking Equipment', marketCap: 22000000000, price: 45.67, change: 1.89,
      changePercent: 4.31, volume: 8900000, avgVolume: 7200000, peRatio: 25.6, eps: 1.78,
      dividend: 0, dividendYield: 0, beta: 1.28, fiftyTwoWeekHigh: 52.30,
      fiftyTwoWeekLow: 29.80, description: 'Provider of next-generation networking infrastructure and cybersecurity solutions.',
      exchange: 'NASDAQ', country: 'US'
    },
    {
      id: 'ATL010', ticker: 'ATL', name: 'Atlas Real Estate Trust', sector: 'Real Estate',
      industry: 'REIT - Commercial', marketCap: 15000000000, price: 34.21, change: -0.67,
      changePercent: -1.92, volume: 6300000, avgVolume: 5500000, peRatio: 16.8, eps: 2.04,
      dividend: 2.10, dividendYield: 6.14, beta: 0.78, fiftyTwoWeekHigh: 41.50,
      fiftyTwoWeekLow: 28.90, description: 'Commercial real estate investment trust focused on premium office and mixed-use properties.',
      exchange: 'NYSE', country: 'US'
    }
  ];

  constructor(private http: HttpClient) {
    console.log('ResearchService initialized with API URL:', this.apiUrl);
  }

  searchCompanies(query: string): Observable<CompanySearchResult> {
    console.log('Searching companies with query:', query);
    const filtered = this.mockCompanies.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.ticker.toLowerCase().includes(query.toLowerCase()) ||
      c.sector.toLowerCase().includes(query.toLowerCase())
    );
    return of({
      companies: filtered,
      totalResults: filtered.length,
      page: 1,
      pageSize: 50
    }).pipe(delay(300));
  }

  getCompanyById(id: string): Observable<Company | undefined> {
    console.log('Fetching company by ID:', id);
    const company = this.mockCompanies.find(c => c.id === id);
    return of(company).pipe(delay(200));
  }

  getCompanyByTicker(ticker: string): Observable<Company | undefined> {
    console.log('Fetching company by ticker:', ticker);
    const company = this.mockCompanies.find(c => c.ticker === ticker);
    return of(company).pipe(delay(200));
  }

  getCompanyFinancials(companyId: string): Observable<CompanyFinancials> {
    console.log('Fetching financials for company:', companyId);
    const financials: CompanyFinancials = {
      companyId: companyId,
      revenue: [
        { quarter: 'Q1 2024', value: 12400000000, yoyChange: 8.5 },
        { quarter: 'Q2 2024', value: 13100000000, yoyChange: 11.2 },
        { quarter: 'Q3 2024', value: 13800000000, yoyChange: 9.8 },
        { quarter: 'Q4 2024', value: 14500000000, yoyChange: 12.1 },
      ],
      netIncome: [
        { quarter: 'Q1 2024', value: 2800000000, yoyChange: 5.4 },
        { quarter: 'Q2 2024', value: 3100000000, yoyChange: 9.2 },
        { quarter: 'Q3 2024', value: 3400000000, yoyChange: 7.8 },
        { quarter: 'Q4 2024', value: 3600000000, yoyChange: 10.5 },
      ],
      operatingMargin: [
        { quarter: 'Q1 2024', value: 28.5, yoyChange: 1.2 },
        { quarter: 'Q2 2024', value: 29.8, yoyChange: 2.1 },
        { quarter: 'Q3 2024', value: 30.1, yoyChange: 1.8 },
        { quarter: 'Q4 2024', value: 31.2, yoyChange: 2.5 },
      ],
      debtToEquity: 0.45,
      currentRatio: 2.1,
      returnOnEquity: 22.5,
      freeCashFlow: 8900000000,
    };
    return of(financials).pipe(delay(400));
  }

  getAllCompanies(): Observable<Company[]> {
    console.log('Fetching all companies from:', this.apiUrl);
    return of(this.mockCompanies).pipe(delay(250));
  }

  getCompaniesBySector(sector: string): Observable<Company[]> {
    const filtered = this.mockCompanies.filter(c => c.sector === sector);
    return of(filtered).pipe(delay(200));
  }
}
