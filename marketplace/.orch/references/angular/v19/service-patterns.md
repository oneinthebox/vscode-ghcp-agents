# Service Patterns
Source: https://angular.dev/guide/di
Last refreshed: 2026-03-24

## Creating Services

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

## inject() vs Constructor Injection

### Modern: `inject()` (Preferred)

```typescript
@Component({...})
export class UserProfile {
  private userService = inject(UserService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
}
```

### Legacy: Constructor Injection

```typescript
@Component({...})
export class UserProfile {
  constructor(
    private userService: UserService,
    private router: Router,
  ) {}
}
```

### Comparison

| Feature | `inject()` | Constructor |
|---|---|---|
| Readability | Better with many deps | Verbose with many deps |
| Type inference | Full | Full |
| Usable in functions | Yes (guards, interceptors) | No |
| Inheritance | No super() issues | Requires super() forwarding |
| Tree-shaking | Same | Same |
| Field initializer | Yes | No (must assign in body) |

## `inject()` Valid Contexts

```typescript
// Class field initializer
export class MyComponent {
  private service = inject(MyService);          // OK
}

// Constructor body
export class MyComponent {
  constructor() {
    this.service = inject(MyService);           // OK
  }
}

// Factory function in provider
{ provide: TOKEN, useFactory: () => inject(Dep) } // OK

// Functional guard / interceptor / resolver
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);             // OK
  return auth.isAuthenticated();
};
```

## `providedIn` Options

| Value | Scope | Instance Count | Use Case |
|---|---|---|---|
| `'root'` | App-wide singleton | 1 | **Default for most services** |
| `'platform'` | Shared across apps | 1 per platform | Multi-app pages |
| `'any'` | Per lazy module | 1+ | Isolated module state |
| _(none)_ | Must provide manually | Depends | Component-scoped services |

## Provider Configuration

### Application-level

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    { provide: API_URL, useValue: environment.apiUrl },
  ],
});
```

### Route-level

```typescript
const routes: Routes = [
  {
    path: 'admin',
    providers: [AdminService, AdminGuard],
    children: [
      { path: '', component: AdminDashboard },
    ],
  },
];
```

### Component-level

```typescript
@Component({
  providers: [FormStateService],  // New instance per component
})
export class EditFormComponent {}
```

## HttpClient Patterns

### Setup

```typescript
provideHttpClient(
  withInterceptors([authInterceptor, loggingInterceptor]),
  withFetch(),  // Use fetch API instead of XMLHttpRequest
)
```

### GET

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  getProducts() {
    return this.http.get<Product[]>('/api/products');
  }

  getProduct(id: string) {
    return this.http.get<Product>(`/api/products/${id}`);
  }
}
```

### POST / PUT / DELETE

```typescript
createProduct(product: Product) {
  return this.http.post<Product>('/api/products', product);
}

updateProduct(id: string, product: Product) {
  return this.http.put<Product>(`/api/products/${id}`, product);
}

deleteProduct(id: string) {
  return this.http.delete(`/api/products/${id}`);
}
```

### Error Handling

```typescript
import { catchError, retry } from 'rxjs/operators';
import { throwError } from 'rxjs';

getProducts() {
  return this.http.get<Product[]>('/api/products').pipe(
    retry({ count: 2, delay: 1000 }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 404) {
        return of([]);
      }
      return throwError(() => new Error(`API error: ${error.status}`));
    }),
  );
}
```

### Caching with shareReplay

```typescript
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private config$ = this.http.get<AppConfig>('/api/config').pipe(
    shareReplay(1),
  );

  getConfig() {
    return this.config$;
  }
}
```

## Functional Interceptors

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const started = Date.now();
  return next(req).pipe(
    tap({
      next: () => console.log(`${req.method} ${req.url} - ${Date.now() - started}ms`),
      error: (err) => console.error(`${req.method} ${req.url} FAILED`, err),
    }),
  );
};

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({ count: 2, delay: 1000 }),
  );
};
```

Register:
```typescript
provideHttpClient(
  withInterceptors([authInterceptor, loggingInterceptor, retryInterceptor])
)
```

## Common Service Types

| Type | Purpose | Example |
|---|---|---|
| Data client | API communication | `UserService`, `ProductService` |
| State management | Shared state | `CartService` (with signals) |
| Auth | Tokens, guards | `AuthService` |
| Logging | Centralized errors | `LoggingService` |
| Utility | Reusable helpers | `DateFormatService` |

## State Service Pattern (Signals)

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);
  readonly cartItems = this.items.asReadonly();
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );
  readonly count = computed(() => this.items().length);

  addItem(item: CartItem) {
    this.items.update(items => [...items, item]);
  }

  removeItem(id: string) {
    this.items.update(items => items.filter(i => i.id !== id));
  }

  clear() {
    this.items.set([]);
  }
}
```

## InjectionToken

```typescript
import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');
export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS');

// Provide
providers: [
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: FEATURE_FLAGS, useFactory: () => inject(ConfigService).getFlags() },
]

// Consume
export class ApiService {
  private apiUrl = inject(API_URL);
}
```

## DestroyRef Pattern

```typescript
@Component({...})
export class SearchComponent {
  private destroyRef = inject(DestroyRef);
  private searchService = inject(SearchService);

  ngOnInit() {
    this.searchService.results$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => this.handleResults(results));
  }
}
```

Or in field initializer (injection context):
```typescript
export class SearchComponent {
  private results$ = inject(SearchService).results$.pipe(
    takeUntilDestroyed(),  // no arg needed in injection context
  );
}
```
