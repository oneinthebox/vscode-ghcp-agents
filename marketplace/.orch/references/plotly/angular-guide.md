# Plotly for Angular Guide
Source: https://plotly.com/javascript/getting-started/
Last refreshed: 2026-03-24

## Installation

### Option 1: angular-plotly.js (Recommended)

```bash
npm install plotly.js-dist-min angular-plotly.js
```

```typescript
// app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyModule } from 'angular-plotly.js';

PlotlyModule.plotlyjs = PlotlyJS;

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(PlotlyModule),
  ],
};
```

### Option 2: Direct Plotly.js

```bash
npm install plotly.js-dist-min
npm install --save-dev @types/plotly.js
```

```typescript
import Plotly from 'plotly.js-dist-min';

// Use Plotly.newPlot(element, data, layout, config) directly
```

## Basic Usage (angular-plotly.js)

```typescript
import { Component } from '@angular/core';
import { PlotlyModule } from 'angular-plotly.js';

@Component({
  standalone: true,
  imports: [PlotlyModule],
  template: `
    <plotly-plot
      [data]="graph.data"
      [layout]="graph.layout"
      [config]="graph.config"
      [useResizeHandler]="true"
      [style]="{ position: 'relative', width: '100%', height: '400px' }"
      (plotlyClick)="onChartClick($event)"
    />
  `,
})
export class ChartComponent {
  graph = {
    data: [{ x: [1, 2, 3], y: [2, 6, 3], type: 'scatter', mode: 'lines+markers' }],
    layout: { title: 'My Chart' },
    config: { responsive: true },
  };
}
```

## Chart Types

### Line Chart

```typescript
data: Plotly.Data[] = [
  {
    x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    y: [10, 15, 13, 17, 21, 25],
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Revenue',
    line: { color: '#1f77b4', width: 2 },
    marker: { size: 6 },
  },
  {
    x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    y: [8, 12, 11, 14, 18, 22],
    type: 'scatter',
    mode: 'lines',
    name: 'Expenses',
    line: { color: '#ff7f0e', dash: 'dash' },
  },
];
```

### Bar Chart

```typescript
data: Plotly.Data[] = [
  {
    x: ['Q1', 'Q2', 'Q3', 'Q4'],
    y: [20, 14, 23, 28],
    type: 'bar',
    name: 'Product A',
    marker: { color: '#2196F3' },
  },
  {
    x: ['Q1', 'Q2', 'Q3', 'Q4'],
    y: [12, 18, 15, 22],
    type: 'bar',
    name: 'Product B',
    marker: { color: '#4CAF50' },
  },
];

layout = {
  barmode: 'group',  // 'group' | 'stack' | 'overlay' | 'relative'
  title: 'Quarterly Sales',
};
```

### Pie Chart (Allocation)

```typescript
data: Plotly.Data[] = [
  {
    values: [40, 25, 20, 15],
    labels: ['Equities', 'Bonds', 'Real Estate', 'Cash'],
    type: 'pie',
    hole: 0.4,  // donut chart
    textinfo: 'label+percent',
    marker: {
      colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
    },
  },
];

layout = { title: 'Portfolio Allocation' };
```

### Scatter Plot

```typescript
data: Plotly.Data[] = [
  {
    x: [1, 2, 3, 4, 5],
    y: [1, 6, 3, 6, 1],
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: [10, 20, 30, 40, 50],
      color: [1, 2, 3, 4, 5],
      colorscale: 'Viridis',
      showscale: true,
    },
    text: ['A', 'B', 'C', 'D', 'E'],
  },
];
```

### Candlestick Chart (Financial)

```typescript
data: Plotly.Data[] = [
  {
    x: ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08'],
    open: [33.0, 33.3, 33.5, 34.0, 34.5],
    high: [33.8, 34.0, 34.2, 34.8, 35.0],
    low: [32.7, 33.0, 33.2, 33.8, 34.0],
    close: [33.4, 33.7, 34.0, 34.5, 34.8],
    type: 'candlestick',
    increasing: { line: { color: '#26a69a' } },
    decreasing: { line: { color: '#ef5350' } },
    name: 'AAPL',
  },
];

layout: Partial<Plotly.Layout> = {
  title: 'Stock Price',
  xaxis: {
    rangeslider: { visible: true },
    type: 'date',
  },
  yaxis: { title: 'Price ($)' },
};
```

### P&L Line Chart (Financial)

```typescript
data: Plotly.Data[] = [
  {
    x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    y: [120, -50, 200, 150, -80, 300, 250, 100, -30, 400, 350, 500],
    type: 'scatter',
    mode: 'lines+markers',
    name: 'P&L',
    line: { width: 2 },
    marker: { size: 8 },
    fill: 'tozeroy',
    fillcolor: 'rgba(31, 119, 180, 0.1)',
  },
  {
    x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    y: [120, 70, 270, 420, 340, 640, 890, 990, 960, 1360, 1710, 2210],
    type: 'scatter',
    mode: 'lines',
    name: 'Cumulative P&L',
    yaxis: 'y2',
    line: { color: '#ff7f0e', dash: 'dot' },
  },
];

layout: Partial<Plotly.Layout> = {
  title: 'Profit & Loss',
  yaxis: { title: 'Monthly P&L ($K)' },
  yaxis2: {
    title: 'Cumulative ($K)',
    overlaying: 'y',
    side: 'right',
  },
  legend: { x: 0, y: 1.1, orientation: 'h' },
};
```

## Responsive Layout

```typescript
layout: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { l: 50, r: 30, t: 40, b: 40 },
  font: { family: 'Inter, sans-serif', size: 12 },
  xaxis: { title: 'X Axis' },
  yaxis: { title: 'Y Axis' },
};

config: Partial<Plotly.Config> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'chart-export',
    width: 1200,
    height: 800,
  },
};
```

## Event Handling

| Event | angular-plotly.js Output | Description |
|-------|------------------------|-------------|
| Click | `(plotlyClick)` | Point clicked |
| Hover | `(plotlyHover)` | Point hovered |
| Unhover | `(plotlyUnhover)` | Hover ended |
| Selected | `(plotlySelected)` | Points selected (box/lasso) |
| Relayout | `(plotlyRelayout)` | Axis range or layout changed |
| AfterPlot | `(plotlyAfterPlot)` | Rendering complete |

```typescript
onChartClick(event: any) {
  const point = event.points[0];
  console.log('Clicked:', {
    x: point.x,
    y: point.y,
    curveNumber: point.curveNumber,
    pointIndex: point.pointIndex,
    data: point.data.name,
  });
}

onChartHover(event: any) {
  const point = event.points[0];
  console.log('Hovered:', point.x, point.y);
}

onChartSelected(event: any) {
  if (event) {
    const selectedPoints = event.points;
    console.log('Selected:', selectedPoints.length, 'points');
  }
}
```

## Updating Data Reactively

```typescript
import { Component, signal, effect } from '@angular/core';

@Component({
  standalone: true,
  imports: [PlotlyModule],
  template: `
    <plotly-plot
      [data]="chartData()"
      [layout]="layout"
      [config]="{ responsive: true }"
      [useResizeHandler]="true"
    />
    <button (click)="refresh()">Refresh Data</button>
  `,
})
export class ReactiveChartComponent {
  rawData = signal<number[]>([]);

  chartData = computed(() => [{
    x: this.rawData().map((_, i) => i),
    y: this.rawData(),
    type: 'scatter' as const,
    mode: 'lines' as const,
  }]);

  layout = { title: 'Live Data', autosize: true };

  refresh() {
    const newData = Array.from({ length: 50 }, () => Math.random() * 100);
    this.rawData.set(newData);
  }
}
```

### Direct Plotly API Update (for performance)

```typescript
import Plotly from 'plotly.js-dist-min';

@ViewChild('chartEl') chartEl!: ElementRef;

updateChart(newY: number[]) {
  // Efficient partial update without full re-render
  Plotly.restyle(this.chartEl.nativeElement, { y: [newY] }, [0]);
}

extendChart(newX: number[], newY: number[]) {
  // Append data points (streaming)
  Plotly.extendTraces(this.chartEl.nativeElement, { x: [newX], y: [newY] }, [0]);
}
```

## Dark / Light Theme

```typescript
lightLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { color: '#333333' },
  xaxis: { gridcolor: '#e0e0e0' },
  yaxis: { gridcolor: '#e0e0e0' },
};

darkLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: '#1e1e1e',
  plot_bgcolor: '#1e1e1e',
  font: { color: '#e0e0e0' },
  xaxis: { gridcolor: '#444444', zerolinecolor: '#666666' },
  yaxis: { gridcolor: '#444444', zerolinecolor: '#666666' },
};

// Toggle based on app theme
get currentLayout() {
  return this.isDarkMode ? this.darkLayout : this.lightLayout;
}
```

## Common Layout Options

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string \| {text, font, x, y}` | Chart title |
| `autosize` | `boolean` | Auto-resize to container |
| `width` / `height` | `number` | Fixed dimensions |
| `margin` | `{l, r, t, b, pad}` | Chart margins |
| `showlegend` | `boolean` | Show/hide legend |
| `legend` | `{x, y, orientation}` | Legend position |
| `paper_bgcolor` | `string` | Outer background color |
| `plot_bgcolor` | `string` | Plot area background color |
| `font` | `{family, size, color}` | Global font |
| `xaxis` / `yaxis` | object | Axis configuration |
| `barmode` | `'group' \| 'stack'` | Bar chart grouping |
| `hovermode` | `'closest' \| 'x' \| 'y'` | Hover behavior |
