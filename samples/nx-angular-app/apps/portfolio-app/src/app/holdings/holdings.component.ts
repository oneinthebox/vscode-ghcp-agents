import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { PortfolioService } from '@fintech/data-access';
import { Position } from '@fintech/shared-models';

@Component({
  selector: 'app-holdings',
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: './holdings.component.html',
})
export class HoldingsComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);
  private gridApi!: GridApi;

  positions: Position[] = [];
  totalMarketValue = 0;
  totalPnL = 0;

  columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'ticker',
      width: 30,
      pinned: 'left',
      cellRenderer: () => '<span style="color:#546e7a;font-size:0.6rem;">&#9654;</span>',
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Ticker',
      field: 'ticker',
      width: 75,
      pinned: 'left',
      cellStyle: { fontWeight: '700', color: '#00d4aa', letterSpacing: '0.5px' },
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Company',
      field: 'companyName',
      width: 160,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Sector',
      field: 'sector',
      width: 140,
      filter: 'agTextColumnFilter',
      enableRowGroup: true,
    },
    {
      headerName: 'Region',
      field: 'region',
      width: 110,
      filter: 'agTextColumnFilter',
      enableRowGroup: true,
    },
    {
      headerName: 'Qty',
      field: 'quantity',
      width: 75,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => (p.value ?? 0).toLocaleString(),
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Avg Cost',
      field: 'averageCost',
      width: 85,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toFixed(2)}`,
    },
    {
      headerName: 'Last',
      field: 'currentPrice',
      width: 80,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toFixed(2)}`,
      cellStyle: { color: '#e0e0e0', fontWeight: '600' },
    },
    {
      headerName: 'Mkt Value',
      field: 'marketValue',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sort: 'desc',
    },
    {
      headerName: 'Cost Basis',
      field: 'costBasis',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    },
    {
      headerName: 'Unrl P&L',
      field: 'unrealizedPnL',
      width: 100,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => {
        const v = p.value ?? 0;
        return `${v >= 0 ? '+' : ''}$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      },
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
        fontWeight: '600',
        fontFamily: 'Courier New, monospace',
      }),
    },
    {
      headerName: 'P&L %',
      field: 'unrealizedPnLPercent',
      width: 75,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `${(p.value ?? 0) > 0 ? '+' : ''}${(p.value ?? 0).toFixed(2)}%`,
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
      }),
    },
    {
      headerName: 'Day Chg',
      field: 'dailyChange',
      width: 80,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => {
        const v = p.value ?? 0;
        return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
      },
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
        fontSize: '0.65rem',
      }),
    },
    {
      headerName: 'Day %',
      field: 'dailyChangePercent',
      width: 70,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `${(p.value ?? 0) > 0 ? '+' : ''}${(p.value ?? 0).toFixed(2)}%`,
      cellStyle: (params) => ({
        color: (params.value ?? 0) >= 0 ? '#00c853' : '#ff1744',
        fontSize: '0.65rem',
      }),
    },
    {
      headerName: 'Wt %',
      field: 'weight',
      width: 65,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `${(p.value ?? 0).toFixed(1)}%`,
    },
    {
      headerName: 'Beta',
      field: 'beta',
      width: 60,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => (p.value ?? 0).toFixed(2),
    },
    {
      headerName: 'Sharpe',
      field: 'sharpeRatio',
      width: 65,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => (p.value ?? 0).toFixed(2),
    },
  ];

  gridOptions: GridOptions = {
    headerHeight: 22,
    rowHeight: 20,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      cellStyle: {
        fontSize: '0.68rem',
        fontFamily: 'Courier New, monospace',
        padding: '0 3px',
        lineHeight: '20px',
      },
    },
    rowSelection: 'multiple',
    animateRows: true,
    suppressCellFocus: true,
    enableCellTextSelection: true,
    getRowStyle: (params) => {
      if (params.node.rowIndex !== null && params.node.rowIndex % 2 === 0) {
        return { backgroundColor: '#0d1117' };
      }
      return { backgroundColor: '#111827' };
    },
  };

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.gridApi.sizeColumnsToFit();
  }

  ngOnInit(): void {
    this.portfolioService.getPositions().subscribe((positions) => {
      this.positions = positions;
      this.totalMarketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
      this.totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    });
  }
}
