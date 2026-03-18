import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { PortfolioService } from '@fintech/data-access';
import { of } from 'rxjs';
import { Portfolio, PortfolioSummary } from '@fintech/shared-models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockPortfolioService: jest.Mocked<Partial<PortfolioService>>;

  const mockPortfolio: Portfolio = {
    id: 'PTF-001',
    name: 'Global Equity Alpha Fund',
    accountNumber: 'GEA-789456',
    currency: 'USD',
    totalMarketValue: 15_420_890.50,
    totalCostBasis: 12_340_000.00,
    totalUnrealizedPnL: 3_080_890.50,
    totalRealizedPnL: 1_284_530.42,
    dailyPnL: 42_318.75,
    dailyPnLPercent: 0.27,
    ytdReturn: 18.74,
    inceptionReturn: 42.36,
    cashBalance: 2_847_293.18,
    positions: [
      {
        id: 'POS-AAPL-001',
        portfolioId: 'PTF-001',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        region: 'North America',
        quantity: 2500,
        averageCost: 142.50,
        currentPrice: 191.24,
        marketValue: 478_100,
        costBasis: 356_250,
        unrealizedPnL: 121_850,
        unrealizedPnLPercent: 34.20,
        dailyChange: 1.40,
        dailyChangePercent: 0.73,
        weight: 3.10,
        beta: 1.18,
        sharpeRatio: 1.45,
      },
      {
        id: 'POS-MSFT-001',
        portfolioId: 'PTF-001',
        ticker: 'MSFT',
        companyName: 'Microsoft Corp.',
        sector: 'Technology',
        region: 'North America',
        quantity: 1800,
        averageCost: 285.00,
        currentPrice: 417.88,
        marketValue: 752_184,
        costBasis: 513_000,
        unrealizedPnL: 239_184,
        unrealizedPnLPercent: 46.62,
        dailyChange: 2.38,
        dailyChangePercent: 0.57,
        weight: 4.88,
        beta: 0.92,
        sharpeRatio: 1.82,
      },
      {
        id: 'POS-NVDA-001',
        portfolioId: 'PTF-001',
        ticker: 'NVDA',
        companyName: 'NVIDIA Corp.',
        sector: 'Technology',
        region: 'North America',
        quantity: 1500,
        averageCost: 245.00,
        currentPrice: 878.36,
        marketValue: 1_317_540,
        costBasis: 367_500,
        unrealizedPnL: 950_040,
        unrealizedPnLPercent: 258.51,
        dailyChange: 7.06,
        dailyChangePercent: 0.80,
        weight: 8.54,
        beta: 1.68,
        sharpeRatio: 2.14,
      },
    ],
    lastUpdated: new Date('2026-03-18T14:30:00'),
  };

  const mockSummary: PortfolioSummary = {
    totalAUM: 18_268_183.68,
    totalPositions: 20,
    totalSecurities: 20,
    longMarketValue: 15_420_890.50,
    shortMarketValue: 0,
    netExposure: 15_420_890.50,
    grossExposure: 15_420_890.50,
    cashPercent: 15.58,
  };

  beforeEach(async () => {
    mockPortfolioService = {
      getPortfolio: jest.fn().mockReturnValue(of(mockPortfolio)),
      getPortfolioSummary: jest.fn().mockReturnValue(of(mockSummary)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: PortfolioService, useValue: mockPortfolioService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load portfolio data on init', () => {
    expect(mockPortfolioService.getPortfolio).toHaveBeenCalled();
    expect(component.portfolio).toBeDefined();
    expect(component.portfolio?.id).toBe('PTF-001');
  });

  it('should load portfolio summary on init', () => {
    expect(mockPortfolioService.getPortfolioSummary).toHaveBeenCalled();
    expect(component.summary).toBeDefined();
    expect(component.summary?.totalAUM).toBe(18_268_183.68);
  });

  it('should display top 10 holdings sorted by market value', () => {
    expect(component.topHoldings.length).toBeLessThanOrEqual(10);
    // Should be sorted descending by market value
    for (let i = 1; i < component.topHoldings.length; i++) {
      expect(component.topHoldings[i - 1].marketValue).toBeGreaterThanOrEqual(
        component.topHoldings[i].marketValue
      );
    }
  });

  it('should have AG Grid column definitions', () => {
    expect(component.columnDefs).toBeDefined();
    expect(component.columnDefs.length).toBeGreaterThan(5);

    const tickerCol = component.columnDefs.find((c) => c.field === 'ticker');
    expect(tickerCol).toBeDefined();
    expect(tickerCol?.pinned).toBe('left');
  });

  it('should have grid options with proper row height', () => {
    expect(component.gridOptions).toBeDefined();
    expect(component.gridOptions.rowHeight).toBe(22);
    expect(component.gridOptions.headerHeight).toBe(24);
  });

  it('should render portfolio name in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Global Equity Alpha Fund');
  });

  it('should render KPI cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('fintech-data-card');
    expect(cards.length).toBe(6);
  });
});
