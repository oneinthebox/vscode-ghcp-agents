# AG Grid Angular Guide
Source: https://www.ag-grid.com/angular-data-grid/getting-started/
Last refreshed: 2026-03-24

## Installation

```bash
npm install ag-grid-angular ag-grid-community
# Enterprise (optional)
npm install ag-grid-enterprise
```

## Module Registration

```typescript
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

// Enterprise (selective)
import { RowGroupingModule, PivotModule, ServerSideRowModelModule } from 'ag-grid-enterprise';
ModuleRegistry.registerModules([RowGroupingModule, PivotModule, ServerSideRowModelModule]);
```

## Basic Setup (Standalone Component)

```typescript
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridOptions } from 'ag-grid-community';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      style="width: 100%; height: 500px;"
      [rowData]="rowData"
      [columnDefs]="colDefs"
      [defaultColDef]="defaultColDef"
      [theme]="theme"
      (gridReady)="onGridReady($event)"
    />
  `,
})
export class GridComponent {
  rowData = [
    { make: 'Tesla', model: 'Model Y', price: 64950, electric: true },
    { make: 'Ford', model: 'F-Series', price: 33850, electric: false },
    { make: 'Toyota', model: 'Corolla', price: 29600, electric: false },
  ];

  colDefs: ColDef[] = [
    { field: 'make' },
    { field: 'model' },
    { field: 'price' },
    { field: 'electric' },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    sortable: true,
    filter: true,
    resizable: true,
  };

  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
  }
}
```

## Column Definitions

### Common ColDef Properties

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | Data field name |
| `headerName` | `string` | Column header text |
| `width` | `number` | Fixed width in pixels |
| `minWidth` | `number` | Minimum width |
| `maxWidth` | `number` | Maximum width |
| `flex` | `number` | Flex ratio for available space |
| `sortable` | `boolean` | Enable sorting |
| `filter` | `boolean \| string` | Enable/set filter type |
| `resizable` | `boolean` | Allow column resize |
| `editable` | `boolean` | Enable cell editing |
| `pinned` | `'left' \| 'right'` | Pin column |
| `hide` | `boolean` | Hide column |
| `cellRenderer` | `Component \| Function` | Custom cell renderer |
| `valueFormatter` | `Function` | Format display value |
| `valueGetter` | `Function` | Compute cell value |
| `cellClass` | `string \| Function` | CSS class for cells |
| `headerClass` | `string` | CSS class for header |
| `checkboxSelection` | `boolean` | Show checkbox |

### Column Groups

```typescript
colDefs: ColDef[] = [
  {
    headerName: 'Vehicle',
    children: [
      { field: 'make' },
      { field: 'model' },
    ],
  },
  {
    headerName: 'Details',
    children: [
      { field: 'price' },
      { field: 'electric' },
    ],
  },
];
```

## Sorting

```typescript
colDefs: ColDef[] = [
  { field: 'name', sortable: true, sort: 'asc' },
  { field: 'age', sortable: true },
  {
    field: 'date',
    comparator: (valueA: Date, valueB: Date) =>
      valueA.getTime() - valueB.getTime(),
  },
];

// Grid options
multiSortKey: 'ctrl'        // Ctrl+click for multi-sort
accentedSort: true           // Locale-aware sorting
```

## Filtering

### Filter Types

| Filter | ColDef Config | Use Case |
|--------|--------------|----------|
| Text | `filter: 'agTextColumnFilter'` | String columns |
| Number | `filter: 'agNumberColumnFilter'` | Numeric columns |
| Date | `filter: 'agDateColumnFilter'` | Date columns |
| Set (Enterprise) | `filter: 'agSetColumnFilter'` | Excel-like checkboxes |
| Multi (Enterprise) | `filter: 'agMultiColumnFilter'` | Combine filters |
| `true` | `filter: true` | Auto-detect by data type |

### Filter Configuration

```typescript
colDefs: ColDef[] = [
  {
    field: 'name',
    filter: 'agTextColumnFilter',
    filterParams: {
      filterOptions: ['contains', 'notContains', 'startsWith'],
      defaultOption: 'contains',
      caseSensitive: false,
    },
  },
  {
    field: 'price',
    filter: 'agNumberColumnFilter',
    filterParams: {
      filterOptions: ['greaterThan', 'lessThan', 'inRange'],
    },
  },
];
```

### Quick Filter

```typescript
// In template
<input (input)="onFilterTextChange($event)" placeholder="Search...">
<ag-grid-angular [rowData]="rowData" [columnDefs]="colDefs" />

// In component
onFilterTextChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  this.gridApi.setGridOption('quickFilterText', value);
}
```

## Pagination

```typescript
@Component({
  template: `
    <ag-grid-angular
      [rowData]="rowData"
      [columnDefs]="colDefs"
      [pagination]="true"
      [paginationPageSize]="20"
      [paginationPageSizeSelector]="[10, 20, 50, 100]"
    />
  `,
})
```

## Cell Renderers

### Function-based

```typescript
colDefs: ColDef[] = [
  {
    field: 'price',
    cellRenderer: (params: ICellRendererParams) =>
      `<b>$${params.value.toLocaleString()}</b>`,
  },
  {
    field: 'electric',
    cellRenderer: (params: ICellRendererParams) =>
      params.value ? '&#x2714;' : '&#x2718;',
  },
];
```

### Component-based

```typescript
@Component({
  selector: 'app-action-cell',
  standalone: true,
  template: `
    <button (click)="onEdit()">Edit</button>
    <button (click)="onDelete()">Delete</button>
  `,
})
export class ActionCellRenderer implements ICellRendererAngularComp {
  private params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onEdit() { /* use this.params.data */ }
  onDelete() { /* use this.params.node */ }
}

// Usage in column def
{ field: 'actions', cellRenderer: ActionCellRenderer }
```

### Dynamic Renderer Selection

```typescript
{
  field: 'type',
  cellRendererSelector: (params: ICellRendererParams) => {
    if (params.data.type === 'currency') {
      return { component: CurrencyCellRenderer };
    }
    return { component: DefaultCellRenderer };
  },
}
```

## Value Formatters

```typescript
colDefs: ColDef[] = [
  {
    field: 'price',
    valueFormatter: (params) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value),
  },
  {
    field: 'date',
    valueFormatter: (params) =>
      new Date(params.value).toLocaleDateString('en-US'),
  },
];
```

## Event Handling

| Event | Description |
|-------|-------------|
| `(gridReady)` | Grid initialized |
| `(cellClicked)` | Cell clicked |
| `(cellDoubleClicked)` | Cell double-clicked |
| `(rowClicked)` | Row clicked |
| `(rowSelected)` | Row selection changed |
| `(selectionChanged)` | Selection changed |
| `(sortChanged)` | Sort changed |
| `(filterChanged)` | Filter changed |
| `(paginationChanged)` | Pagination changed |
| `(cellValueChanged)` | Cell value edited |
| `(rowDragEnd)` | Row drag completed |

```typescript
@Component({
  template: `
    <ag-grid-angular
      [rowData]="rowData"
      [columnDefs]="colDefs"
      [rowSelection]="'multiple'"
      (cellClicked)="onCellClicked($event)"
      (selectionChanged)="onSelectionChanged($event)"
    />
  `,
})
export class GridComponent {
  onCellClicked(event: CellClickedEvent) {
    console.log('Cell:', event.colDef.field, event.value);
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    const selected = event.api.getSelectedRows();
    console.log('Selected:', selected);
  }
}
```

## Theming

### Built-in Themes

| Theme | Import | Description |
|-------|--------|-------------|
| Quartz | `themeQuartz` | Modern, high contrast (default) |
| Balham | `themeBalham` | Traditional spreadsheet |
| Material | `themeMaterial` | Material Design v2 |
| Alpine | `themeAlpine` | Legacy predecessor to Quartz |

### Theme Application

```typescript
import { themeQuartz } from 'ag-grid-community';

@Component({
  template: `<ag-grid-angular [theme]="theme" ... />`,
})
export class GridComponent {
  theme = themeQuartz;
}
```

### Custom Theme Parameters

```typescript
import { themeQuartz } from 'ag-grid-community';

const myTheme = themeQuartz.withParams({
  accentColor: '#3f51b5',
  headerBackgroundColor: '#f5f5f5',
  headerTextColor: '#333',
  rowHoverColor: '#e8eaf6',
  borderColor: '#e0e0e0',
  fontSize: 14,
  headerFontSize: 13,
  spacing: 8,
});
```

## Enterprise Features

### Row Grouping

```typescript
import { RowGroupingModule } from 'ag-grid-enterprise';
ModuleRegistry.registerModules([RowGroupingModule]);

colDefs: ColDef[] = [
  { field: 'country', rowGroup: true, hide: true },
  { field: 'sport', rowGroup: true, hide: true },
  { field: 'gold', aggFunc: 'sum' },
  { field: 'silver', aggFunc: 'sum' },
];

// Grid options
groupDefaultExpanded: 1,
autoGroupColumnDef: {
  headerName: 'Group',
  minWidth: 250,
},
```

### Pivoting

```typescript
import { PivotModule } from 'ag-grid-enterprise';

colDefs: ColDef[] = [
  { field: 'country', rowGroup: true },
  { field: 'year', pivot: true },
  { field: 'gold', aggFunc: 'sum' },
];

// Enable pivot mode
pivotMode: true,
```

### Server-Side Row Model

```typescript
import { ServerSideRowModelModule } from 'ag-grid-enterprise';

@Component({
  template: `
    <ag-grid-angular
      [columnDefs]="colDefs"
      [rowModelType]="'serverSide'"
      [serverSideDatasource]="datasource"
    />
  `,
})
export class GridComponent {
  datasource: IServerSideDatasource = {
    getRows: (params: IServerSideGetRowsParams) => {
      this.http.post('/api/data', params.request).subscribe({
        next: (response) => params.success({ rowData: response.rows, rowCount: response.total }),
        error: () => params.fail(),
      });
    },
  };
}
```

## Integration with Angular Signals

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  template: `
    <ag-grid-angular
      [rowData]="rowData()"
      [columnDefs]="colDefs()"
    />
  `,
})
export class GridComponent {
  rowData = signal<any[]>([]);
  colDefs = signal<ColDef[]>([
    { field: 'name' },
    { field: 'value' },
  ]);

  filteredCount = computed(() => this.rowData().length);

  async loadData() {
    const data = await this.dataService.fetch();
    this.rowData.set(data);
  }
}
```

## Grid API Quick Reference

| Method | Description |
|--------|-------------|
| `api.setGridOption(key, val)` | Set grid option |
| `api.getSelectedRows()` | Get selected row data |
| `api.getSelectedNodes()` | Get selected row nodes |
| `api.selectAll()` | Select all rows |
| `api.deselectAll()` | Deselect all rows |
| `api.sizeColumnsToFit()` | Auto-size to fit |
| `api.autoSizeAllColumns()` | Auto-size to content |
| `api.exportDataAsCsv()` | Export as CSV |
| `api.exportDataAsExcel()` | Export as Excel (Enterprise) |
| `api.setFilterModel(model)` | Set filter state |
| `api.getFilterModel()` | Get filter state |
| `api.refreshCells()` | Refresh cell rendering |
| `api.applyTransaction({add, update, remove})` | Update row data |
