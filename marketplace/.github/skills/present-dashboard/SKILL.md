---
name: present-dashboard
description: "Generate a single-page HTML dashboard from audit and scan data. Self-contained, zero external dependencies, HDS themed. Produces a ready-to-open status board for teams and stakeholders."
references:
  - references/orch/report-template-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Produces a self-contained HTML dashboard from ORCH audit data, scan results, and migration progress. Single file, zero external dependencies, inline CSS and SVG charts. Opens in any browser, works offline. HDS dark theme by default with light theme option. Designed for status boards, executive views, team monitors, and meeting presentations.

## Inputs

- "Create a dashboard" — full dashboard with all available sections
- "Show me agent adoption" — usage section only
- "Migration dashboard" — migration progress section only
- Optional: `--output {path}` — output file path (default: `.orch/reports/dashboard.html`)
- Optional: `--theme {dark|light}` — theme selection (default: dark)
- Optional: `--sections {list}` — comma-separated sections to include

## HDS Design Token Usage

All styling uses HDS (Hashi Design System) CSS custom properties. No hardcoded colors or font sizes.

```css
:root {
  /* Surface colors — dark theme */
  --hds-surface-primary: #0a0a0a;
  --hds-surface-secondary: #1a1a2e;
  --hds-surface-card: #16213e;
  --hds-surface-elevated: #1e2a4a;

  /* Text colors */
  --hds-text-primary: #e8e8e8;
  --hds-text-secondary: #a0a0b0;
  --hds-text-muted: #6b6b80;

  /* Semantic colors */
  --hds-color-success: #22c55e;
  --hds-color-warning: #f59e0b;
  --hds-color-critical: #ef4444;
  --hds-color-info: #3b82f6;
  --hds-color-neutral: #6b7280;

  /* Typography */
  --hds-font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --hds-font-size-kpi: 2.5rem;
  --hds-font-size-heading: 1.25rem;
  --hds-font-size-body: 0.875rem;
  --hds-font-size-caption: 0.75rem;

  /* Spacing and layout */
  --hds-spacing-xs: 0.25rem;
  --hds-spacing-sm: 0.5rem;
  --hds-spacing-md: 1rem;
  --hds-spacing-lg: 1.5rem;
  --hds-spacing-xl: 2rem;
  --hds-border-radius: 8px;
  --hds-card-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
```

Light theme overrides swap surface and text values:
```css
[data-theme="light"] {
  --hds-surface-primary: #ffffff;
  --hds-surface-secondary: #f8f9fa;
  --hds-surface-card: #ffffff;
  --hds-text-primary: #1a1a2e;
  --hds-text-secondary: #4a4a5a;
  --hds-card-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
```

## HTML Structure and Components

### KPI Cards

Each KPI metric is rendered as a card with value, label, trend indicator, and optional sparkline:

```html
<div class="kpi-grid">
  <div class="kpi-card">
    <span class="kpi-value" style="color: var(--hds-color-success)">1,247</span>
    <span class="kpi-label">Sessions (7d)</span>
    <span class="kpi-trend kpi-trend--up">+12.3%</span>
    <svg class="kpi-sparkline" viewBox="0 0 80 24" preserveAspectRatio="none">
      <polyline points="0,20 10,18 20,15 30,16 40,12 50,10 60,8 70,6 80,4"
                fill="none" stroke="var(--hds-color-success)" stroke-width="2"/>
    </svg>
  </div>
  <div class="kpi-card">
    <span class="kpi-value">342K</span>
    <span class="kpi-label">Tokens Used</span>
    <span class="kpi-trend kpi-trend--down" style="color: var(--hds-color-critical)">+8.1%</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value" style="color: var(--hds-color-success)">94.2%</span>
    <span class="kpi-label">Compliance</span>
    <span class="kpi-trend kpi-trend--up">+1.5%</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value" style="color: var(--hds-color-info)">67%</span>
    <span class="kpi-label">Migration</span>
    <span class="kpi-trend kpi-trend--up">+5%</span>
  </div>
</div>
```

### SVG Bar Chart Generation

Charts are rendered as pure inline SVG with no JavaScript dependencies:

```html
<svg class="chart-bar" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Y-axis labels -->
  <text x="30" y="20" class="chart-label">200</text>
  <text x="30" y="100" class="chart-label">100</text>
  <text x="30" y="180" class="chart-label">0</text>
  <!-- Grid lines -->
  <line x1="50" y1="20" x2="390" y2="20" stroke="var(--hds-text-muted)" stroke-dasharray="4"/>
  <line x1="50" y1="100" x2="390" y2="100" stroke="var(--hds-text-muted)" stroke-dasharray="4"/>
  <!-- Bars — height derived from data value / max * chart_height -->
  <rect x="60"  y="40"  width="40" height="140" rx="4" fill="var(--hds-color-info)"/>
  <rect x="110" y="60"  width="40" height="120" rx="4" fill="var(--hds-color-info)"/>
  <rect x="160" y="30"  width="40" height="150" rx="4" fill="var(--hds-color-info)"/>
  <rect x="210" y="80"  width="40" height="100" rx="4" fill="var(--hds-color-info)"/>
  <rect x="260" y="50"  width="40" height="130" rx="4" fill="var(--hds-color-success)"/>
  <!-- X-axis labels -->
  <text x="80"  y="195" class="chart-label" text-anchor="middle">Mon</text>
  <text x="130" y="195" class="chart-label" text-anchor="middle">Tue</text>
  <text x="180" y="195" class="chart-label" text-anchor="middle">Wed</text>
  <text x="230" y="195" class="chart-label" text-anchor="middle">Thu</text>
  <text x="280" y="195" class="chart-label" text-anchor="middle">Fri</text>
</svg>
```

### Status Indicators

Status badges use semantic color tokens:

```html
<span class="status-badge status-badge--success">Healthy</span>
<span class="status-badge status-badge--warning">Stale (3)</span>
<span class="status-badge status-badge--critical">Failed (1)</span>
```

```css
.status-badge {
  padding: var(--hds-spacing-xs) var(--hds-spacing-sm);
  border-radius: 12px;
  font-size: var(--hds-font-size-caption);
  font-weight: 600;
}
.status-badge--success { background: color-mix(in srgb, var(--hds-color-success) 15%, transparent); color: var(--hds-color-success); }
.status-badge--warning { background: color-mix(in srgb, var(--hds-color-warning) 15%, transparent); color: var(--hds-color-warning); }
.status-badge--critical { background: color-mix(in srgb, var(--hds-color-critical) 15%, transparent); color: var(--hds-color-critical); }
```

### Responsive Grid Layout

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--hds-spacing-lg);
  padding: var(--hds-spacing-xl);
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hds-spacing-md);
}
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
.section-card {
  background: var(--hds-surface-card);
  border-radius: var(--hds-border-radius);
  box-shadow: var(--hds-card-shadow);
  padding: var(--hds-spacing-lg);
}
```

## Data Binding: Audit Metrics to Visual Elements

Each dashboard section maps data files to visual components:

| Data Source                        | Visual Element             | Binding Logic                                  |
|------------------------------------|----------------------------|-------------------------------------------------|
| `.orch/runs/**/*.json`             | Sessions KPI + sparkline   | Count sessions per day, last 7 days for sparkline |
| `.orch/audit/tokens/*.json`        | Tokens KPI + bar chart     | Sum `total_tokens` per day, group by agent       |
| `.orch/audit/violations.json`      | Compliance KPI + badge     | `1 - (violations / total_checks)` = adherence % |
| `.orch/workflow-state/*.yaml`      | Migration progress bar     | `completed_phases / total_phases * 100`          |
| Scan output JSON                   | Code Health table          | Map `coverage`, `antiPatterns`, `docCoverage`    |
| `.orch/registry.yaml`              | Registry status badges     | Count current/stale/draft per domain             |

## Steps

1. Determine which sections to render (all, or filtered by user request / `--sections`).
2. Read data sources for each section (see data binding table above).
3. Load HDS tokens for theming (colors, fonts, spacing).
4. Generate the HTML dashboard:
   a. KPI cards at top: sessions, tokens, adherence %, migration progress.
   b. Charts rendered as inline SVG (no chart library dependency).
   c. Tables for detailed breakdowns.
   d. Progress bars for migration phases.
   e. Responsive grid layout.
5. Embed all CSS inline (HDS tokens, theme colors).
6. Write single self-contained HTML file.

## Output

```markdown
## Dashboard Generated

### Details
| Field         | Value                              |
|---------------|------------------------------------|
| Sections      | adoption, tokens, compliance, migration, health, registry |
| Theme         | dark                               |
| Output        | .orch/reports/dashboard.html        |
| Size          | 42 KB                              |
| Data range    | 2026-03-18 to 2026-03-25           |

### Sections Included
| Section       | Data Points | Status   |
|---------------|-------------|----------|
| Adoption      | 1,247       | rendered |
| Tokens        | 342,000     | rendered |
| Compliance    | 94.2%       | rendered |
| Migration     | 67%         | rendered |
| Code Health   | 6 metrics   | rendered |
| Registry      | 78 sources  | rendered |
```

## Validation

- Opens in browser without errors or console warnings
- All metrics display correctly (no NaN, undefined, or missing values)
- HDS theme applied — all colors reference `var(--hds-*)` tokens, no hardcoded hex in elements
- Charts render as inline SVG (no external chart library requests, verify in network tab)
- Responsive layout works on 1080p and 4K displays (test `kpi-grid` breakpoint at 900px)
- Zero external dependencies — no `<link>`, `<script src>`, or `fetch()` calls to external URLs
- Auto-refresh meta tag included for live dashboard use: `<meta http-equiv="refresh" content="300">`
- Light theme toggle works by setting `data-theme="light"` on the root element
