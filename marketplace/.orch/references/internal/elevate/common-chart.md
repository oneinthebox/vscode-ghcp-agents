# Elevate Common Chart Component API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Common Chart component API. Keep under 500 lines.

## Setup

```typescript
import { ElevateChartModule } from '@yourorg/elevate-common/chart';

@Component({
  standalone: true,
  imports: [ElevateChartModule],
  // ...
})
export class PortfolioOverviewComponent {}
```

<!-- ADD-HERE: replace with your actual chart module setup -->

## ElevateChartComponent API

| Input/Output | Type | Default | Description |
|-------------|------|---------|-------------|
| `[data]` | `ChartDataset[]` | `[]` | Array of datasets to plot |
| `[chartType]` | `'line' \| 'bar' \| 'pie' \| 'scatter'` | `'line'` | Chart visualization type |
| `[options]` | `ElevateChartOptions` | `{}` | Chart configuration options |
| `[responsive]` | `boolean` | `true` | Auto-resize with container |
| `(pointClicked)` | `EventEmitter<ChartPoint>` | — | Emits when a data point is clicked |
<!-- ADD-HERE: add remaining inputs, outputs, and methods -->

## Chart Library Wrapper Details

```typescript
// The chart wraps Plotly/Chart.js with org-standard defaults:
// - HDS color palette for series
// - Accessible color contrast
// - Tooltip formatting
// - Responsive resize handling
```

<!-- ADD-HERE: describe underlying chart library, version, custom plugins, theme integration -->

## Usage Example

```html
<elevate-chart
  [data]="portfolioData()"
  [chartType]="'line'"
  [options]="chartOptions"
  (pointClicked)="onDataPointClick($event)">
</elevate-chart>
```

<!-- ADD-HERE: replace with your actual chart usage examples -->
