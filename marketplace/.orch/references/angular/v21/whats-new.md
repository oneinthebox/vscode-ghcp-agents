# Angular 21 — What's New
Source: https://angular.love/angular-21-whats-new
Last refreshed: 2026-03-25

## Key Features

| Feature | Category | Description | Status |
|---|---|---|---|
| Signal Components | Components | Full signal-based component model as the primary authoring pattern | Stable |
| `httpResource()` Stable | HTTP | Signal-based HTTP data fetching promoted to stable | Stable |
| Zoneless Fully Supported | Performance | Zoneless is the recommended change detection strategy | Stable |
| TypeScript 5.9 Required | Platform | TypeScript 5.9.x pinned | Stable |
| Vitest Stable | Testing | Vitest fully stable as default test runner | Stable |
| Enhanced SSR | SSR | Improved streaming SSR and partial hydration | Stable |
| `@defer` Improvements | Performance | Better prefetching strategies and nested defer support | Stable |
| Standalone-Only CLI | Tooling | CLI no longer generates NgModule-based code | Stable |
| Template Diagnostics | DX | Improved template type-checking and error messages | Stable |
| Build Performance | Tooling | Further esbuild/Vite optimizations for faster builds | Stable |

## Breaking Changes

| Change | Impact | Migration Action |
|---|---|---|
| TypeScript 5.9 required | TS version | Upgrade TypeScript to 5.9.x |
| Node.js same as v20 | Platform | Node 20.19+, 22.12+, or 24.0+ |
| NgModule generation removed from CLI | Code generation | All `ng generate` commands produce standalone code only |
| `@angular/http` legacy removed | HTTP | Must use `@angular/common/http` (was already removed but types cleaned up) |
| Zone.js not included by default | New projects | New projects are zoneless; existing apps keep Zone.js if configured |
| Decorator-based APIs deprecated | Components | `@Input()`, `@Output()`, `@ViewChild()` etc. show deprecation warnings |

## New APIs

| API | Module | Description |
|---|---|---|
| `httpResource()` | `@angular/common/http` | Stable signal-based HTTP resource |
| `httpResource().value` | `@angular/common/http` | Signal of the response data |
| `httpResource().isLoading` | `@angular/common/http` | Signal of loading state |
| `httpResource().error` | `@angular/common/http` | Signal of error state |
| Enhanced `resource()` | `@angular/core` | Improved with abort controller support |
| `signalStore()` Improvements | `@ngrx/signals` | Better integration with Angular signal APIs |

## Migration Steps

1. Update TypeScript to 5.9.x
2. Ensure Node.js 20.19+, 22.12+, or 24.0+
3. Run `ng update @angular/core@21 @angular/cli@21`
4. Run automated migration schematics (run during update):
   - Signal inputs migration
   - Signal queries migration
   - Output migration
   - inject() migration
5. Address deprecation warnings for decorator-based APIs
6. Optional: Migrate to zoneless if not already done
7. Optional: Adopt `httpResource()` for HTTP data fetching
8. Optional: Migrate from Karma/Jest to Vitest if not already done

## Signal Component Authoring Pattern (v21 Recommended)

```typescript
@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (users.isLoading()) {
      <app-spinner />
    } @else if (users.error()) {
      <p>Error: {{ users.error() }}</p>
    } @else {
      @for (user of users.value(); track user.id) {
        <app-user-card [user]="user" (selected)="selectUser($event)" />
      } @empty {
        <p>No users found.</p>
      }
    }
  `,
})
export class UserListComponent {
  private userService = inject(UserService);

  readonly filter = input<string>('');
  readonly userSelected = output<User>();

  protected users = httpResource(() => ({
    url: '/api/users',
    params: { filter: this.filter() },
  }));

  protected selectUser(user: User) {
    this.userSelected.emit(user);
  }
}
```

## Version Compatibility

| Dependency | Required Version |
|---|---|
| Node.js | 20.19+, 22.12+, or 24.0+ |
| TypeScript | 5.9.x |
| RxJS | 7.x or 8.x |
| Zone.js | Optional (0.14.x if used) |
