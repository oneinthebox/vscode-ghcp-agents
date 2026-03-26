# Playwright Guide for Angular
Source: https://playwright.dev/docs/intro
Last refreshed: 2026-03-24

## Installation

```bash
npm init playwright@latest
# or add to existing project
npm install -D @playwright/test
npx playwright install
```

## playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['line'],
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Locators

| Method | Selector | Example |
|--------|----------|---------|
| `getByRole` | ARIA role + name | `page.getByRole('button', { name: 'Submit' })` |
| `getByText` | Text content | `page.getByText('Welcome')` |
| `getByLabel` | Label text | `page.getByLabel('Email')` |
| `getByPlaceholder` | Placeholder | `page.getByPlaceholder('Search...')` |
| `getByTestId` | `data-testid` | `page.getByTestId('login-form')` |
| `getByAltText` | Alt attribute | `page.getByAltText('Logo')` |
| `getByTitle` | Title attribute | `page.getByTitle('Close')` |
| `locator` | CSS / XPath | `page.locator('.my-class')` |

### Filtering Locators

```typescript
// Filter by text
page.getByRole('listitem').filter({ hasText: 'Product 1' });

// Filter by child locator
page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name: 'Product 1' }),
});

// Chain locators
page.getByRole('table').getByRole('row').nth(2);

// First, last, nth
page.getByRole('button').first();
page.getByRole('button').last();
page.getByRole('button').nth(0);
```

## Assertions

| Assertion | Description |
|-----------|-------------|
| `expect(locator).toBeVisible()` | Element visible |
| `expect(locator).toBeHidden()` | Element hidden |
| `expect(locator).toBeEnabled()` | Element enabled |
| `expect(locator).toBeDisabled()` | Element disabled |
| `expect(locator).toHaveText('txt')` | Exact text match |
| `expect(locator).toContainText('txt')` | Contains text |
| `expect(locator).toHaveValue('val')` | Input value |
| `expect(locator).toHaveAttribute('name', 'val')` | Attribute match |
| `expect(locator).toHaveClass(/active/)` | Class match |
| `expect(locator).toHaveCount(n)` | Element count |
| `expect(locator).toBeChecked()` | Checkbox checked |
| `expect(page).toHaveURL(/pattern/)` | URL match |
| `expect(page).toHaveTitle('Title')` | Page title |

### Soft Assertions (non-failing)

```typescript
await expect.soft(locator).toHaveText('Expected');
// test continues even if this fails
```

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My Angular App/);
});
```

### Form Submission

```typescript
test('submits login form', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

### Navigation

```typescript
test('navigates via sidebar', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
});
```

### Data Grid Interaction

```typescript
test('sorts data grid', async ({ page }) => {
  await page.goto('/data');

  // Click column header to sort
  await page.getByRole('columnheader', { name: 'Name' }).click();

  // Verify first row
  const firstRow = page.getByRole('row').nth(1);
  await expect(firstRow.getByRole('cell').first()).toHaveText('Alice');

  // Click again for descending
  await page.getByRole('columnheader', { name: 'Name' }).click();
  await expect(firstRow.getByRole('cell').first()).toHaveText('Zara');
});
```

## Page Object Pattern

```typescript
// e2e/pages/login.page.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toHaveText(message);
  }
}
```

### Using Page Object

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test('login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('bad@email.com', 'wrong');
  await loginPage.expectError('Invalid credentials');
});
```

## Fixtures

### Custom Fixture

```typescript
// e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
```

### Using Fixtures

```typescript
import { test, expect } from './fixtures';

test('dashboard loads after login', async ({ loginPage, dashboardPage }) => {
  await loginPage.login('user@test.com', 'password');
  await expect(dashboardPage.heading).toBeVisible();
});
```

## Authentication Setup

### Global Setup (storage state)

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

### Config for Auth

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

## Visual Comparisons

```typescript
test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,
  });
});

// Element screenshot
test('chart renders correctly', async ({ page }) => {
  await page.goto('/reports');
  const chart = page.getByTestId('revenue-chart');
  await expect(chart).toHaveScreenshot('revenue-chart.png');
});
```

### Update Screenshots

```bash
npx playwright test --update-snapshots
```

## CI Configuration

### GitHub Actions

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Running Tests

| Command | Description |
|---------|-------------|
| `npx playwright test` | Run all tests |
| `npx playwright test --project=chromium` | Specific browser |
| `npx playwright test login.spec.ts` | Specific file |
| `npx playwright test --grep "login"` | By title pattern |
| `npx playwright test --headed` | Show browser |
| `npx playwright test --debug` | Step-by-step debug |
| `npx playwright test --ui` | Interactive UI mode |
| `npx playwright show-report` | View HTML report |
| `npx playwright codegen localhost:4200` | Code generator |

## Test Hooks

```typescript
test.describe('Dashboard', () => {
  test.beforeAll(async () => { /* runs once before all tests */ });
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });
  test.afterEach(async ({ page }) => { /* cleanup */ });
  test.afterAll(async () => { /* runs once after all tests */ });

  test('shows stats', async ({ page }) => {
    await expect(page.getByTestId('stats')).toBeVisible();
  });
});
```
