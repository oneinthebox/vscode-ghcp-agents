# Elevate Data Connector — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/data-connector --target .orch/references/internal/elevate/data-connector.md`

## Overview

The Data Connector provides a unified data fetching abstraction for Elevate
applications. It wraps HttpClient with automatic retry, caching, request
deduplication, and integration with Elevate auth (token injection) and logging.

<!-- ADD-HERE: replace with your actual data-connector overview -->

## Installation

```bash
npm install @yourorg/elevate/data-connector
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateDataConnector } from '@yourorg/elevate/data-connector';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateDataConnector({
      baseUrl: '/api',
      retryAttempts: 3,
      cacheTtl: 60000, // 1 minute
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateDataConnector()` | Provider | Register data connector |
| `DataConnectorService` | Service | Fetch, cache, retry API |
| `DataRequest` | Interface | Request configuration |
| `CachePolicy` | Enum | `NoCache`, `CacheFirst`, `NetworkFirst` |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { DataConnectorService } from '@yourorg/elevate/data-connector';

@Injectable({ providedIn: 'root' })
export class TradeService {
  private dataConnector = inject(DataConnectorService);

  getTrades(): Observable<Trade[]> {
    return this.dataConnector.get<Trade[]>('/trades', {
      cache: 'CacheFirst',
      cacheTtl: 30000,
    });
  }

  executeTrade(trade: Trade): Observable<TradeResult> {
    return this.dataConnector.post<TradeResult>('/trades/execute', trade, {
      retry: 0, // no retry for mutations
    });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Use `CacheFirst` for read-heavy endpoints (reference data, user profiles)
- Use `NetworkFirst` for real-time data (positions, market data)
- Disable retry for mutation requests (POST, PUT, DELETE)
- The connector automatically injects auth tokens via Elevate auth

<!-- ADD-HERE: add org-specific patterns and best practices -->
