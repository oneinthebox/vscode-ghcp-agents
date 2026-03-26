# Component Patterns
Source: https://angular.dev/guide/components
Last refreshed: 2026-03-24

## Component Anatomy

```typescript
@Component({
  selector: 'user-profile',
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
  imports: [ProfilePhoto, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfile {
  readonly name = input.required<string>();
  readonly saved = output<void>();
  protected fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
}
```

All components are **standalone by default** in Angular 19+. No `standalone: true` needed.

## Lifecycle Hooks

| Hook | Timing | Common Use |
|---|---|---|
| `ngOnInit` | After first `ngOnChanges` | Fetch data, init logic |
| `ngOnChanges` | When input bindings change | React to input changes |
| `ngAfterViewInit` | After view and child views init | DOM queries |
| `ngAfterContentInit` | After projected content init | Content child access |
| `ngOnDestroy` | Before directive is destroyed | Cleanup subscriptions |
| `ngDoCheck` | Every change detection run | Custom change detection |
| `afterNextRender` | After next render (one-shot) | DOM measurement |
| `afterRender` | After every render | Sync DOM state |

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    // cleanup handled by DestroyRef or takeUntilDestroyed
  }
}
```

### Modern: `afterRenderEffect` (Angular 19+)

```typescript
export class ChartComponent {
  private color = signal('red');

  constructor() {
    afterRenderEffect(() => {
      document.body.style.backgroundColor = this.color();
    });
  }
}
```

## Input Signals

```typescript
// Optional with default
label = input('Click me');

// Required
userId = input.required<string>();

// With transform
disabled = input(false, { transform: booleanAttribute });

// With alias
name = input('', { alias: 'userName' });
```

Usage in template:
```html
<app-button [userId]="'123'" [label]="'Save'" />
```

## Output Signals

```typescript
countChanged = output<number>();
closed = output<void>();

// Emit
this.countChanged.emit(42);
this.closed.emit();
```

Parent:
```html
<app-counter (countChanged)="onCount($event)" (closed)="onClose()" />
```

## Model Signals (Two-Way Binding)

```typescript
// Child
count = model(0);
count = model.required<number>();

// Update
this.count.update(v => v + 1);
this.count.set(5);
```

Parent:
```html
<app-counter [(count)]="parentCount" />
```

## Change Detection

| Strategy | Behavior | When to Use |
|---|---|---|
| `Default` | Checks all components on every cycle | Prototyping |
| `OnPush` | Checks only when inputs/signals change, events fire, or async pipe emits | **Always use in production** |

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class MyComponent {}
```

OnPush triggers on:
- Input reference changes
- Signal value changes
- DOM events in the component
- `async` pipe emission
- `markForCheck()` call
- `effect()` writing to signals read in template

## Template Control Flow

### @if / @else

```html
@if (user()) {
  <p>Welcome, {{ user().name }}</p>
} @else {
  <p>Please log in</p>
}

@if (users$ | async; as users) {
  <ul>@for (u of users; track u.id) { <li>{{ u.name }}</li> }</ul>
}
```

### @for with track

```html
@for (item of items(); track item.id) {
  <app-card [data]="item" />
} @empty {
  <p>No items found</p>
}
```

Context variables: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count`

### @switch

```html
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <app-error [msg]="errorMsg()" /> }
  @case ('success') { <app-data [data]="data()" /> }
}
```

### @defer

```html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="chartData()" />
} @placeholder {
  <div class="chart-skeleton"></div>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart</p>
}
```

## Content Projection

### Single slot

```html
<!-- parent -->
<app-card><p>Projected content</p></app-card>

<!-- app-card template -->
<div class="card"><ng-content /></div>
```

### Named slots

```html
<!-- parent -->
<app-card>
  <h2 header>Title</h2>
  <p>Body content</p>
  <button footer>Action</button>
</app-card>

<!-- app-card template -->
<ng-content select="[header]" />
<ng-content />
<ng-content select="[footer]" />
```

## View Queries

```typescript
// Single child
chart = viewChild.required<ElementRef>('chartCanvas');
dialog = viewChild(DialogComponent);

// Multiple children
items = viewChildren(ItemComponent);

// Content projection queries
header = contentChild<ElementRef>('header');
tabs = contentChildren(TabComponent);
```

Usage:
```typescript
export class ChartComponent {
  canvas = viewChild.required<ElementRef>('chartCanvas');

  constructor() {
    afterRenderEffect(() => {
      const ctx = this.canvas().nativeElement.getContext('2d');
      // draw chart
    });
  }
}
```

## Component Property Ordering Convention

```typescript
@Component({...})
export class UserProfile {
  // 1. Angular-specific (inputs, outputs, queries)
  readonly userId = input.required<string>();
  readonly userSaved = output<void>();
  readonly avatar = viewChild<ElementRef>('avatar');

  // 2. Injected services
  private userService = inject(UserService);

  // 3. Computed / derived state
  protected fullName = computed(() => ...);

  // 4. Internal state
  private loading = signal(false);

  // 5. Lifecycle hooks
  ngOnInit() { ... }

  // 6. Public methods
  save() { ... }

  // 7. Private methods
  private validate() { ... }
}
```

## Standalone Component Imports

```typescript
@Component({
  selector: 'app-dashboard',
  imports: [
    // Components
    HeaderComponent,
    SidebarComponent,
    // Pipes
    DatePipe,
    CurrencyPipe,
    // Directives
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {}
```
