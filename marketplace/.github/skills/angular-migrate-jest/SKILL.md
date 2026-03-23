---
name: angular-migrate-jest
description: "Migrate Angular unit tests from Karma/Jasmine to Jest. Replaces Karma config, installs Jest dependencies, converts test setup, adapts Jasmine-specific APIs to Jest equivalents, and verifies all tests pass under the new runner."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/jest-migration.md
allowed-tools: Bash(ng:*) Bash(nx:*) Bash(npx:*) Bash(npm:*) Bash(git:*) Read Edit
---

## Context

Migrates Angular projects from Karma + Jasmine test runner to Jest. This involves replacing the test infrastructure (config files, dependencies, test setup), converting Jasmine-specific APIs to Jest equivalents, and ensuring all existing tests pass under Jest. Karma is being deprecated in the Angular ecosystem; Jest provides faster execution, better IDE integration, and snapshot testing.

## Inputs

- **Scope** — Entire project or specific app in an Nx workspace.
- **Mode** (optional) — `--branch-only` (default) or `--worktree`.
- **Preserve Jasmine syntax** (optional) — `--keep-jasmine` to use `jest-jasmine2` runner instead of converting syntax.

## Steps

1. **Pre-flight checks.**
   - Verify clean git state. Stop if dirty.
   - Create migration branch: `migrate/jest-{date}`.
   - Record current test count: run `ng test` and capture spec count.

2. **Analyze current state.**
   - Read `karma.conf.js` for current configuration.
   - Read `src/test.ts` for test setup.
   - Count `.spec.ts` files.
   - Identify Jasmine-specific APIs in use: `jasmine.createSpy`, `jasmine.SpyObj`, `jasmine.clock()`, custom matchers.

3. **Load reference.** Read [references/angular/v19/jest-migration.md](references/angular/v19/jest-migration.md) for migration steps and common pitfalls.

4. **Phase 1: Install Jest dependencies.**
   - Install: `jest`, `@types/jest`, `jest-preset-angular`, `ts-jest`.
   - Remove: `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`, `karma-jasmine-html-reporter`.
   - Update `package.json` test script from `ng test` to `jest`.
   - Commit checkpoint.

5. **Phase 2: Configure Jest.**
   - Create `jest.config.ts` with `jest-preset-angular` preset.
   - Create `setup-jest.ts` with `import 'jest-preset-angular/setup-jest'`.
   - Update `tsconfig.spec.json`: change `types` from `jasmine` to `jest`.
   - Remove `karma.conf.js`.
   - Remove `src/test.ts`.
   - Update `angular.json` to remove Karma builder if present.
   - Commit checkpoint.

6. **Phase 3: Convert test syntax** (unless `--keep-jasmine`).
   - Convert `jasmine.createSpy('name')` to `jest.fn()`.
   - Convert `jasmine.createSpyObj('Name', ['method'])` to manual mock objects with `jest.fn()`.
   - Convert `jasmine.clock().install()` / `mockDate()` to `jest.useFakeTimers()`.
   - Convert `spyOn(obj, 'method').and.returnValue(val)` to `jest.spyOn(obj, 'method').mockReturnValue(val)`.
   - Convert `.and.callThrough()` to `.mockCallThrough()` or remove (Jest default).
   - Convert `.and.callFake(fn)` to `.mockImplementation(fn)`.
   - Convert `.toHaveBeenCalledTimes()` — same API, no change.
   - Convert custom Jasmine matchers to Jest custom matchers.
   - Commit checkpoint.

7. **Phase 4: Fix and verify.**
   - Run `jest` and capture results.
   - Fix failures (common issues: async test timing, zone.js interactions, module resolution).
   - Re-run until all tests pass.
   - Compare test count: must be same or higher.
   - Commit checkpoint.

8. **Report results.**

## Output

```markdown
## Jest Migration Complete

| Phase | Action | Status |
|-------|--------|--------|
| 1 | Dependencies installed | Done |
| 2 | Jest configured, Karma removed | Done |
| 3 | Test syntax converted | Done ({n} files) |
| 4 | All tests passing | Done |

Test count before: {n} (Karma/Jasmine)
Test count after: {n} (Jest)
Files removed: karma.conf.js, src/test.ts
Files created: jest.config.ts, setup-jest.ts
Execution time: {before}s (Karma) → {after}s (Jest)
```

## Validation

- `jest` runs successfully with exit code 0.
- Test count after migration >= test count before migration.
- No Karma dependencies remain in `package.json`.
- No `karma.conf.js` file exists.
- `tsconfig.spec.json` references `jest` types, not `jasmine`.
- All `.spec.ts` files use Jest APIs (unless `--keep-jasmine`).
- `ng build` still passes (test migration should not affect production code).
- Each phase has a git checkpoint.
