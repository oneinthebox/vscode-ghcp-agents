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

BDD-driven end-to-end testing using Cucumber (Gherkin feature files) with Playwright as the automation engine. Feature files define application behavior in business-readable language using Given/When/Then syntax. Step definitions implement those scenarios using the Playwright browser automation API. The Page Object Model pattern is used for maintainability and reuse across step definitions.

This approach bridges the gap between business stakeholders and technical testers — feature files serve as living documentation that is directly executable. Cucumber parses Gherkin, maps steps to TypeScript implementations, and Playwright drives real browsers to validate behavior.

### Technology Stack

| Layer              | Tool                                  |
|--------------------|---------------------------------------|
| BDD Framework      | `@cucumber/cucumber`                  |
| Browser Automation | `playwright`, `@playwright/test`      |
| Language           | TypeScript via `ts-node`              |
| Reporting          | `multiple-cucumber-html-reporter`     |
| Pattern            | Page Object Model                     |

## Steps

### 1. Set Up Cucumber + Playwright Integration

Install required packages:

```bash
npm install --save-dev @cucumber/cucumber @playwright/test playwright ts-node multiple-cucumber-html-reporter
npx playwright install chromium
```

Configure the Cucumber profile in `cucumber.js`:

```javascript
module.exports = {
  default: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'json:e2e/reports/cucumber-report.json',
      'html:e2e/reports/cucumber-report.html'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  }
};
```

Set up TypeScript support with `tsconfig.e2e.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": true,
    "outDir": "./dist-e2e",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["e2e/pages/*"],
      "@support/*": ["e2e/support/*"],
      "@test-data/*": ["e2e/test-data/*"]
    }
  },
  "include": ["e2e/**/*.ts"]
}
```

### 2. Create Directory Structure

```
e2e/
  features/              # Gherkin .feature files
  step-definitions/      # Step implementations using Playwright
  pages/                 # Page Object Models
  support/               # Hooks, custom World, fixtures
  test-data/             # JSON/TS test data fixtures
  reports/               # Generated reports (gitignored)
cucumber.js              # Cucumber profile config
playwright.config.ts     # Playwright settings
tsconfig.e2e.json        # TypeScript config for e2e
```

Add `e2e/reports/` to `.gitignore` — reports are generated artifacts.

### 3. Write Feature Files in Gherkin

Feature files live in `e2e/features/` and use standard Gherkin syntax:

```gherkin
Feature: Trade Execution
  As a trader
  I want to execute buy and sell orders
  So that I can manage my portfolio

  Background:
    Given I am logged in as a trader
    And the market is open

  Scenario: Submit a market buy order
    Given I navigate to the trading page
    When I select symbol "AAPL"
    And I enter quantity "100"
    And I select order type "Market"
    And I click "Submit Order"
    Then I should see confirmation "Order submitted"
    And the order should appear in the blotter with status "Pending"
```

Use `Background` for shared preconditions, `Scenario Outline` with `Examples` tables for data-driven tests, and tags (`@smoke`, `@regression`, `@wip`) for selective execution.

### 4. Implement Step Definitions Using Playwright API

Step definitions in `e2e/step-definitions/` map Gherkin steps to Playwright actions via the custom World:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { TradingPage } from '../pages/trading.page';

Given('I navigate to the trading page', async function (this: CustomWorld) {
  this.tradingPage = new TradingPage(this.page!);
  await this.tradingPage.goto();
});

When('I select symbol {string}', async function (this: CustomWorld, symbol: string) {
  await this.tradingPage!.selectSymbol(symbol);
});

Then('I should see confirmation {string}', async function (this: CustomWorld, message: string) {
  const confirmation = await this.tradingPage!.getConfirmationText();
  expect(confirmation).toContain(message);
});
```

Each step definition file focuses on a single domain area (trading, portfolio, authentication).

### 5. Create Page Object Models

Page Objects in `e2e/pages/` encapsulate page structure and actions:

```typescript
import { Page, Locator } from '@playwright/test';

export class TradingPage {
  private readonly symbolSelect: Locator;
  private readonly quantityInput: Locator;
  private readonly submitButton: Locator;
  private readonly confirmationBanner: Locator;

  constructor(private page: Page) {
    this.symbolSelect = page.locator('[data-testid="symbol-select"]');
    this.quantityInput = page.locator('[data-testid="quantity-input"]');
    this.submitButton = page.locator('[data-testid="submit-order-btn"]');
    this.confirmationBanner = page.locator('[data-testid="confirmation-banner"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/trading');
    await this.page.waitForSelector('[data-testid="trading-page-loaded"]');
  }

  async selectSymbol(symbol: string): Promise<void> {
    await this.symbolSelect.selectOption(symbol);
  }

  async enterQuantity(quantity: string): Promise<void> {
    await this.quantityInput.fill(quantity);
  }

  async submitOrder(): Promise<void> {
    await this.submitButton.click();
  }

  async getConfirmationText(): Promise<string> {
    return await this.confirmationBanner.innerText();
  }
}
```

Rules for Page Objects:
- Locators use `data-testid` attributes exclusively
- Methods represent user actions, not DOM operations
- No assertions inside Page Objects — assertions belong in step definitions
- One Page Object per page or major component

### 6. Set Up Test Data Fixtures

Store test data in `e2e/test-data/` as JSON files:

```json
{
  "validOrders": [
    { "symbol": "AAPL", "quantity": 100, "type": "Market" },
    { "symbol": "GOOGL", "quantity": 50, "type": "Limit", "price": 150.00 }
  ],
  "invalidOrders": [
    { "symbol": "AAPL", "quantity": 0, "expectedError": "Quantity must be > 0" },
    { "symbol": "AAPL", "quantity": -5, "expectedError": "Quantity must be > 0" }
  ]
}
```

Import fixtures in step definitions for data-driven scenarios.

### 7. Configure Reporting

Cucumber outputs JSON results to `e2e/reports/cucumber-report.json`. Use `multiple-cucumber-html-reporter` to generate a rich HTML report:

```javascript
const report = require('multiple-cucumber-html-reporter');

report.generate({
  jsonDir: 'e2e/reports',
  reportPath: 'e2e/reports/html',
  metadata: {
    browser: { name: 'chromium', version: 'latest' },
    platform: { name: 'linux', version: 'CI' }
  }
});
```

The HTML report includes:
- Scenario pass/fail breakdown by feature
- Step execution times
- Screenshots on failure (attached in After hooks)
- Tag-based filtering

### 8. Run Tests

```bash
# Run all scenarios
npx cucumber-js --config cucumber.js

# Run specific tags
npx cucumber-js --config cucumber.js --tags "@smoke"

# Run a single feature file
npx cucumber-js --config cucumber.js e2e/features/trade-execution.feature

# Run with increased parallelism
npx cucumber-js --config cucumber.js --parallel 4

# Generate HTML report after test run
node scripts/generate-report.js
```

Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "e2e": "cucumber-js --config cucumber.js",
    "e2e:smoke": "cucumber-js --config cucumber.js --tags @smoke",
    "e2e:report": "node scripts/generate-report.js"
  }
}
```

### 9. Generate Reports

After a test run, generate the HTML report:

```bash
npm run e2e:report
```

This reads `e2e/reports/cucumber-report.json` and produces `e2e/reports/html/index.html`.

## Output

```
$ npx cucumber-js --config cucumber.js

Feature: Trade Execution
  Scenario: Submit a market buy order ........................ passed (2.3s)
  Scenario: Cancel a pending order ........................... passed (1.1s)
  Scenario Outline: Validate order form inputs
    Example: quantity=0 ..................................... passed (0.4s)
    Example: quantity=-5 .................................... passed (0.3s)
    Example: quantity=abc ................................... passed (0.3s)
    Example: quantity=1000001 ............................... passed (0.4s)

Feature: Portfolio Overview
  Scenario: View portfolio summary ........................... passed (1.8s)
  Scenario: Filter positions by asset class .................. FAILED (2.1s)
    Step: Then I should see 3 positions
      AssertionError: Expected 3 positions but found 5
      at step-definitions/portfolio.steps.ts:42:5
  Scenario: Export portfolio to CSV .......................... passed (1.5s)

9 scenarios (8 passed, 1 failed)
38 steps (37 passed, 1 failed)
Duration: 10.2s

Report written to: e2e/reports/cucumber-report.json

$ npm run e2e:report

Generating HTML report...
Reading: e2e/reports/cucumber-report.json
Report generated: e2e/reports/html/index.html

Summary:
  Features:  2 (1 passed, 1 failed)
  Scenarios: 9 (8 passed, 1 failed)
  Steps:     38 (37 passed, 1 failed)
```

## Validation

- **Feature files parse**: All `.feature` files are valid Gherkin syntax — run `npx cucumber-js --dry-run` to verify without executing
- **Steps map to definitions**: Every Given/When/Then step in feature files has a matching step definition — no undefined or ambiguous steps
- **Playwright launches browser**: Chromium launches in headless mode during Before hook; the `page` object is available in every step via `this.page`
- **Page Object Model enforced**: No raw Playwright locators in step definitions — all page interactions go through Page Objects
- **Screenshots on failure**: After hook captures a screenshot and attaches it to the Cucumber report when a scenario fails
- **Reports generate**: JSON output produces valid `cucumber-report.json`; HTML report renders at `e2e/reports/html/index.html`
- **No hardcoded waits**: No `page.waitForTimeout()` calls — use Playwright auto-waiting and explicit `waitForSelector`/`waitForResponse`
- **Selectors use data-testid**: All locators reference `[data-testid="..."]` attributes exclusively
