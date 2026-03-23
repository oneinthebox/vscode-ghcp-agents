---
name: test
description: "Generate and manage tests — unit tests (Jest), e2e tests (Playwright for new, Cypress for legacy), component tests (TestBed + ng-mocks). Detects domain and applies the right test framework, patterns, and conventions. Use when writing tests, improving coverage, or migrating test frameworks."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(npx:*) Bash(ng:*) Bash(nx:*) Read Edit
---

## Domain Detection

Same as /generate — detect from active agent, project files, or file context.

## Capabilities

| Action | When to use |
|--------|------------|
| **Generate** | Write tests for existing code that lacks tests |
| **Improve** | Add edge cases, error scenarios, increase coverage |
| **Migrate** | Convert Karma → Jest, Cypress → Playwright |
| **Coverage** | Check coverage against thresholds, compare to baseline |

## Steps

1. Detect domain and test stack.
2. Load domain-specific references: [references/{domain}/](references/)
4. Load templates: [templates/{domain}/](templates/)
5. Study examples: [examples/{domain}/](examples/)
6. Determine action (generate, improve, or migrate) from user prompt.
7. Generate or modify test files.
8. Run tests to verify they pass.

## Test stack per domain

### Angular (@angular)
| Type | Framework | Reference |
|------|-----------|-----------|
| Unit tests | Jest + jest-preset-angular | [references/angular/jest-patterns.md](references/angular/jest-patterns.md) |
| Component tests | TestBed + ng-mocks | [references/angular/ng-mocks-patterns.md](references/angular/ng-mocks-patterns.md) |
| E2E (new) | Playwright | [references/angular/playwright-patterns.md](references/angular/playwright-patterns.md) |
| E2E (legacy) | Cypress | [references/angular/cypress-patterns.md](references/angular/cypress-patterns.md) |

### Testing rules (Angular)
- **Jest for all unit tests** — no Karma
- **Test behavior, not implementation** — assert what user sees, not internal state
- **ng-mocks for dependency mocking** — MockRender, MockProvider, MockComponent
- **data-testid for e2e selectors** — not CSS classes or text content
- **One assertion per test** (guideline, not rule)
- **Playwright for new e2e** — Cypress for existing only
- **Coverage script**: [scripts/angular/run-coverage.sh](scripts/angular/run-coverage.sh)

## Coverage Thresholds

### --min-coverage flag

When invoked with `--min-coverage {N}` (e.g., `/test --min-coverage 80`):
1. Run the test suite with coverage enabled: [scripts/angular/run-coverage.sh](scripts/angular/run-coverage.sh)
2. Parse the coverage summary output (lines, branches, functions, statements).
3. Compare each metric against the threshold.
4. Report pass/fail per metric.

### Baseline comparison

If a previous coverage snapshot exists in `.orch/audit/metrics/`:
1. Read the previous coverage numbers.
2. Compare against the current run.
3. Report delta per metric.
4. Flag any regression (current < previous) as a warning.

### Output

```markdown
## Coverage Report — {scope}
| Metric | Current | Threshold | Baseline | Delta | Status |
|--------|---------|-----------|----------|-------|--------|
| Lines | 78% | 70% | 75% | +3% | PASS |
| Branches | 62% | 60% | 64% | -2% | WARN (regression) |
| Functions | 81% | 70% | 80% | +1% | PASS |
| Statements | 79% | 70% | 76% | +3% | PASS |
```

### Default threshold

If no `--min-coverage` specified, default to 70% (org standard).
If the project has `.orch/workflow/` with a coverage baseline, use that instead.

## Workflow Integration

### Prerequisites

| Prerequisite | Why | Type |
|-------------|-----|------|
| Working build | Tests require compilable code | Mandatory |

### Post-actions (recommended)

After test generation: `/review` (recommended — catch anti-patterns in test code).

Update `.orch/workflow/` stage status to `completed` if running within a workflow.

## Validation

- All generated tests pass
- No duplicate test descriptions
- Mocking is done via ng-mocks (not manual mock classes)
- E2E selectors use data-testid
