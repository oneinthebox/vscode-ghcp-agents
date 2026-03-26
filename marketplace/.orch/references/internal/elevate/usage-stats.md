# Elevate Usage Stats — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/usage-stats --target .orch/references/internal/elevate/usage-stats.md`

## Overview

The Usage Stats library provides usage analytics and telemetry for Elevate
applications. It tracks page views, feature usage, performance metrics, and
custom business events with automatic batching and server-side aggregation.

<!-- ADD-HERE: replace with your actual usage-stats overview -->

## Installation

```bash
npm install @yourorg/elevate/usage-stats
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateUsageStats } from '@yourorg/elevate/usage-stats';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateUsageStats({
      endpoint: '/api/telemetry',
      batchSize: 20,
      flushInterval: 10000,
      trackPageViews: true,
      trackPerformance: true,
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateUsageStats()` | Provider | Register usage stats |
| `UsageStatsService` | Service | Track events, page views, performance |
| `TrackEvent` | Interface | Custom event data structure |
| `PerformanceMetric` | Interface | Performance measurement |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { UsageStatsService } from '@yourorg/elevate/usage-stats';

@Component({ /* ... */ })
export class TradeFormComponent {
  private stats = inject(UsageStatsService);

  onTradeSubmit(trade: Trade): void {
    this.stats.trackEvent({
      category: 'trading',
      action: 'trade-submitted',
      label: trade.type,
      value: trade.quantity,
    });
  }

  onFilterChange(filters: TradeFilters): void {
    this.stats.trackEvent({
      category: 'trading',
      action: 'filter-changed',
      metadata: { filters },
    });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Enable `trackPageViews` for automatic route-change tracking
- Use custom events for business-specific analytics (trade submissions, searches)
- Performance metrics are collected automatically when `trackPerformance` is enabled
- Events are batched and flushed periodically to reduce network overhead
- Integrates with Elevate auth for user-attributed analytics

<!-- ADD-HERE: add org-specific patterns and best practices -->
