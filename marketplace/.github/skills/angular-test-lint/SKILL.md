---
name: angular-test-lint
description: "Run ng lint on the project, report issues grouped by severity and rule, and suggest auto-fixable corrections. Produces a structured lint report with actionable fix suggestions."
references: []
---

## Context

Runs the Angular project linter (`ng lint` or `npx eslint`) and produces a structured report. Groups issues by severity and rule, identifies auto-fixable problems, and provides specific fix suggestions for manual issues. Designed for pre-commit or pre-PR quality gates.

## Inputs

- Optional: `--scope {path}` — lint specific directory or file instead of full project
- Optional: `--fix` — apply auto-fixable corrections automatically
- Optional: `--strict` — treat warnings as errors
- Optional: `--report-only` — skip fix suggestions, just report

## Steps

1. Detect the lint configuration: `.eslintrc.*`, `eslint.config.*`, or `angular.json` lint target.
2. Run `ng lint` (or `npx eslint` if no Angular CLI target) with JSON output format.
3. Parse the JSON output into a structured issue list.
4. Group issues by:
   a. Severity: error, warning.
   b. Rule name (e.g., `@angular-eslint/no-empty-lifecycle-method`).
   c. File path.
5. For each issue group, determine if auto-fixable (`--fix` flag support).
6. For non-fixable issues, generate a specific fix suggestion with code snippet.
7. If `--fix` specified, run `ng lint --fix` and report what was auto-corrected.
8. Produce the structured lint report.

## Output

```markdown
## Lint Report — {scope}

### Summary
| Metric           | Value |
|------------------|-------|
| Files scanned    | {n}   |
| Errors           | {n}   |
| Warnings         | {n}   |
| Auto-fixable     | {n}   |

### Issues by Rule
| Rule                              | Count | Severity | Fixable |
|-----------------------------------|-------|----------|---------|
| `@angular-eslint/{rule}`          | {n}   | error    | Yes/No  |

### Top Issues (detail)
#### {rule-name} ({count} occurrences)
**Files:** `{file}:{line}`, ...
**What:** {explanation of the rule violation}
**Fix:** {specific code change suggestion}

### Auto-fixed (if --fix used)
| Rule          | Files Fixed | Changes |
|---------------|-------------|---------|
```

## Validation

- Lint command exits successfully (config found and parseable)
- All issues include file path and line number
- Fix suggestions are specific (not generic "fix this")
- Auto-fix changes do not break the build (run build check after fix)
- Report groups match actual ESLint rule names
