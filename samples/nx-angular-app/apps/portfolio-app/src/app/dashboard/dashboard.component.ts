import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridOptions, ValueFormatterParams } from 'ag-grid-community';
import { DataCardComponent, NumberFormatPipe } from '@fintech/shared-ui';
import { PortfolioService } from '@fintech/data-access';
import { Portfolio, Position, PortfolioSummary } from '@fintech/shared-models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AgGridModule, DataCardComponent, NumberFormatPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);

  portfolio: Portfolio | null = null;
  summary: PortfolioSummary | null = null;
  topHoldings: Position[] = [];

  // AG Grid configuration
  columnDefs: ColDef[] = [
    {
      headerName: 'Ticker',
      field: 'ticker',
      width: 80,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold', color: '#00d4aa' },
    },
    { headerName: 'Name', field: 'companyName', width: 150 },
    { headerName: 'Sector', field: 'sector', width: 130 },
    {
      headerName: 'Qty',
      field: 'quantity',
      width: 80,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => p.value?.toLocaleString() ?? '',
    },
    {
      headerName: 'Price',
      field: 'currentPrice',
      width: 90,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${p.value?.toFixed(2) ?? ''}`,
    },
    {
      headerName: 'Mkt Value',
      field: 'marketValue',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    },
    {
      headerName: 'P&L',
      field: 'unrealizedPnL',
      width: 100,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
        fontFamily: 'Courier New, monospace',
      }),
    },
    {
      headerName: 'P&L %',
      field: 'unrealizedPnLPercent',
      width: 80,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `${(p.value ?? 0) > 0 ? '+' : ''}${(p.value ?? 0).toFixed(2)}%`,
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
      }),
    },
    {
      headerName: 'Wt %',
      field: 'weight',
      width: 70,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `${(p.value ?? 0).toFixed(1)}%`,
    },
    {
      headerName: 'Beta',
      field: 'beta',
      width: 65,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => (p.value ?? 0).toFixed(2),
    },
  ];

  gridOptions: GridOptions = {
    headerHeight: 24,
    rowHeight: 22,
    domLayout: 'autoHeight',
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      cellStyle: { fontSize: '0.7rem', fontFamily: 'Courier New, monospace', padding: '0 4px' },
      headerClass: 'ag-header-dense',
    },
    rowSelection: 'single',
    animateRows: true,
    suppressCellFocus: true,
  };

  ngOnInit(): void {
    this.portfolioService.getPortfolio().subscribe((portfolio) => {
      this.portfolio = portfolio;
      this.topHoldings = [...portfolio.positions]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 10);
    });

    this.portfolioService.getPortfolioSummary().subscribe((summary) => {
      this.summary = summary;
    });
  }
}
