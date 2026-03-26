# Angular 18 — What's New
Source: https://angular.love/angular-18-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| Zoneless Change Detection | Performance | `provideExperimentalZonelessChangeDetection()` removes Zone.js | Experimental |
| Signal Inputs | Components | `input()` / `input.required()` function-based inputs | Stable |
| Signal Outputs | Components | `output()` function-based outputs | Stable |
| Model Inputs | Components | `model()` for two-way binding with signals | Stable |
| Signal Queries | Components | `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` | Stable |
| Material 3 Default | Material | Angular Material uses M3 theming by default | Stable |
| Partial Hydration | SSR | `@defer` blocks can skip hydration on the client | Developer Preview |
| Route Redirects | Router | `redirectTo` can be a function | Stable |
| Firebase App Hosting | Deploy | New deployment target for Firebase | Stable |
| `@angular/ssr` Package | SSR | Unified SSR package replacing `@nguniversal` | Stable |
| Forms Events | Forms | Unified `events` observable on `AbstractControl` | Stable |
| Fallback for ng-content | Components | `<ng-content>` supports default/fallback content | Stable |
| Stable Control Flow | Templates | `@if`/`@for`/`@switch` fully stable | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| Node.js 16 fully dropped | Apps on Node 16 | Upgrade to Node 18.13+ |
| TypeScript 5.4+ required | TS version pinned | Upgrade TypeScript |
| `standalone: true` default for CLI | Generated components | Add `standalone: false` if using NgModules |
| `@angular/platform-server` changes | SSR apps | Migrate to `@angular/ssr` |
| `@nguniversal/*` removed | Universal SSR | Use `@angular/ssr` package |
| `withFetch()` default for HttpClient | HTTP | Fetch API used by default instead of XMLHttpRequest |
| Route `redirectTo` relative by default | Router config | Review `redirectTo` paths in route configs |
| `OnPush` components require `markForCheck` or signals | Change detection | Ensure state updates are signal-based or mark dirty |

## New APIs

| API | Module | Description |
|---|---|---|
| `input()` | `@angular/core` | Signal-based input (replaces `@Input()`) |
| `input.required()` | `@angular/core` | Required signal input |
| `output()` | `@angular/core` | Function-based output (replaces `@Output()`) |
| `outputFromObservable()` | `@angular/core/rxjs-interop` | Convert Observable to output |
| `outputToObservable()` | `@angular/core/rxjs-interop` | Convert output to Observable |
| `model()` | `@angular/core` | Two-way bindable signal input |
| `viewChild()` | `@angular/core` | Signal-based `@ViewChild` replacement |
| `viewChildren()` | `@angular/core` | Signal-based `@ViewChildren` replacement |
| `contentChild()` | `@angular/core` | Signal-based `@ContentChild` replacement |
| `contentChildren()` | `@angular/core` | Signal-based `@ContentChildren` replacement |
| `provideExperimentalZonelessChangeDetection()` | `@angular/core` | Enable zoneless mode |
| `events` | `@angular/forms` | Unified events observable on form controls |
| `<ng-content>` fallback | Template | Default content when nothing is projected |

## Migration Steps

1. Update Node.js to 18.13+
2. Update TypeScript to 5.4+
3. Run `ng update @angular/core@18 @angular/cli@18`
4. Run `ng g @angular/core:signal-input-migration` to migrate `@Input()` to `input()`
5. Run `ng g @angular/core:output-migration` to migrate `@Output()` to `output()`
6. Run `ng g @angular/core:signal-queries-migration` to migrate query decorators
7. Replace `@nguniversal/*` with `@angular/ssr` for SSR apps
8. Review `redirectTo` paths (now relative by default)
9. Optional: Try zoneless with `provideExperimentalZonelessChangeDetection()`
10. Optional: Migrate to M3 theming in Angular Material

## Automated Schematics

| Schematic | Command |
|---|---|
| Control Flow | `ng g @angular/core:control-flow` |
| Standalone | `ng g @angular/core:standalone` |
| inject() Migration | `ng g @angular/core:inject-migration` |
| Signal Inputs | `ng g @angular/core:signal-input-migration` |
| Signal Queries | `ng g @angular/core:signal-queries-migration` |
| Output Migration | `ng g @angular/core:output-migration` |
