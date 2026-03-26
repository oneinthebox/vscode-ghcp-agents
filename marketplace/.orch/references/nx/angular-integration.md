# Nx Angular Integration
Source: https://nx.dev/nx-api/angular
Last refreshed: 2026-03-24

## Installation

```bash
npx nx add @nx/angular
```

## Generators

### Application Generator

```bash
npx nx g @nx/angular:application apps/my-app \
  --routing \
  --style=scss \
  --standalone \
  --ssr=false \
  --e2eTestRunner=playwright \
  --unitTestRunner=jest \
  --prefix=app
```

| Option | Default | Description |
|--------|---------|-------------|
| `--name` | required | Application name |
| `--directory` | | Application location |
| `--routing` | `false` | Add routing |
| `--style` | `css` | `css`, `scss`, `sass`, `less` |
| `--standalone` | `true` | Standalone components |
| `--ssr` | `false` | Server-side rendering |
| `--e2eTestRunner` | `playwright` | `playwright`, `cypress`, `none` |
| `--unitTestRunner` | `jest` | `jest`, `vitest`, `none` |
| `--prefix` | `app` | Component selector prefix |
| `--strict` | `true` | Strict TypeScript |
| `--port` | `4200` | Dev server port |
| `--tags` | | Comma-separated tags |

### Library Generator

```bash
# Feature library
npx nx g @nx/angular:library libs/feature-auth \
  --standalone \
  --routing \
  --lazy \
  --tags="type:feature,scope:client"

# UI library
npx nx g @nx/angular:library libs/shared/ui \
  --standalone \
  --buildable \
  --tags="type:ui,scope:shared"

# Data-access library
npx nx g @nx/angular:library libs/shared/data-access \
  --standalone \
  --tags="type:data-access,scope:shared"

# Publishable library (to npm)
npx nx g @nx/angular:library libs/my-lib \
  --publishable \
  --importPath=@my-org/my-lib
```

| Option | Default | Description |
|--------|---------|-------------|
| `--directory` | | Library location |
| `--standalone` | `true` | Standalone components |
| `--buildable` | `false` | Can be built independently |
| `--publishable` | `false` | Can publish to npm |
| `--importPath` | | npm import path (publishable only) |
| `--routing` | `false` | Add routing |
| `--lazy` | `false` | Lazy-loaded route |
| `--tags` | | Comma-separated tags |

### Component Generator

```bash
npx nx g @nx/angular:component \
  libs/shared/ui/src/lib/button \
  --standalone \
  --export \
  --changeDetection=OnPush \
  --style=scss
```

### Service Generator

```bash
npx nx g @nx/angular:service \
  libs/shared/data-access/src/lib/auth
```

### Pipe / Directive / Guard

```bash
npx nx g @nx/angular:pipe libs/shared/util/src/lib/currency
npx nx g @nx/angular:directive libs/shared/ui/src/lib/tooltip
npx nx g @nx/angular:guard libs/shared/util/src/lib/auth --implements=CanActivate
```

## Executors

| Executor | Description |
|----------|-------------|
| `@angular-devkit/build-angular:application` | Build Angular app |
| `@angular-devkit/build-angular:dev-server` | Dev server |
| `@nx/angular:ng-packagr` | Build library with ng-packagr |
| `@nx/angular:module-federation-dev-server` | MF dev server |
| `@nx/angular:module-federation-ssr-dev-server` | MF SSR dev server |

## Module Federation Setup

### Create Host Application

```bash
npx nx g @nx/angular:host apps/shell \
  --remotes=feature-dashboard,feature-settings \
  --style=scss \
  --standalone
```

### Create Remote Application

```bash
npx nx g @nx/angular:remote apps/feature-dashboard \
  --host=shell \
  --style=scss \
  --standalone
```

### module-federation.config.ts (Host)

```typescript
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['feature-dashboard', 'feature-settings'],
  shared: (libraryName, sharedConfig) => {
    if (libraryName === '@angular/core' || libraryName === '@angular/common') {
      return { ...sharedConfig, singleton: true, strictVersion: true };
    }
    return sharedConfig;
  },
};
export default config;
```

### module-federation.config.ts (Remote)

```typescript
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'feature-dashboard',
  exposes: {
    './Routes': 'apps/feature-dashboard/src/app/remote-entry/entry.routes.ts',
  },
};
export default config;
```

### Host Routing

```typescript
// apps/shell/src/app/app.routes.ts
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('feature-dashboard/Routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('feature-settings/Routes').then((m) => m.remoteRoutes),
  },
];
```

### Serve Module Federation

```bash
# Serve host with all remotes
npx nx serve shell

# Serve host with specific remotes in dev mode
npx nx serve shell --devRemotes=feature-dashboard
```

## Storybook Integration

### Setup

```bash
npx nx add @nx/storybook
npx nx g @nx/angular:storybook-configuration shared-ui \
  --configureCypress=false
```

### Generated File Structure

```
libs/shared/ui/
├── .storybook/
│   ├── main.ts
│   └── preview.ts
└── src/lib/button/
    ├── button.component.ts
    └── button.component.stories.ts
```

### Story File

```typescript
// button.component.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Shared/Button',
  component: ButtonComponent,
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: { label: 'Click Me', variant: 'primary', disabled: false },
};

export const Secondary: Story = {
  args: { label: 'Cancel', variant: 'secondary' },
};

export const Disabled: Story = {
  args: { label: 'Disabled', disabled: true },
};
```

### Run Storybook

```bash
npx nx storybook shared-ui
npx nx build-storybook shared-ui
```

## Testing Setup

### Jest Configuration

```bash
npx nx g @nx/jest:configuration my-lib
```

```typescript
// libs/my-lib/jest.config.ts
export default {
  displayName: 'my-lib',
  preset: '../../jest.preset.js',
  setupFilesAfterSetup: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/libs/my-lib',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      { tsconfig: '<rootDir>/tsconfig.spec.json', stringifyContentPathRegex: '\\.(html|svg)$' },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
```

### Playwright Configuration

```bash
npx nx g @nx/playwright:configuration my-app-e2e \
  --project=my-app \
  --webServerCommand="npx nx serve my-app" \
  --webServerAddress="http://localhost:4200"
```

### Run Tests

```bash
npx nx test my-lib                    # Unit tests
npx nx test my-lib --watch            # Watch mode
npx nx test my-lib --coverage         # With coverage
npx nx e2e my-app-e2e                 # E2E tests
npx nx affected -t test               # Affected unit tests
```

## Shared Libraries Pattern

### Recommended Library Organization

```
libs/
├── shared/
│   ├── ui/              # Reusable UI components (buttons, cards, modals)
│   ├── util/            # Pure utility functions, pipes
│   ├── data-access/     # API services, state management
│   └── models/          # TypeScript interfaces, types, enums
├── feature-auth/        # Authentication feature
├── feature-dashboard/   # Dashboard feature
└── feature-settings/    # Settings feature
```

### Dependency Rules

| Library Type | Can Depend On |
|-------------|---------------|
| `type:app` | `type:feature`, `type:ui`, `type:util`, `type:data-access` |
| `type:feature` | `type:ui`, `type:util`, `type:data-access`, `type:models` |
| `type:ui` | `type:util`, `type:models` |
| `type:data-access` | `type:util`, `type:models` |
| `type:util` | `type:models` |
| `type:models` | (none) |

## Migration from Angular CLI to Nx

### Automatic Migration

```bash
# In existing Angular CLI project
npx nx@latest init
```

This will:
1. Install `nx` and `@nx/angular` packages
2. Create `nx.json` configuration
3. Keep existing `angular.json` (works with both)
4. Enable caching for build, test, lint targets

### Manual Steps (if needed)

```bash
# 1. Install Nx
npm install -D nx @nx/angular @nx/workspace

# 2. Create nx.json
npx nx init

# 3. Convert angular.json to project.json (optional)
npx nx g @nx/angular:convert-to-application-executor

# 4. Extract libraries from monolithic app
npx nx g @nx/angular:library libs/shared/ui --standalone
# Then move components into the library

# 5. Add module boundary rules
# Update .eslintrc.json with depConstraints
```

### Verifying Migration

```bash
npx nx build my-app          # Verify build works
npx nx test my-app           # Verify tests work
npx nx lint my-app           # Verify linting works
npx nx graph                 # Visualize project structure
```

## Useful Commands Quick Reference

| Task | Command |
|------|---------|
| Create app | `npx nx g @nx/angular:application apps/my-app` |
| Create library | `npx nx g @nx/angular:library libs/my-lib` |
| Create component | `npx nx g @nx/angular:component path/to/comp` |
| Create service | `npx nx g @nx/angular:service path/to/svc` |
| Serve | `npx nx serve my-app` |
| Build | `npx nx build my-app` |
| Test | `npx nx test my-lib` |
| Lint | `npx nx lint my-app` |
| E2E | `npx nx e2e my-app-e2e` |
| Run many | `npx nx run-many -t build test lint` |
| Affected | `npx nx affected -t test` |
| Dep graph | `npx nx graph` |
| List plugins | `npx nx list` |
| Show project | `npx nx show project my-app` |
| Move project | `npx nx g @nx/workspace:move --project=old --destination=new` |
| Remove project | `npx nx g @nx/workspace:remove my-lib` |
