# Elevate Authorization Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Authorization service API. Keep under 500 lines.

## Setup

```typescript
import { ElevateAuthorizationModule } from '@yourorg/elevate/authorization';

@NgModule({
  imports: [
    ElevateAuthorizationModule.forRoot({
      roleEndpoint: '/api/roles',
      permissionCacheMs: 300000,
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual authorization module setup -->

## ElevateAuthorizationService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `hasRole(role)` | `role: string` | `Observable<boolean>` | Check if user has a specific role |
| `hasPermission(perm)` | `perm: string` | `Observable<boolean>` | Check if user has a specific permission |
| `getRoles()` | — | `Observable<string[]>` | Get all roles for current user |
| `getPermissions()` | — | `Observable<string[]>` | Get all permissions for current user |
<!-- ADD-HERE: add remaining methods -->

## RBAC Guard

```typescript
// Protect routes with role-based access control
const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [elevateRbacGuard(['admin', 'manager'])],
  },
];
```

<!-- ADD-HERE: replace with your actual RBAC guard usage -->

## Permission Directive

```typescript
// Conditionally show UI elements based on permissions
// <button *elevateHasPermission="'trade:execute'">Execute Trade</button>
```

<!-- ADD-HERE: describe permission directive usage, supported permission patterns -->
