# Elevate Platform Overview — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Elevate platform details. Keep under 500 lines.

## What is Elevate?

Elevate is the internal platform services layer that provides authentication,
logging, configuration, and other cross-cutting concerns for Angular apps.

<!-- ADD-HERE: replace with your actual platform overview -->

## Service Catalog

| Service | Module | Import Path | Purpose |
|---------|--------|-------------|---------|
| Auth | `ElevateAuthModule` | `@yourorg/elevate/auth` | SSO, token management |
| Logging | `ElevateLoggingModule` | `@yourorg/elevate/logging` | Structured logging |
| Config | `ElevateConfigModule` | `@yourorg/elevate/config` | Runtime configuration |
<!-- ADD-HERE: add remaining platform services -->

## Quick Start

```typescript
// app.module.ts — wire up all Elevate services
import { ElevateModule } from '@yourorg/elevate';

@NgModule({
  imports: [
    ElevateModule.forRoot({
      appId: 'my-app',
      environment: 'production',
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual setup code -->

## Environment Configuration

| Environment | Base URL | Auth Provider |
|-------------|----------|---------------|
| local | `http://localhost:4200` | Mock |
| dev | `https://dev.internal.com` | Okta |
| prod | `https://app.internal.com` | Okta |
<!-- ADD-HERE: add your actual environments -->
