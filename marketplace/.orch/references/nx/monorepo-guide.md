# Nx Monorepo Guide
Source: https://nx.dev/getting-started/intro
Last refreshed: 2026-03-24

## What is Nx

Nx is a build system for monorepos providing:
- **Caching** -- never rebuild the same code twice
- **Task orchestration** -- runs tasks in correct order, parallelizing when possible
- **Dependency graph** -- understands project interconnections
- **Module boundaries** -- enforces architectural rules
- **Affected commands** -- only runs tasks on changed projects

## Workspace Creation

```bash
# New workspace with Angular preset
npx create-nx-workspace@latest my-org --preset=angular-monorepo

# New workspace (empty)
npx create-nx-workspace@latest my-org --preset=apps

# Add Nx to existing Angular CLI project
npx nx@latest init
```

## Workspace Structure

```
my-org/
├── apps/
│   ├── my-app/                  # Application
│   │   ├── src/
│   │   ├── project.json         # Project config
│   │   └── tsconfig.app.json
│   └── my-app-e2e/              # E2E tests
│       ├── src/
│       └── project.json
├── libs/
│   ├── shared/
│   │   ├── ui/                  # Shared UI library
│   │   │   ├── src/
│   │   │   │   ├── index.ts     # Public API
│   │   │   │   └── lib/
│   │   │   └── project.json
│   │   └── util/                # Shared utility library
│   └── feature-dashboard/       # Feature library
├── nx.json                      # Nx configuration
├── tsconfig.base.json           # Root TS config with paths
└── package.json
```

## project.json Configuration

```json
{
  "name": "my-app",
  "sourceRoot": "apps/my-app/src",
  "projectType": "application",
  "tags": ["type:app", "scope:client"],
  "targets": {
    "build": {
      "executor": "@angular-devkit/build-angular:application",
      "options": {
        "outputPath": "dist/apps/my-app",
        "index": "apps/my-app/src/index.html",
        "browser": "apps/my-app/src/main.ts",
        "tsConfig": "apps/my-app/tsconfig.app.json"
      },
      "configurations": {
        "production": {
          "budgets": [{ "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" }],
          "outputHashing": "all"
        },
        "development": {
          "optimization": false,
          "extractLicenses": false,
          "sourceMap": true
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "executor": "@angular-devkit/build-angular:dev-server",
      "options": { "buildTarget": "my-app:build" },
      "configurations": {
        "development": { "buildTarget": "my-app:build:development", "hmr": true }
      },
      "defaultConfiguration": "development"
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/my-app/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

## nx.json Configuration

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/tsconfig.spec.json"],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  },
  "plugins": ["@nx/angular/plugin", "@nx/jest/plugin", "@nx/eslint/plugin"],
  "defaultBase": "main"
}
```

## Running Tasks

| Command | Description |
|---------|-------------|
| `npx nx serve my-app` | Serve application |
| `npx nx build my-app` | Build application |
| `npx nx test my-lib` | Test library |
| `npx nx lint my-app` | Lint application |
| `npx nx run my-app:build:production` | Build with config |
| `npx nx run-many -t build test` | Run multiple tasks across projects |
| `npx nx run-many -t build --projects=app1,app2` | Run on specific projects |
| `npx nx affected -t test` | Test only affected projects |
| `npx nx affected -t build --base=main` | Affected since main branch |
| `npx nx graph` | Visualize dependency graph |
| `npx nx show project my-app` | Show project details |
| `npx nx reset` | Clear local cache |

## Generators

### Generate Application

```bash
npx nx g @nx/angular:application apps/my-app --routing --style=scss --standalone
```

### Generate Library

```bash
# Feature library
npx nx g @nx/angular:library libs/feature-dashboard --standalone --routing

# UI library
npx nx g @nx/angular:library libs/shared/ui --standalone

# Utility library (no components)
npx nx g @nx/angular:library libs/shared/util --standalone --buildable
```

### Generate Component / Service

```bash
npx nx g @nx/angular:component libs/shared/ui/src/lib/button --standalone --export
npx nx g @nx/angular:service libs/shared/util/src/lib/auth --skipTests
```

### Move / Remove Project

```bash
npx nx g @nx/workspace:move --project my-lib --destination shared/my-lib
npx nx g @nx/workspace:remove my-lib
```

## Executors

| Executor | Package | Task |
|----------|---------|------|
| `@angular-devkit/build-angular:application` | Angular CLI | Build app |
| `@angular-devkit/build-angular:dev-server` | Angular CLI | Serve app |
| `@nx/jest:jest` | Nx Jest | Run unit tests |
| `@nx/eslint:lint` | Nx ESLint | Lint code |
| `@nx/angular:ng-packagr` | Nx Angular | Build publishable lib |
| `@nx/playwright:playwright` | Nx Playwright | Run E2E tests |

## Module Boundaries (depConstraints)

### .eslintrc.json (root)

```json
{
  "overrides": [
    {
      "files": ["*.ts"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              { "sourceTag": "type:app", "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"] },
              { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui", "type:util", "type:data-access"] },
              { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:util"] },
              { "sourceTag": "type:data-access", "onlyDependOnLibsWithTags": ["type:util"] },
              { "sourceTag": "type:util", "onlyDependOnLibsWithTags": ["type:util"] },
              { "sourceTag": "scope:client", "onlyDependOnLibsWithTags": ["scope:client", "scope:shared"] },
              { "sourceTag": "scope:admin", "onlyDependOnLibsWithTags": ["scope:admin", "scope:shared"] },
              { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] }
            ]
          }
        ]
      }
    }
  ]
}
```

### Tag Assignment in project.json

```json
{
  "tags": ["type:feature", "scope:client"]
}
```

## Library Public API

```typescript
// libs/shared/ui/src/index.ts
export { ButtonComponent } from './lib/button/button.component';
export { CardComponent } from './lib/card/card.component';
export { ModalComponent } from './lib/modal/modal.component';
```

### tsconfig.base.json Path Mappings

```json
{
  "compilerOptions": {
    "paths": {
      "@my-org/shared/ui": ["libs/shared/ui/src/index.ts"],
      "@my-org/shared/util": ["libs/shared/util/src/index.ts"],
      "@my-org/feature-dashboard": ["libs/feature-dashboard/src/index.ts"]
    }
  }
}
```

### Importing Libraries

```typescript
import { ButtonComponent, CardComponent } from '@my-org/shared/ui';
import { AuthService } from '@my-org/shared/util';
```

## Caching

### Local Cache (default)

Nx caches task results in `.nx/cache/`. Re-running identical tasks returns instant results.

### Remote Cache (Nx Cloud)

```bash
npx nx connect-to-nx-cloud
```

```json
// nx.json
{
  "nxCloudAccessToken": "your-token"
}
```

### Cache Configuration

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "cache": true,
      "inputs": ["production", "^production"],
      "outputs": ["{options.outputPath}"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
    }
  }
}
```

## Affected Commands

```bash
# Compare against main branch
npx nx affected -t test --base=main --head=HEAD

# Compare against specific commit
npx nx affected -t build --base=sha1 --head=sha2

# Show affected projects
npx nx show projects --affected

# Affected graph
npx nx affected --graph
```

## Plugins

| Plugin | Package | Features |
|--------|---------|----------|
| Angular | `@nx/angular` | Angular generators, executors, module federation |
| Jest | `@nx/jest` | Jest test runner |
| ESLint | `@nx/eslint` | Linting, module boundary rules |
| Playwright | `@nx/playwright` | E2E test runner |
| Storybook | `@nx/storybook` | Component documentation |
| Cypress | `@nx/cypress` | E2E test runner (legacy) |
| Webpack | `@nx/webpack` | Custom webpack config |
| Vite | `@nx/vite` | Vite build support |

### Install Plugin

```bash
npx nx add @nx/angular
npx nx add @nx/jest
npx nx add @nx/playwright
```

## CI Configuration (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: nrwl/nx-set-shas@v4
      - run: npx nx affected -t lint test build --parallel=3
```
