import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { FundService } from '../../services/fund.service';
import { TradeService } from '../../services/trade.service';
import { Fund, Holding, SectorAllocation } from '../../models/fund.model';
import { Trade } from '../../models/trade.model';

@Component({
  selector: 'app-fund-detail',
  templateUrl: './fund-detail.component.html',
  styleUrls: []
})
export class FundDetailComponent implements OnInit {

  fund: Fund | undefined;
  holdings: Holding[] = [];
  sectorAllocations: SectorAllocation[] = [];
  recentTrades: Trade[] = [];
  holdingsDataSource = new MatTableDataSource<Holding>();
  isLoading = true;

  holdingColumns = [
    'ticker', 'companyName', 'sector', 'shares', 'avgCost', 'currentPrice',
    'marketValue', 'weight', 'unrealizedPnl', 'unrealizedPnlPercent'
  ];

  tradeColumns = ['ticker', 'side', 'quantity', 'price', 'status', 'createdAt'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fundService: FundService,
    private tradeService: TradeService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const fundId = params['id'];
      this.loadFundData(fundId);
    });
  }

  loadFundData(fundId: string): void {
    this.isLoading = true;

    this.fundService.getFundById(fundId).subscribe(fund => {
      this.fund = fund;
      this.isLoading = false;
      console.log('Fund loaded:', fund?.name);
    });

    this.fundService.getFundHoldings(fundId).subscribe(holdings => {
      this.holdings = holdings;
      this.holdingsDataSource.data = holdings;
    });

    this.fundService.getSectorAllocations(fundId).subscribe(allocations => {
      this.sectorAllocations = allocations;
    });

    this.tradeService.getTradeBlotter(fundId).subscribe(blotter => {
      this.recentTrades = blotter.trades.slice(0, 5);
    });
  }

  goBack(): void {
    this.router.navigate(['/funds']);
  }

  getTotalMarketValue(): number {
    return this.holdings.reduce((sum, h) => sum + h.marketValue, 0);
  }

  getTotalPnl(): number {
    return this.holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
  }

  getMaxAllocationWeight(): number {
    if (this.sectorAllocations.length === 0) return 1;
    return Math.max(...this.sectorAllocations.map(a => a.weight));
  }

  formatValue(value: number): string {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    return '$' + value.toLocaleString();
  }
}
