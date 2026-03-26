# HDS-Wrapped Component Catalog — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual HDS component catalog. Keep under 500 lines.

## Component Index

| Component | Module | Selector | Wraps |
|-----------|--------|----------|-------|
| HDS Button | `HdsButtonModule` | `<hds-button>` | Native |
| HDS Data Grid | `HdsDataGridModule` | `<hds-data-grid>` | AG Grid |
<!-- ADD-HERE: add remaining components -->

## HDS Button

```html
<hds-button variant="primary" (clicked)="onSave()">Save</hds-button>
```

**Inputs:**

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Visual style |
| `disabled` | `boolean` | `false` | Disable interaction |
<!-- ADD-HERE: add remaining inputs -->

**Outputs:**

| Output | Payload | Description |
|--------|---------|-------------|
| `clicked` | `MouseEvent` | Emitted on click |
<!-- ADD-HERE: add remaining outputs -->

## HDS Data Grid (AG Grid Wrapper)

```html
<hds-data-grid [rowData]="rows" [columnDefs]="cols"></hds-data-grid>
```

**Inputs:**

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `rowData` | `any[]` | `[]` | Row data array |
| `columnDefs` | `ColDef[]` | `[]` | AG Grid column definitions |
<!-- ADD-HERE: add remaining inputs and HDS-specific overrides -->

## HDS Chart (Plotly Wrapper)

```html
<hds-chart [data]="chartData" [layout]="chartLayout"></hds-chart>
```

<!-- ADD-HERE: add inputs, outputs, and usage examples -->
