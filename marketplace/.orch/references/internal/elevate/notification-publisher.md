# Elevate Notification Publisher — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/notification-publisher --target .orch/references/internal/elevate/notification-publisher.md`

## Overview

The Notification Publisher enables applications to publish notifications to
specific users, groups, or broadcast channels. It supports scheduling, priority
levels, and action buttons. Works with the Notification Consumer for delivery.

<!-- ADD-HERE: replace with your actual notification-publisher overview -->

## Installation

```bash
npm install @yourorg/elevate/notification-publisher
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateNotificationPublisher } from '@yourorg/elevate/notification-publisher';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateNotificationPublisher({
      serviceUrl: '/api/notifications',
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateNotificationPublisher()` | Provider | Register notification publisher |
| `NotificationPublisherService` | Service | Publish, schedule, cancel API |
| `PublishRequest` | Interface | Notification creation request |
| `NotificationTarget` | Interface | User, group, or broadcast target |
| `NotificationPriority` | Enum | `Low`, `Normal`, `High`, `Urgent` |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { NotificationPublisherService } from '@yourorg/elevate/notification-publisher';

@Injectable({ providedIn: 'root' })
export class TradeAlertService {
  private publisher = inject(NotificationPublisherService);

  notifyTradeExecuted(trade: Trade): Observable<void> {
    return this.publisher.publish({
      title: 'Trade Executed',
      body: `${trade.type} ${trade.quantity} ${trade.symbol} @ ${trade.price}`,
      priority: 'Normal',
      target: { userId: trade.requestedBy },
      actions: [
        { label: 'View Details', route: `/trades/${trade.id}` },
      ],
    });
  }

  notifyRiskBreach(alert: RiskAlert): Observable<void> {
    return this.publisher.publish({
      title: 'Risk Limit Breach',
      body: alert.message,
      priority: 'Urgent',
      target: { group: 'risk-managers' },
    });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Target notifications to specific users, groups, or broadcast to all
- Use priority levels to control display behavior (Urgent bypasses auto-close)
- Schedule notifications for future delivery with `scheduleAt`
- Include action buttons for in-notification workflows

<!-- ADD-HERE: add org-specific patterns and best practices -->
