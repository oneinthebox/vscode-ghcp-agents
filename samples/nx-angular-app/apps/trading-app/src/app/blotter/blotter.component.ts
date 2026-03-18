import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { Subscription } from 'rxjs';
import { TradingService } from '@fintech/data-access';
import { Trade } from '@fintech/shared-models';

@Component({
  selector: 'app-blotter',
  standalone: true,
  imports: [CommonModule, AgGridModule],
  templateUrl: './blotter.component.html',
})
export class BlotterComponent implements OnInit, OnDestroy {
  private readonly tradingService = inject(TradingService);
  private gridApi!: GridApi;
  private subscriptions: Subscription[] = [];

  trades: Trade[] = [];
  totalNotional = 0;
  tradeCount = 0;

  columnDefs: ColDef[] = [
    {
      headerName: 'Trade ID',
      field: 'tradeId',
      width: 105,
      pinned: 'left',
      cellStyle: { color: '#78909c', fontSize: '0.62rem' },
    },
    {
      headerName: 'Time',
      field: 'executedAt',
      width: 75,
      valueFormatter: (p: ValueFormatterParams) => {
        const d = p.value as Date;
        return d ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}` : '';
      },
      sort: 'desc',
    },
    {
      headerName: 'Ticker',
      field: 'ticker',
      width: 70,
      cellStyle: { fontWeight: '700', color: '#00d4aa' },
    },
    {
      headerName: 'Side',
      field: 'side',
      width: 55,
      cellStyle: (params) => ({
        color: params.value === 'BUY' || params.value === 'COVER' ? '#00c853' : '#ff1744',
        fontWeight: '700',
      }),
    },
    {
      headerName: 'Qty',
      field: 'quantity',
      width: 70,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => (p.value ?? 0).toLocaleString(),
    },
    {
      headerName: 'Price',
      field: 'price',
      width: 85,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toFixed(2)}`,
      cellStyle: { fontWeight: '600' },
    },
    {
      headerName: 'Notional',
      field: 'notional',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    },
    {
      headerName: 'Comm',
      field: 'commission',
      width: 70,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toFixed(2)}`,
      cellStyle: { color: '#78909c', fontSize: '0.62rem' },
    },
    {
      headerName: 'Fees',
      field: 'fees',
      width: 60,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toFixed(2)}`,
      cellStyle: { color: '#78909c', fontSize: '0.62rem' },
    },
    {
      headerName: 'Net',
      field: 'netAmount',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cellStyle: { fontWeight: '600', color: '#e0e0e0' },
    },
    {
      headerName: 'Venue',
      field: 'venue',
      width: 70,
      cellStyle: { fontSize: '0.62rem', color: '#90a4ae' },
    },
    {
      headerName: 'Cpty',
      field: 'counterparty',
      width: 120,
      cellStyle: { fontSize: '0.62rem', color: '#78909c' },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 85,
      cellRenderer: (params: any) => {
        const color = params.value === 'CONFIRMED' ? '#00c853' : params.value === 'SETTLED' ? '#29b6f6' : '#ffd740';
        return `<span style="color:${color};font-size:0.6rem;">&#9679; ${params.value}</span>`;
      },
    },
    {
      headerName: 'Order',
      field: 'orderId',
      width: 85,
      cellStyle: { color: '#546e7a', fontSize: '0.6rem' },
    },
    {
      headerName: 'Settle',
      field: 'settlementDate',
      width: 80,
      valueFormatter: (p: ValueFormatterParams) => {
        const d = p.value as Date;
        return d ? `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}` : '';
      },
      cellStyle: { color: '#546e7a', fontSize: '0.6rem' },
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
        fontSize: '0.67rem',
        fontFamily: 'Courier New, monospace',
        padding: '0 3px',
        lineHeight: '20px',
      },
    },
    rowSelection: 'single',
    animateRows: true,
    suppressCellFocus: true,
    getRowStyle: (params) => {
      if (params.node.rowIndex !== null && params.node.rowIndex % 2 === 0) {
        return { backgroundColor: '#0d1117' };
      }
      return { backgroundColor: '#111827' };
    },
  };

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  ngOnInit(): void {
    const sub1 = this.tradingService.getTrades().subscribe((trades) => {
      this.trades = trades;
      this.tradeCount = trades.length;
      this.totalNotional = trades.reduce((sum, t) => sum + t.notional, 0);
    });
    this.subscriptions.push(sub1);

    const sub2 = this.tradingService.getTradesWithSimulatedUpdates().subscribe((trades) => {
      this.trades = trades;
      this.tradeCount = trades.length;
      this.totalNotional = trades.reduce((sum, t) => sum + t.notional, 0);
    });
    this.subscriptions.push(sub2);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
