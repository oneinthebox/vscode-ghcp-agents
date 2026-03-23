---
name: angular-refactor
description: "Modernize Angular code to current v19 best practices — improve readability, apply current conventions, replace deprecated patterns. Targeted improvements to individual files or modules, not full project migrations. Use when cleaning up or modernizing specific code."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/best-practices.md
allowed-tools: Bash(ng:*) Bash(nx:*) Bash(npx:*) Read Edit
---

## Context

Applies targeted modernization to Angular code. Unlike `/angular-migrate-*` skills that perform project-wide transformations, this skill focuses on improving individual files or small modules to follow current v19 conventions. It reads the code, identifies outdated patterns, applies improvements, and verifies nothing breaks.

## Inputs

- **Target** — File path, component name, service name, or module to refactor.
- **Focus** (optional) — Specific concern: `readability`, `performance`, `conventions`, `types`, or `all` (default).
- **Dry run** (optional) — `--dry-run` to show proposed changes without applying them.

## Steps

1. **Read the target file(s).** Understand the current code, its purpose, and dependencies.

2. **Load reference.** Read [references/angular/v19/best-practices.md](references/angular/v19/best-practices.md) for current conventions and patterns.

3. **Identify modernization opportunities.** Check for:

   | Old Pattern | Modern Pattern | Priority |
   |------------|---------------|----------|
   | Constructor injection | `inject()` function | High |
   | `@Input()` / `@Output()` decorators | `input()` / `output()` signals | High |
   | `ngOnInit` + `subscribe()` | `effect()` or `computed()` | High |
   | `ngOnChanges` | Signal inputs with `computed()` / `effect()` | High |
   | `*ngIf` / `*ngFor` in templates | `@if` / `@for` control flow | High |
   | Mutable class properties | `signal()` for reactive state | Medium |
   | Large component (300+ lines) | Extract child components | Medium |
   | Inline template logic | Pipe or `computed()` signal | Medium |
   | `any` type | Proper interface or type alias | Medium |
   | `console.log` | `LoggingService` from `@yourorg/elevate` | Medium |
   | Manual `unsubscribe` / `takeUntil` | Signals (auto-cleanup) or `DestroyRef` | Medium |
   | Class-based guards/resolvers | Functional guards/resolvers | Low |
   | `NgModule` imports for single component | Standalone with direct imports | Low |
   | Verbose `switch` statements | Mapped object or strategy pattern | Low |

4. **Present findings.** If not `--dry-run`, show the list of proposed changes and their rationale.

5. **Apply changes.** For each identified pattern:
   - Apply the modern equivalent.
   - Preserve behavior (refactoring must not change functionality).
   - Update related tests if they reference changed APIs.

6. **Run build verification.** Execute `ng build` to confirm compilation.

7. **Run tests.** Execute `ng test` for the affected files to confirm no regressions.

8. **Report results.**

## Output

```markdown
## Refactor Complete — {target}

| Pattern | Old | New | Occurrences |
|---------|-----|-----|-------------|
| DI style | constructor injection | inject() | {n} |
| Inputs | @Input() | input() | {n} |
| Control flow | *ngIf/*ngFor | @if/@for | {n} |
| State | mutable property | signal() | {n} |

Files modified: {n}
Lines changed: +{added} / -{removed}
Build: {pass|fail}
Tests: {pass|fail}
```

## Validation

- `ng build` passes after all changes.
- All `ng test` specs pass (no regressions).
- Refactored file is same length or shorter (should not add complexity).
- No behavior changes (pure refactoring).
- Linter passes with no new warnings.
- All public APIs retain TSDoc (update if signatures changed).
- No `any` types introduced during refactoring.
