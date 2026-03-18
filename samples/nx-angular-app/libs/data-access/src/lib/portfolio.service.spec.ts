import { TestBed } from '@angular/core/testing';
import { PortfolioService } from './portfolio.service';
import { Portfolio, SectorAllocation, GeographyAllocation, PortfolioSummary } from '@fintech/shared-models';
import { firstValueFrom } from 'rxjs';

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PortfolioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPortfolio', () => {
    it('should return a portfolio with positions', async () => {
      const portfolio = await firstValueFrom(service.getPortfolio());

      expect(portfolio).toBeDefined();
      expect(portfolio.id).toBe('PTF-001');
      expect(portfolio.name).toBe('Global Equity Alpha Fund');
      expect(portfolio.currency).toBe('USD');
      expect(portfolio.positions.length).toBeGreaterThan(0);
    });

    it('should have valid market values', async () => {
      const portfolio = await firstValueFrom(service.getPortfolio());

      expect(portfolio.totalMarketValue).toBeGreaterThan(0);
      expect(portfolio.cashBalance).toBeGreaterThan(0);
      expect(portfolio.positions.every((p) => p.marketValue > 0)).toBe(true);
    });

    it('should have realistic ticker symbols', async () => {
      const portfolio = await firstValueFrom(service.getPortfolio());
      const knownTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'JPM', 'V'];
      const portfolioTickers = portfolio.positions.map((p) => p.ticker);

      knownTickers.forEach((ticker) => {
        expect(portfolioTickers).toContain(ticker);
      });
    });
  });

  describe('getPositions', () => {
    it('should return positions array', async () => {
      const positions = await firstValueFrom(service.getPositions());

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBe(20);
    });

    it('should have valid position fields', async () => {
      const positions = await firstValueFrom(service.getPositions());
      const firstPosition = positions[0];

      expect(firstPosition.ticker).toBeDefined();
      expect(firstPosition.companyName).toBeDefined();
      expect(firstPosition.quantity).toBeGreaterThan(0);
      expect(firstPosition.currentPrice).toBeGreaterThan(0);
      expect(firstPosition.sector).toBeDefined();
      expect(firstPosition.region).toBeDefined();
    });
  });

  describe('getSectorAllocations', () => {
    it('should return sector allocations', async () => {
      const allocations = await firstValueFrom(service.getSectorAllocations());

      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].sector).toBeDefined();
      expect(allocations[0].weight).toBeGreaterThan(0);
      expect(allocations[0].marketValue).toBeGreaterThan(0);
    });

    it('should be sorted by weight descending', async () => {
      const allocations = await firstValueFrom(service.getSectorAllocations());

      for (let i = 1; i < allocations.length; i++) {
        expect(allocations[i - 1].weight).toBeGreaterThanOrEqual(allocations[i].weight);
      }
    });

    it('should include expected sectors', async () => {
      const allocations = await firstValueFrom(service.getSectorAllocations());
      const sectors = allocations.map((a) => a.sector);

      expect(sectors).toContain('Technology');
      expect(sectors).toContain('Financials');
    });
  });

  describe('getGeographyAllocations', () => {
    it('should return geography allocations', async () => {
      const allocations = await firstValueFrom(service.getGeographyAllocations());

      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].region).toBeDefined();
      expect(allocations[0].weight).toBeGreaterThan(0);
    });

    it('should include North America', async () => {
      const allocations = await firstValueFrom(service.getGeographyAllocations());
      const regions = allocations.map((a) => a.region);

      expect(regions).toContain('North America');
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return a valid summary', async () => {
      const summary = await firstValueFrom(service.getPortfolioSummary());

      expect(summary.totalAUM).toBeGreaterThan(0);
      expect(summary.totalPositions).toBe(20);
      expect(summary.longMarketValue).toBeGreaterThan(0);
      expect(summary.cashPercent).toBeGreaterThan(0);
      expect(summary.cashPercent).toBeLessThan(100);
    });
  });
});
