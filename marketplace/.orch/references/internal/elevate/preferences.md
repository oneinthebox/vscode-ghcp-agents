# Elevate Preferences Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Preferences service API. Keep under 500 lines.

## Setup

```typescript
import { ElevatePreferencesModule } from '@yourorg/elevate/preferences';

@NgModule({
  imports: [
    ElevatePreferencesModule.forRoot({
      storageBackend: 'api',
      apiEndpoint: '/api/preferences',
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual preferences module setup -->

## ElevatePreferencesService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `get(key)` | `key: string` | `Observable<T>` | Retrieve a user preference value |
| `set(key, value)` | `key: string, value: T` | `Observable<void>` | Store a user preference value |
| `getAll()` | — | `Observable<Record<string, unknown>>` | Get all preferences for current user |
| `remove(key)` | `key: string` | `Observable<void>` | Remove a stored preference |
<!-- ADD-HERE: add remaining methods -->

## Feature Flags

```typescript
// Check feature flag state
const isEnabled = this.preferences.getFeatureFlag('new-dashboard');

// Use in templates with the feature flag directive
// <div *elevateFeatureFlag="'new-dashboard'">New Dashboard</div>
```

<!-- ADD-HERE: replace with your actual feature flag usage -->

## Settings Storage

```typescript
// Store user-specific settings (theme, layout, defaults)
this.preferences.set('theme', 'dark');
this.preferences.set('defaultView', 'grid');
```

<!-- ADD-HERE: describe storage mechanism, sync behavior, default values -->
