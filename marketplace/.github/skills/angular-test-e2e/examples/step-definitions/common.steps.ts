import { Given } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

/**
 * Common step definitions shared across feature files.
 * Handles authentication and market-state preconditions.
 */

Given('I am logged in as a trader', async function (this: CustomWorld) {
  // Authenticate via API to avoid UI login in every scenario
  const response = await this.page.request.post('/api/auth/login', {
    data: {
      username: 'trader@acme-trading.com',
      password: 'Test@Trader123'
    }
  });
  const { token } = await response.json();

  // Inject auth token into browser storage
  await this.page.addInitScript((tkn: string) => {
    localStorage.setItem('auth_token', tkn);
  }, token);
});

Given('I am logged in as a portfolio manager', async function (this: CustomWorld) {
  const response = await this.page.request.post('/api/auth/login', {
    data: {
      username: 'pm@acme-trading.com',
      password: 'Test@PM123'
    }
  });
  const { token } = await response.json();

  await this.page.addInitScript((tkn: string) => {
    localStorage.setItem('auth_token', tkn);
  }, token);
});

Given('the market is open', async function (this: CustomWorld) {
  // Mock the market-status endpoint to return open
  await this.page.route('**/api/market/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'open', session: 'regular' })
    })
  );
});
