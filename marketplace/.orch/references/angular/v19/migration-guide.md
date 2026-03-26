# Migration Guide
Source: https://angular.dev/update-guide
Last refreshed: 2026-03-25

## Upgrade Command

```bash
ng update @angular/core @angular/cli
```

For specific version:
```bash
ng update @angular/core@19 @angular/cli@19
```

With Angular Material:
```bash
ng update @angular/core @angular/cli @angular/material
```

## Version Upgrade Summary

### Angular 16 -> 17

| Category | Change | Action |
|---|---|---|
| Node.js | Minimum 18.13 | Upgrade Node if needed |
| TypeScript | 5.2.x required | Upgrade TS |
| Control flow | `@if`/`@for`/`@switch` new syntax | Run `ng g @angular/core:control-flow` to migrate |
| Deferrable views | `@defer` blocks for lazy loading | Adopt for heavy components |
| esbuild/Vite | Default build system for new projects | Migrate existing with `ng update` |
| Standalone | Default for generated components | No action for existing code |
| `*ngIf`/`*ngFor` | Soft-deprecated | Migrate to `@if`/`@for` syntax |
| `RouterTestingModule` | Deprecated | Use `provideRouter()` in tests |
| `HttpClientTestingModule` | Deprecated | Use `provideHttpClientTesting()` |

**Automated migrations:**
```bash
ng g @angular/core:control-flow      # *ngIf -> @if
```

### Angular 17 -> 18

| Category | Change | Action |
|---|---|---|
| Node.js | Minimum 18.13 | Upgrade Node if needed |
| TypeScript | 5.4.x required | Upgrade TS |
| Standalone | Default `standalone: true` for CLI-generated | Add `standalone: false` if using NgModules |
| Control flow | `@if`/`@for` stable | Run `ng g @angular/core:control-flow` to migrate |
| Signals | `input()`, `output()`, `model()` stable | Migrate from decorators |
| HttpClient | `withFetch()` default | No action needed |
| Route redirects | Relative by default | Check redirect paths |
| Zoneless | Experimental | Optional: `provideExperimentalZonelessChangeDetection()` |

**Automated migrations:**
```bash
ng generate @angular/core:control-flow      # *ngIf -> @if
ng generate @angular/core:standalone         # NgModules -> standalone
ng generate @angular/core:inject-migration   # constructor -> inject()
```

### Angular 18 -> 19

| Category | Change | Action |
|---|---|---|
| Node.js | Minimum 18.19.1, Node 20.11.1+, or 22.0.0+ | Upgrade Node |
| TypeScript | 5.5.x - 5.7.x | Upgrade TS |
| Standalone | `standalone: true` is default (no longer emitted) | Remove explicit `standalone: true` |
| Signals | `linkedSignal()`, `resource()` developer preview | Optional adoption |
| Incremental hydration | Developer preview | Optional for SSR |
| `afterRenderEffect` | New API | Replace `afterRender` with `afterRenderEffect` where appropriate |
| `provideAppInitializer` | New | Replace `APP_INITIALIZER` token |
| HMR | Enabled by default | `--no-hmr` to disable |
| Strict standalone | Components with `standalone: false` need explicit opt-out | Add `standalone: false` to non-standalone |

**Automated migrations:**
```bash
ng update @angular/core@19 @angular/cli@19
# Schematics run automatically during update
```

### Angular 19 -> 20

| Category | Change | Action |
|---|---|---|
| Node.js | Drop Node 18; minimum 20.19.0, 22.12.0+, or 24.0.0+ | **Upgrade Node to 20+** |
| TypeScript | 5.8.x required | Upgrade TS |
| Signals | `linkedSignal()`, `resource()` stable | Adopt for production |
| Zoneless | Stable | Consider migration |
| `effect()` | By default runs in change detection (not microtask) | Check effect timing |
| Build | Vitest default test runner | Migrate from Karma |
| Outputs | `OutputEmitterRef.subscribe()` removed | Use `.pipe()` or template binding |
| Router | `CanLoad` removed | Use `canMatch` |
| Forms | `FormControlStatus` type narrowed | Fix type assertions |

**Breaking changes:**
- Node 18 support dropped
- `CanLoad` guard removed (use `canMatch`)
- `OutputEmitterRef.subscribe()` removed

**Automated migrations:**
```bash
ng update @angular/core@20 @angular/cli@20
```

### Angular 20 -> 21

| Category | Change | Action |
|---|---|---|
| Node.js | Same as v20 (20.19+, 22.12+, 24.0+) | No change |
| TypeScript | 5.9.x required | Upgrade TS |
| Signals | Full signal-based components | Adopt signal components |
| Zoneless | Fully supported | Migrate from Zone.js |

## Step-by-Step Upgrade Process

### 1. Preparation

```bash
# Check current versions
ng version

# Ensure clean git state
git status

# Run tests before upgrade
ng build
ng test --no-watch
```

### 2. Update Dependencies

```bash
# Update Angular packages
ng update @angular/core @angular/cli

# Update Angular Material (if used)
ng update @angular/material

# Update other Angular packages
ng update @angular/cdk

# Update Nx (if used)
npx nx migrate latest
npx nx migrate --run-migrations
```

### 3. Run Automated Migrations

```bash
# These may run automatically during ng update, or run manually:
ng generate @angular/core:standalone
ng generate @angular/core:control-flow
ng generate @angular/core:inject-migration
ng generate @angular/core:route-lazy-loading
ng generate @angular/core:signal-input-migration
ng generate @angular/core:signal-queries-migration
ng generate @angular/core:output-migration
```

### 4. Verify

```bash
ng build
ng test --no-watch
ng lint
ng e2e
```

## Available Schematics

| Schematic | Purpose |
|---|---|
| `@angular/core:standalone` | NgModule -> standalone migration |
| `@angular/core:control-flow` | `*ngIf`/`*ngFor` -> `@if`/`@for` |
| `@angular/core:inject-migration` | Constructor DI -> `inject()` |
| `@angular/core:route-lazy-loading` | Eager routes -> `loadComponent` |
| `@angular/core:signal-input-migration` | `@Input()` -> `input()` |
| `@angular/core:signal-queries-migration` | `@ViewChild` -> `viewChild()` |
| `@angular/core:output-migration` | `@Output()` -> `output()` |

## Deprecated APIs by Version

| Deprecated In | API | Replacement |
|---|---|---|
| v17 | `NgModule` for new code | Standalone components |
| v17 | `*ngIf`, `*ngFor`, `ngSwitch` | `@if`, `@for`, `@switch` |
| v18 | Constructor injection (soft) | `inject()` |
| v18 | `@Input()` decorator | `input()` |
| v18 | `@Output()` decorator | `output()` |
| v18 | `@ViewChild()`, `@ViewChildren()` | `viewChild()`, `viewChildren()` |
| v18 | `@ContentChild()`, `@ContentChildren()` | `contentChild()`, `contentChildren()` |
| v19 | `APP_INITIALIZER` token | `provideAppInitializer()` |
| v19 | `afterRender` (some overloads) | `afterRenderEffect` |
| v20 | `CanLoad` guard | `canMatch` |
| v20 | Zone.js (soft deprecation) | Zoneless change detection |

## Troubleshooting Common Issues

| Issue | Solution |
|---|---|
| `TS version mismatch` | Install exact TS version required by Angular |
| `Peer dependency conflicts` | Use `--force` cautiously, or align versions |
| `NgModule not found` | Module may have been deleted by standalone migration |
| `Template parse errors` | Run control-flow schematic |
| `Missing imports` | Standalone components need explicit imports |
| `Zone.js errors after v20` | Ensure zone.js is still in polyfills if not zoneless |
| `Test failures` | Update TestBed config: use `imports` instead of `declarations` |

## Modern Migration Commands (v20+)

Starting with Angular 20, migrations use `ng migrate` syntax:

| Schematic | New Command | Legacy Command |
|---|---|---|
| Standalone | `ng migrate standalone` | `ng g @angular/core:standalone` |
| Control Flow | `ng migrate control-flow` | `ng g @angular/core:control-flow` |
| inject() | `ng migrate inject-function` | `ng g @angular/core:inject-migration` |
| Signal Inputs | `ng migrate signal-inputs` | `ng g @angular/core:signal-input-migration` |
| Signal Queries | `ng migrate signal-queries` | `ng g @angular/core:signal-queries-migration` |
| Outputs | `ng migrate outputs` | `ng g @angular/core:output-migration` |
| Route Lazy Loading | `ng migrate route-lazy-loading` | `ng g @angular/core:route-lazy-loading` |
| Unused Imports | `ng migrate cleanup-unused-imports` | N/A |
| Self-closing Tags | `ng migrate self-closing-tags` | N/A |
| NgClass to Class | `ng migrate ngclass-to-class` | N/A |
| NgStyle to Style | `ng migrate ngstyle-to-style` | N/A |
| RouterTestingModule | `ng migrate router-testing-module-migration` | N/A |
| CommonModule | `ng migrate common-to-standalone` | N/A |

> See also: [migrations-reference.md](../migrations-reference.md) for the full migrations reference (refreshed 2026-03-25).
