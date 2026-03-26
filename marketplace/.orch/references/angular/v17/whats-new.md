# Angular 17 — What's New
Source: https://angular.love/angular-17-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| Built-in Control Flow | Templates | `@if`, `@for`, `@switch` replace structural directives | Stable |
| Deferrable Views | Performance | `@defer` blocks for lazy-loading template sections | Stable |
| New angular.dev | Docs | Rebuilt documentation site with interactive playground | Stable |
| Signals Stable | Reactivity | `signal()`, `computed()`, `effect()` promoted to stable | Stable |
| SSR Hydration Stable | SSR | Non-destructive hydration is now stable | Stable |
| Vite + esbuild Default | Tooling | New projects use esbuild/Vite by default | Stable |
| View Transitions API | Router | `withViewTransitions()` for animated route changes | Developer Preview |
| Standalone by Default | CLI | `standalone: true` is the default for generated components | Stable |
| Style/styleUrl as String | Components | `styleUrl: './comp.css'` (singular) supported | Stable |
| New Lifecycle Hooks | Components | `afterRender` and `afterNextRender` | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| Node.js 16 dropped | Apps on Node 16 | Upgrade to Node 18.13+ |
| TypeScript 5.2+ required | TS version pinned | Upgrade TypeScript |
| `*ngIf`/`*ngFor`/`ngSwitch` soft-deprecated | All templates | Run `ng g @angular/core:control-flow` to migrate |
| `NgModule`-based apps soft-deprecated | New code | Use standalone components for new code |
| `@angular/http` fully removed | Legacy HTTP | Must use `@angular/common/http` |
| Animations module restructured | Animation imports | Use `provideAnimationsAsync()` for lazy animations |
| `RouterTestingModule` deprecated | Tests | Use `provideRouter()` in tests |
| `HttpClientTestingModule` deprecated | Tests | Use `provideHttpClientTesting()` |

## New APIs

| API | Module | Description |
|---|---|---|
| `@if / @else` | Template syntax | Replaces `*ngIf` with cleaner syntax |
| `@for / @empty` | Template syntax | Replaces `*ngFor`; requires `track` expression |
| `@switch / @case / @default` | Template syntax | Replaces `ngSwitch` directives |
| `@defer / @loading / @placeholder / @error` | Template syntax | Lazy-load template blocks with triggers |
| `withViewTransitions()` | `@angular/router` | Enable View Transitions API in router |
| `afterRender()` | `@angular/core` | Hook that runs after every render |
| `afterNextRender()` | `@angular/core` | Hook that runs after the next render only |
| `provideAnimationsAsync()` | `@angular/platform-browser/animations/async` | Lazy-load animations module |
| `provideHttpClientTesting()` | `@angular/common/http/testing` | Standalone HTTP testing provider |

## Control Flow Syntax Reference

| Old Syntax | New Syntax |
|---|---|
| `*ngIf="cond"` | `@if (cond) { ... }` |
| `*ngIf="cond; else elseBlock"` | `@if (cond) { ... } @else { ... }` |
| `*ngFor="let item of items"` | `@for (item of items; track item.id) { ... }` |
| `*ngFor` with empty | `@for (...) { ... } @empty { ... }` |
| `[ngSwitch]="val"` | `@switch (val) { @case (1) { ... } @default { ... } }` |

## Deferrable Views Triggers

| Trigger | Description |
|---|---|
| `@defer (on viewport)` | Load when element enters viewport |
| `@defer (on idle)` | Load when browser is idle |
| `@defer (on interaction)` | Load on user interaction (click, focus) |
| `@defer (on hover)` | Load on mouse hover |
| `@defer (on timer(500ms))` | Load after specified delay |
| `@defer (on immediate)` | Load immediately after non-deferred content |
| `@defer (when condition)` | Load when boolean expression is true |
| `@defer (prefetch on idle)` | Prefetch when idle, render on trigger |

## Migration Steps

1. Update Node.js to 18.13+
2. Update TypeScript to 5.2+
3. Run `ng update @angular/core@17 @angular/cli@17`
4. Run `ng g @angular/core:control-flow` to migrate templates
5. Replace `RouterTestingModule` with `provideRouter()` in tests
6. Replace `HttpClientTestingModule` with `provideHttpClientTesting()`
7. Optional: Add `@defer` blocks for heavy components
8. Optional: Enable view transitions with `withViewTransitions()`
