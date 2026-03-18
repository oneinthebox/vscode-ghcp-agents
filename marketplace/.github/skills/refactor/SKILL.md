---
name: refactor
description: "Modernize existing code to current best practices — update patterns, improve readability, apply current conventions. Not a full migration — targeted improvements to individual files or modules. Use when cleaning up code, not when upgrading versions."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(ng:*) Bash(nx:*) Read Edit
---

## Domain Detection

Same as /generate — detect from active agent, project files, or file context.

## Steps

1. Detect domain and project version.
2. Check for overrides: `.github/skill-overrides/refactor/overrides.yaml`
3. Load domain-specific reference: [references/{domain}.md](references/)
4. Study before/after examples: [examples/{domain}/](examples/)
5. Read the target file(s).
6. Identify modernization opportunities based on current version's best practices.
7. Apply changes.
8. Run build + tests to verify no regressions.

## Refactor vs Migrate

| | /refactor | /migrate |
|--|----------|---------|
| **Scope** | One file or small module | Entire project or feature |
| **Goal** | Modernize patterns | Change versions or frameworks |
| **Risk** | Low — targeted changes | Medium/high — broad changes |
| **Build step** | Verify after each file | Verify after each migration phase |

Use `/refactor` for: "clean up this service", "modernize this component"
Use `/migrate` for: "upgrade to Angular 19", "switch from Karma to Jest"

## Angular refactoring patterns

| Old pattern | Modern pattern | When to apply |
|------------|---------------|--------------|
| Constructor injection | `inject()` function | Angular 18+ |
| `ngOnInit` + subscribe | Signal or async pipe | All versions |
| `ngOnChanges` | Signal inputs with `effect()` | Angular 19 |
| Mutable class properties | Signals | Angular 18+ |
| Large component (300+ lines) | Extract child components | All versions |
| Inline template logic | Pipe or computed signal | All versions |
| `any` type | Proper interface | All versions |
| `console.log` | `@yourorg/elevate` LoggingService | All versions |

## Validation

- Build passes after refactoring
- All tests still pass (no regressions)
- File is shorter or same length (refactoring shouldn't add complexity)
- Linter passes
