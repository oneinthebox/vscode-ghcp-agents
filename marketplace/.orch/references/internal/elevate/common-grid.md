# Elevate Common Grid Component API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Common Grid component API. Keep under 500 lines.

## Setup

```typescript
import { ElevateGridModule } from '@yourorg/elevate-common/grid';

@Component({
  standalone: true,
  imports: [ElevateGridModule],
  // ...
})
export class TradeListComponent {}
```

<!-- ADD-HERE: replace with your actual grid module setup -->

## ElevateGridComponent API

| Input/Output | Type | Default | Description |
|-------------|------|---------|-------------|
| `[rowData]` | `T[]` | `[]` | Array of data objects to display |
| `[columnDefs]` | `ElevateColumnDef[]` | `[]` | Column definitions with field, header, renderer |
| `[pagination]` | `boolean` | `true` | Enable client-side pagination |
| `[pageSize]` | `number` | `25` | Rows per page |
| `(rowSelected)` | `EventEmitter<T>` | — | Emits when a row is selected |
| `(sortChanged)` | `EventEmitter<SortModel>` | — | Emits when sort state changes |
<!-- ADD-HERE: add remaining inputs, outputs, and methods -->

## AG Grid Wrapper Details

```typescript
// The grid wraps AG Grid with org-standard defaults:
// - HDS-themed headers and cells
// - Built-in column resize, sort, and filter
// - Accessible keyboard navigation
// - Export to CSV/Excel
```

<!-- ADD-HERE: describe AG Grid version, license, custom cell renderers, theme overrides -->

## Usage Example

```html
<elevate-grid
  [rowData]="trades()"
  [columnDefs]="tradeColumns"
  [pagination]="true"
  [pageSize]="50"
  (rowSelected)="onTradeSelect($event)">
</elevate-grid>
```

<!-- ADD-HERE: replace with your actual grid usage examples -->
