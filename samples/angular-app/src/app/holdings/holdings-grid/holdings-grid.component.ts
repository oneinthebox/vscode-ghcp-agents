import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { FundService } from '../../services/fund.service';
import { Holding } from '../../models/fund.model';

@Component({
  selector: 'app-holdings-grid',
  templateUrl: './holdings-grid.component.html',
  styleUrls: []
})
export class HoldingsGridComponent implements OnInit {

  holdings: Holding[] = [];
  dataSource = new MatTableDataSource<Holding>();
  isLoading = false;
  filterText = '';
  selectedSector = '';
  selectedFund = '';

  displayedColumns = [
    'fundId', 'ticker', 'companyName', 'sector', 'assetClass', 'shares',
    'avgCost', 'currentPrice', 'marketValue', 'weight',
    'unrealizedPnl', 'unrealizedPnlPercent', 'dateAdded'
  ];

  sectors: string[] = [];
  fundIds: string[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private fundService: FundService) { }

  ngOnInit(): void {
    this.loadHoldings();
  }

  loadHoldings(): void {
    this.isLoading = true;
    this.fundService.getAllHoldings().subscribe(holdings => {
      this.holdings = holdings;
      this.dataSource.data = holdings;
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
      this.isLoading = false;

      this.sectors = [...new Set(holdings.map(h => h.sector))].sort();
      this.fundIds = [...new Set(holdings.map(h => h.fundId))].sort();

      this.dataSource.filterPredicate = (data: Holding, filter: string) => {
        const searchStr = filter.toLowerCase();
        return data.ticker.toLowerCase().includes(searchStr) ||
               data.companyName.toLowerCase().includes(searchStr) ||
               data.sector.toLowerCase().includes(searchStr) ||
               data.fundId.toLowerCase().includes(searchStr);
      };

      console.log('Loaded', holdings.length, 'holdings across', this.fundIds.length, 'funds');
    });
  }

  applyFilter(): void {
    this.dataSource.filter = this.filterText.trim().toLowerCase();
  }

  filterBySector(): void {
    if (!this.selectedSector && !this.selectedFund) {
      this.dataSource.data = this.holdings;
      return;
    }

    let filtered = this.holdings;
    if (this.selectedSector) {
      filtered = filtered.filter(h => h.sector === this.selectedSector);
    }
    if (this.selectedFund) {
      filtered = filtered.filter(h => h.fundId === this.selectedFund);
    }
    this.dataSource.data = filtered;
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedSector = '';
    this.selectedFund = '';
    this.dataSource.data = this.holdings;
    this.dataSource.filter = '';
  }

  getTotalMarketValue(): number {
    return this.dataSource.filteredData.reduce((sum, h) => sum + h.marketValue, 0);
  }

  getTotalPnl(): number {
    return this.dataSource.filteredData.reduce((sum, h) => sum + h.unrealizedPnl, 0);
  }

  formatValue(value: number): string {
    if (Math.abs(value) >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (Math.abs(value) >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    if (Math.abs(value) >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
    return '$' + value.toFixed(2);
  }
}
