# Routing Guide
Source: https://angular.dev/guide/routing
Last refreshed: 2026-03-24

## Setup

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', component: NotFoundComponent },
];

// app.config.ts
import { provideRouter, withComponentInputBinding } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

## Route Object Properties

| Property | Type | Purpose |
|---|---|---|
| `path` | `string` | URL path segment |
| `component` | `Type<any>` | Eagerly loaded component |
| `loadComponent` | `() => Promise` | Lazy-loaded standalone component |
| `loadChildren` | `() => Promise` | Lazy-loaded child routes |
| `redirectTo` | `string` | Redirect target |
| `pathMatch` | `'full' \| 'prefix'` | Match strategy (use `'full'` with redirects) |
| `children` | `Routes` | Nested routes |
| `canActivate` | `CanActivateFn[]` | Access guards |
| `canActivateChild` | `CanActivateChildFn[]` | Child route guards |
| `canDeactivate` | `CanDeactivateFn[]` | Leave guards |
| `canMatch` | `CanMatchFn[]` | Route matching guards |
| `resolve` | `Record<string, ResolveFn>` | Data resolvers |
| `data` | `object` | Static route data |
| `title` | `string \| ResolveFn<string>` | Page title |
| `providers` | `Provider[]` | Route-scoped DI providers |

## Lazy Loading

### Single Component

```typescript
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
}
```

### Child Routes

```typescript
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

```typescript
// admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminDashboard },
  { path: 'users', component: AdminUsers },
  { path: 'settings', component: AdminSettings },
];
```

## Route Parameters

### Path Parameters

```typescript
{ path: 'user/:id', component: UserDetailComponent }
{ path: 'user/:id/:tab', component: UserDetailComponent }
```

Reading in component (with `withComponentInputBinding()`):
```typescript
export class UserDetailComponent {
  id = input.required<string>();  // bound from route param
}
```

Reading via ActivatedRoute:
```typescript
export class UserDetailComponent {
  private route = inject(ActivatedRoute);

  ngOnInit() {
    // Snapshot (non-reactive)
    const id = this.route.snapshot.paramMap.get('id');

    // Observable (reactive)
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
    });
  }
}
```

### Query Parameters

```typescript
// Navigate with query params
this.router.navigate(['/search'], { queryParams: { q: 'angular', page: 1 } });

// Read
export class SearchComponent {
  private route = inject(ActivatedRoute);
  query = toSignal(this.route.queryParamMap.pipe(
    map(params => params.get('q') ?? ''),
  ));
}
```

## Nested Routes

```typescript
const routes: Routes = [
  {
    path: 'product/:id',
    component: ProductComponent,
    children: [
      { path: '', redirectTo: 'info', pathMatch: 'full' },
      { path: 'info', component: ProductInfoComponent },
      { path: 'reviews', component: ProductReviewsComponent },
    ],
  },
];
```

Parent template must include `<router-outlet />`.

## Functional Guards

### canActivate

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
```

### canActivateChild

```typescript
export const adminChildGuard: CanActivateChildFn = (childRoute, state) => {
  const auth = inject(AuthService);
  return auth.hasRole('admin');
};
```

### canDeactivate

```typescript
export const unsavedChangesGuard: CanDeactivateFn<FormComponent> = (
  component, currentRoute, currentState, nextState,
) => {
  if (component.hasUnsavedChanges()) {
    return confirm('Discard unsaved changes?');
  }
  return true;
};
```

### canMatch

```typescript
export const featureGuard: CanMatchFn = (route, segments) => {
  return inject(FeatureService).isEnabled('newDashboard');
};

// Use for A/B routing
const routes: Routes = [
  { path: 'dashboard', component: NewDashboard, canMatch: [featureGuard] },
  { path: 'dashboard', component: OldDashboard },
];
```

### Apply Guards

```typescript
{
  path: 'admin',
  canActivate: [authGuard, adminGuard],
  canActivateChild: [adminChildGuard],
  children: [
    { path: '', component: AdminHome },
    { path: 'users', component: AdminUsers },
  ],
}
```

## Functional Resolvers

```typescript
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  const id = route.paramMap.get('id')!;
  return userService.getUser(id);
};

// Route config
{
  path: 'user/:id',
  component: UserDetailComponent,
  resolve: { user: userResolver },
}

// Component (with withComponentInputBinding)
export class UserDetailComponent {
  user = input.required<User>();  // resolved data bound as input
}
```

## Router Features (provideRouter options)

| Feature | Purpose |
|---|---|
| `withComponentInputBinding()` | Bind route params/data/resolve to component inputs |
| `withRouterConfig({...})` | Configure paramsInheritanceStrategy, onSameUrlNavigation |
| `withHashLocation()` | Use hash-based URLs |
| `withPreloading(PreloadAllModules)` | Preload lazy routes |
| `withDebugTracing()` | Log router events (dev only) |
| `withViewTransitions()` | Enable View Transitions API |

```typescript
provideRouter(
  routes,
  withComponentInputBinding(),
  withViewTransitions(),
  withPreloading(PreloadAllModules),
)
```

## Programmatic Navigation

```typescript
private router = inject(Router);

// Navigate by URL
this.router.navigate(['/user', userId]);
this.router.navigate(['/search'], { queryParams: { q: 'test' } });

// Navigate by URL string
this.router.navigateByUrl('/user/123');

// Relative navigation
this.router.navigate(['../sibling'], { relativeTo: this.route });
```

## Route Ordering (First-Match Wins)

```typescript
const routes: Routes = [
  { path: '', component: Home },
  { path: 'users/new', component: NewUser },      // Before :id
  { path: 'users/:id', component: UserDetail },
  { path: 'users', component: UserList },
  { path: '**', component: NotFound },             // Always last
];
```
