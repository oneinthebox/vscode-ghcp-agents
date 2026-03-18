import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, timer, switchMap } from 'rxjs';
import {
  Portfolio,
  Position,
  SectorAllocation,
  GeographyAllocation,
  PortfolioSummary,
} from '@fintech/shared-models';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly portfolioSubject = new BehaviorSubject<Portfolio>(this.generateMockPortfolio());

  getPortfolio(): Observable<Portfolio> {
    return this.portfolioSubject.asObservable();
  }

  getPortfolioWithLiveUpdates(): Observable<Portfolio> {
    return timer(0, 3000).pipe(
      switchMap(() => {
        const portfolio = this.generateMockPortfolio();
        this.portfolioSubject.next(portfolio);
        return this.portfolioSubject.asObservable();
      })
    );
  }

  getPositions(): Observable<Position[]> {
    return this.portfolioSubject.pipe(map((p) => p.positions));
  }

  getSectorAllocations(): Observable<SectorAllocation[]> {
    return this.portfolioSubject.pipe(
      map((portfolio) => {
        const sectorMap = new Map<string, SectorAllocation>();
        const totalMV = portfolio.totalMarketValue;

        portfolio.positions.forEach((pos) => {
          const existing = sectorMap.get(pos.sector);
          if (existing) {
            existing.marketValue += pos.marketValue;
            existing.weight = existing.marketValue / totalMV;
            existing.positionCount += 1;
            existing.pnl += pos.unrealizedPnL;
          } else {
            sectorMap.set(pos.sector, {
              sector: pos.sector,
              marketValue: pos.marketValue,
              weight: pos.marketValue / totalMV,
              positionCount: 1,
              pnl: pos.unrealizedPnL,
              pnlPercent: 0,
            });
          }
        });

        const allocations = Array.from(sectorMap.values());
        allocations.forEach((a) => {
          a.pnlPercent = a.marketValue > 0 ? (a.pnl / a.marketValue) * 100 : 0;
        });
        return allocations.sort((a, b) => b.weight - a.weight);
      })
    );
  }

  getGeographyAllocations(): Observable<GeographyAllocation[]> {
    return this.portfolioSubject.pipe(
      map((portfolio) => {
        const geoMap = new Map<string, GeographyAllocation>();
        const totalMV = portfolio.totalMarketValue;

        portfolio.positions.forEach((pos) => {
          const existing = geoMap.get(pos.region);
          if (existing) {
            existing.marketValue += pos.marketValue;
            existing.weight = existing.marketValue / totalMV;
            existing.positionCount += 1;
          } else {
            geoMap.set(pos.region, {
              region: pos.region,
              country: pos.region === 'North America' ? 'United States' : pos.region,
              marketValue: pos.marketValue,
              weight: pos.marketValue / totalMV,
              positionCount: 1,
            });
          }
        });

        return Array.from(geoMap.values()).sort((a, b) => b.weight - a.weight);
      })
    );
  }

  getPortfolioSummary(): Observable<PortfolioSummary> {
    return this.portfolioSubject.pipe(
      map((portfolio) => ({
        totalAUM: portfolio.totalMarketValue + portfolio.cashBalance,
        totalPositions: portfolio.positions.length,
        totalSecurities: new Set(portfolio.positions.map((p) => p.ticker)).size,
        longMarketValue: portfolio.positions
          .filter((p) => p.quantity > 0)
          .reduce((sum, p) => sum + p.marketValue, 0),
        shortMarketValue: portfolio.positions
          .filter((p) => p.quantity < 0)
          .reduce((sum, p) => sum + Math.abs(p.marketValue), 0),
        netExposure: portfolio.totalMarketValue,
        grossExposure: portfolio.positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0),
        cashPercent: (portfolio.cashBalance / (portfolio.totalMarketValue + portfolio.cashBalance)) * 100,
      }))
    );
  }

  private generateMockPortfolio(): Portfolio {
    const positions: Position[] = [
      this.createPosition('AAPL', 'Apple Inc.', 'Technology', 'North America', 2500, 142.50, 191.24 + this.jitter(2)),
      this.createPosition('MSFT', 'Microsoft Corp.', 'Technology', 'North America', 1800, 285.00, 417.88 + this.jitter(3)),
      this.createPosition('GOOGL', 'Alphabet Inc.', 'Technology', 'North America', 800, 105.20, 175.98 + this.jitter(1.5)),
      this.createPosition('AMZN', 'Amazon.com Inc.', 'Consumer Discretionary', 'North America', 1200, 128.90, 186.49 + this.jitter(2)),
      this.createPosition('NVDA', 'NVIDIA Corp.', 'Technology', 'North America', 1500, 245.00, 878.36 + this.jitter(8)),
      this.createPosition('JPM', 'JPMorgan Chase & Co.', 'Financials', 'North America', 2200, 138.60, 198.47 + this.jitter(1.5)),
      this.createPosition('V', 'Visa Inc.', 'Financials', 'North America', 1100, 221.30, 279.08 + this.jitter(2)),
      this.createPosition('JNJ', 'Johnson & Johnson', 'Healthcare', 'North America', 1800, 165.40, 156.74 + this.jitter(1)),
      this.createPosition('UNH', 'UnitedHealth Group', 'Healthcare', 'North America', 600, 482.10, 527.49 + this.jitter(4)),
      this.createPosition('PG', 'Procter & Gamble', 'Consumer Staples', 'North America', 1400, 148.90, 164.42 + this.jitter(1)),
      this.createPosition('MA', 'Mastercard Inc.', 'Financials', 'North America', 700, 362.50, 458.21 + this.jitter(3)),
      this.createPosition('HD', 'Home Depot Inc.', 'Consumer Discretionary', 'North America', 900, 298.40, 362.58 + this.jitter(2.5)),
      this.createPosition('XOM', 'Exxon Mobil Corp.', 'Energy', 'North America', 2000, 88.50, 107.83 + this.jitter(1)),
      this.createPosition('BAC', 'Bank of America', 'Financials', 'North America', 3500, 29.80, 37.42 + this.jitter(0.5)),
      this.createPosition('PFE', 'Pfizer Inc.', 'Healthcare', 'North America', 4000, 38.20, 27.18 + this.jitter(0.3)),
      this.createPosition('NESN.SW', 'Nestle SA', 'Consumer Staples', 'Europe', 1200, 95.40, 88.62 + this.jitter(0.8)),
      this.createPosition('ASML', 'ASML Holding NV', 'Technology', 'Europe', 400, 590.80, 912.45 + this.jitter(8)),
      this.createPosition('SAP', 'SAP SE', 'Technology', 'Europe', 800, 132.40, 188.54 + this.jitter(1.5)),
      this.createPosition('7203.T', 'Toyota Motor Corp.', 'Consumer Discretionary', 'Asia Pacific', 1500, 165.20, 192.30 + this.jitter(1.5)),
      this.createPosition('9984.T', 'SoftBank Group', 'Technology', 'Asia Pacific', 600, 52.80, 71.94 + this.jitter(1)),
    ];

    const totalMV = positions.reduce((sum, p) => sum + p.marketValue, 0);
    positions.forEach((p) => {
      p.weight = (p.marketValue / totalMV) * 100;
    });

    const totalCost = positions.reduce((sum, p) => sum + p.costBasis, 0);
    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const dailyPnL = positions.reduce((sum, p) => sum + p.dailyChange * p.quantity, 0);

    return {
      id: 'PTF-001',
      name: 'Global Equity Alpha Fund',
      accountNumber: 'GEA-789456',
      currency: 'USD',
      totalMarketValue: totalMV,
      totalCostBasis: totalCost,
      totalUnrealizedPnL: totalPnL,
      totalRealizedPnL: 1_284_530.42,
      dailyPnL: dailyPnL,
      dailyPnLPercent: (dailyPnL / totalMV) * 100,
      ytdReturn: 18.74,
      inceptionReturn: 42.36,
      cashBalance: 2_847_293.18,
      positions: positions,
      lastUpdated: new Date(),
    };
  }

  private createPosition(
    ticker: string,
    companyName: string,
    sector: string,
    region: string,
    quantity: number,
    avgCost: number,
    currentPrice: number
  ): Position {
    const marketValue = quantity * currentPrice;
    const costBasis = quantity * avgCost;
    const unrealizedPnL = marketValue - costBasis;
    const dailyChange = currentPrice * (Math.random() * 0.04 - 0.02);

    return {
      id: `POS-${ticker}-${Math.random().toString(36).substring(2, 8)}`,
      portfolioId: 'PTF-001',
      ticker,
      companyName,
      sector,
      region,
      quantity,
      averageCost: avgCost,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      marketValue: parseFloat(marketValue.toFixed(2)),
      costBasis: parseFloat(costBasis.toFixed(2)),
      unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
      unrealizedPnLPercent: parseFloat(((unrealizedPnL / costBasis) * 100).toFixed(2)),
      dailyChange: parseFloat(dailyChange.toFixed(2)),
      dailyChangePercent: parseFloat(((dailyChange / currentPrice) * 100).toFixed(2)),
      weight: 0,
      beta: parseFloat((0.6 + Math.random() * 0.9).toFixed(2)),
      sharpeRatio: parseFloat((0.3 + Math.random() * 2.2).toFixed(2)),
    };
  }

  private jitter(range: number): number {
    return parseFloat(((Math.random() - 0.5) * range).toFixed(2));
  }
}
