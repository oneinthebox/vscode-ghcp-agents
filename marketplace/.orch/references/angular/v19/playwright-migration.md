# Playwright Migration Guide
Source: https://playwright.dev/docs/protractor-migration
Last refreshed: 2026-03-24

## Overview

Migration guide from Protractor and Cypress to Playwright Test.

## Protractor to Playwright API Mapping

| Protractor | Playwright | Notes |
|-----------|-----------|-------|
| `browser.get(url)` | `await page.goto(url)` | Navigation |
| `browser.getCurrentUrl()` | `page.url()` | Current URL |
| `browser.getTitle()` | `await page.title()` | Page title |
| `browser.sleep(ms)` | `await page.waitForTimeout(ms)` | Avoid; use assertions |
| `browser.wait(EC.presenceOf(el))` | `await expect(locator).toBeVisible()` | Auto-waiting built in |
| `browser.wait(EC.urlContains(str))` | `await expect(page).toHaveURL(/str/)` | URL assertion |
| `browser.actions().mouseMove(el)` | `await locator.hover()` | Mouse hover |
| `browser.actions().doubleClick(el)` | `await locator.dblclick()` | Double click |
| `browser.switchTo().frame(el)` | `page.frameLocator('#frame')` | Frame handling |
| `browser.executeScript(script)` | `await page.evaluate(script)` | JS execution |

### Element Interaction

| Protractor | Playwright |
|-----------|-----------|
| `element(by.css('.cls'))` | `page.locator('.cls')` |
| `element(by.id('myId'))` | `page.locator('#myId')` |
| `element(by.buttonText('OK'))` | `page.getByRole('button', { name: 'OK' })` |
| `element(by.cssContainingText('p', 'txt'))` | `page.locator('p').filter({ hasText: 'txt' })` |
| `element(by.model('user.name'))` | `page.locator('[ng-model="user.name"]')` |
| `element(by.binding('ctrl.name'))` | `page.locator('[ng-bind="ctrl.name"]')` |
| `element(by.repeater('item in list'))` | `page.locator('[ng-repeat="item in list"]')` |
| `element.all(by.css('.items'))` | `page.locator('.items')` |
| `element.all(by.css('.items')).count()` | `await page.locator('.items').count()` |
| `element.all(by.css('.items')).get(2)` | `page.locator('.items').nth(2)` |
| `element.all(by.css('.items')).first()` | `page.locator('.items').first()` |
| `element.all(by.css('.items')).last()` | `page.locator('.items').last()` |

### Element Actions

| Protractor | Playwright |
|-----------|-----------|
| `element.click()` | `await locator.click()` |
| `element.sendKeys('text')` | `await locator.fill('text')` |
| `element.clear()` | `await locator.clear()` |
| `element.getText()` | `await locator.textContent()` |
| `element.getAttribute('href')` | `await locator.getAttribute('href')` |
| `element.isDisplayed()` | `await locator.isVisible()` |
| `element.isEnabled()` | `await locator.isEnabled()` |
| `element.isPresent()` | `await locator.count() > 0` |

## Cypress to Playwright API Mapping

| Cypress | Playwright | Notes |
|---------|-----------|-------|
| `cy.visit(url)` | `await page.goto(url)` | Navigation |
| `cy.url()` | `page.url()` | Current URL |
| `cy.title()` | `await page.title()` | Page title |
| `cy.get('.cls')` | `page.locator('.cls')` | CSS selector |
| `cy.get('[data-testid="id"]')` | `page.getByTestId('id')` | Test ID |
| `cy.contains('text')` | `page.getByText('text')` | Text content |
| `cy.findByRole('button', {name: 'OK'})` | `page.getByRole('button', {name: 'OK'})` | ARIA role |
| `cy.get('input').type('text')` | `await page.locator('input').fill('text')` | Type text |
| `cy.get('button').click()` | `await page.locator('button').click()` | Click |
| `cy.get('.el').should('be.visible')` | `await expect(page.locator('.el')).toBeVisible()` | Visibility |
| `cy.get('.el').should('have.text', 't')` | `await expect(page.locator('.el')).toHaveText('t')` | Text check |
| `cy.get('.el').should('have.length', 3)` | `await expect(page.locator('.el')).toHaveCount(3)` | Count |
| `cy.get('input').should('have.value', 'v')` | `await expect(page.locator('input')).toHaveValue('v')` | Value |
| `cy.get('.el').should('have.class', 'active')` | `await expect(page.locator('.el')).toHaveClass(/active/)` | Class |
| `cy.get('.el').should('have.attr', 'href', '/home')` | `await expect(page.locator('.el')).toHaveAttribute('href', '/home')` | Attribute |
| `cy.get('.el').should('not.exist')` | `await expect(page.locator('.el')).toHaveCount(0)` | Not exists |
| `cy.wait(1000)` | `await page.waitForTimeout(1000)` | Avoid; use assertions |
| `cy.intercept('GET', '/api/*')` | `await page.route('/api/*', handler)` | Network intercept |
| `cy.wait('@alias')` | `await page.waitForResponse('/api/*')` | Wait for response |
| `cy.go('back')` | `await page.goBack()` | Navigate back |
| `cy.reload()` | `await page.reload()` | Reload page |
| `cy.viewport(1280, 720)` | Config: `use: { viewport: {width: 1280, height: 720} }` | Viewport |
| `cy.screenshot()` | `await page.screenshot({ path: 'file.png' })` | Screenshot |

## Config Migration

### Protractor (protractor.conf.js) to Playwright

```typescript
// BEFORE: protractor.conf.js
exports.config = {
  directConnect: true,
  baseUrl: 'http://localhost:4200',
  specs: ['./e2e/**/*.e2e-spec.ts'],
  capabilities: { browserName: 'chrome' },
  onPrepare() {
    browser.driver.manage().window().setSize(1280, 1024);
  },
  jasmineNodeOpts: { defaultTimeoutInterval: 30000 },
};
```

```typescript
// AFTER: playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1280, height: 1024 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Cypress (cypress.config.ts) to Playwright

```typescript
// BEFORE: cypress.config.ts
import { defineConfig } from 'cypress';
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
  },
});
```

```typescript
// AFTER: playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Migration Example

### Protractor Before/After

```typescript
// BEFORE: protractor e2e test
import { browser, by, element } from 'protractor';

describe('Login', () => {
  it('should log in successfully', async () => {
    await browser.get('/login');

    await element(by.css('#email')).sendKeys('user@test.com');
    await element(by.css('#password')).sendKeys('password');
    await element(by.buttonText('Sign In')).click();

    const url = await browser.getCurrentUrl();
    expect(url).toContain('/dashboard');

    const welcome = await element(by.css('.welcome')).getText();
    expect(welcome).toContain('Welcome');
  });
});
```

```typescript
// AFTER: playwright test
import { test, expect } from '@playwright/test';

test('should log in successfully', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('.welcome')).toContainText('Welcome');
});
```

### Cypress Before/After

```typescript
// BEFORE: cypress test
describe('Login', () => {
  it('should log in successfully', () => {
    cy.visit('/login');

    cy.get('#email').type('user@test.com');
    cy.get('#password').type('password');
    cy.contains('button', 'Sign In').click();

    cy.url().should('include', '/dashboard');
    cy.get('.welcome').should('contain', 'Welcome');
  });
});
```

```typescript
// AFTER: playwright test
import { test, expect } from '@playwright/test';

test('should log in successfully', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('.welcome')).toContainText('Welcome');
});
```

## Network Interception Migration

### Cypress to Playwright

```typescript
// BEFORE: Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
cy.visit('/users');
cy.wait('@getUsers');
cy.get('table tbody tr').should('have.length', 3);
```

```typescript
// AFTER: Playwright
await page.route('/api/users', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]),
  });
});

await page.goto('/users');
await expect(page.locator('table tbody tr')).toHaveCount(3);
```

## Migration Checklist

| Step | Action |
|------|--------|
| 1 | Install `@playwright/test` and run `npx playwright install` |
| 2 | Create `playwright.config.ts` with Angular webServer |
| 3 | Create `e2e/` directory for test files |
| 4 | Convert test files (`.e2e-spec.ts` / `.cy.ts` to `.spec.ts`) |
| 5 | Replace selectors with Playwright locators (prefer `getByRole`, `getByTestId`) |
| 6 | Replace assertions with Playwright `expect` |
| 7 | Replace `browser.sleep` / `cy.wait` with auto-waiting assertions |
| 8 | Replace network intercepts with `page.route` |
| 9 | Convert page objects to Playwright pattern |
| 10 | Update CI config for Playwright |
| 11 | Remove Protractor/Cypress packages and config files |
| 12 | Update `angular.json` e2e target |

## Key Differences

| Feature | Protractor/Cypress | Playwright |
|---------|-------------------|-----------|
| Auto-waiting | Manual / implicit | Built-in on all actions |
| Parallelism | Limited | Full parallel by default |
| Multi-browser | Chrome (Protractor) / Chrome+FF (Cypress) | Chromium, Firefox, WebKit |
| Assertion style | Jasmine / Chai | Built-in `expect` with auto-retry |
| Network mocking | Limited / `cy.intercept` | `page.route` (full control) |
| Auth reuse | Manual | Storage state |
| Debugging | Protractor debug / Cypress time-travel | Trace viewer, UI mode, `--debug` |
| Mobile emulation | No / Limited | Full device emulation |
