---
name: angular-scan-tests
description: "Inventory tests: unit, e2e, and smoke counts, coverage percentage, and gap analysis"
---

## Context

Scans the project's test infrastructure to produce a complete test inventory. Counts tests by type, measures coverage, identifies untested code, and highlights test quality issues. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan tests" — full test inventory with coverage and gap analysis
- "What's our test coverage?" — coverage percentage breakdown by project/module
- "Find untested code" — gap analysis showing components/services without tests
- "Test health check" — test quality assessment (flaky, slow, skipped)

## Steps

1. Detect test frameworks from `package.json` and config files: Jest (`jest.config`), Karma (`karma.conf`), Jasmine, Playwright (`playwright.config`), Cypress (`cypress.config`), Vitest.
2. Scan for test files: `*.spec.ts`, `*.test.ts`, `*.e2e-spec.ts`, `*.po.ts` (page objects).
3. Count tests by type:
   - Unit tests: `*.spec.ts` co-located with source files
   - Integration tests: TestBed-based component tests
   - E2E tests: Playwright/Cypress spec files
   - Smoke tests: if a smoke test suite is defined
4. Run test suite with coverage enabled (e.g., `ng test --code-coverage --watch=false`).
5. Parse coverage report (`coverage/lcov.info` or `coverage-summary.json`) for:
   - Line coverage, branch coverage, function coverage per file
   - Overall coverage percentage
6. Perform gap analysis:
   - List all `.component.ts`, `.service.ts`, `.pipe.ts`, `.directive.ts` files
   - Match each against corresponding `.spec.ts` — flag files with no test
   - Identify files with test files but 0% coverage (empty or skipped tests)
7. Assess test quality:
   - Count `xdescribe`, `xit`, `test.skip` — skipped tests
   - Identify tests with no assertions (empty `it` blocks)
   - Flag test files that import `NO_ERRORS_SCHEMA` (weak component tests)
8. Produce the output report.

## Output

```markdown
## Test Scan — {project_name}

### Summary
| Metric | Count |
|--------|-------|
| Unit tests | {n} |
| Integration tests | {n} |
| E2E tests | {n} |
| Skipped tests | {n} |
| Overall coverage | {n}% |

### Coverage by Module
| Module/Feature | Files | Covered | Coverage % |

### Gap Analysis — Untested Files
| File | Type | Reason |

### Test Quality Issues
| Issue | Count | Files |
|-------|-------|-------|
| Skipped tests (xit/xdescribe) | {n} | {list} |
| No assertions | {n} | {list} |
| NO_ERRORS_SCHEMA usage | {n} | {list} |

### Framework Config
| Framework | Version | Config File | Purpose |
```

## Validation

- Test counts match actual spec file counts on disk
- Coverage data comes from actual test execution, not estimation
- Gap analysis cross-references all source files against spec files
- Skipped test counts match actual `xit`/`xdescribe`/`skip` occurrences
- No files are modified during the scan
