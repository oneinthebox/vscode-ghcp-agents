# Elevate Angular Adapter — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/angular-adapter --target .orch/references/internal/elevate/angular-adapter.md`

## Overview

The Angular Adapter provides Angular-specific bindings for the Elevate platform.
It bridges the core Elevate runtime with Angular's dependency injection, change
detection, and module system. Required for any Angular application using Elevate.

<!-- ADD-HERE: replace with your actual angular-adapter overview -->

## Installation

```bash
npm install @yourorg/elevate/angular-adapter
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateAngular } from '@yourorg/elevate/angular-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateAngular(),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateAngular()` | Provider | Register Angular-specific Elevate bindings |
| `ElevateModule` | NgModule | Legacy module-based setup (pre-standalone) |
| `ELEVATE_ZONE_CONFIG` | InjectionToken | Zone.js integration configuration |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
// Standalone app (Angular 17+)
import { provideElevateAngular } from '@yourorg/elevate/angular-adapter';
import { provideElevateCore } from '@yourorg/elevate/client-core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateCore({ appId: 'my-app' }),
    provideElevateAngular(),
  ],
};
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Always pair with `provideElevateCore()` — the adapter depends on the core runtime
- For standalone apps, use `provideElevateAngular()` in `app.config.ts`
- For legacy NgModule apps, import `ElevateModule.forRoot()` in `AppModule`
- The adapter handles Angular zone integration automatically

<!-- ADD-HERE: add org-specific patterns and best practices -->
