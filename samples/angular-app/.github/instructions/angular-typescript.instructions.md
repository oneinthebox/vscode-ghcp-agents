---
description: "Angular, TypeScript, HTML, and SCSS coding standards for enterprise applications. Covers Angular v17-v19, component architecture, RxJS, state management, testing, accessibility, and clean code practices."
applyTo: "**/*.ts, **/*.html, **/*.scss, **/*.spec.ts"
---

## Angular Version Detection

Check `package.json` for `@angular/core` version to determine which patterns apply. When version is ambiguous, prefer the newer pattern.

---

## HTML Best Practices (Templates)

### 1. Use semantic HTML elements
Use `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<aside>` instead of generic `<div>` containers.

### 2. Use control flow syntax on Angular 18+
```html
<!-- ✅ Angular 18+ -->
@if (user) {
  <app-user-profile [user]="user" />
}

<!-- ❌ Avoid on Angular 18+ -->
<app-user-profile *ngIf="user" [user]="user"></app-user-profile>
```
On Angular 17, `*ngIf`/`*ngFor` are acceptable. Flag for migration on 18+.

### 3. Use trackBy with @for (or *ngFor)
```html
<!-- ✅ -->
@for (trade of trades; track trade.id) {
  <app-trade-row [trade]="trade" />
}

<!-- ❌ Missing track expression -->
@for (trade of trades; track $index) {
  <!-- $index is a last resort — prefer a unique identifier -->
}
```

### 4. Use async pipe over manual subscription in templates
```html
<!-- ✅ -->
@if (user$ | async; as user) {
  <span>{{ user.name }}</span>
}

<!-- ❌ Don't subscribe in component and bind to a property -->
<span>{{ userName }}</span>
```

### 5. Self-closing tags for void components
```html
<!-- ✅ -->
<app-icon [name]="'trade'" />
<input type="text" />

<!-- ❌ -->
<app-icon [name]="'trade'"></app-icon>
```

### 6. Max template complexity — extract to methods or pipes
If a template expression has more than one ternary or two method calls, extract to a computed signal, getter, or pipe. Templates should be readable without tracing logic.

### 7. Attribute ordering convention
Order attributes consistently: structural directives → inputs → outputs → native attributes → aria.
```html
<app-trade-card
  @if (trade.isActive)
  [trade]="trade"
  [highlighted]="isSelected"
  (click)="onSelect(trade)"
  class="trade-card"
  role="listitem"
  aria-label="Trade {{ trade.id }}"
/>
```

### 8. No inline styles
Never use `[style]` or `style=""` in templates. Use CSS classes or `:host` styles.

### 9. Use ng-container for structural logic without extra DOM
```html
<!-- ✅ No extra DOM element -->
<ng-container *ngIf="showHeader">
  <h2>{{ title }}</h2>
  <p>{{ subtitle }}</p>
</ng-container>
```

### 10. Accessibility — always provide text alternatives
- Every `<img>` must have `alt`
- Every interactive element must be keyboard-accessible
- Every icon-only button must have `aria-label`
- Use `role` attributes where semantic HTML isn't sufficient

### 11. No hardcoded text strings in templates
Use i18n attributes or a translation service. Hardcoded English strings block localization.

---

## CSS / SCSS Best Practices

### 1. Use component-scoped styles (ViewEncapsulation default)
Never set `ViewEncapsulation.None` unless absolutely necessary (theme overrides only). Component styles should not leak.

### 2. Use CSS custom properties for theming
```scss
// ✅ Use HDS design tokens
.trade-card {
  background: var(--hds-surface-primary);
  color: var(--hds-text-primary);
  border-radius: var(--hds-border-radius-md);
}

// ❌ Hardcoded values
.trade-card {
  background: #ffffff;
  color: #333333;
  border-radius: 8px;
}
```

### 3. Use the @yourorg/hds design tokens
Always use HDS design tokens (`--hds-*`) over raw values. This ensures theme consistency.

### 4. No `!important`
If specificity is a problem, restructure selectors. `!important` indicates a CSS architecture issue.

### 5. Mobile-first responsive design
```scss
// ✅ Mobile-first
.container {
  padding: var(--hds-spacing-sm);

  @media (min-width: 768px) {
    padding: var(--hds-spacing-md);
  }

  @media (min-width: 1200px) {
    padding: var(--hds-spacing-lg);
  }
}
```

### 6. BEM naming for custom classes
```scss
// ✅ BEM
.trade-card { }
.trade-card__header { }
.trade-card__header--highlighted { }

// ❌ Generic / nested
.card .header.active { }
```

### 7. Max nesting depth: 3 levels
Deeply nested SCSS is hard to maintain and indicates over-specificity.

### 8. No magic numbers
```scss
// ✅
margin-top: var(--hds-spacing-md);
width: 100%;
max-width: var(--hds-container-max-width);

// ❌
margin-top: 17px;
width: 347px;
```

### 9. Use `:host` for component root styling
```scss
// ✅
:host {
  display: block;
  padding: var(--hds-spacing-md);
}

// ❌ Wrapping everything in a root div and styling that
```

### 10. Prefer flexbox/grid over floats and absolute positioning
Modern layout should use CSS Grid for page layout and Flexbox for component layout.

---

## Angular / TypeScript Best Practices

### 1. Standalone components (Angular 18+, opt-in on 17)
```typescript
// ✅
@Component({
  selector: 'app-trade-list',
  standalone: true,
  imports: [CommonModule, TradeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trade-list.component.html'
})
export class TradeListComponent { }
```

### 2. OnPush change detection for every component
No exceptions. Use OnPush + async pipe + signals for predictable rendering.

### 3. Use inject() over constructor injection (Angular 18+)
```typescript
// ✅ Angular 18+
export class TradeService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
}

// ✅ Angular 17 — constructor injection is acceptable
export class TradeService {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService
  ) {}
}
```

### 4. No `any` type — ever
Use `unknown` for truly unknown types, or define a proper interface. `any` bypasses TypeScript's entire value.

### 5. Use interfaces over classes for data models
```typescript
// ✅
export interface Trade {
  id: string;
  instrument: string;
  quantity: number;
  side: 'buy' | 'sell';
  status: TradeStatus;
}

// ❌ Classes for data — unnecessary overhead
export class Trade {
  constructor(public id: string, ...) {}
}
```

### 6. Use const objects over enums
```typescript
// ✅
export const TradeStatus = {
  Pending: 'pending',
  Executed: 'executed',
  Cancelled: 'cancelled'
} as const;
export type TradeStatus = typeof TradeStatus[keyof typeof TradeStatus];

// ❌ TypeScript enums have surprising behavior
export enum TradeStatus { Pending, Executed, Cancelled }
```

### 7. Strict null checks — handle nullability explicitly
```typescript
// ✅
function getTrade(id: string): Trade | undefined {
  return this.trades.find(t => t.id === id);
}

// Use it
const trade = getTrade(id);
if (trade) {
  // trade is narrowed to Trade
}
```

### 8. Use readonly where possible
```typescript
// ✅
private readonly trades = signal<Trade[]>([]);
private readonly destroy$ = new Subject<void>();
```

### 9. Max file length: 300 lines
If a file exceeds 300 lines, it's doing too much. Extract into smaller components, services, or utilities.

### 10. Single responsibility — one component/service per file
Never define multiple components or services in a single file.

### 11. Lazy-load every feature route
```typescript
// ✅
export const routes: Routes = [
  {
    path: 'trades',
    loadComponent: () => import('./trade-list.component').then(m => m.TradeListComponent)
  }
];

// ❌ Eagerly imported
import { TradeListComponent } from './trade-list.component';
{ path: 'trades', component: TradeListComponent }
```

### 12. No hardcoded API URLs or environment values in services
Use `@yourorg/elevate` ConfigService for all configuration.
```typescript
// ✅
private readonly apiUrl = inject(ConfigService).get('tradeApi.baseUrl');

// ❌
private readonly apiUrl = 'https://api.internal.com/v2/trades';
```

---

## RxJS Best Practices

### 1. Use async pipe — never subscribe in components
```typescript
// ✅
trades$ = this.tradeService.getTrades();
// In template: trades$ | async

// ❌
trades: Trade[] = [];
ngOnInit() {
  this.tradeService.getTrades().subscribe(t => this.trades = t);
}
```

### 2. Use takeUntilDestroyed() for service subscriptions (Angular 16+)
```typescript
// ✅
export class TradeMonitor {
  private readonly destroyRef = inject(DestroyRef);

  startMonitoring() {
    this.priceStream$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(price => this.processPrice(price));
  }
}
```

### 3. Prefer switchMap for API calls, exhaustMap for form submissions
```typescript
// ✅ switchMap — cancel previous request when new search term arrives
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  switchMap(term => this.searchService.search(term))
);

// ✅ exhaustMap — ignore clicks while request is in flight
this.submitClick$.pipe(
  exhaustMap(() => this.tradeService.createTrade(this.form.value))
);
```

### 4. Use shareReplay for shared observables
```typescript
// ✅
readonly user$ = this.authService.getUser().pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

### 5. Never nest subscribes
```typescript
// ❌
this.userService.getUser().subscribe(user => {
  this.tradeService.getTrades(user.id).subscribe(trades => { ... });
});

// ✅
this.userService.getUser().pipe(
  switchMap(user => this.tradeService.getTrades(user.id))
);
```

---

## State Management

### For Angular 19 (new code)
Use **Angular signals** for local component state. Use **NgRx SignalStore** for shared/complex state.

### For Angular 17-18 (existing code)
Existing NgRx classic (store + effects + selectors) is acceptable. Don't force migration to signals unless upgrading.

### For simple state
A service with a BehaviorSubject or signal is fine. Don't over-engineer with NgRx for simple CRUD.

---

## Testing Best Practices

### 1. Jest for all unit tests
Use `jest-preset-angular` for setup. No Karma.

### 2. Test behavior, not implementation
```typescript
// ✅ Test what the user sees
it('should display trade list after loading', async () => {
  const trades = [mockTrade()];
  tradeService.getTrades.mockReturnValue(of(trades));
  fixture.detectChanges();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

// ❌ Test internal state
it('should set trades array', () => {
  component.ngOnInit();
  expect(component.trades).toEqual([...]);
});
```

### 3. Use ng-mocks for dependency mocking
```typescript
// ✅
const fixture = MockRender(TradeListComponent, {}, {
  providers: [
    MockProvider(TradeService, {
      getTrades: () => of(mockTrades)
    })
  ]
});
```

### 4. One assertion per test (guideline, not rule)
If a test needs 5 assertions, it might be testing too many things.

### 5. Use data-testid for e2e selectors
```html
<button data-testid="submit-trade" (click)="onSubmit()">Submit</button>
```
Playwright/Cypress should select by `data-testid`, not CSS class or text content.

### 6. Playwright for new e2e tests, Cypress for existing
Don't migrate existing Cypress tests unless they need significant changes. New e2e tests use Playwright. Use `/angular-migrate-playwright` skill for bulk migration.

---

## Internal Library Usage (@yourorg)

### Always prefer @yourorg components
| Need | Use | Not |
|------|-----|-----|
| Buttons, inputs, forms | `@yourorg/elevate-common` | Raw HTML or Material |
| Data tables | `@yourorg/hds` themed AG Grid | Raw `ag-grid-angular` |
| Charts | `@yourorg/hds` themed Plotly | Raw `angular-plotly.js` |
| Theming / tokens | `@yourorg/hds` CSS variables | Hardcoded colors/spacing |
| Auth / login | `@yourorg/elevate` AuthModule | Custom auth implementation |
| Logging | `@yourorg/elevate` LoggingService | `console.log` |
| Config | `@yourorg/elevate` ConfigService | `environment.ts` files |
| Preferences | `@yourorg/elevate` PreferencesService | localStorage directly |

### Import from public API only
```typescript
// ✅
import { AuthService } from '@yourorg/elevate';
import { ButtonComponent } from '@yourorg/elevate-common';
import { HdsThemeService } from '@yourorg/hds';

// ❌ Deep imports — breaks encapsulation
import { AuthService } from '@yourorg/elevate/src/lib/auth/auth.service';
```

---

## Nx Workspace Practices

### 1. Respect project boundaries
Don't import from other project's `src/` directly. Use the project's public API (barrel export).

### 2. Use Nx generators for new code
```bash
nx generate @nx/angular:component trade-list --project=trade-app
```

### 3. Libraries for shared code
Shared code lives in `libs/`, not copied between apps.

### 4. Tags for dependency constraints
Respect `nx.json` enforce boundaries. Frontend apps should not import backend libs.

---

## Anti-Patterns to Flag (Warning, not Fail)

| Anti-pattern | Severity | Why |
|-------------|----------|-----|
| `any` type usage | Warning | Bypasses TypeScript safety |
| Manual `.subscribe()` in components | Warning | Memory leak risk, use async pipe |
| `setTimeout` / `setInterval` | Warning | Use RxJS `timer()` / `interval()` |
| Direct DOM manipulation (`document.querySelector`) | Warning | Use ViewChild/ElementRef |
| Hardcoded API URLs | Warning | Use ConfigService |
| `console.log` in production code | Warning | Use LoggingService |
| Nested subscribes | Warning | Use RxJS operators (switchMap, etc.) |
| `ViewEncapsulation.None` | Warning | Styles leak globally |
| Mutable state in services (non-signal/non-Subject) | Warning | Unpredictable state changes |
| Barrel files re-exporting everything (`index.ts`) | Info | Can cause circular deps and slow builds |
| `ngOnChanges` for complex logic | Info | Use signals or setters |
| Empty catch blocks | Warning | Silently swallows errors |
