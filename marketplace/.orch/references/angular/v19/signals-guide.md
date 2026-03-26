# Signals Guide
Source: https://angular.dev/guide/signals
Last refreshed: 2026-03-24

## Core APIs

### signal() - Writable State

```typescript
import { signal } from '@angular/core';

const count = signal(0);           // WritableSignal<number>
count();                           // Read: 0
count.set(5);                      // Set: 5
count.update(v => v + 1);         // Update: 6

// With custom equality
const users = signal<User[]>([], { equal: (a, b) => deepEqual(a, b) });

// Expose as readonly
const readonlyCount = count.asReadonly(); // Signal<number> (no set/update)
```

### computed() - Derived State

```typescript
import { signal, computed } from '@angular/core';

const price = signal(100);
const qty = signal(2);
const total = computed(() => price() * qty());  // Signal<number>

total(); // 200 (lazily evaluated, memoized)
```

- Read-only (no `.set()` or `.update()`)
- Lazily evaluated on first read
- Memoized: recalculates only when dependencies change
- Dynamic dependency tracking

### effect() - Side Effects

```typescript
import { signal, effect } from '@angular/core';

const query = signal('');

effect(() => {
  console.log('Search query:', query());
  // Runs whenever query changes
});
```

Use for: logging, DOM manipulation, external API calls, analytics, localStorage sync.

**Cleanup:**
```typescript
effect((onCleanup) => {
  const timer = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(timer));
});
```

**Untracked reads:**
```typescript
import { untracked } from '@angular/core';

effect(() => {
  const q = query();  // tracked
  const theme = untracked(() => themeSignal());  // NOT tracked
});
```

## Component Signals

### input() - Input Signals

```typescript
import { input } from '@angular/core';

// Optional with default
label = input('Submit');              // InputSignal<string>

// Required
userId = input.required<string>();    // InputSignal<string>

// With transform
disabled = input(false, { transform: booleanAttribute });

// With alias
name = input('', { alias: 'userName' });

// Read in template or code
template: `<button>{{ label() }}</button>`
```

### output() - Output Signals

```typescript
import { output } from '@angular/core';

saved = output<User>();        // OutputEmitterRef<User>
closed = output<void>();       // OutputEmitterRef<void>

// Emit
this.saved.emit(user);
this.closed.emit();
```

Parent:
```html
<app-editor (saved)="onSave($event)" (closed)="onClose()" />
```

### model() - Two-Way Binding

```typescript
import { model } from '@angular/core';

// Optional with default
value = model('');                     // ModelSignal<string>

// Required
count = model.required<number>();      // ModelSignal<number>

// Read + Write
this.value();          // read
this.value.set('hi');  // write (emits to parent)
this.value.update(v => v.toUpperCase());
```

Parent:
```html
<app-input [(value)]="searchQuery" />
```

## Advanced Signals

### linkedSignal() - Dependent Writable State

```typescript
import { signal, linkedSignal } from '@angular/core';

const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts) => opts[0],  // reset to first when options change
});

selected();           // 'a'
selected.set('b');    // writable override
options.set(['x', 'y']); // selected resets to 'x'
```

Shorthand:
```typescript
const selected = linkedSignal(() => options()[0]);
```

### resource() - Async Data Loading

```typescript
import { resource, signal } from '@angular/core';

const userId = signal(1);

const user = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/users/${request.id}`, { signal: abortSignal });
    return res.json();
  },
});

// Reactive state
user.value();      // User | undefined
user.isLoading();  // boolean
user.error();      // unknown | undefined
user.status();     // 'idle' | 'loading' | 'resolved' | 'error' | 'reloading'

// Manual control
user.reload();
```

### rxResource() - Observable-based resource

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

const user = rxResource({
  request: () => ({ id: userId() }),
  loader: ({ request }) => this.http.get<User>(`/api/users/${request.id}`),
});
```

## RxJS Interop

### toSignal() - Observable to Signal

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

// With initial value
ticks = toSignal(interval(1000), { initialValue: 0 });

// From HTTP (undefined until first emit)
users = toSignal(this.http.get<User[]>('/api/users'));

// With requireSync for synchronous observables
route = toSignal(this.route.paramMap, { requireSync: true });
```

### toObservable() - Signal to Observable

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

query = signal('');

results$ = toObservable(this.query).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.searchService.search(q)),
);
```

## Migration: BehaviorSubject to Signals

### Before (RxJS)

```typescript
@Injectable({ providedIn: 'root' })
export class CounterService {
  private count$ = new BehaviorSubject(0);
  readonly count = this.count$.asObservable();
  increment() { this.count$.next(this.count$.value + 1); }
}

// Component
export class MyComponent {
  count$ = inject(CounterService).count;
  // Template: {{ count$ | async }}
}
```

### After (Signals)

```typescript
@Injectable({ providedIn: 'root' })
export class CounterService {
  private _count = signal(0);
  readonly count = this._count.asReadonly();
  increment() { this._count.update(v => v + 1); }
}

// Component
export class MyComponent {
  count = inject(CounterService).count;
  // Template: {{ count() }}
}
```

## Signals vs Observables

| Aspect | Signals | Observables |
|---|---|---|
| Read value | Synchronous: `sig()` | Async: `subscribe()` / `async` pipe |
| Change detection | Automatic, fine-grained | Requires `async` pipe or manual |
| State model | Current value always available | Push-based stream |
| Composition | `computed()`, `linkedSignal()` | `pipe()` operators |
| Async operations | `resource()` / `rxResource()` | Native |
| Cleanup | Automatic | Manual unsubscribe |
| Learning curve | Lower | Higher |

**Use signals for:** component state, input/output, computed UI values, simple service state.

**Use observables for:** HTTP requests, WebSocket streams, complex async workflows, combining multiple event streams, debounce/throttle.

## Type Checking Utilities

```typescript
import { isSignal, isWritableSignal } from '@angular/core';

isSignal(count);          // true for any signal
isWritableSignal(count);  // true only for WritableSignal
isSignal(computed(...));  // true
isWritableSignal(computed(...)); // false
```

## Reactive Contexts (Where signals are tracked)

- `computed()` derivation function
- `effect()` callback
- `linkedSignal()` computation
- `resource()` request function
- Component templates
- `afterRenderEffect()` callback

Outside these contexts, reading a signal just returns the value without tracking.
