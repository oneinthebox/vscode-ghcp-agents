# Best Practices
Source: https://angular.dev/style-guide
Last refreshed: 2026-03-24

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Component file | `kebab-case.ts` | `user-profile.ts` |
| Component class | PascalCase | `UserProfile` |
| Component selector | `kebab-case` with prefix | `app-user-profile` |
| Directive selector | camelCase with prefix | `[appHighlight]` |
| Pipe name | camelCase | `dateFormat` |
| Service file | `kebab-case.ts` | `user.service.ts` or `user-service.ts` |
| Service class | PascalCase + suffix | `UserService` |
| Test file | Same name + `.spec.ts` | `user-profile.spec.ts` |
| Route file | `feature.routes.ts` | `admin.routes.ts` |
| Config file | `app.config.ts` | `app.config.ts` |
| Guard file | `name.guard.ts` or `name-guard.ts` | `auth.guard.ts` |
| Interceptor file | `name.interceptor.ts` | `auth.interceptor.ts` |
| Model/interface | `name.model.ts` | `user.model.ts` |
| Enum | PascalCase | `UserRole` |
| Constant | UPPER_SNAKE_CASE | `API_BASE_URL` |

## File Structure

### Recommended: Feature-Based

```
src/
  app/
    core/                    # Singleton services, guards, interceptors
      auth/
        auth.service.ts
        auth.guard.ts
        auth.interceptor.ts
    shared/                  # Reusable components, pipes, directives
      ui/
        button/
        card/
        spinner/
      pipes/
      directives/
    features/
      users/
        user-list/
          user-list.ts
          user-list.html
          user-list.css
          user-list.spec.ts
        user-detail/
        user.service.ts
        user.model.ts
        users.routes.ts
      products/
        ...
    app.component.ts
    app.config.ts
    app.routes.ts
  environments/
    environment.ts
    environment.prod.ts
```

### Avoid: Type-Based

```
# DON'T DO THIS
src/
  components/
  services/
  directives/
  pipes/
```

## Component Patterns

| Pattern | Description | When to Use |
|---|---|---|
| Smart (container) | Injects services, manages state, orchestrates | Route-level components |
| Dumb (presentational) | Inputs/outputs only, no service injection | Reusable UI components |
| Layout | Defines page structure with `<router-outlet>` | Shell, sidebar, header |
| Page | Smart component mapped to a route | Each route endpoint |

### Smart Component

```typescript
@Component({
  selector: 'app-user-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserCardComponent, SpinnerComponent],
  template: `
    @if (users.isLoading()) {
      <app-spinner />
    } @else {
      @for (user of users.value(); track user.id) {
        <app-user-card [user]="user" (selected)="onSelect($event)" />
      }
    }
  `,
})
export class UserListPage {
  private userService = inject(UserService);
  users = rxResource({
    loader: () => this.userService.getUsers(),
  });

  onSelect(user: User) {
    inject(Router).navigate(['/users', user.id]);
  }
}
```

### Presentational Component

```typescript
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" (click)="selected.emit(user())">
      <h3>{{ user().name }}</h3>
      <p>{{ user().email }}</p>
    </div>
  `,
})
export class UserCardComponent {
  user = input.required<User>();
  selected = output<User>();
}
```

## Property Ordering in Components

```typescript
@Component({...})
export class MyComponent {
  // 1. Angular properties (inputs, outputs, queries)
  readonly name = input.required<string>();
  readonly changed = output<string>();
  readonly content = viewChild<ElementRef>('content');

  // 2. Injected services (private)
  private service = inject(MyService);

  // 3. Derived / computed state (protected for template)
  protected displayName = computed(() => this.name().toUpperCase());

  // 4. Internal state (private)
  private loading = signal(false);

  // 5. Lifecycle hooks
  ngOnInit() {}

  // 6. Public/protected methods
  save() {}

  // 7. Private methods
  private validate() {}
}
```

## RxJS Best Practices

| Do | Don't |
|---|---|
| `takeUntilDestroyed()` for cleanup | Manual `unsubscribe()` in `ngOnDestroy` |
| `async` pipe in templates | `.subscribe()` to set component fields |
| `toSignal()` to convert observables | Long subscription chains in components |
| `shareReplay(1)` for cached HTTP | Multiple subscriptions to same HTTP call |
| `catchError` in service layer | Uncaught observable errors |
| `switchMap` for latest value | `mergeMap` when only latest matters |
| Functional interceptors | Class-based interceptors |

### Cleanup Patterns

```typescript
// Best: takeUntilDestroyed in field initializer (injection context)
private data$ = inject(DataService).data$.pipe(
  takeUntilDestroyed(),
);

// Good: takeUntilDestroyed with DestroyRef
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.source$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
}

// Good: async pipe (auto-cleanup)
// Template: {{ data$ | async }}

// Best for new code: use signals instead
data = toSignal(inject(DataService).data$);
```

## TypeScript Strict Mode

Enable in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "strictInjectionParameters": true
  }
}
```

## Template Best Practices

| Do | Don't |
|---|---|
| `@if` / `@for` / `@switch` | `*ngIf` / `*ngFor` / `ngSwitch` |
| `track item.id` in `@for` | `track $index` (unless static list) |
| `[class.active]="isActive()"` | `[ngClass]="{ active: isActive() }"` |
| `[style.color]="color()"` | `[ngStyle]="{ color: color() }"` |
| Simple template expressions | Complex logic in templates |
| `computed()` for derived values | Getter methods called in templates |
| `ChangeDetectionStrategy.OnPush` | Default change detection |

## Access Modifiers

| Modifier | Use For |
|---|---|
| `readonly` | Angular-initialized properties (inputs, queries) |
| `protected` | Template-only properties and methods |
| `private` | Internal logic not used in template |
| _(none/public)_ | Public API of the component |

## Event Handler Naming

| Prefer | Avoid |
|---|---|
| `(click)="saveUser()"` | `(click)="handleClick()"` |
| `(click)="toggleMenu()"` | `(click)="onClick()"` |
| `(keydown.enter)="submitForm()"` | `(keydown.enter)="onKeydown()"` |

Name handlers for the **action performed**, not the event that triggers them.

## General Principles

- One concept per file
- Keep files under 400 lines
- Keep methods under 75 lines
- Use `OnPush` change detection everywhere
- Prefer signals over observables for component state
- Extract business logic into services
- Use environment files for configuration
- Write tests alongside source files
- Use `inject()` over constructor injection

---

## Angular Official Style Guide Reference

> See also: [style-guide.md](./style-guide.md) for the full Angular style guide extracted from https://angular.dev/style-guide (refreshed 2026-03-25).

Key additions from the official style guide not covered above:

| Topic | Guideline |
|---|---|
| Lifecycle hooks | Call named methods from hooks; don't write implementation directly in hooks |
| Protected members | Use `protected` for template-only computed values; don't expose as public API |
| Readonly | Mark all Angular-initialized properties (`input()`, `viewChild()`) as `readonly` |
| Generic files | Avoid vague file names like `helpers.ts`, `utils.ts`, `common.ts` |
| Consistency | When guide rules contradict file style, prioritize file-level consistency |
| Multiple style files | Add descriptive suffixes: `user-profile-settings.css`, `user-profile-subscription.css` |
