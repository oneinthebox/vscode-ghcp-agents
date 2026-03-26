# Elevate Client Core — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/client-core --target .orch/references/internal/elevate/client-core.md`

## Overview

Client Core is the foundational package for the Elevate platform. It handles
platform bootstrapping, initialization sequencing, version management, and
provides the core runtime that all other Elevate libraries depend on.

<!-- ADD-HERE: replace with your actual client-core overview -->

## Installation

```bash
npm install @yourorg/elevate/client-core
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateCore } from '@yourorg/elevate/client-core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateCore({
      appId: 'my-app',
      version: '1.0.0',
      environment: 'production',
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateCore()` | Provider | Bootstrap the Elevate runtime |
| `ElevateCoreService` | Service | Runtime info, version, health checks |
| `ELEVATE_CONFIG` | InjectionToken | Core configuration token |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { ElevateCoreService } from '@yourorg/elevate/client-core';

@Component({ /* ... */ })
export class AppComponent {
  private core = inject(ElevateCoreService);

  ngOnInit(): void {
    console.log('Elevate version:', this.core.getVersion());
    console.log('App ID:', this.core.getAppId());
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Always initialize client-core before other Elevate libraries
- Use `provideElevateCore()` as the first Elevate provider in `app.config.ts`
- Access runtime metadata via `ElevateCoreService`

<!-- ADD-HERE: add org-specific patterns and best practices -->
