# Angular 20 — What's New
Source: https://angular.love/angular-20-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| Zoneless Change Detection | Performance | `provideZonelessChangeDetection()` — stable, no longer experimental | Stable |
| `linkedSignal()` Stable | Reactivity | Derived writable signal promoted to stable | Stable |
| `resource()` / `rxResource()` Stable | Reactivity | Signal-based async data loading promoted to stable | Stable |
| `effect()` Timing Change | Reactivity | Effects now run during change detection by default (not microtask) | Stable |
| Vitest Default | Testing | Vitest replaces Karma as the default test runner for new projects | Stable |
| Node.js 18 Dropped | Platform | Minimum Node 20.19.0, 22.12.0+, or 24.0.0+ | Stable |
| TypeScript 5.8 Required | Platform | TypeScript 5.8.x pinned | Stable |
| Incremental Hydration Stable | SSR | `@defer`-based incremental hydration promoted to stable | Stable |
| `outputToObservable()` subscribe removed | Components | `OutputEmitterRef.subscribe()` removed | Breaking |
| `CanLoad` Guard Removed | Router | Fully removed; use `canMatch` | Breaking |
| `FormControlStatus` Narrowed | Forms | Type narrowed from string to union type | Breaking |
| Signal Components | Components | Full signal-based component authoring pattern | Stable |
| Build Caching | Tooling | Persistent build cache for faster rebuilds | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| Node.js 18 dropped | Apps on Node 18 | **Upgrade to Node 20.19+** |
| TypeScript 5.8 required | TS version | Upgrade TypeScript |
| `CanLoad` guard removed | Router guards | Replace with `canMatch` |
| `OutputEmitterRef.subscribe()` removed | Output subscriptions | Use `.pipe()` or template `(event)` binding |
| `effect()` timing changed | Effect-based code | Effects run in CD cycle; review timing-sensitive effects |
| `FormControlStatus` type narrowed | Forms type checks | Fix type assertions relying on `string` type |
| Karma deprecated | Testing | Migrate to Vitest or Jest |
| Zone.js soft-deprecated | Change detection | Plan migration to zoneless |

## New APIs

| API | Module | Description |
|---|---|---|
| `provideZonelessChangeDetection()` | `@angular/core` | Stable zoneless CD (replaces experimental version) |
| `linkedSignal()` | `@angular/core` | Stable derived writable signal |
| `resource()` | `@angular/core` | Stable signal-based async resource |
| `rxResource()` | `@angular/core/rxjs-interop` | Stable Observable-based async resource |
| `httpResource()` | `@angular/common/http` | Signal-based HTTP resource (Developer Preview) |
| `canMatch` | `@angular/router` | Guard replacement for removed `CanLoad` |

## Migration Steps

1. **Upgrade Node.js** to 20.19+, 22.12+, or 24.0+
2. Update TypeScript to 5.8.x
3. Run `ng update @angular/core@20 @angular/cli@20`
4. Replace `CanLoad` guards with `canMatch`
5. Replace `OutputEmitterRef.subscribe()` with template bindings or `.pipe()`
6. Review `effect()` timing — now runs during change detection
7. Fix `FormControlStatus` type assertions if using string comparisons
8. Optional: Migrate to zoneless with `provideZonelessChangeDetection()`
9. Optional: Migrate from Karma to Vitest

## Zoneless Migration Checklist

| Step | Command / Action |
|---|---|
| 1. Add provider | `provideZonelessChangeDetection()` in `app.config.ts` |
| 2. Remove Zone.js | Remove `zone.js` from `polyfills` in `angular.json` |
| 3. Update components | Ensure all state uses signals or calls `ChangeDetectorRef.markForCheck()` |
| 4. Update tests | Remove `fakeAsync`/`tick`; use `fixture.whenStable()` or signals |
| 5. Remove Zone.js dep | `npm uninstall zone.js` |
