---
name: angular-migrate-playwright
description: "Migrate Angular end-to-end tests from Cypress to Playwright. Replaces Cypress config, installs Playwright dependencies, converts test files with page object models, adapts selectors and assertions, and verifies all e2e tests pass."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/playwright-migration.md
  - references/angular/v19/cypress-to-playwright-migration.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Migrates Angular end-to-end tests from Cypress to Playwright. Unlike mechanical migrations, e2e test conversion requires semantic understanding of test intent, page interactions, and assertion patterns. The agent converts test files, adapts selectors, translates Cypress commands to Playwright equivalents, and establishes page object models where appropriate.

## Inputs

- **Scope** — Entire e2e suite or specific test files.
- **Mode** (optional) — `--branch-only` (default) or `--worktree`.
- **Base URL** (optional) — Application URL for e2e tests. Defaults to value in Cypress config.

### Helper Script

Run the detection script before executing steps manually:
```bash
node scripts/detect-cypress-specs.js [project-root]
```
The script outputs JSON to stdout with Cypress spec inventory, custom commands, and support file details. Use this data to inform the steps below.

## Steps

1. **Pre-flight checks.**
   - Check git state. If only .github/, .orch/, .vscode/, node_modules/ are dirty — IGNORE (ORCH infrastructure). NEVER stop for dirty git state.
   - Create migration branch: `migrate/playwright-{date}`.
   - Record current e2e test count from Cypress.

2. **Analyze current state.**
   - Read `cypress.config.ts` / `cypress.config.js` for base URL, viewports, timeouts.
   - Inventory Cypress test files (`cypress/e2e/**/*.cy.ts`).
   - Identify Cypress-specific patterns: `cy.intercept`, `cy.fixture`, custom commands, `cy.wait`.
   - Identify page objects or support files.

3. **Load reference.** Read [references/angular/v19/playwright-migration.md](references/angular/v19/playwright-migration.md) and [references/angular/v19/cypress-to-playwright-migration.md](references/angular/v19/cypress-to-playwright-migration.md) for migration patterns and API mappings.

4. **Phase 1: Install Playwright.**
   - Install: `@playwright/test`.
   - Run: `npx playwright install` to download browsers.
   - Create `playwright.config.ts` with settings from Cypress config (base URL, timeouts, viewport).
   - Configure `webServer` block to start the Angular dev server.
   - Commit checkpoint.

5. **Phase 2: Convert test files** (semantic, agent-driven).
   - For each Cypress test file, create a Playwright equivalent:
     - `describe` / `it` to `test.describe` / `test`.
     - `cy.visit(url)` to `await page.goto(url)`.
     - `cy.get('selector')` to `page.locator('selector')`.
     - `cy.get('[data-testid="x"]')` to `page.getByTestId('x')`.
     - `cy.contains('text')` to `page.getByText('text')`.
     - `.click()` to `await locator.click()`.
     - `.type('text')` to `await locator.fill('text')`.
     - `.should('be.visible')` to `await expect(locator).toBeVisible()`.
     - `.should('have.text', 'x')` to `await expect(locator).toHaveText('x')`.
     - `cy.intercept` to `page.route` for network mocking.
     - `cy.fixture` to local JSON imports or `page.route` responses.
     - `cy.wait('@alias')` to `await page.waitForResponse(url)`.
     - `beforeEach` hooks to Playwright `test.beforeEach`.
   - Create page objects where Cypress tests had reusable selectors.
   - Commit checkpoint.

6. **Phase 3: Convert custom commands and support files.**
   - Cypress custom commands to Playwright fixtures or helper functions.
   - Cypress support files to Playwright global setup/teardown.
   - Commit checkpoint.

7. **Phase 4: Remove Cypress.**
   - Remove `cypress` and related packages from `package.json`.
   - Remove `cypress.config.ts`, `cypress/` directory.
   - Update `angular.json` to remove Cypress e2e target if present.
   - Update CI config if applicable.
   - Commit checkpoint.

8. **Phase 5: Verify.**
   - Run `npx playwright test` and capture results.
   - Fix failures (common: timing issues, selector differences, async handling).
   - Compare test count: must match original Cypress count.
   - Commit checkpoint.

9. **Report results.**

## Output

```markdown
## Playwright Migration Complete

| Phase | Action | Status |
|-------|--------|--------|
| 1 | Playwright installed and configured | Done |
| 2 | Test files converted | Done ({n} files) |
| 3 | Custom commands converted | Done ({n} commands) |
| 4 | Cypress removed | Done |
| 5 | All e2e tests passing | Done |

Test count before: {n} (Cypress)
Test count after: {n} (Playwright)
Page objects created: {n}
Files removed: cypress.config.ts, cypress/ directory
Files created: playwright.config.ts, e2e/ directory
```

## Validation

- `npx playwright test` passes with exit code 0.
- E2e test count after migration >= test count before migration.
- No Cypress dependencies remain in `package.json`.
- No `cypress.config.ts` or `cypress/` directory exists.
- All Playwright tests use `async/await` correctly.
- Network mocking uses `page.route` (not leftover `cy.intercept` patterns).
- Selectors prefer `getByTestId`, `getByRole`, `getByText` over raw CSS selectors.
- `ng build` still passes (e2e migration should not affect production code).
- Each phase has a git checkpoint.
