import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { FundService } from '../../services/fund.service';
import { Fund } from '../../models/fund.model';

@Component({
  selector: 'app-fund-list',
  templateUrl: './fund-list.component.html',
  styleUrls: []
})
export class FundListComponent implements OnInit {

  funds: Fund[] = [];
  dataSource = new MatTableDataSource<Fund>();
  isLoading = false;
  totalAum = 0;
  selectedType = '';

  displayedColumns = [
    'ticker', 'name', 'type', 'strategy', 'aum', 'nav', 'navChange',
    'ytdReturn', 'oneYearReturn', 'sharpeRatio', 'expenseRatio', 'status'
  ];

  fundTypes = ['Equity', 'Fixed Income', 'Multi-Asset'];

  constructor(
    private fundService: FundService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadFunds();
    this.loadTotalAum();
  }

  loadFunds(): void {
    this.isLoading = true;
    this.fundService.getAllFunds().subscribe(funds => {
      this.funds = funds;
      this.dataSource.data = funds;
      this.isLoading = false;
      console.log('Loaded', funds.length, 'funds');
    });
  }

  loadTotalAum(): void {
    this.fundService.getTotalAum().subscribe(total => {
      this.totalAum = total;
    });
  }

  filterByType(): void {
    if (!this.selectedType) {
      this.loadFunds();
      return;
    }

    this.isLoading = true;
    this.fundService.getFundsByType(this.selectedType).subscribe(funds => {
      this.funds = funds;
      this.dataSource.data = funds;
      this.isLoading = false;
    });
  }

  viewFund(fund: Fund): void {
    this.router.navigate(['/funds', fund.id]);
  }

  formatAum(value: number): string {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(0) + 'M';
    return '$' + value.toLocaleString();
  }
}
