# Elevate Tableau — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/tableau --target .orch/references/internal/elevate/tableau.md`

## Overview

The Tableau library provides Angular components for embedding Tableau dashboards
and visualizations. It manages authentication, dashboard rendering, and
interactive filtering with Elevate platform integration.

<!-- ADD-HERE: replace with your actual tableau overview -->

## Installation

```bash
npm install @yourorg/elevate/tableau
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateTableau } from '@yourorg/elevate/tableau';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateTableau({
      serverUrl: 'https://tableau.internal.yourorg.com',
      site: 'org-site',
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateTableau()` | Provider | Register Tableau integration |
| `ElevateTableauComponent` | Component | `<elevate-tableau>` embed element |
| `TableauService` | Service | Programmatic dashboard management |
| `TableauFilter` | Interface | Dashboard filter configuration |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<elevate-tableau
  [viewUrl]="'/views/TradingDashboard/Overview'"
  [filters]="dashboardFilters"
  [height]="'700px'"
  [toolbar]="'hidden'"
  (loaded)="onDashboardLoaded($event)"
  data-testid="tableau-dashboard">
</elevate-tableau>
```

```typescript
@Component({ /* ... */ })
export class AnalyticsDashboardComponent {
  dashboardFilters = [
    { field: 'Region', values: ['APAC', 'EMEA'] },
  ];

  onDashboardLoaded(event: DashboardLoadedEvent): void {
    this.logger.info('Tableau dashboard loaded', { context: 'Analytics' });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Configure the Tableau server URL once via `provideElevateTableau()`
- Authentication is handled through Elevate auth (trusted tickets or SSO)
- Apply filters dynamically based on app context
- Use `toolbar: 'hidden'` for seamless embedding

<!-- ADD-HERE: add org-specific patterns and best practices -->
