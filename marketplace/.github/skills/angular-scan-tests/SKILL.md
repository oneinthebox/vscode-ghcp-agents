---
name: angular-scan-tests
description: "Inventory tests: unit, e2e, and smoke counts, coverage percentage, and gap analysis"
references: []
allowed-tools:
  - codebase
  - terminal
---

## Context

Scans the project's test infrastructure to produce a complete test inventory. Counts tests by type, measures coverage, identifies untested code, and highlights test quality issues. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan tests" — full test inventory with coverage and gap analysis
- "What's our test coverage?" — coverage percentage breakdown by project/module
- "Find untested code" — gap analysis showing components/services without tests
- "Test health check" — test quality assessment (flaky, slow, skipped)

## Steps

1. **Detect test frameworks** — check `package.json` devDependencies and config files:
   - **Jest**: look for `jest` or `@jest/core` in devDependencies, and config files: `jest.config.ts`, `jest.config.js`, `jest.preset.js`. Check for `@angular-builders/jest` (Angular Jest integration).
   - **Karma/Jasmine**: look for `karma`, `karma-jasmine`, `karma-chrome-launcher` in devDependencies, and `karma.conf.js`. This is the default Angular test runner (pre-v19).
   - **Vitest**: look for `vitest` in devDependencies and `vitest.config.ts`.
   - **Playwright**: look for `@playwright/test` in devDependencies and `playwright.config.ts`.
   - **Cypress**: look for `cypress` in devDependencies and `cypress.config.ts` or `cypress.json`.
   - Record each framework's version and config file path.

2. **Scan for test files** — glob across the workspace:
   - Unit/integration specs: `**/*.spec.ts`, `**/*.test.ts` (excluding `node_modules`, `dist`)
   - E2E specs: `**/e2e/**/*.spec.ts`, `**/e2e/**/*.e2e-spec.ts`, `**/*.e2e.ts`, `cypress/e2e/**/*.cy.ts`
   - Page objects: `**/*.po.ts`
   - Test utilities/helpers: `**/test-utils.ts`, `**/testing/**/*.ts`, `**/*.mock.ts`, `**/*.stub.ts`

3. **Classify tests by type** — for each `.spec.ts` file, determine the test type:
   - **Unit test**: the spec file tests a service, pipe, directive, or utility function with no `TestBed` usage. Example:
     ```typescript
     describe('FormatDatePipe', () => {
       const pipe = new FormatDatePipe();
       it('should format ISO date', () => {
         expect(pipe.transform('2026-03-25')).toBe('Mar 25, 2026');
       });
     });
     ```
   - **Integration test (component test)**: the spec uses `TestBed.configureTestingModule` and renders a component. Example:
     ```typescript
     describe('DashboardComponent', () => {
       beforeEach(() => TestBed.configureTestingModule({
         imports: [DashboardComponent],
         providers: [provideHttpClientTesting()]
       }));
       it('should render stats cards', () => {
         const fixture = TestBed.createComponent(DashboardComponent);
         fixture.detectChanges();
         expect(fixture.nativeElement.querySelectorAll('app-stats-card').length).toBe(4);
       });
     });
     ```
   - **E2E test**: spec file is under `e2e/`, `cypress/`, or uses Playwright/Cypress APIs (`page.goto`, `cy.visit`).
   - **Classification heuristic**: search each spec file for `TestBed` → integration; `page.goto` or `cy.visit` → e2e; otherwise → unit.

4. **Run test suite with coverage** — execute the appropriate command:
   - Jest: `npx ng test --code-coverage --watch=false` or `npx jest --coverage`
   - Karma: `npx ng test --code-coverage --watch=false --browsers=ChromeHeadless`
   - Vitest: `npx vitest run --coverage`
   - The coverage report is written to `coverage/` directory.

5. **Parse coverage report** — locate and parse the coverage output:
   - **lcov format** (`coverage/lcov.info`): parse `SF:` (source file), `LF:` (lines found), `LH:` (lines hit), `BRF:` (branches found), `BRH:` (branches hit), `FNF:` (functions found), `FNH:` (functions hit).
     ```
     SF:src/app/core/services/order.service.ts
     FNF:12
     FNH:10
     LF:85
     LH:72
     BRF:18
     BRH:14
     end_of_record
     ```
     Per-file coverage: `line_coverage = LH / LF * 100`, `branch_coverage = BRH / BRF * 100`, `function_coverage = FNH / FNF * 100`.
   - **Istanbul JSON** (`coverage/coverage-summary.json`): parse `total` and per-file entries with `lines.pct`, `branches.pct`, `functions.pct`, `statements.pct`.
   - **Overall coverage**: weighted average across all files, or read from `total` in the JSON summary.

6. **Perform gap analysis** — identify untested code:
   - Glob all source files: `**/*.component.ts`, `**/*.service.ts`, `**/*.pipe.ts`, `**/*.directive.ts`, `**/*.guard.ts`, `**/*.resolver.ts`, `**/*.interceptor.ts`.
   - For each source file, check if a corresponding `.spec.ts` exists (same name, same directory or `__tests__/` directory).
   - **Gap detection algorithm for untested public methods**:
     1. For each source file with a spec, parse the source for public method names.
     2. In the spec file, search for those method names inside `it()` or `test()` blocks.
     3. A public method is "untested" if its name does not appear in any test description or assertion in the spec.
     ```
     Example:
     Source: order.service.ts → public methods: getOrders(), createOrder(), deleteOrder()
     Spec: order.service.spec.ts → tests: 'should get orders', 'should create order'
     Gap: deleteOrder() has no corresponding test
     ```
   - Flag files with spec files that have 0% coverage (indicates all tests are skipped or empty).

7. **Assess test quality** — scan spec files for quality issues:
   - **Skipped tests**: count `xdescribe`, `xit`, `fdescribe`, `fit`, `test.skip`, `describe.skip`, `it.skip`, `test.only`, `describe.only`. Note: `fdescribe`/`fit` are focused tests that skip all others — flag as risk.
   - **Empty assertions**: detect `it('should ...', () => {})` or `it('should ...', () => { expect(true).toBe(true); })` — tests that assert nothing meaningful.
   - **Weak component tests**: detect `NO_ERRORS_SCHEMA` in `TestBed.configureTestingModule` — this suppresses unknown element errors and hides template bugs.
     ```typescript
     // Anti-pattern to detect:
     TestBed.configureTestingModule({
       schemas: [NO_ERRORS_SCHEMA]  // Hides template compilation errors
     });
     ```
   - **Async handling**: detect tests that call async code without `fakeAsync`/`tick`, `waitForAsync`, or `async/await` — potential false positives.
   - **Test isolation**: detect tests that share mutable state (variables declared in `describe` but modified in `it` without `beforeEach` reset).

8. **Apply coverage thresholds and produce the output report**:
   - **Overall thresholds**: PASS >= 80%, WARN 60%-79%, FAIL < 60%
   - **Per-module thresholds**: PASS >= 70%, WARN 40%-69%, FAIL < 40%
   - **Critical gap threshold**: any `.service.ts` or `.guard.ts` with 0% coverage or no spec file is flagged as Critical.

## Output

```markdown
## Test Scan — {project_name}

### Summary
| Metric | Count | Status | Threshold |
|--------|-------|--------|-----------|
| Unit tests | 124 | — | — |
| Integration tests (TestBed) | 48 | — | — |
| E2E tests (Playwright) | 18 | — | — |
| Total test files | 62 | — | — |
| Skipped tests | 7 | WARN | 0 = PASS, 1-10 = WARN, >10 = FAIL |
| Overall line coverage | 68% | WARN | >=80% PASS, >=60% WARN, <60% FAIL |
| Overall branch coverage | 55% | WARN | >=70% PASS, >=50% WARN, <50% FAIL |
| Overall function coverage | 72% | WARN | >=80% PASS, >=60% WARN, <60% FAIL |
| Files with no spec | 11 of 52 | FAIL | 0 = PASS, 1-5 = WARN, >5 = FAIL |

### Coverage by Module
| Module/Feature | Source Files | Spec Files | Line Coverage | Branch Coverage | Function Coverage | Status |
|---------------|-------------|-----------|---------------|-----------------|-------------------|--------|
| `core/services` | 8 | 8 | 82% | 71% | 85% | PASS |
| `core/models` | 5 | 4 | 90% | 80% | 95% | PASS |
| `core/guards` | 3 | 3 | 78% | 65% | 80% | WARN |
| `core/interceptors` | 3 | 2 | 60% | 45% | 65% | WARN |
| `feature-dashboard` | 8 | 6 | 62% | 48% | 58% | WARN |
| `feature-reports` | 6 | 4 | 45% | 32% | 50% | FAIL |
| `feature-settings` | 5 | 3 | 55% | 40% | 60% | WARN |
| `feature-admin` | 4 | 2 | 38% | 25% | 42% | FAIL |
| `shared-ui` | 7 | 5 | 70% | 55% | 75% | WARN |
| `shared/pipes` | 3 | 3 | 95% | 90% | 100% | PASS |
| **Total** | **52** | **40** | **68%** | **55%** | **72%** | **WARN** |

### Coverage Detail (per-file, sorted by lowest coverage)
| File | Line % | Branch % | Function % | Status |
|------|--------|----------|------------|--------|
| `admin/user-management.component.ts` | 22% | 10% | 30% | FAIL |
| `reports/report-builder.component.ts` | 30% | 18% | 35% | FAIL |
| `reports/report-export.component.ts` | 35% | 22% | 40% | FAIL |
| `settings/notif-prefs.component.ts` | 40% | 28% | 45% | FAIL |
| `interceptors/loading.interceptor.ts` | 42% | 30% | 50% | FAIL |
| ... | ... | ... | ... | ... |

### Gap Analysis — Untested Files (no spec exists)
| File | Type | Public Methods | Severity |
|------|------|---------------|----------|
| `src/app/core/interceptors/error.interceptor.ts` | Interceptor | `intercept()` | Critical |
| `src/app/features/admin/admin-stats.component.ts` | Component | `ngOnInit()`, `refresh()` | High |
| `src/app/features/admin/role-editor.component.ts` | Component | `onSave()`, `validate()` | High |
| `src/app/features/reports/chart-config.service.ts` | Service | `getConfig()`, `setDefaults()` | Critical |
| `src/app/features/settings/theme.service.ts` | Service | `toggle()`, `getCurrentTheme()` | Critical |
| `src/app/shared/directives/tooltip.directive.ts` | Directive | `show()`, `hide()` | Medium |
| `src/app/shared/directives/click-outside.directive.ts` | Directive | — (host listener only) | Low |
| `src/app/features/dashboard/dashboard-filter.component.ts` | Component | `onFilterChange()`, `reset()` | High |
| `src/app/features/dashboard/export-dialog.component.ts` | Component | `onExport()` | Medium |
| `src/app/features/reports/report-filter.component.ts` | Component | `applyFilters()`, `clearFilters()` | Medium |
| `src/app/shared/pipes/truncate.pipe.ts` | Pipe | `transform()` | Low |

### Gap Analysis — Untested Public Methods (spec exists but method not tested)
| File | Method | Spec File Exists? | Notes |
|------|--------|-------------------|-------|
| `order.service.ts` | `deleteOrder()` | Yes | Method name absent from any test block |
| `order.service.ts` | `bulkUpdate()` | Yes | Method name absent from any test block |
| `auth.service.ts` | `refreshToken()` | Yes | Only tested in happy path, no error case |
| `dashboard.component.ts` | `exportData()` | Yes | No test covers this method |
| `data-table.component.ts` | `onSort()`, `onPageChange()` | Yes | Event handlers untested |

### Test Quality Issues
| Issue | Count | Severity | Files |
|-------|-------|----------|-------|
| Skipped tests (`xit`/`xdescribe`) | 5 | Medium | `dashboard.component.spec.ts` (2), `report-builder.component.spec.ts` (2), `auth.service.spec.ts` (1) |
| Focused tests (`fdescribe`/`fit`) | 1 | High | `order.service.spec.ts` — will cause other tests to skip in CI |
| Empty assertions | 3 | High | `settings.component.spec.ts` (2), `admin.component.spec.ts` (1) |
| `NO_ERRORS_SCHEMA` usage | 4 | Medium | `dashboard.component.spec.ts`, `reports-list.component.spec.ts`, `settings.component.spec.ts`, `admin.component.spec.ts` |
| Missing async handling | 2 | Medium | `websocket.service.spec.ts`, `notification.service.spec.ts` — subscribe without `fakeAsync` |
| `test.skip` / `describe.skip` | 2 | Medium | `user-management.component.spec.ts` (1), `report-detail.component.spec.ts` (1) |

### Framework Config
| Framework | Version | Config File | Purpose | Runner |
|-----------|---------|-------------|---------|--------|
| Jest | 29.7.0 | `jest.config.ts` | Unit & integration tests | `ng test` / `nx test` |
| @angular-builders/jest | 19.0.0 | `angular.json` | Angular-Jest bridge | — |
| Playwright | 1.42.0 | `playwright.config.ts` | E2E tests | `npx playwright test` |
| istanbul (via Jest) | — | `jest.config.ts` → `coverageReporters` | Coverage reporting | lcov, json-summary |

### Test Infrastructure Health
| Aspect | Status | Notes |
|--------|--------|-------|
| Test runner configured | PASS | Jest via @angular-builders/jest |
| Coverage reporting | PASS | Istanbul lcov + json-summary |
| E2E framework | PASS | Playwright configured |
| CI test execution | PASS | `nx affected:test --code-coverage` in CI |
| Coverage enforcement | WARN | No `coverageThreshold` in `jest.config.ts` — coverage can silently regress |
| Test file co-location | PASS | Spec files co-located with source files |
```

## Validation

- **Test file count accuracy**: the number of spec files reported must match the count from `find src -name '*.spec.ts' | wc -l` (or equivalent glob). The total test count (unit + integration + e2e) must be reconcilable with the number of `it()` / `test()` blocks in those files.
- **Coverage from actual execution**: coverage percentages must come from running the test suite with `--code-coverage`. Verify by checking that `coverage/lcov.info` or `coverage/coverage-summary.json` was generated by the test run. Never estimate coverage from code inspection alone.
- **lcov parsing accuracy**: for at least 2 files, manually verify the lcov record:
  - Open `coverage/lcov.info`, find the `SF:` entry for the file
  - Confirm `LH / LF * 100` matches the reported line coverage percentage
  - Confirm `BRH / BRF * 100` matches the reported branch coverage percentage
- **Gap analysis completeness**: every source file (`*.component.ts`, `*.service.ts`, `*.pipe.ts`, `*.directive.ts`, `*.guard.ts`, `*.resolver.ts`, `*.interceptor.ts`) must be checked for a corresponding spec file. The count of source files without specs must match the Gap Analysis table row count.
- **Skipped test count accuracy**: search all spec files for `xit(`, `xdescribe(`, `fit(`, `fdescribe(`, `test.skip(`, `describe.skip(`, `it.skip(` and verify the total matches the reported count.
- **NO_ERRORS_SCHEMA detection**: search all spec files for `NO_ERRORS_SCHEMA` and verify the count matches the report.
- **Threshold application**: the Status column must correctly apply the stated thresholds. For example, 68% line coverage with threshold ">=80% PASS, >=60% WARN, <60% FAIL" must be WARN.
- **No modifications**: confirm that no source files were modified. The only artifacts are coverage reports in `coverage/` directory (expected side effect of running tests).
