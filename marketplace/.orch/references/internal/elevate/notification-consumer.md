# Elevate Notification Consumer — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/notification-consumer --target .orch/references/internal/elevate/notification-consumer.md`

## Overview

The Notification Consumer provides subscription and display capabilities for
platform notifications. It connects to the Elevate notification service,
renders toast/snackbar notifications, manages notification history, and
handles user actions on notifications.

<!-- ADD-HERE: replace with your actual notification-consumer overview -->

## Installation

```bash
npm install @yourorg/elevate/notification-consumer
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateNotificationConsumer } from '@yourorg/elevate/notification-consumer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateNotificationConsumer({
      position: 'top-right',
      maxVisible: 5,
      autoCloseMs: 5000,
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateNotificationConsumer()` | Provider | Register notification consumer |
| `NotificationConsumerService` | Service | Subscribe, dismiss, history API |
| `ElevateNotificationOutlet` | Component | `<elevate-notification-outlet>` display area |
| `Notification` | Interface | Notification data structure |
| `NotificationAction` | Interface | Action button configuration |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<!-- Place once in app root template -->
<elevate-notification-outlet></elevate-notification-outlet>
```

```typescript
import { NotificationConsumerService } from '@yourorg/elevate/notification-consumer';

@Component({ /* ... */ })
export class AppComponent implements OnInit {
  private notifications = inject(NotificationConsumerService);
  private logger = inject(LoggingService);

  ngOnInit(): void {
    this.notifications.onReceive().subscribe(notification => {
      this.logger.info('Notification received', {
        context: 'AppComponent',
        data: { type: notification.type, title: notification.title },
      });
    });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Place `<elevate-notification-outlet>` once in the root component template
- Subscribe to specific notification types for custom handling
- Use notification actions for trade approvals, alerts acknowledgment
- Notifications integrate with Elevate auth for user targeting

<!-- ADD-HERE: add org-specific patterns and best practices -->
