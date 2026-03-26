# Elevate Power BI — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/power-bi --target .orch/references/internal/elevate/power-bi.md`

## Overview

The Power BI library provides Angular components for embedding Power BI reports
and dashboards. It manages embed token acquisition, report rendering, and
interaction events, with full integration into Elevate auth for token management.

<!-- ADD-HERE: replace with your actual power-bi overview -->

## Installation

```bash
npm install @yourorg/elevate/power-bi
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevatePowerBI } from '@yourorg/elevate/power-bi';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevatePowerBI({
      tokenEndpoint: '/api/powerbi/token',
      defaultWorkspace: 'org-workspace-id',
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevatePowerBI()` | Provider | Register Power BI integration |
| `ElevatePowerBIComponent` | Component | `<elevate-power-bi>` embed element |
| `PowerBIService` | Service | Programmatic report/token management |
| `EmbedConfig` | Interface | Report embed configuration |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<elevate-power-bi
  [reportId]="'report-guid-here'"
  [pageName]="'Overview'"
  [filters]="reportFilters"
  [height]="'600px'"
  (loaded)="onReportLoaded($event)"
  (error)="onReportError($event)"
  data-testid="pbi-report">
</elevate-power-bi>
```

```typescript
@Component({ /* ... */ })
export class ReportDashboardComponent {
  reportFilters = [
    { table: 'Trades', column: 'Region', values: ['EMEA'] },
  ];

  onReportLoaded(event: ReportLoadedEvent): void {
    this.logger.info('Power BI report loaded', { context: 'ReportDashboard', data: { reportId: event.reportId } });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Use `provideElevatePowerBI()` to configure the token endpoint once
- Embed tokens are acquired and refreshed automatically via Elevate auth
- Apply filters dynamically based on app context (user, region, date range)
- Handle `error` events for token expiry or report unavailability

<!-- ADD-HERE: add org-specific patterns and best practices -->
