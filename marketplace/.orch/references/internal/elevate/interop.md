# Elevate Interop — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/interop --target .orch/references/internal/elevate/interop.md`

## Overview

The Interop library provides cross-application communication for Elevate apps
running inside io.Connect (formerly Glue42) or similar desktop containers. It
enables context sharing, method invocation, and channel subscriptions between
applications in the workspace.

<!-- ADD-HERE: replace with your actual interop overview -->

## Installation

```bash
npm install @yourorg/elevate/interop
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateInterop } from '@yourorg/elevate/interop';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateInterop({
      gatewayUrl: 'ws://localhost:8385',
      appName: 'my-app',
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateInterop()` | Provider | Register interop bindings |
| `InteropService` | Service | Context sharing, method invocation |
| `InteropContext` | Interface | Shared context data structure |
| `InteropChannel` | Interface | Channel subscription handle |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { InteropService } from '@yourorg/elevate/interop';

@Component({ /* ... */ })
export class TradeBlotterComponent {
  private interop = inject(InteropService);

  selectInstrument(symbol: string): void {
    // Publish context to other apps in the workspace
    this.interop.setContext('instrument', { symbol, source: 'trade-blotter' });
  }

  ngOnInit(): void {
    // Subscribe to context changes from other apps
    this.interop.onContextUpdate('instrument').subscribe(ctx => {
      this.loadInstrument(ctx.symbol);
    });
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Use context sharing for linked views (blotter selects instrument, chart updates)
- Register interop methods for cross-app RPC calls
- Subscribe to channels for broadcast-style communication
- Gracefully degrade when not running inside a desktop container

<!-- ADD-HERE: add org-specific patterns and best practices -->
