# Elevate Auth Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Auth service API. Keep under 500 lines.

## Setup

```typescript
import { ElevateAuthModule } from '@yourorg/elevate/auth';

@NgModule({
  imports: [
    ElevateAuthModule.forRoot({
      issuer: 'https://sso.internal.com',
      clientId: 'my-app-client-id',
      scopes: ['openid', 'profile', 'api'],
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual auth module setup -->

## ElevateAuthService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `login()` | — | `Promise<void>` | Redirect to SSO login |
| `logout()` | — | `Promise<void>` | Clear session, redirect to logout |
| `getAccessToken()` | — | `Observable<string>` | Current access token |
| `isAuthenticated()` | — | `Observable<boolean>` | Auth state stream |
<!-- ADD-HERE: add remaining methods -->

## Auth Guard

```typescript
// Protect routes with the Elevate auth guard
const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [ElevateAuthGuard] },
];
```

<!-- ADD-HERE: replace with your actual guard usage -->

## Token Interceptor

```typescript
// Automatically attaches bearer token to API calls
// Included when you import ElevateAuthModule — no extra setup needed.
```

<!-- ADD-HERE: describe interceptor behavior, excluded URLs, refresh logic -->
