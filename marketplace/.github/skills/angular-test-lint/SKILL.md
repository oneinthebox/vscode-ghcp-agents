---
name: angular-test-lint
description: "Run ng lint on the project, report issues grouped by severity and rule, and suggest auto-fixable corrections. Produces a structured lint report with actionable fix suggestions."
references:
  - references/angular/v19/best-practices.md
allowed-tools:
  - codebase
  - terminal
---

## Context

Runs the Angular project linter (`ng lint` or `npx eslint`) and produces a structured report. Groups issues by severity and rule, identifies auto-fixable problems, and provides specific fix suggestions for manual issues. Designed for pre-commit or pre-PR quality gates.

## Inputs

- Optional: `--scope {path}` — lint specific directory or file instead of full project
- Optional: `--fix` — apply auto-fixable corrections automatically
- Optional: `--strict` — treat warnings as errors
- Optional: `--report-only` — skip fix suggestions, just report

## Angular-Specific ESLint Rule Categories

The skill understands and groups `@angular-eslint` rules by category:

| Category         | Key Rules                                                      | Fixable |
|------------------|----------------------------------------------------------------|---------|
| Lifecycle        | `no-empty-lifecycle-method`, `use-lifecycle-interface`         | Yes     |
| Component style  | `prefer-standalone`, `prefer-on-push-component-change-detection` | Yes  |
| Template safety  | `template/no-negated-async`, `template/alt-text`, `template/click-events-have-key-events` | Mixed |
| Naming           | `component-selector`, `directive-selector`, `pipe-prefix`      | No      |
| Security         | `template/no-any`, `no-forward-ref`                            | No      |
| Performance      | `no-input-rename`, `no-output-rename`, `relative-url-prefix`  | Yes     |

**Severity classification rules:**
- **Error**: Security rules, template safety, lifecycle interface violations.
- **Warning**: Style preferences (standalone, OnPush), naming conventions.
- Auto-fixable rules are those with ESLint `meta.fixable` set in the rule definition.

## Steps

1. Detect the lint configuration: `.eslintrc.*`, `eslint.config.*`, or `angular.json` lint target.
2. Run the lint command with JSON output:
   ```bash
   ng lint --format=json 2>/dev/null || npx eslint "src/**/*.ts" --format=json
   ```
3. Parse the JSON output into a structured issue list. ESLint JSON format:
   ```json
   [
     {
       "filePath": "/app/src/app/user/user.component.ts",
       "messages": [
         {
           "ruleId": "@angular-eslint/prefer-standalone",
           "severity": 1,
           "message": "Component should be standalone",
           "line": 8,
           "column": 1,
           "fix": { "range": [142, 142], "text": "\n  standalone: true," }
         }
       ],
       "errorCount": 0,
       "warningCount": 1,
       "fixableErrorCount": 0,
       "fixableWarningCount": 1
     }
   ]
   ```
4. Group issues by:
   a. Severity: error (severity=2), warning (severity=1).
   b. Rule name (e.g., `@angular-eslint/no-empty-lifecycle-method`).
   c. File path.
5. For each issue group, determine if auto-fixable (presence of `fix` property in JSON).
6. For non-fixable issues, generate a specific fix suggestion with code snippet.
7. If `--fix` specified, run `ng lint --fix` and report what was auto-corrected.
8. Produce the structured lint report.

## Common Violations: Before/After

### `@angular-eslint/prefer-standalone` (auto-fixable)
**Before:**
```typescript
@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
})
export class UserComponent {}
```
**After:**
```typescript
@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user.component.html',
})
export class UserComponent {}
```

### `@angular-eslint/use-lifecycle-interface` (auto-fixable)
**Before:**
```typescript
export class UserComponent {
  ngOnInit() { this.load(); }
}
```
**After:**
```typescript
export class UserComponent implements OnInit {
  ngOnInit() { this.load(); }
}
```

### `@angular-eslint/template/alt-text` (manual fix)
**Before:**
```html
<img [src]="user.avatar">
```
**After:**
```html
<img [src]="user.avatar" [alt]="user.name + ' avatar'">
```

### Unused imports (auto-fixable via `@typescript-eslint/no-unused-vars`)
**Before:**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
// OnDestroy never used
```
**After:**
```typescript
import { Component, OnInit } from '@angular/core';
```

## Output

```markdown
## Lint Report — src/app/

### Summary
| Metric           | Value |
|------------------|-------|
| Files scanned    | 142   |
| Errors           | 8     |
| Warnings         | 23    |
| Auto-fixable     | 19    |

### Issues by Rule
| Rule                                        | Count | Severity | Fixable |
|---------------------------------------------|-------|----------|---------|
| `@angular-eslint/prefer-standalone`         | 12    | warning  | Yes     |
| `@angular-eslint/use-lifecycle-interface`   | 5     | error    | Yes     |
| `@angular-eslint/template/alt-text`         | 4     | error    | No      |
| `@angular-eslint/template/no-negated-async` | 3     | error    | No      |
| `@typescript-eslint/no-unused-vars`         | 7     | warning  | Yes     |

### Top Issues (detail)
#### @angular-eslint/prefer-standalone (12 occurrences)
**Files:** `user.component.ts:8`, `admin.component.ts:6`, `dashboard.component.ts:10`, ...
**What:** Component uses NgModule declarations instead of standalone mode. Angular 19 defaults to standalone.
**Fix:** Add `standalone: true` to the `@Component` decorator and move NgModule imports to the component `imports` array.

#### @angular-eslint/template/alt-text (4 occurrences)
**Files:** `profile.component.html:15`, `avatar.component.html:3`, ...
**What:** `<img>` element missing `alt` attribute. Accessibility violation (WCAG 2.1 Level A).
**Fix:** Add a descriptive `[alt]` binding: `<img [src]="src" [alt]="descriptiveText">`.

### Auto-fixed (if --fix used)
| Rule                                      | Files Fixed | Changes |
|-------------------------------------------|-------------|---------|
| `@angular-eslint/prefer-standalone`       | 12          | Added `standalone: true` and imports |
| `@angular-eslint/use-lifecycle-interface` | 5           | Added `implements OnInit` / `OnDestroy` |
| `@typescript-eslint/no-unused-vars`       | 7           | Removed unused import specifiers |
```

## Validation

- Lint command exits successfully (config found and parseable)
- All issues include file path and line number from the ESLint JSON `messages` array
- Fix suggestions are specific (not generic "fix this") — include exact code transformations
- Auto-fix changes do not break the build (run `ng build` check after fix)
- Report groups match actual ESLint rule names prefixed with `@angular-eslint/` or `@typescript-eslint/`
- Severity classification matches the JSON `severity` field (1=warning, 2=error)
- When `--strict` is set, warnings (severity=1) are escalated to errors in the report
