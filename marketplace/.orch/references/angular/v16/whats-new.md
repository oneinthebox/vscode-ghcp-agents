# Angular 16 — What's New
Source: https://angular.love/angular-16-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| Signals | Reactivity | New reactive primitive for fine-grained reactivity; `signal()`, `computed()`, `effect()` | Developer Preview |
| RxJS Interop | Reactivity | `toSignal()` and `toObservable()` bridges between signals and RxJS | Developer Preview |
| Server-Side Rendering (SSR) | Performance | Non-destructive hydration for SSR apps | Developer Preview |
| Required Inputs | Components | `@Input({ required: true })` to enforce required properties | Stable |
| Router Input Binding | Router | `withComponentInputBinding()` to bind route params directly to `@Input()` | Stable |
| DestroyRef | Lifecycle | Injectable `DestroyRef` for flexible cleanup logic | Stable |
| takeUntilDestroyed | RxJS | Operator that auto-completes on component destroy | Stable |
| esbuild Builder | Tooling | `@angular-devkit/build-angular:application` using esbuild + Vite dev server | Developer Preview |
| Jest Support | Testing | Experimental Jest integration via `@angular-devkit/build-angular:jest` | Experimental |
| Self-Closing Tags | Templates | `<app-icon />` syntax supported in templates | Stable |
| CSP Support | Security | Nonce-based Content Security Policy support for inline styles | Stable |
| ngOnDestroy Injectable | Lifecycle | `ngOnDestroy` can be injected as a provider | Stable |
| Standalone Project Default | CLI | `ng new` generates standalone projects by default (no `AppModule`) | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| Node.js 14 dropped | Apps using Node 14 | Upgrade to Node 16.14+ or 18.10+ |
| TypeScript 4.9.3+ required | TS version pinned | Upgrade TypeScript |
| Zone.js 0.13.x required | Zone.js update | `npm install zone.js@~0.13.0` |
| `ngcc` removed | Libraries using View Engine | Ensure all libs publish Ivy-compatible packages |
| `entryComponents` removed | Dynamic components | Remove `entryComponents` arrays (no-op since Ivy) |
| `RouterModule.forRoot()` guard/resolver types | Route config typing | Use functional guards/resolvers or cast types |
| `@angular/flex-layout` deprecated | Layout library | Migrate to CSS flexbox/grid or TailwindCSS |
| `BrowserModule.withServerTransition()` removed | SSR | Use `provideClientHydration()` |

## New APIs

| API | Module | Description |
|---|---|---|
| `signal()` | `@angular/core` | Create a writable reactive signal |
| `computed()` | `@angular/core` | Create a derived signal from other signals |
| `effect()` | `@angular/core` | Side-effect that runs when signals change |
| `toSignal()` | `@angular/core/rxjs-interop` | Convert Observable to Signal |
| `toObservable()` | `@angular/core/rxjs-interop` | Convert Signal to Observable |
| `takeUntilDestroyed()` | `@angular/core/rxjs-interop` | Auto-unsubscribe on destroy |
| `DestroyRef` | `@angular/core` | Injectable destroy lifecycle reference |
| `provideClientHydration()` | `@angular/platform-browser` | Enable non-destructive hydration |
| `withComponentInputBinding()` | `@angular/router` | Route param to `@Input()` binding |
| `@Input({ required: true })` | `@angular/core` | Mark input as required |
| `@Input({ transform })` | `@angular/core` | Transform input values (e.g., `booleanAttribute`) |
| `provideRouter()` | `@angular/router` | Standalone router provider |
| `provideHttpClient()` | `@angular/common/http` | Standalone HTTP provider |
| `provideAnimations()` | `@angular/platform-browser/animations` | Standalone animations provider |

## Migration Steps

1. Update Node.js to 16.14+ or 18.10+
2. Update TypeScript to 4.9.3+
3. Run `ng update @angular/core@16 @angular/cli@16`
4. Remove any `entryComponents` arrays
5. Remove `BrowserModule.withServerTransition()` calls
6. Replace with `provideClientHydration()` for SSR apps
7. Update Zone.js to 0.13.x
8. Optional: Start adopting signals for new reactive state
9. Optional: Try esbuild builder in `angular.json` (`"builder": "@angular-devkit/build-angular:application"`)
