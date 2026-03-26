# Elevate WebSocket — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/websocket --target .orch/references/internal/elevate/websocket.md`

## Overview

The WebSocket library provides a managed WebSocket client for Elevate applications.
It handles connection lifecycle, automatic reconnection with exponential backoff,
message serialization, heartbeat/keepalive, and integration with Elevate auth
for authenticated connections.

<!-- ADD-HERE: replace with your actual websocket overview -->

## Installation

```bash
npm install @yourorg/elevate/websocket
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateWebSocket } from '@yourorg/elevate/websocket';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateWebSocket({
      url: 'wss://realtime.internal.yourorg.com',
      reconnect: true,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateWebSocket()` | Provider | Register WebSocket client |
| `WebSocketService` | Service | Connect, subscribe, send messages |
| `WebSocketMessage` | Interface | Message envelope structure |
| `ConnectionState` | Enum | `Connected`, `Disconnected`, `Reconnecting` |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { WebSocketService } from '@yourorg/elevate/websocket';

@Component({ /* ... */ })
export class MarketDataComponent implements OnInit, OnDestroy {
  private ws = inject(WebSocketService);
  private logger = inject(LoggingService);

  readonly prices = signal<PriceUpdate[]>([]);

  ngOnInit(): void {
    this.ws.subscribe<PriceUpdate>('market.prices').subscribe(update => {
      this.prices.update(current => [...current, update]);
    });

    this.ws.connectionState$.subscribe(state => {
      this.logger.info('WebSocket state changed', { context: 'MarketData', data: { state } });
    });
  }

  ngOnDestroy(): void {
    this.ws.unsubscribe('market.prices');
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Subscribe to topics for real-time data feeds (market data, notifications)
- Use `connectionState$` to show connection status to users
- The client handles reconnection automatically — no manual retry logic needed
- Auth tokens are injected into the connection handshake via Elevate auth

<!-- ADD-HERE: add org-specific patterns and best practices -->
