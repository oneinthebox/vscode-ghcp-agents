# Architecture Patterns
Source: https://angular.dev/guide/architecture
Last refreshed: 2026-03-24

## Modules vs Standalone

| Aspect | NgModules (Legacy) | Standalone (Modern) |
|---|---|---|
| Declaration | `@NgModule({ declarations: [...] })` | `@Component({ imports: [...] })` |
| Dependency tracking | Implicit via module | Explicit per component |
| Lazy loading | `loadChildren: () => Module` | `loadComponent: () => Component` |
| Tree-shaking | Module-level | Component-level (better) |
| Boilerplate | High | Low |
| Default in v19+ | No | Yes |
| Recommended | No (legacy only) | Yes |

**Rule: All new code should use standalone components.**

## Application Architecture Layers

```
┌─────────────────────────────────────────────┐
│                 Routing Layer                │
│  (app.routes.ts, feature.routes.ts)         │
├─────────────────────────────────────────────┤
│              Page Components                 │
│  (Smart/Container — inject services)        │
├─────────────────────────────────────────────┤
│            Feature Components                │
│  (Business-specific UI)                     │
├─────────────────────────────────────────────┤
│            Shared UI Components              │
│  (Presentational — inputs/outputs only)     │
├─────────────────────────────────────────────┤
│              Service Layer                   │
│  (Data, State, Auth, Utility)               │
├─────────────────────────────────────────────┤
│            Core / Infrastructure             │
│  (Interceptors, Guards, Error Handling)     │
└─────────────────────────────────────────────┘
```

## Folder Structure

### Small App (<20 components)

```
src/app/
  components/
    header/
    sidebar/
  pages/
    home/
    about/
  services/
  app.component.ts
  app.config.ts
  app.routes.ts
```

### Medium App (20-100 components)

```
src/app/
  core/
    auth/
    interceptors/
    guards/
  shared/
    ui/
    pipes/
    directives/
    models/
  features/
    users/
      components/
      pages/
      user.service.ts
      user.model.ts
      users.routes.ts
    products/
      ...
    orders/
      ...
  app.component.ts
  app.config.ts
  app.routes.ts
```

### Large App / Monorepo (Nx)

```
apps/
  web-app/
    src/app/
      app.config.ts
      app.routes.ts
libs/
  shared/
    ui/           # Reusable UI components
    util/         # Utility functions
    models/       # Shared interfaces/types
  features/
    users/        # User feature library
    products/     # Product feature library
  data-access/
    user-api/     # HTTP services for users
    product-api/  # HTTP services for products
```

## Component Architecture

### Communication Patterns

| Pattern | Direction | Mechanism | Use Case |
|---|---|---|---|
| Input binding | Parent -> Child | `input()` | Pass data down |
| Output binding | Child -> Parent | `output()` | Emit events up |
| Two-way binding | Both | `model()` | Form controls |
| Service (signals) | Any -> Any | Shared `signal()` | Cross-component state |
| Service (observable) | Any -> Any | Shared `Subject` | Event streams |
| Router | Navigation | `Router.navigate()` | Page transitions |
| Content projection | Parent -> Child | `<ng-content>` | Layout composition |

### Smart vs Presentational

```typescript
// SMART: Knows about services and state
@Component({
  selector: 'app-order-page',
  imports: [OrderFormComponent, OrderSummaryComponent],
  template: `
    <app-order-form [products]="products()" (submit)="placeOrder($event)" />
    <app-order-summary [total]="total()" />
  `,
})
export class OrderPage {
  private orderService = inject(OrderService);
  products = this.orderService.products;
  total = this.orderService.total;

  placeOrder(order: Order) {
    this.orderService.submit(order);
  }
}

// PRESENTATIONAL: Pure input/output, no services
@Component({
  selector: 'app-order-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class OrderFormComponent {
  products = input.required<Product[]>();
  submit = output<Order>();
}
```

## Service Layer Patterns

### Data Access Service

```typescript
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_URL);

  getAll() { return this.http.get<User[]>(`${this.apiUrl}/users`); }
  getById(id: string) { return this.http.get<User>(`${this.apiUrl}/users/${id}`); }
  create(user: CreateUserDto) { return this.http.post<User>(`${this.apiUrl}/users`, user); }
  update(id: string, user: UpdateUserDto) { return this.http.put<User>(`${this.apiUrl}/users/${id}`, user); }
  delete(id: string) { return this.http.delete(`${this.apiUrl}/users/${id}`); }
}
```

### State Service (Signals)

```typescript
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private _users = signal<User[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private api = inject(UserApiService);

  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly count = computed(() => this._users().length);

  loadUsers() {
    this._loading.set(true);
    this._error.set(null);
    this.api.getAll().pipe(
      takeUntilDestroyed(),
    ).subscribe({
      next: (users) => { this._users.set(users); this._loading.set(false); },
      error: (err) => { this._error.set(err.message); this._loading.set(false); },
    });
  }
}
```

### State Service (resource)

```typescript
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private api = inject(UserApiService);
  private refresh = signal(0);

  users = rxResource({
    request: () => this.refresh(),
    loader: () => this.api.getAll(),
  });

  reload() { this.refresh.update(v => v + 1); }
}
```

## State Management Options

| Approach | Complexity | Use Case |
|---|---|---|
| Component signals | Low | Local component state |
| Service + signals | Low-Medium | Shared state across few components |
| `resource()` / `rxResource()` | Medium | Async data with loading/error states |
| NgRx SignalStore | Medium | Feature-level state with patterns |
| NgRx Store | High | Enterprise apps, complex state, time-travel debug |

### When to Use NgRx

- Multiple features reading/writing same state
- Complex async workflows (effects)
- Need for devtools / time-travel debugging
- Team convention requires it

### When Signals Suffice

- State is local to a feature or component tree
- Simple CRUD operations
- Small to medium app
- Team prefers less boilerplate

## Dependency Injection Hierarchy

```
Platform Injector (providedIn: 'platform')
  └── Root Injector (providedIn: 'root', bootstrapApplication providers)
        ├── Route Injector (route-level providers)
        │     └── Child Route Injector
        └── Component Injector (component-level providers)
              └── Child Component Injector
```

- Services default to root (singleton)
- Route providers create feature-scoped singletons
- Component providers create per-instance services

## Environment Configuration

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  features: { darkMode: true },
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.example.com',
  features: { darkMode: true },
};
```

Provide via InjectionToken:
```typescript
export const API_URL = new InjectionToken<string>('API_URL');

// app.config.ts
providers: [
  { provide: API_URL, useValue: environment.apiUrl },
]
```

## Error Handling Strategy

```typescript
// Global error handler
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggingService);

  handleError(error: unknown) {
    this.logger.error('Unhandled error', error);
    // Report to monitoring service
  }
}

// Provide
providers: [
  { provide: ErrorHandler, useClass: GlobalErrorHandler },
]
```

### HTTP Error Interceptor

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        inject(Router).navigate(['/login']);
      }
      inject(NotificationService).showError(`Request failed: ${error.status}`);
      return throwError(() => error);
    }),
  );
};
```
