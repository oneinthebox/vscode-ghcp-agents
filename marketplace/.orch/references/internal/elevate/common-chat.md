# Elevate Common Chat — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/common-chat --target .orch/references/internal/elevate/common-chat.md`

## Overview

The Common Chat component provides an embeddable chat UI with real-time messaging
capabilities. It integrates with the Elevate WebSocket service for live message
delivery and supports threaded conversations, file attachments, and presence indicators.

<!-- ADD-HERE: replace with your actual common-chat overview -->

## Installation

```bash
npm install @yourorg/elevate-components/common-chat
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { ElevateChatModule } from '@yourorg/elevate-components/common-chat';

@Component({
  standalone: true,
  imports: [ElevateChatModule],
  // ...
})
export class MyComponent {}
```

<!-- ADD-HERE: replace with your actual setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ElevateChatModule` | Module | Chat component and directives |
| `ElevateChatComponent` | Component | `<elevate-chat>` element |
| `ChatService` | Service | Programmatic message send/receive |
| `ChatMessage` | Interface | Message data structure |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<elevate-chat
  [channelId]="'trade-desk-alpha'"
  [userId]="currentUser().id"
  [showPresence]="true"
  [enableAttachments]="true"
  (messageSent)="onMessageSent($event)"
  data-testid="trade-chat">
</elevate-chat>
```

```typescript
@Component({ /* ... */ })
export class TradeDeskComponent {
  currentUser = inject(ElevateAuthService).currentUser;

  onMessageSent(msg: ChatMessage): void {
    this.logger.info('Chat message sent', { context: 'TradeDesk', data: { channelId: msg.channelId } });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Pair with Elevate WebSocket for real-time delivery
- Use `channelId` to scope conversations per context (trade desk, team, etc.)
- Enable presence indicators for live collaboration
- Integrate with Elevate auth for user identity

<!-- ADD-HERE: add org-specific patterns and best practices -->
