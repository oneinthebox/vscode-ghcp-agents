# Module Federation with Nx & Angular — Architecture Guide

Sources:
- https://nx.dev/docs/technologies/module-federation/concepts/module-federation-and-nx
- https://www.angulararchitects.io/en/blog/using-module-federation-with-monorepos-and-angular/
- https://module-federation.io/practice/frameworks/angular/angular-mfe.html
Last refreshed: 2026-03-25

---

## When to Use Module Federation

| Use case | Recommended? | Why |
|----------|-------------|-----|
| Multiple teams, independent deploy cycles | Yes | Each team deploys their remote independently |
| Faster CI/CD for large monorepos | Yes | Parallelize builds per app, share libs at runtime |
| Single team, shared deploy | No | Standard Nx monorepo with lazy loading is simpler |
| Prototype / small app | No | Overhead not justified |
| Shared design system across apps | Yes | HDS tokens/components shared at runtime |

## Architecture Overview

```
┌─────────────────────────────────────┐
│            Host (Shell)              │
│  - App shell, navigation, auth      │
│  - Loads remotes at runtime         │
│  - Owns shared Angular/RxJS/Zone    │
├──────────┬──────────┬───────────────┤
│ Remote 1 │ Remote 2 │ Remote 3      │
│ Trading  │ Portfolio│ Admin         │
│ Team A   │ Team B   │ Team C        │
│ :4201    │ :4202    │ :4203         │
└──────────┴──────────┴───────────────┘
     ↕          ↕          ↕
  shared-ui  shared-models  data-access
         (Nx libraries — shared at runtime)
```

## Nx Setup

### Create Host

```bash
npx nx generate @nx/angular:host shell \
  --directory=apps/shell \
  --remotes=trading,portfolio,admin \
  --dynamic \
  --standalone
```

### Create Remote

```bash
npx nx generate @nx/angular:remote trading \
  --directory=apps/trading \
  --host=shell \
  --standalone
```

### Key Files Generated

| File | Purpose |
|------|---------|
| `apps/shell/module-federation.config.ts` | Host config: lists remotes |
| `apps/trading/module-federation.config.ts` | Remote config: exposes entry point |
| `apps/shell/src/app/app.routes.ts` | Dynamic remote loading routes |

## Module Federation Config

### Host (shell)

```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['trading', 'portfolio', 'admin'],
  shared: (libraryName, sharedConfig) => {
    if (libraryName === '@angular/core' || libraryName === 'rxjs') {
      return { ...sharedConfig, singleton: true, strictVersion: true };
    }
    return sharedConfig;
  },
};
export default config;
```

### Remote (trading)

```typescript
// apps/trading/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'trading',
  exposes: {
    './Routes': 'apps/trading/src/app/remote-entry/entry.routes.ts',
  },
};
export default config;
```

## Dynamic Remote Loading (Recommended)

```typescript
// apps/shell/src/app/app.routes.ts
import { loadRemoteModule } from '@nx/angular/mf';

export const appRoutes: Route[] = [
  {
    path: 'trading',
    loadChildren: () =>
      loadRemoteModule('trading', './Routes').then(m => m.remoteRoutes),
  },
  {
    path: 'portfolio',
    loadChildren: () =>
      loadRemoteModule('portfolio', './Routes').then(m => m.remoteRoutes),
  },
];
```

## Shared Dependencies

### What to Share

| Package | Singleton? | Why |
|---------|-----------|-----|
| `@angular/core` | Yes (strict) | Only one Angular instance allowed |
| `@angular/common` | Yes | Same Angular version across remotes |
| `@angular/router` | Yes | Shared routing context |
| `rxjs` | Yes | Shared Observable operators |
| `zone.js` | Yes | One zone per app |
| `@yourorg/hds` | Yes | Consistent design system |
| `@yourorg/elevate` | Yes | Shared auth, logging, config |
| `@ngrx/signals` | Yes | Shared state management |

### What NOT to Share

| Package | Why |
|---------|-----|
| Feature-specific libs | Each remote has its own features |
| Test utilities | Not needed at runtime |
| Build tools | Dev dependency only |

## Shared Libraries (Nx)

```typescript
// libs/shared-models/src/index.ts — exported from monorepo
export { Fund, Trade, Portfolio } from './lib/models';
```

```typescript
// ESLint depConstraints for module boundaries
{
  "depConstraints": [
    { "sourceTag": "scope:shell", "onlyDependOnLibsWithTags": ["scope:shared"] },
    { "sourceTag": "scope:trading", "onlyDependOnLibsWithTags": ["scope:shared"] },
    { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] }
  ]
}
```

## Local Development

```bash
# Start host + all remotes simultaneously
npx nx serve shell

# Start host with specific remotes only
npx nx serve shell --devRemotes=trading

# Build all for production
npx nx run-many --target=build --all --configuration=production
```

## CI/CD with Affected

```bash
# Only build what changed
npx nx affected --target=build

# Only test what changed
npx nx affected --target=test

# Print which apps need deployment
npx nx print-affected --type=app
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Shared module is not available" | Version mismatch | Pin exact versions in `shared` config |
| Duplicate Angular instances | Not marked as singleton | Add `singleton: true, strictVersion: true` |
| Styles not loading | CSS not in shared scope | Use HDS tokens (CSS vars work across boundaries) |
| Slow dev server | All remotes starting | Use `--devRemotes=trading` to serve only what you need |
| Type errors across remotes | Missing TypeScript paths | Shared libs must be in tsconfig paths |

## Decision: Static vs Dynamic Remotes

| Aspect | Static | Dynamic |
|--------|--------|---------|
| Config | Remotes listed in module-federation.config.ts | Remotes discovered at runtime from manifest |
| Deploy | All remotes must be available at build | Remotes can be added/removed without rebuilding host |
| Latency | Faster initial load (bundled) | Slightly slower (runtime fetch) |
| Recommended | Small team, few remotes | Enterprise, many teams, independent deploy |
