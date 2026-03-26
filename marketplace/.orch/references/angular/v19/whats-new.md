# Angular 19 — What's New
Source: https://angular.love/angular-19-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| `linkedSignal()` | Reactivity | Writable signal derived from other signals with reset logic | Developer Preview |
| `resource()` / `rxResource()` | Reactivity | Signal-based async data loading primitive | Developer Preview |
| Incremental Hydration | SSR | `@defer` blocks hydrate on demand based on triggers | Developer Preview |
| `standalone: true` Omitted | Components | `standalone: true` no longer emitted (it is the default) | Stable |
| `provideAppInitializer()` | Core | Replaces `APP_INITIALIZER` token for app bootstrapping | Stable |
| `afterRenderEffect()` | Lifecycle | Reactive alternative to `afterRender` using signals | Stable |
| Hot Module Replacement (HMR) | DX | Styles and templates hot-reload enabled by default | Stable |
| Zoneless Improvements | Performance | Improved zoneless change detection, broader support | Experimental |
| Event Replay | SSR | `withEventReplay()` captures user events during hydration | Stable |
| Route-Level Render Mode | SSR | Per-route SSR/SSG/CSR configuration | Developer Preview |
| Strict Standalone Enforcement | Components | Components with `standalone: false` need explicit opt-out | Stable |
| `input()` / `output()` / `model()` Stable | Components | All signal-based component APIs fully stable | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| Node.js minimum raised | Node < 18.19.1 | Upgrade to Node 18.19.1+, 20.11.1+, or 22.0.0+ |
| TypeScript 5.5 - 5.7 required | TS version pinned | Upgrade TypeScript |
| `standalone: true` is default | Component metadata | Remove explicit `standalone: true`; add `standalone: false` for NgModule components |
| `APP_INITIALIZER` deprecated | App bootstrap | Use `provideAppInitializer()` instead |
| `afterRender` overloads deprecated | Lifecycle | Use `afterRenderEffect()` for reactive after-render side effects |
| HMR enabled by default | Dev workflow | Use `--no-hmr` to disable if issues arise |
| `@angular/ssr` route config | SSR | Update server routing for route-level render modes |
| `ComponentFixture.autoDetectChanges` | Testing | Default behavior changed with zoneless; call `fixture.detectChanges()` explicitly if needed |

## New APIs

| API | Module | Description |
|---|---|---|
| `linkedSignal()` | `@angular/core` | Derived writable signal that resets when source changes |
| `resource()` | `@angular/core` | Signal-based async resource (Promise-based) |
| `rxResource()` | `@angular/core/rxjs-interop` | Signal-based async resource (Observable-based) |
| `provideAppInitializer()` | `@angular/core` | Functional replacement for `APP_INITIALIZER` |
| `afterRenderEffect()` | `@angular/core` | Reactive after-render side effect |
| `withEventReplay()` | `@angular/platform-browser` | Replay user events captured before hydration |
| `ServerRoute` | `@angular/ssr` | Configure per-route render mode (SSR/SSG/CSR) |

## Migration Steps

1. Update Node.js to 18.19.1+, 20.11.1+, or 22.0.0+
2. Update TypeScript to 5.5+
3. Run `ng update @angular/core@19 @angular/cli@19`
4. Automated schematics run during update:
   - Removes explicit `standalone: true`
   - Adds `standalone: false` to non-standalone components
5. Replace `APP_INITIALIZER` with `provideAppInitializer()`
6. Replace `afterRender` with `afterRenderEffect()` where appropriate
7. Optional: Start using `linkedSignal()` and `resource()` (developer preview)
8. Optional: Configure route-level render modes for SSR apps
9. Optional: Try incremental hydration with `@defer` blocks

## Signal APIs Summary (v19)

| API | Status | Purpose |
|---|---|---|
| `signal()` | Stable | Writable reactive state |
| `computed()` | Stable | Derived reactive state |
| `effect()` | Stable | Side effects on signal changes |
| `input()` | Stable | Component inputs |
| `output()` | Stable | Component outputs |
| `model()` | Stable | Two-way binding |
| `viewChild()` / `viewChildren()` | Stable | View queries |
| `contentChild()` / `contentChildren()` | Stable | Content queries |
| `linkedSignal()` | Developer Preview | Derived writable signal |
| `resource()` / `rxResource()` | Developer Preview | Async data loading |
