---
name: angular-refactor
description: "Modernize Angular code to current v19 best practices — improve readability, apply current conventions, replace deprecated patterns. Targeted improvements to individual files or modules, not full project migrations. Use when cleaning up or modernizing specific code."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/best-practices.md
  - references/angular/v19/state-management-guide.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Applies targeted modernization to Angular code. Unlike `/angular-migrate-*` skills that perform project-wide transformations, this skill focuses on improving individual files or small modules to follow current v19 conventions. It reads the code, identifies outdated patterns, applies improvements, and verifies nothing breaks.

## Inputs

- **Target** — File path, component name, service name, or module to refactor.
- **Focus** (optional) — Specific concern: `readability`, `performance`, `conventions`, `types`, or `all` (default).
- **Dry run** (optional) — `--dry-run` to show proposed changes without applying them.

## Steps

1. **Read the target file(s).** Understand the current code, its purpose, and dependencies.

2. **Load reference.** Read [references/angular/v19/best-practices.md](references/angular/v19/best-practices.md) and [references/angular/v19/state-management-guide.md](references/angular/v19/state-management-guide.md) for current conventions and patterns.

3. **Identify modernization opportunities.** Check for each pattern and apply the transformation:

   | Old Pattern | Modern Pattern | Priority |
   |------------|---------------|----------|
   | Constructor injection | `inject()` function | High |
   | `@Input()` / `@Output()` decorators | `input()` / `output()` signals | High |
   | `ngOnInit` + `subscribe()` | `effect()` or `computed()` | High |
   | `ngOnChanges` | Signal inputs with `computed()` / `effect()` | High |
   | `*ngIf` / `*ngFor` in templates | `@if` / `@for` control flow | High |
   | Mutable class properties | `signal()` for reactive state | Medium |
   | Large component (300+ lines) | Extract child components | Medium |
   | Inline template logic | Pipe or `computed()` signal | Medium |
   | `any` type | Proper interface or type alias | Medium |
   | `console.log` | `LoggingService` from `@yourorg/elevate` | Medium |
   | Manual `unsubscribe` / `takeUntil` | Signals (auto-cleanup) or `DestroyRef` | Medium |
   | Class-based guards/resolvers | Functional guards/resolvers | Low |
   | `NgModule` imports for single component | Standalone with direct imports | Low |
   | Verbose `switch` statements | Mapped object or strategy pattern | Low |

   **Concrete before/after for each high-priority transformation:**

   ---

   **Constructor injection -> inject():**
   ```typescript
   // BEFORE
   @Component({ ... })
   export class TradeComponent {
     constructor(
       private tradeService: TradeService,
       private router: Router,
       private logger: LoggingService,
     ) {}
   }

   // AFTER
   @Component({ ... })
   export class TradeComponent {
     private readonly tradeService = inject(TradeService);
     private readonly router = inject(Router);
     private readonly logger = inject(LoggingService);
   }
   ```

   ---

   **@Input()/@Output() decorators -> input()/output() signals:**
   ```typescript
   // BEFORE
   @Component({ ... })
   export class TradeCardComponent {
     @Input() trade!: Trade;
     @Input() showDetails = false;
     @Output() tradeSelected = new EventEmitter<Trade>();
     @Output() tradeDeleted = new EventEmitter<string>();

     onSelect(): void {
       this.tradeSelected.emit(this.trade);
     }
   }

   // AFTER
   @Component({ ... })
   export class TradeCardComponent {
     /** The trade to display. */
     readonly trade = input.required<Trade>();

     /** Whether to show expanded details. */
     readonly showDetails = input<boolean>(false);

     /** Emitted when the user selects this trade. */
     readonly tradeSelected = output<Trade>();

     /** Emitted when the user deletes this trade. */
     readonly tradeDeleted = output<string>();

     onSelect(): void {
       this.tradeSelected.emit(this.trade());
     }
   }
   ```

   Note: After converting to signal inputs, all template references change from `trade` to `trade()` and all TypeScript references use the function call syntax.

   ---

   **NgModule -> standalone component:**
   ```typescript
   // BEFORE — NgModule-based component
   // trade-card.module.ts
   @NgModule({
     declarations: [TradeCardComponent],
     imports: [CommonModule, MatIconModule, SharedPipesModule],
     exports: [TradeCardComponent],
   })
   export class TradeCardModule {}

   // trade-card.component.ts
   @Component({
     selector: 'app-trade-card',
     templateUrl: './trade-card.component.html',
   })
   export class TradeCardComponent { ... }

   // AFTER — standalone component (delete the module file)
   @Component({
     selector: 'app-trade-card',
     standalone: true,
     imports: [MatIconModule, CurrencyPipe, DatePipe],
     templateUrl: './trade-card.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
   })
   export class TradeCardComponent { ... }
   ```

   ---

   ***ngIf/*ngFor -> @if/@for control flow:**
   ```html
   <!-- BEFORE -->
   <div *ngIf="trades$ | async as trades; else loading">
     <div *ngFor="let trade of trades; trackBy: trackBySymbol">
       <span *ngIf="trade.status === 'filled'; else pending">
         Filled: {{ trade.symbol }}
       </span>
       <ng-template #pending>
         <span>Pending: {{ trade.symbol }}</span>
       </ng-template>
     </div>
   </div>
   <ng-template #loading>
     <div class="spinner">Loading...</div>
   </ng-template>

   <!-- AFTER -->
   @if (trades(); as trades) {
     @for (trade of trades; track trade.symbol) {
       @if (trade.status === 'filled') {
         <span>Filled: {{ trade.symbol }}</span>
       } @else {
         <span>Pending: {{ trade.symbol }}</span>
       }
     } @empty {
       <div>No trades found.</div>
     }
   } @else {
     <div class="spinner">Loading...</div>
   }
   ```

   ---

   **subscribe() -> signals with computed()/effect():**
   ```typescript
   // BEFORE — manual subscription with cleanup
   @Component({ ... })
   export class DashboardComponent implements OnInit, OnDestroy {
     trades: Trade[] = [];
     filteredTrades: Trade[] = [];
     filterTerm = '';
     private destroy$ = new Subject<void>();

     constructor(private tradeService: TradeService) {}

     ngOnInit(): void {
       this.tradeService.getTrades().pipe(
         takeUntil(this.destroy$),
       ).subscribe(trades => {
         this.trades = trades;
         this.filteredTrades = trades.filter(t => t.symbol.includes(this.filterTerm));
       });
     }

     onFilterChange(term: string): void {
       this.filterTerm = term;
       this.filteredTrades = this.trades.filter(t => t.symbol.includes(term));
     }

     ngOnDestroy(): void {
       this.destroy$.next();
       this.destroy$.complete();
     }
   }

   // AFTER — signals, no manual cleanup needed
   @Component({ ... })
   export class DashboardComponent {
     private readonly tradeService = inject(TradeService);

     /** All trades loaded from the service. */
     readonly trades = toSignal(this.tradeService.getTrades(), { initialValue: [] });

     /** Current filter term entered by the user. */
     readonly filterTerm = signal('');

     /** Trades filtered by the current filter term. */
     readonly filteredTrades = computed(() =>
       this.trades().filter(t => t.symbol.includes(this.filterTerm())),
     );

     onFilterChange(term: string): void {
       this.filterTerm.set(term);
     }
   }
   ```

   ---

   **ngOnChanges -> computed() with signal inputs:**
   ```typescript
   // BEFORE
   @Component({ ... })
   export class PriceBadgeComponent implements OnChanges {
     @Input() price!: number;
     @Input() previousPrice!: number;
     priceDirection: 'up' | 'down' | 'flat' = 'flat';
     formattedChange = '';

     ngOnChanges(changes: SimpleChanges): void {
       if (changes['price'] || changes['previousPrice']) {
         if (this.price > this.previousPrice) {
           this.priceDirection = 'up';
         } else if (this.price < this.previousPrice) {
           this.priceDirection = 'down';
         } else {
           this.priceDirection = 'flat';
         }
         this.formattedChange = `${((this.price - this.previousPrice) / this.previousPrice * 100).toFixed(2)}%`;
       }
     }
   }

   // AFTER — computed signals auto-update when inputs change
   @Component({ ... })
   export class PriceBadgeComponent {
     readonly price = input.required<number>();
     readonly previousPrice = input.required<number>();

     readonly priceDirection = computed<'up' | 'down' | 'flat'>(() => {
       const current = this.price();
       const previous = this.previousPrice();
       if (current > previous) return 'up';
       if (current < previous) return 'down';
       return 'flat';
     });

     readonly formattedChange = computed(() => {
       const change = (this.price() - this.previousPrice()) / this.previousPrice() * 100;
       return `${change.toFixed(2)}%`;
     });
   }
   ```

4. **Present findings.** If not `--dry-run`, show the list of proposed changes and their rationale.

5. **Apply changes.** For each identified pattern:
   - Apply the modern equivalent using the transformations above.
   - Preserve behavior (refactoring must not change functionality).
   - Update related tests if they reference changed APIs.
   - When converting to signal inputs, update all template references to use `()` call syntax.
   - When removing NgModules, update all consumer imports to reference the standalone component directly.

6. **Run build verification.** Execute `ng build` to confirm compilation.

7. **Run tests.** Execute `ng test` for the affected files to confirm no regressions.

8. **Report results.**

## Output

```markdown
## Refactor Complete — {target}

| Pattern | Old | New | Occurrences |
|---------|-----|-----|-------------|
| DI style | constructor injection | inject() | {n} |
| Inputs | @Input() | input() / input.required() | {n} |
| Outputs | @Output() + EventEmitter | output() | {n} |
| Control flow | *ngIf/*ngFor | @if/@for | {n} |
| State | mutable property | signal() | {n} |
| Derived state | ngOnChanges | computed() | {n} |
| Subscriptions | subscribe + takeUntil | toSignal() | {n} |
| Module | NgModule | standalone: true | {n} |

Files modified: {n}
Lines changed: +{added} / -{removed}
Build: {pass|fail}
Tests: {pass|fail}
```

## Validation

- `ng build` passes after all changes.
- All `ng test` specs pass (no regressions).
- Refactored file is same length or shorter (should not add complexity).
- No behavior changes (pure refactoring).
- Linter passes with no new warnings.
- All public APIs retain TSDoc (update if signatures changed).
- No `any` types introduced during refactoring.
- All signal input references in templates use `()` call syntax.
- No orphaned NgModule files remain after standalone conversion.
- No `Subject` / `takeUntil` / `ngOnDestroy` patterns remain where `toSignal` was applied.
