# Elevate Logging Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Logging service API. Keep under 500 lines.

## Setup

```typescript
import { ElevateLoggingModule } from '@yourorg/elevate/logging';

@NgModule({
  imports: [
    ElevateLoggingModule.forRoot({
      appId: 'my-app',
      level: 'info',           // 'debug' | 'info' | 'warn' | 'error'
      endpoint: '/api/logs',   // backend log collector
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual logging module setup -->

## ElevateLoggingService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `debug(msg, context?)` | `string, object?` | `void` | Debug-level log |
| `info(msg, context?)` | `string, object?` | `void` | Info-level log |
| `warn(msg, context?)` | `string, object?` | `void` | Warning-level log |
| `error(msg, error?, context?)` | `string, Error?, object?` | `void` | Error-level log |
<!-- ADD-HERE: add remaining methods (e.g., setCorrelationId, flush) -->

## Structured Logging Example

```typescript
constructor(private log: ElevateLoggingService) {}

loadFunds() {
  this.log.info('Loading funds', { page: 1, filter: 'equity' });
  this.fundService.getAll().subscribe({
    next: (funds) => this.log.debug('Funds loaded', { count: funds.length }),
    error: (err) => this.log.error('Failed to load funds', err),
  });
}
```

<!-- ADD-HERE: replace with your actual logging patterns -->

## Log Levels and Environments

| Environment | Default Level | Ships to Backend? |
|-------------|--------------|-------------------|
| local | `debug` | No |
| dev | `info` | Yes |
| prod | `warn` | Yes |
<!-- ADD-HERE: add your actual log level configuration -->
