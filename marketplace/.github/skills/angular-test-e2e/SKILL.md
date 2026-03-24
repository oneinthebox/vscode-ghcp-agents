---
name: angular-test-e2e
description: "Generate Playwright end-to-end tests for Angular apps. Page object pattern, data-testid selectors, fixtures for auth and test data. Produces tests that run headless or headed."
references:
  - references/angular/v19/playwright-guide.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates Playwright e2e tests for Angular applications. Uses the page object model for maintainability, `data-testid` attributes for resilient selectors, and Playwright fixtures for shared setup (authentication, seed data, intercepted APIs). All new e2e tests use Playwright; Cypress is legacy-only.

## Inputs

- **target**: Feature, route, or user flow to test (e.g., "login flow", "dashboard filtering")
- Optional: `--headed` — generate config for headed mode debugging
- Optional: `--fixtures` — also generate fixture files for auth/data setup
- Optional: `--parallel` — configure sharded parallel execution

## Steps

1. Identify the feature scope: routes involved, components rendered, APIs called.
2. Load Playwright conventions from `references/angular/v19/playwright-guide.md`.
3. Create or update the page object class in `e2e/pages/`:
   a. Locators use `data-testid` attributes exclusively.
   b. Methods represent user actions (e.g., `login(user)`, `filterByDate(range)`).
   c. Assertions as helper methods (e.g., `expectRowCount(n)`).
4. Generate the test spec in `e2e/specs/`:
   a. Arrange: use fixtures for auth state and test data.
   b. Act: call page object methods for user actions.
   c. Assert: verify visible outcomes (text, element counts, URLs).
5. Generate fixtures if `--fixtures` specified:
   a. Auth fixture: login via API, store state for reuse.
   b. Data fixture: seed or intercept API responses.
6. Run `npx playwright test {spec_file}` to verify tests pass.
7. If any `data-testid` attributes are missing in the app, list them for the developer to add.

## Output

```markdown
## E2E Tests Generated — {feature}

### Files Created
| File                          | Purpose              |
|-------------------------------|----------------------|
| `e2e/pages/{Feature}Page.ts`  | Page object          |
| `e2e/specs/{feature}.spec.ts` | Test spec            |
| `e2e/fixtures/{name}.ts`      | Fixture (if created) |

### Test Scenarios
| # | Scenario                        | Steps | Assertions |
|---|--------------------------------|-------|------------|
| 1 | {user flow description}         | {n}   | {n}        |

### Missing data-testid (action required)
| Component | Element | Suggested testid        |
|-----------|---------|-------------------------|
| {comp}    | {elem}  | `data-testid="{value}"`  |
```

## Validation

- All generated tests pass in headless mode
- Selectors use `data-testid` exclusively (no CSS classes, no text content)
- Page object pattern used (no raw locators in spec files)
- Fixtures handle auth and data setup (no login steps in every test)
- No hardcoded wait times (`page.waitForTimeout`) — use Playwright auto-waiting
- Test descriptions are user-flow oriented, not implementation-oriented
