---
name: angular-migrate-control-flow
description: "Migrate Angular structural directives (*ngIf, *ngFor, *ngSwitch) to the built-in control flow syntax (@if, @for, @switch). Uses the Angular CLI schematic for automated, reliable conversion across all templates."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/control-flow-guide.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Migrates Angular templates from structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) to the built-in control flow syntax (`@if`, `@for`, `@switch`) introduced in Angular 17. Uses the official Angular CLI schematic (`@angular/core:control-flow-migration`) for reliable, automated conversion. The agent orchestrates the migration, verifies results, and handles edge cases.

## Inputs

- **Scope** — Entire project or specific paths (e.g., `src/app/features/trade`).
- **Mode** (optional) — `--branch-only` (default) or `--worktree`.

### Helper Script

Run the detection script before executing steps manually:
```bash
node scripts/detect-legacy-directives.js [project-root]
```
The script outputs JSON to stdout with counts of *ngIf, *ngFor, *ngSwitch usages and files containing legacy structural directives. Use this data to inform the steps below.

## Steps

1. **Pre-flight checks.**
   - Check git state. If only .github/, .orch/, .vscode/, node_modules/ are dirty — IGNORE (ORCH infrastructure). NEVER stop for dirty git state.
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

### Conversion Patterns — Before/After Reference

**`*ngIf` to `@if`** — simple condition:
```html
<!-- BEFORE -->
<div *ngIf="isLoggedIn">Welcome back!</div>

<!-- AFTER -->
@if (isLoggedIn) {
  <div>Welcome back!</div>
}
```

**`*ngIf` with `else`** — conditional with alternative template:
```html
<!-- BEFORE -->
<div *ngIf="trades.length > 0; else noTrades">
  <app-trade-table [trades]="trades" />
</div>
<ng-template #noTrades>
  <p>No trades found.</p>
</ng-template>

<!-- AFTER -->
@if (trades.length > 0) {
  <div>
    <app-trade-table [trades]="trades" />
  </div>
} @else {
  <p>No trades found.</p>
}
```

**`*ngIf` with `as`** — aliasing the truthy value (common with async pipe):
```html
<!-- BEFORE -->
<div *ngIf="user$ | async as user">
  Hello, {{ user.name }}
</div>

<!-- AFTER -->
@if (user$ | async; as user) {
  <div>Hello, {{ user.name }}</div>
}
```

**`*ngFor` to `@for`** — basic iteration with required `track`:
```html
<!-- BEFORE -->
<tr *ngFor="let trade of trades; trackBy: trackByTradeId">
  <td>{{ trade.symbol }}</td>
</tr>

<!-- AFTER -->
@for (trade of trades; track trade.id) {
  <tr>
    <td>{{ trade.symbol }}</td>
  </tr>
}
```

**`*ngFor` with `index`, `first`, `last`** — loop context variables:
```html
<!-- BEFORE -->
<li *ngFor="let item of items; let i = index; let isFirst = first; let isLast = last"
    [class.first]="isFirst" [class.last]="isLast">
  {{ i + 1 }}. {{ item.name }}
</li>

<!-- AFTER -->
@for (item of items; track item.id; let i = $index) {
  <li [class.first]="$first" [class.last]="$last">
    {{ i + 1 }}. {{ item.name }}
  </li>
}
```
Note: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count` are implicit context variables in the new syntax.

**`@for` with `@empty`** — handling empty collections:
```html
<!-- BEFORE -->
<div *ngIf="trades.length > 0; else emptyList">
  <div *ngFor="let trade of trades; trackBy: trackByFn">{{ trade.symbol }}</div>
</div>
<ng-template #emptyList><p>No trades available.</p></ng-template>

<!-- AFTER -->
@for (trade of trades; track trade.id) {
  <div>{{ trade.symbol }}</div>
} @empty {
  <p>No trades available.</p>
}
```

**`*ngSwitch` to `@switch`**:
```html
<!-- BEFORE -->
<div [ngSwitch]="order.status">
  <span *ngSwitchCase="'pending'" class="badge-warning">Pending</span>
  <span *ngSwitchCase="'filled'" class="badge-success">Filled</span>
  <span *ngSwitchCase="'cancelled'" class="badge-danger">Cancelled</span>
  <span *ngSwitchDefault class="badge-secondary">Unknown</span>
</div>

<!-- AFTER -->
@switch (order.status) {
  @case ('pending') {
    <span class="badge-warning">Pending</span>
  }
  @case ('filled') {
    <span class="badge-success">Filled</span>
  }
  @case ('cancelled') {
    <span class="badge-danger">Cancelled</span>
  }
  @default {
    <span class="badge-secondary">Unknown</span>
  }
}
```

**Nested directives** — `*ngIf` wrapping `*ngFor` (formerly required `<ng-container>`):
```html
<!-- BEFORE -->
<ng-container *ngIf="isLoaded">
  <tr *ngFor="let trade of trades; trackBy: trackByFn">
    <td>{{ trade.symbol }}</td>
  </tr>
</ng-container>

<!-- AFTER -->
@if (isLoaded) {
  @for (trade of trades; track trade.id) {
    <tr>
      <td>{{ trade.symbol }}</td>
    </tr>
  }
}
```

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
