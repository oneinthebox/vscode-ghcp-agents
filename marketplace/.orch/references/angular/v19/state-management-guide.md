# Angular State Management — Complete Guide

Sources:
- https://angular.love/mastering-state-management-in-angular-with-ngrx-and-signals-scalable-predictable-performant
- https://angular.love/lightweight-port-and-adapter-pattern-for-ngrx-signal-store
- https://angular.love/breakthrough-in-state-management-discover-the-simplicity-of-signal-store-part-1
- https://angular.love/how-to-start-flying-with-angular-and-ngrx
- https://www.angulararchitects.io/en/blog/full-cycle-reativity-in-angular-signal-forms-signal-store-resources-mutation-api/
Last refreshed: 2026-03-25

---

## Decision Matrix: When to Use What

| Pattern | Best for | Complexity | Boilerplate | Angular version |
|---------|----------|-----------|-------------|-----------------|
| Component signals | Local component state | Low | None | 17+ |
| Service with signals | Shared state, simple apps | Low | Minimal | 17+ |
| NgRx Signal Store | Feature-level state, medium apps | Medium | Low | 17+ |
| NgRx Store (traditional) | Enterprise apps, complex state | High | High | Any |
| Resource API | Async data loading | Low | None | 19+ |
| Mutation API (NgRx Toolkit) | Server-side updates | Medium | Low | 19+ |
| Signal Forms | Reactive forms with signals | Low | None | 21+ |

## 1. Component Signals (Simplest)

```typescript
@Component({ ... })
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment() { this.count.update(v => v + 1); }
}
```

**Use when:** State is local to one component. No sharing needed.

## 2. Service with Signals (Shared State)

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>([]);

  items = this._items.asReadonly();
  total = computed(() => this._items().reduce((sum, i) => sum + i.price, 0));
  count = computed(() => this._items().length);

  add(item: CartItem) { this._items.update(items => [...items, item]); }
  remove(id: number) { this._items.update(items => items.filter(i => i.id !== id)); }
}
```

**Use when:** Multiple components share state. No complex async flows.

## 3. NgRx Signal Store (Recommended for Most Apps)

### Basic Store

```typescript
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

export const FundStore = signalStore(
  { providedIn: 'root' },
  withState({
    funds: [] as Fund[],
    selectedFundId: null as number | null,
    loading: false,
    error: null as string | null,
  }),
  withComputed(({ funds, selectedFundId }) => ({
    selectedFund: computed(() => funds().find(f => f.id === selectedFundId())),
    fundCount: computed(() => funds().length),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    loadFunds: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => http.get<Fund[]>('/api/funds')),
        tap(funds => patchState(store, { funds, loading: false })),
        catchError(err => {
          patchState(store, { error: err.message, loading: false });
          return EMPTY;
        }),
      ),
    ),
    selectFund(id: number) {
      patchState(store, { selectedFundId: id });
    },
  })),
);
```

### Store with Entities

```typescript
import { withEntities, setAllEntities, addEntity, removeEntity, updateEntity } from '@ngrx/signals/entities';

export const TradeStore = signalStore(
  withEntities<Trade>(),
  withMethods((store) => ({
    setTrades(trades: Trade[]) { patchState(store, setAllEntities(trades)); },
    addTrade(trade: Trade) { patchState(store, addEntity(trade)); },
    removeTrade(id: number) { patchState(store, removeEntity(id)); },
    updateTrade(id: number, changes: Partial<Trade>) {
      patchState(store, updateEntity({ id, changes }));
    },
  })),
);
```

### Using in Components

```typescript
@Component({ ... })
export class FundListComponent {
  private store = inject(FundStore);

  funds = this.store.funds;
  loading = this.store.loading;
  count = this.store.fundCount;

  constructor() {
    this.store.loadFunds();
  }

  onSelect(id: number) { this.store.selectFund(id); }
}
```

## 4. Port & Adapter Pattern (Clean Architecture)

For testable, swappable state management:

```typescript
// Port (interface)
export abstract class FundService {
  abstract funds: Signal<Fund[]>;
  abstract loading: Signal<boolean>;
  abstract loadFunds(): void;
  abstract selectFund(id: number): void;
}

// Adapter (implementation with Signal Store)
export const FundServiceAdapter = signalStore(
  withState({ funds: [] as Fund[], loading: false }),
  withMethods((store, http = inject(HttpClient)) => ({
    loadFunds: () => { /* implementation */ },
    selectFund: (id: number) => { /* implementation */ },
  })),
) satisfies Type<FundService>;

// Provide in app.config.ts
{ provide: FundService, useClass: FundServiceAdapter }
```

**Benefits:** Swap implementations for testing. Clean boundaries. Framework-agnostic business logic.

## 5. Traditional NgRx (Enterprise/Complex)

### Structure

```
store/
  fund.actions.ts     # Action definitions
  fund.reducer.ts     # State changes
  fund.effects.ts     # Side effects (HTTP calls)
  fund.selectors.ts   # Derived state
  fund.state.ts       # State interface
```

### Actions

```typescript
export const loadFunds = createAction('[Fund] Load Funds');
export const loadFundsSuccess = createAction('[Fund] Load Funds Success', props<{ funds: Fund[] }>());
export const loadFundsFailure = createAction('[Fund] Load Funds Failure', props<{ error: string }>());
```

### Reducer

```typescript
export const fundReducer = createReducer(
  initialState,
  on(loadFunds, (state) => ({ ...state, loading: true })),
  on(loadFundsSuccess, (state, { funds }) => ({ ...state, funds, loading: false })),
  on(loadFundsFailure, (state, { error }) => ({ ...state, error, loading: false })),
);
```

### Effects

```typescript
@Injectable()
export class FundEffects {
  loadFunds$ = createEffect(() => this.actions$.pipe(
    ofType(loadFunds),
    switchMap(() => this.http.get<Fund[]>('/api/funds').pipe(
      map(funds => loadFundsSuccess({ funds })),
      catchError(error => of(loadFundsFailure({ error: error.message }))),
    )),
  ));
}
```

**Use when:** Very large apps with complex state interactions, time-travel debugging needs, strict unidirectional data flow requirements.

## 6. Resource API (Angular 19+)

```typescript
@Component({ ... })
export class FundDetailComponent {
  private http = inject(HttpClient);
  fundId = input.required<number>();

  fund = resource({
    request: () => this.fundId(),
    loader: ({ request: id }) => this.http.get<Fund>(`/api/funds/${id}`),
  });

  // fund.value() — the loaded data
  // fund.isLoading() — loading state
  // fund.error() — error if failed
  // fund.reload() — manually refetch
}
```

**Use when:** Loading data that depends on a signal (route param, user selection). Replaces manual loading state management.

## 7. Full Reactive Cycle (Angular 21+ Cutting Edge)

```typescript
// Resource for reading
const fundResource = resource({
  request: () => this.fundId(),
  loader: ({ request: id }) => this.http.get<Fund>(`/api/funds/${id}`),
});

// Mutation for writing
const saveFund = mutation({
  mutator: (fund: Fund) => this.http.put(`/api/funds/${fund.id}`, fund),
  onSuccess: () => fundResource.reload(),
  onError: (err) => this.handleError(err),
  concurrency: switchOp, // cancel previous save if new one starts
});

// Signal form bound to resource data
const fundForm = linkedSignal(() => fundResource.value());
```

## Migration Path: NgRx Store → Signal Store

| Step | From | To |
|------|------|----|
| 1 | `createAction()` | Direct method calls |
| 2 | `createReducer()` | `withState()` + `patchState()` |
| 3 | `createEffect()` | `rxMethod()` in `withMethods()` |
| 4 | `createSelector()` | `withComputed()` |
| 5 | `Store.dispatch()` | `store.methodName()` |
| 6 | `Store.select()` | `store.signalName()` |

### Before (NgRx Store)

```typescript
this.store.dispatch(loadFunds());
this.funds$ = this.store.select(selectAllFunds);
```

### After (Signal Store)

```typescript
this.fundStore.loadFunds();
this.funds = this.fundStore.funds; // Signal, not Observable
```

## Anti-Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Massive global store | Context rot, hard to test | Feature-scoped stores |
| Store for everything | Over-engineering simple state | Component signals for local state |
| Manual subscribe in components | Memory leaks | Use signals or async pipe |
| Mutable state updates | Unpredictable behavior | Always use patchState or immutable updates |
| Effects calling effects | Circular dependencies | Keep effects independent, use actions |
| Selector without memoization | Performance | Use computed() or createSelector() |
