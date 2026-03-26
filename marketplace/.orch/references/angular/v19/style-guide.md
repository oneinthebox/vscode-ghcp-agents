# Angular Style Guide
Source: https://angular.dev/style-guide
Last refreshed: 2026-03-25

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| File names | Hyphen-separated (kebab-case) | `user-profile.ts` |
| Test files | Append `.spec` before extension | `user-profile.spec.ts` |
| Component class | PascalCase, match file name | `UserProfile` in `user-profile.ts` |
| Component selector | kebab-case with app prefix | `app-user-profile` |
| Directive selector | camelCase with app prefix | `[appHighlight]` |
| Pipe name | camelCase | `dateFormat` |
| Service file | kebab-case | `user.service.ts` or `user-service.ts` |
| Service class | PascalCase with suffix | `UserService` |
| Route file | `feature.routes.ts` | `admin.routes.ts` |
| Config file | `app.config.ts` | `app.config.ts` |
| Guard file | `name.guard.ts` | `auth.guard.ts` |
| Interceptor file | `name.interceptor.ts` | `auth.interceptor.ts` |
| Model/interface | `name.model.ts` | `user.model.ts` |
| Enum | PascalCase | `UserRole` |
| Constant | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Multiple style files | Add descriptive suffix | `user-profile-settings.css` |

## File Structure

| Principle | Do | Don't |
|---|---|---|
| Organization | Feature-based directories | Type-based directories (`components/`, `services/`) |
| UI code location | All Angular code in `src/` | Scatter across project root |
| Bootstrap file | `main.ts` at `src/` root | Alternative entry points |
| File grouping | Related files in same directory | Separate template/styles from component |
| Test location | Same directory as source | Separate `test/` directory |
| Generic files | Avoid vague names | `helpers.ts`, `utils.ts`, `common.ts` |

### Recommended Structure

```
src/
  app/
    core/                    # Singleton services, guards, interceptors
    shared/                  # Reusable components, pipes, directives
    features/
      feature-name/
        sub-feature/
          component.ts
          component.html
          component.css
          component.spec.ts
    app.component.ts
    app.config.ts
    app.routes.ts
  environments/
```

## Component Patterns

| Aspect | Do | Don't |
|---|---|---|
| CSS bindings | `[class.name]="condition"`, `[style.prop]="value"` | `[ngClass]`, `[ngStyle]` |
| Event handlers | Name for action: `saveUserData()` | Name for event: `handleClick()` |
| Template members | Use `protected` for template-only | Expose as public API |
| Angular properties | Mark as `readonly` | Allow overwriting Angular-initialized values |
| Property placement | Angular properties (inputs, outputs, queries) at top | Mixed throughout class |
| Business logic | Extract to separate functions/classes | Keep in components |
| Template expressions | Keep straightforward | Complex conditional logic |
| Lifecycle hooks | Call named methods from hooks | Write implementation directly in hooks |

## Property Ordering in Components

| Order | Category | Example |
|---|---|---|
| 1 | Angular properties (inputs, outputs, queries) | `readonly name = input.required<string>()` |
| 2 | Injected services (private) | `private service = inject(MyService)` |
| 3 | Derived / computed state (protected) | `protected display = computed(...)` |
| 4 | Internal state (private) | `private loading = signal(false)` |
| 5 | Lifecycle hooks | `ngOnInit() {}` |
| 6 | Public/protected methods | `save() {}` |
| 7 | Private methods | `private validate() {}` |

## Dependency Injection

| Approach | When to Use |
|---|---|
| `inject()` function | Preferred for all new code; better readability, type inference |
| Constructor parameters | Legacy code (less preferred) |

## Do / Don't Summary

| Do | Don't |
|---|---|
| `@if` / `@for` / `@switch` | `*ngIf` / `*ngFor` / `ngSwitch` |
| `track item.id` in `@for` | `track $index` (unless static list) |
| `[class.active]="isActive()"` | `[ngClass]="{ active: isActive() }"` |
| `[style.color]="color()"` | `[ngStyle]="{ color: color() }"` |
| `computed()` for derived values | Getter methods called in templates |
| `ChangeDetectionStrategy.OnPush` | Default change detection |
| `takeUntilDestroyed()` for cleanup | Manual `unsubscribe()` in `ngOnDestroy` |
| `async` pipe or `toSignal()` | `.subscribe()` to set fields |
| `inject()` for DI | Constructor injection |
| Functional guards/interceptors | Class-based guards/interceptors |
| One concept per file | Multiple classes per file |
| Files under 400 lines | Long files |
| Methods under 75 lines | Long methods |
| Feature-based directories | Type-based directories |

## Consistency Principle

When these rules contradict the style of a particular file, prioritize maintaining consistency within that file over strict adherence to the guide.
