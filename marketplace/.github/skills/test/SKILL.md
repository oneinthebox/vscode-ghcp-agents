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

## Steps

1. Detect domain and test stack.
2. Check for overrides: `.github/skill-overrides/test/overrides.yaml`
3. Load domain-specific references: [references/{domain}/](references/)
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

## Validation

- All generated tests pass
- No duplicate test descriptions
- Mocking is done via ng-mocks (not manual mock classes)
- E2E selectors use data-testid
