# Angular Migrations Reference
Source: https://angular.dev/reference/migrations
Last refreshed: 2026-03-25

## Available Migration Schematics

| Schematic | Command | Description | What It Does | Status |
|---|---|---|---|---|
| Standalone | `ng migrate standalone` | Convert NgModule-based components to standalone | Removes NgModule declarations; adds `imports` array to component metadata; removes unnecessary modules | Stable |
| Control Flow Syntax | `ng migrate control-flow` | Modernize template syntax | Replaces `*ngIf` with `@if`, `*ngFor` with `@for`, `*ngSwitch` with `@switch`; adds `track` expression | Stable |
| inject() Function | `ng migrate inject-function` | Modernize dependency injection | Converts constructor-based DI to `inject()` function; better type inference and readability | Stable |
| Lazy-loaded Routes | `ng migrate route-lazy-loading` | Optimize bundle splitting | Converts eager `component:` routes to `loadComponent: () => import(...)` for code splitting | Stable |
| Signal Inputs | `ng migrate signal-inputs` | Modernize input API | Converts `@Input()` decorators to `input()` / `input.required()` signal functions | Production Ready |
| Outputs | `ng migrate outputs` | Update event emitters | Converts `@Output() event = new EventEmitter()` to `event = output()` | Production Ready |
| Signal Queries | `ng migrate signal-queries` | Modernize query decorators | Converts `@ViewChild()`, `@ViewChildren()`, `@ContentChild()`, `@ContentChildren()` to signal-based equivalents | Production Ready |
| Cleanup Unused Imports | `ng migrate cleanup-unused-imports` | Remove dead code | Scans all TypeScript files and removes unused `import` statements | Stable |
| Self-closing Tags | `ng migrate self-closing-tags` | Template modernization | Converts `<app-icon></app-icon>` to `<app-icon />` where element has no children | Stable |
| NgClass to Class | `ng migrate ngclass-to-class` | Simplify styling | Replaces `[ngClass]` with `[class.x]` bindings | Stable |
| NgStyle to Style | `ng migrate ngstyle-to-style` | Simplify styling | Replaces `[ngStyle]` with `[style.x]` bindings | Stable |
| RouterTestingModule | `ng migrate router-testing-module-migration` | Update testing setup | Converts `RouterTestingModule` to `RouterModule` with mocking utilities | Stable |
| CommonModule to Standalone | `ng migrate common-to-standalone` | Reduce module dependencies | Replaces `CommonModule` imports with individual directive/pipe imports (`NgIf`, `NgFor`, `AsyncPipe`, etc.) | Stable |

## Legacy Schematic Commands (Alternative Syntax)

Some schematics can also be invoked via `ng generate`:

| Schematic | Legacy Command |
|---|---|
| Standalone | `ng g @angular/core:standalone` |
| Control Flow | `ng g @angular/core:control-flow` |
| inject() | `ng g @angular/core:inject-migration` |
| Route Lazy Loading | `ng g @angular/core:route-lazy-loading` |
| Signal Inputs | `ng g @angular/core:signal-input-migration` |
| Signal Queries | `ng g @angular/core:signal-queries-migration` |
| Outputs | `ng g @angular/core:output-migration` |

## Recommended Migration Order

| Step | Migration | Reason |
|---|---|---|
| 1 | Standalone | Foundation for other migrations; removes NgModule boilerplate |
| 2 | Control Flow | Modernize templates; required for future optimizations |
| 3 | inject() Function | Modernize DI before signal migrations |
| 4 | Signal Inputs | Convert `@Input()` to `input()` signals |
| 5 | Signal Queries | Convert `@ViewChild()` etc. to signal queries |
| 6 | Outputs | Convert `@Output()` to `output()` |
| 7 | Route Lazy Loading | Optimize bundle sizes |
| 8 | Cleanup Unused Imports | Final cleanup pass |
| 9 | Self-closing Tags | Cosmetic template cleanup |
| 10 | NgClass/NgStyle | Replace with native bindings |

## Running Migrations

```bash
# Run a specific migration
ng migrate <schematic-name>

# Run during version update (many run automatically)
ng update @angular/core @angular/cli

# Dry run to preview changes
ng migrate <schematic-name> --dry-run

# Target specific path
ng migrate <schematic-name> --path=src/app/features
```

## Notes

- Migrations that run during `ng update` are listed in the update schematic collection and execute automatically
- All migrations can be re-run safely (idempotent)
- Use `--dry-run` to preview changes before applying
- Some migrations may require manual review after running (e.g., complex template logic)
