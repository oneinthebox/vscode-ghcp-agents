# Standalone Migration Guide
Source: https://angular.dev/reference/migrations/standalone
Last refreshed: 2026-03-24

## Overview

Standalone components remove the need for NgModules. Angular 19+ defaults to `standalone: true`. Migration can be done incrementally.

## Automated Migration

```bash
ng generate @angular/core:standalone
```

Run in order — each step builds on the previous:

| Step | What It Does |
|---|---|
| 1. Convert declarations | Adds `imports` to components, removes from NgModule `declarations` |
| 2. Remove empty NgModules | Deletes modules with no declarations, providers, or bootstrap |
| 3. Switch bootstrap API | Replaces `bootstrapModule()` with `bootstrapApplication()` |

## Step 1: Convert Components to Standalone

### Before

```typescript
// shared.module.ts
@NgModule({
  imports: [CommonModule],
  declarations: [GreeterComponent, HighlightDirective],
  exports: [GreeterComponent, HighlightDirective],
})
export class SharedModule {}

// greeter.component.ts
@Component({
  selector: 'app-greeter',
  template: `<div *ngIf="showGreeting">Hello</div>`,
  standalone: false,
})
export class GreeterComponent {
  showGreeting = true;
}
```

### After

```typescript
// shared.module.ts (still exists temporarily)
@NgModule({
  imports: [CommonModule, GreeterComponent, HighlightDirective],
  exports: [GreeterComponent, HighlightDirective],
})
export class SharedModule {}

// greeter.component.ts
@Component({
  selector: 'app-greeter',
  template: `<div *ngIf="showGreeting">Hello</div>`,
  imports: [NgIf],
})
export class GreeterComponent {
  showGreeting = true;
}
```

## Step 2: Remove Empty NgModules

Modules are removed if they have:
- No `declarations`
- No `providers`
- No `bootstrap`
- No `imports` with `ModuleWithProviders`
- No class members (empty constructors ignored)

### Before

```typescript
@NgModule({
  imports: [FooComponent, BarPipe],
  exports: [FooComponent, BarPipe],
})
export class ImporterModule {}
```

### After

```
// File deleted. Import sites updated to reference FooComponent and BarPipe directly.
```

## Step 3: Switch to bootstrapApplication

### Before

```typescript
// app.module.ts
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, RouterModule.forRoot(routes)],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent],
})
export class AppModule {}

// main.ts
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

### After

```typescript
// app.component.ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
  ],
};

// main.ts
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

## Provider Migration Map

| NgModule Import | Standalone Provider |
|---|---|
| `BrowserModule` | Not needed (auto with `bootstrapApplication`) |
| `HttpClientModule` | `provideHttpClient()` |
| `RouterModule.forRoot(routes)` | `provideRouter(routes)` |
| `BrowserAnimationsModule` | `provideAnimationsAsync()` |
| `NoopAnimationsModule` | `provideAnimationsAsync('noop')` |
| `HTTP_INTERCEPTORS` (class) | `withInterceptors([fn])` |
| `RouterModule.forChild(routes)` | `loadChildren: () => import('./x.routes')` |
| Custom module with `.forRoot()` | `importProvidersFrom(Module.forRoot())` |

## importProvidersFrom (Escape Hatch)

For third-party modules that haven't migrated to standalone providers:

```typescript
import { importProvidersFrom } from '@angular/core';
import { ThirdPartyModule } from 'third-party-lib';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(ThirdPartyModule.forRoot({ apiKey: '...' })),
  ],
};
```

## Route-Level Providers

```typescript
const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminComponent),
    providers: [
      AdminService,
      { provide: ADMIN_CONFIG, useValue: { maxUsers: 100 } },
    ],
    children: [
      { path: 'users', loadComponent: () => import('./admin/users').then(m => m.UsersComponent) },
    ],
  },
];
```

Route-level providers create a child injector. Services provided here are scoped to the route and its children.

## Environment-Based Providers

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    environment.production
      ? provideAnalytics()
      : [],
  ],
};
```

## Prerequisites

- Angular 15.2.0+ (schematic available from v15.2)
- Clean git branch
- Project compiles without errors
- Run `ng build` and `ng test` after each step

## Schematic Limitations

| Cannot Handle | Workaround |
|---|---|
| Unit test imports | Manually update `TestBed.configureTestingModule` |
| Custom API wrappers | Manually refactor |
| Dynamic module loading | Manually convert |
| Non-statically-analyzable code | Manually refactor |

## Checklist

- [ ] Run schematic step 1 (convert declarations)
- [ ] Build and test
- [ ] Run schematic step 2 (remove empty modules)
- [ ] Build and test
- [ ] Run schematic step 3 (switch bootstrap)
- [ ] Build and test
- [ ] Manually update remaining test files
- [ ] Replace `*ngIf`/`*ngFor` with `@if`/`@for`
- [ ] Replace class interceptors with functional interceptors
- [ ] Remove all `standalone: false` from components
- [ ] Delete remaining empty NgModule files
