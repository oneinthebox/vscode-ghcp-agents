# Cypress to Playwright Migration Guide
Source: Curated from Cypress and Playwright documentation
Last refreshed: 2026-03-25

## Command Mapping

| Cypress | Playwright | Notes |
|---------|-----------|-------|
| `cy.visit(url)` | `await page.goto(url)` | Playwright is async/await |
| `cy.get(selector)` | `page.locator(selector)` | Playwright prefers role/testid locators |
| `cy.get('[data-testid="x"]')` | `page.getByTestId('x')` | Built-in test ID support |
| `cy.contains(text)` | `page.getByText(text)` | Also: `getByRole`, `getByLabel`, `getByPlaceholder` |
| `cy.get('button').contains('Submit')` | `page.getByRole('button', { name: 'Submit' })` | Preferred accessible locator |
| `cy.find(selector)` | `locator.locator(selector)` | Chained locator |
| `cy.get(sel).click()` | `await locator.click()` | All actions are async |
| `cy.get(sel).type('text')` | `await locator.fill('text')` | `fill` clears first; use `pressSequentially` for keystroke simulation |
| `cy.get(sel).clear()` | `await locator.clear()` | Same concept |
| `cy.get(sel).check()` | `await locator.check()` | For checkboxes/radio |
| `cy.get(sel).uncheck()` | `await locator.uncheck()` | For checkboxes |
| `cy.get(sel).select('value')` | `await locator.selectOption('value')` | Dropdown selection |
| `cy.get(sel).should('be.visible')` | `await expect(locator).toBeVisible()` | Auto-retrying assertion |
| `cy.get(sel).should('have.text', 'x')` | `await expect(locator).toHaveText('x')` | Text assertion |
| `cy.get(sel).should('have.value', 'x')` | `await expect(locator).toHaveValue('x')` | Input value assertion |
| `cy.get(sel).should('be.disabled')` | `await expect(locator).toBeDisabled()` | Disabled state |
| `cy.get(sel).should('have.class', 'c')` | `await expect(locator).toHaveClass(/c/)` | Class assertion |
| `cy.get(sel).should('have.length', n)` | `await expect(locator).toHaveCount(n)` | Element count |
| `cy.get(sel).should('exist')` | `await expect(locator).toBeAttached()` | DOM presence |
| `cy.get(sel).should('not.exist')` | `await expect(locator).not.toBeAttached()` | Negation with `.not` |
| `cy.get(sel).first()` | `locator.first()` | First match |
| `cy.get(sel).last()` | `locator.last()` | Last match |
| `cy.get(sel).eq(n)` | `locator.nth(n)` | Nth match |
| `cy.intercept('GET', '/api/*')` | `await page.route('**/api/*', ...)` | Network interception |
| `cy.intercept('GET', '/api', { body })` | `await page.route('**/api', r => r.fulfill({ body }))` | Mock response |
| `cy.wait('@alias')` | `await page.waitForResponse('**/api')` | Wait for network |
| `cy.fixture('data.json')` | `JSON.parse(fs.readFileSync('fixtures/data.json'))` | File-based fixtures |
| `cy.wrap(value)` | Direct `await` / Promise-based | No wrapper needed |
| `cy.url()` | `page.url()` | Current URL (sync in Playwright) |
| `cy.title()` | `await page.title()` | Page title |
| `cy.go('back')` | `await page.goBack()` | Navigation |
| `cy.reload()` | `await page.reload()` | Reload page |
| `cy.screenshot()` | `await page.screenshot({ path })` | Screenshot capture |
| `cy.viewport(w, h)` | Config `use: { viewport: { width, height } }` | Set in config or `page.setViewportSize()` |
| `cy.clock()` / `cy.tick()` | `await page.clock.install()` / `page.clock.fastForward()` | Clock manipulation |
| `cy.stub()` | `await page.evaluate(() => ...)` | Stub via page context |
| `cy.task('name')` | Direct Node.js in test file | Playwright runs in Node.js |

## Config Migration

### Cypress (cypress.config.ts)
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    retries: { runMode: 2, openMode: 0 },
  },
});
```

### Playwright (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Config Property Mapping

| Cypress | Playwright |
|---------|-----------|
| `baseUrl` | `use.baseURL` |
| `specPattern` | `testDir` + `testMatch` |
| `viewportWidth/Height` | `use.viewport` |
| `defaultCommandTimeout` | `use.actionTimeout` |
| `retries` | `retries` (top-level) |
| `video` | `use.video: 'on'` |
| `screenshotOnRunFailure` | `use.screenshot: 'only-on-failure'` |
| N/A | `use.trace` (unique to Playwright) |
| N/A | `projects` (multi-browser) |
| N/A | `webServer` (auto-start dev server) |

## Plugin / Support File Migration

### Cypress Support File (cypress/support/e2e.ts)
```typescript
import './commands';
beforeEach(() => {
  cy.intercept('GET', '/api/config', { fixture: 'config.json' });
});
```

### Playwright Global Setup (global-setup.ts)
```typescript
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Global setup logic (e.g., auth state, DB seed)
}
export default globalSetup;
```
Reference in config: `globalSetup: require.resolve('./global-setup')`

## Custom Command to Page Fixture Migration

### Cypress Custom Command
```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (user: string, pass: string) => {
  cy.visit('/login');
  cy.get('[data-testid="username"]').type(user);
  cy.get('[data-testid="password"]').type(pass);
  cy.get('[data-testid="submit"]').click();
  cy.url().should('include', '/dashboard');
});

// Usage in test
cy.login('admin', 'password123');
```

### Playwright Page Fixture
```typescript
// fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

export const test = base.extend<{ loginPage: Page }>({
  loginPage: async ({ page }, use) => {
    await page.goto('/login');
    await use(page);
  },
});

// helpers/auth.ts (reusable function approach)
export async function login(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.getByTestId('username').fill(user);
  await page.getByTestId('password').fill(pass);
  await page.getByTestId('submit').click();
  await page.waitForURL('**/dashboard');
}

// Usage in test
import { login } from '../helpers/auth';
test('dashboard loads', async ({ page }) => {
  await login(page, 'admin', 'password123');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## Common Test Patterns: Before / After

### Pattern 1: Page Navigation + Assertion
```typescript
// Cypress
it('navigates to about page', () => {
  cy.visit('/');
  cy.get('a[href="/about"]').click();
  cy.url().should('include', '/about');
  cy.get('h1').should('have.text', 'About Us');
});

// Playwright
test('navigates to about page', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href="/about"]').click();
  await expect(page).toHaveURL(/about/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Us');
});
```

### Pattern 2: API Mocking
```typescript
// Cypress
it('displays mocked data', () => {
  cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
  cy.visit('/users');
  cy.wait('@getUsers');
  cy.get('[data-testid="user-row"]').should('have.length', 3);
});

// Playwright
test('displays mocked data', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    const json = JSON.parse(fs.readFileSync('fixtures/users.json', 'utf-8'));
    await route.fulfill({ json });
  });
  await page.goto('/users');
  await expect(page.getByTestId('user-row')).toHaveCount(3);
});
```

### Pattern 3: Form Submission
```typescript
// Cypress
it('submits contact form', () => {
  cy.visit('/contact');
  cy.get('#name').type('John');
  cy.get('#email').type('john@example.com');
  cy.get('#message').type('Hello!');
  cy.get('form').submit();
  cy.get('.success-message').should('be.visible');
});

// Playwright
test('submits contact form', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Name').fill('John');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByLabel('Message').fill('Hello!');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Pattern 4: Waiting for Element State
```typescript
// Cypress
cy.get('.loading-spinner').should('not.exist');
cy.get('.data-table').should('be.visible');

// Playwright
await expect(page.locator('.loading-spinner')).not.toBeAttached();
await expect(page.locator('.data-table')).toBeVisible();
```

## CI Pipeline Changes

| Aspect | Cypress | Playwright |
|--------|---------|-----------|
| Docker image | `cypress/browsers:node-18` | `mcr.microsoft.com/playwright:v1.x-jammy` |
| Install browsers | Bundled in Docker image | `npx playwright install --with-deps` |
| Run command | `npx cypress run` | `npx playwright test` |
| Parallel execution | `cypress run --parallel` (requires Dashboard) | Built-in `fullyParallel: true` + `workers` |
| CI recording | Cypress Cloud (paid) | Free HTML report, trace viewer |
| Artifacts | `cypress/screenshots`, `cypress/videos` | `playwright-report/`, `test-results/` |
| Browser support | Chromium, Firefox, Edge (no Safari) | Chromium, Firefox, WebKit (Safari) |

### GitHub Actions Example

```yaml
# Before (Cypress)
- uses: cypress-io/github-action@v6
  with:
    start: npm start
    wait-on: 'http://localhost:4200'

# After (Playwright)
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Dependency Changes

```bash
# Remove Cypress
npm uninstall cypress @cypress/angular

# Install Playwright
npm install -D @playwright/test
npx playwright install

# angular.json: remove cypress builder, add playwright script
# package.json scripts:
#   "e2e": "playwright test"
#   "e2e:ui": "playwright test --ui"
#   "e2e:debug": "playwright test --debug"
```

## Key Architectural Differences

| Aspect | Cypress | Playwright |
|--------|---------|-----------|
| Execution model | Runs in browser (same loop) | Runs in Node.js (out-of-process) |
| Async model | Chainable commands (implicit queue) | Native async/await |
| Multi-tab/window | Not supported | `context.newPage()` |
| Multi-domain | Limited (`cy.origin()`) | Full support |
| iframes | `cy.iframe()` plugin | `page.frameLocator()` |
| File download | `cypress-file-download` plugin | `download = page.waitForEvent('download')` |
| API testing | `cy.request()` | `request.get()` via `APIRequestContext` |
| Visual testing | Third-party plugins | `expect(page).toHaveScreenshot()` built-in |
| Trace/debug | Time-travel in Test Runner | Trace Viewer with network, console, DOM snapshots |
