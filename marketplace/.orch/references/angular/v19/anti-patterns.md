# Anti-Patterns
Source: Angular best practices knowledge
Last refreshed: 2026-03-24

## Anti-Pattern Reference Table

| Pattern | Why It's Bad | What to Do Instead | Severity |
|---|---|---|---|
| **Manual `.subscribe()` without cleanup** | Memory leaks, zombie subscriptions after component destroyed | `takeUntilDestroyed()`, `async` pipe, `toSignal()`, `DestroyRef` | Critical |
| **Default change detection** | Unnecessary re-renders on every event/timer, poor performance | `ChangeDetectionStrategy.OnPush` on all components | High |
| **Constructor injection** | Verbose with many deps, inheritance issues, not usable in functions | `inject()` function in field initializer | Medium |
| **`*ngIf` / `*ngFor` / `ngSwitch`** | Legacy syntax, requires `CommonModule` import, extra DOM wrappers | `@if` / `@for` / `@switch` (built-in control flow) | Medium |
| **NgModules in new code** | Unnecessary boilerplate, worse tree-shaking, implicit dependencies | Standalone components with explicit `imports` | High |
| **`console.log` for debugging** | Left in production, no structured logging, no log levels | Dedicated `LoggingService` with levels, error reporting service | Medium |
| **Hardcoded API URLs** | Different per environment, breaks deployment pipeline | `environment.ts` files + `InjectionToken` | High |
| **`*ngFor` without `trackBy`** | Full DOM re-render on every change, destroys/recreates elements | `@for (item of items; track item.id)` (track is required) | High |
| **Getter methods in templates** | Called every change detection cycle, no memoization | `computed()` signal (memoized, called only when deps change) | High |
| **Fat components (logic in component)** | Untestable, not reusable, violates SRP | Extract logic to services, keep components thin | Medium |
| **Importing `CommonModule`** | Imports everything (NgIf, NgFor, pipes, etc.) even if unused | Import only what you need, or use built-in control flow | Low |
| **Class-based interceptors** | Verbose, requires multi-provider registration | Functional interceptors with `withInterceptors([fn])` | Medium |
| **Class-based guards/resolvers** | Verbose, unnecessary class boilerplate | Functional guards (`CanActivateFn`) and resolvers (`ResolveFn`) | Medium |
| **`@Input()` / `@Output()` decorators** | Legacy, no signal reactivity, requires `ngOnChanges` for reactions | `input()`, `output()`, `model()` signal APIs | Medium |
| **`@ViewChild()` / `@ContentChild()` decorators** | Legacy, not signal-reactive | `viewChild()`, `contentChild()`, `viewChildren()`, `contentChildren()` | Medium |
| **BehaviorSubject for simple state** | Boilerplate (subject + observable + next), manual subscription mgmt | `signal()` + `computed()` + `asReadonly()` | Medium |
| **`ngOnChanges` to react to inputs** | Verbose, untyped `SimpleChanges`, legacy pattern | `input()` signals + `computed()` or `effect()` | Medium |
| **Shared mutable state** | Race conditions, unpredictable updates, hard to debug | Immutable updates with `signal.update()`, readonly exposure | High |
| **Deeply nested subscriptions** | Callback hell, hard to read, error-prone cleanup | RxJS operators (`switchMap`, `combineLatest`) or signals | High |
| **`any` type** | Defeats TypeScript, hides bugs, no autocomplete | Strict types, interfaces, generics, `unknown` for truly unknown | High |
| **Barrel files (`index.ts`) re-exporting everything** | Breaks tree-shaking, circular dependencies, slow builds | Direct imports from source files | Medium |
| **Business logic in templates** | Untestable, hard to read, recalculated every CD cycle | `computed()` signals or component methods | Medium |
| **Not using `strictTemplates`** | Template errors only caught at runtime | Enable `strictTemplates: true` in `angularCompilerOptions` | High |
| **Manual `ChangeDetectorRef.detectChanges()`** | Workaround for broken change detection, hides root cause | Fix the data flow: use `OnPush` + signals/async pipe properly | Medium |
| **Route-level `canLoad` guard** | Removed in Angular 20 | Use `canMatch` guard | High |
| **`HttpClientModule` import** | Legacy NgModule pattern | `provideHttpClient()` in app config | Medium |
| **`RouterModule.forRoot()`** | Legacy NgModule pattern | `provideRouter(routes)` in app config | Medium |
| **Large eager bundles** | Slow initial load, poor LCP | `loadComponent` for route-level lazy loading, `@defer` for below-fold | High |
| **Storing derived state** | Out-of-sync bugs, redundant memory, manual sync logic | `computed()` signals that auto-derive from source signals | Medium |
| **Type-based folder structure** | Components/ services/ pipes/ — hard to find related code | Feature-based folder structure | Low |

## Quick Decision Matrix

### Observable vs Signal

| Scenario | Use |
|---|---|
| Component state (counter, form, UI toggle) | `signal()` |
| Derived UI values (full name, totals) | `computed()` |
| HTTP request response | `rxResource()` or `toSignal(http.get())` |
| WebSocket / real-time stream | Observable + `toSignal()` |
| Debounce / throttle / complex async | Observable + operators |
| Shared service state | `signal()` in service |
| Cross-component events | `output()` or service with `Subject` |

### When to Extract to a Service

| Keep in Component | Extract to Service |
|---|---|
| UI state (dropdown open, tab index) | API calls |
| Form validation display logic | Business rules |
| Template event handlers | State management |
| Local computed values | Shared utility functions |
| Animation triggers | Auth / session logic |
