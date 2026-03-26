# Elevate Config Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Config service API. Keep under 500 lines.

## Setup

```typescript
import { ElevateConfigModule } from '@yourorg/elevate/config';

@NgModule({
  imports: [
    ElevateConfigModule.forRoot({
      configUrl: '/api/config',   // runtime config endpoint
      cacheTtl: 300,              // seconds to cache config
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual config module setup -->

## ElevateConfigService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `get<T>(key)` | `string` | `Observable<T>` | Get config value by key |
| `getSnapshot<T>(key)` | `string` | `T` | Synchronous current value |
| `reload()` | — | `Promise<void>` | Force-reload config from server |
<!-- ADD-HERE: add remaining methods -->

## Available Config Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `feature.darkMode` | `boolean` | `false` | Enable dark mode toggle |
| `api.baseUrl` | `string` | `/api` | API gateway base URL |
| `grid.pageSize` | `number` | `25` | Default data grid page size |
<!-- ADD-HERE: add your actual config keys -->

## Usage Example

```typescript
constructor(private config: ElevateConfigService) {}

ngOnInit() {
  const pageSize = this.config.getSnapshot<number>('grid.pageSize');
  this.config.get<boolean>('feature.darkMode').subscribe(enabled => {
    this.darkMode = enabled;
  });
}
```

<!-- ADD-HERE: replace with your actual config usage patterns -->
