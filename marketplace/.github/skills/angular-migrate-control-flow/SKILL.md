---
name: angular-migrate-control-flow
description: "Migrate Angular structural directives (*ngIf, *ngFor, *ngSwitch) to the built-in control flow syntax (@if, @for, @switch). Uses the Angular CLI schematic for automated, reliable conversion across all templates."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/control-flow-guide.md
allowed-tools: Bash(ng:*) Bash(nx:*) Bash(npx:*) Bash(git:*) Read Edit
---

## Context

Migrates Angular templates from structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) to the built-in control flow syntax (`@if`, `@for`, `@switch`) introduced in Angular 17. Uses the official Angular CLI schematic (`@angular/core:control-flow-migration`) for reliable, automated conversion. The agent orchestrates the migration, verifies results, and handles edge cases.

## Inputs

- **Scope** — Entire project or specific paths (e.g., `src/app/features/trade`).
- **Mode** (optional) — `--branch-only` (default) or `--worktree`.

## Steps

1. **Pre-flight checks.**
   - Verify clean git state. Stop if dirty.
   - Confirm Angular version >= 17 (control flow requires 17+).
   - Create migration branch: `migrate/control-flow-{date}`.

2. **Analyze current state.**
   - Count `*ngIf`, `*ngFor`, `*ngSwitch` usages across all templates.
   - Identify complex patterns that may need attention:
     - `*ngIf` with `else` template references.
     - `*ngFor` with `trackBy` functions.
     - Nested structural directives on the same element.

3. **Load reference.** Read [references/angular/v19/control-flow-guide.md](references/angular/v19/control-flow-guide.md) for migration patterns, edge cases, and the `@for` track requirement.

4. **Run the Angular CLI schematic.**
   - Execute: `ng generate @angular/core:control-flow-migration --path={scope}`
   - The schematic handles:
     - `*ngIf="cond"` to `@if (cond) { ... }`.
     - `*ngIf="cond; else tmpl"` to `@if (cond) { ... } @else { ... }`.
     - `*ngFor="let item of items; trackBy: trackFn"` to `@for (item of items; track trackFn(item)) { ... }`.
     - `*ngSwitch` / `*ngSwitchCase` / `*ngSwitchDefault` to `@switch` / `@case` / `@default`.
     - Removal of `CommonModule` / `NgIf` / `NgFor` / `NgSwitch` from imports where no longer needed.

5. **Post-schematic review.**
   - Check for `@for` blocks missing `track` expressions (required in v17+).
   - Check for templates where the schematic could not auto-convert (complex `ng-template` patterns).
   - Fix any remaining issues manually.

6. **Clean up imports.**
   - Remove `CommonModule` from component imports if only used for structural directives.
   - Remove individual directive imports (`NgIf`, `NgFor`, `NgSwitch`, `NgForOf`, `NgSwitchCase`, `NgSwitchDefault`).

7. **Verify.**
   - Run `ng build` to confirm compilation.
   - Run `ng test` to confirm no regressions.
   - Commit: `git commit -m "migrate: control flow — *ngIf/*ngFor/*ngSwitch to @if/@for/@switch"`.

8. **Report results.**

## Output

```markdown
## Control Flow Migration Complete

| Directive | Count Migrated | New Syntax |
|-----------|---------------|------------|
| *ngIf | {n} | @if / @else |
| *ngFor | {n} | @for (track) |
| *ngSwitch | {n} | @switch / @case |

Imports cleaned: {n} components had CommonModule/NgIf/NgFor removed
Manual fixes: {n} (if any)
Build: {pass|fail}
Tests: {pass}/{total} passing
Tool: Angular CLI schematic (@angular/core:control-flow-migration)
```

## Validation

- Zero `*ngIf`, `*ngFor`, `*ngSwitch` directives remain in templates.
- Every `@for` block has a `track` expression.
- `CommonModule` is removed from components that no longer need it.
- `ng build` passes.
- All `ng test` specs pass.
- Template rendering is visually identical (same DOM output).
- No orphaned `<ng-template>` blocks from old `*ngIf; else` patterns.
- Linter passes with no new warnings.
