// Example output from /angular-migrate-playwright — see SKILL.md for usage
// AFTER: Playwright e2e test with page object model
import { test, expect } from '@playwright/test';
import tradesFixture from '../fixtures/trades.json';

class TradeBlotterPage {
  constructor(private readonly page: import('@playwright/test').Page) {}

  readonly table = () => this.page.getByTestId('trade-table');
  readonly rows = () => this.page.getByTestId('trade-row');
  readonly filterInput = () => this.page.getByTestId('filter-input');
  readonly sortDate = () => this.page.getByTestId('sort-date');
  readonly detailPanel = () => this.page.getByTestId('trade-detail-panel');
  readonly tradeSymbol = () => this.page.getByTestId('trade-symbol');
  readonly confirmDialog = () => this.page.getByTestId('confirm-dialog');
  readonly confirmYes = () => this.page.getByTestId('confirm-yes');
  readonly toastSuccess = () => this.page.getByTestId('toast-success');

  async goto(): Promise<void> {
    await this.page.goto('/trades');
  }

  cancelButton(row: import('@playwright/test').Locator) {
    return row.getByTestId('cancel-btn');
  }
}

test.describe('Trade Blotter', () => {
  let blotter: TradeBlotterPage;

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/trades', (route) =>
      route.fulfill({ json: tradesFixture }),
    );
    blotter = new TradeBlotterPage(page);
    await blotter.goto();
  });

  test('should display the trade blotter table', async () => {
    await expect(blotter.table()).toBeVisible();
    await expect(blotter.rows()).toHaveCount(5);
  });

  test('should filter trades by symbol', async () => {
    await blotter.filterInput().fill('AAPL');
    await expect(blotter.rows()).toHaveCount(2);
    await expect(blotter.rows().first()).toContainText('AAPL');
  });

  test('should open trade detail on row click', async ({ page }) => {
    await blotter.rows().first().click();
    await expect(page).toHaveURL(/\/trades\//);
    await expect(blotter.detailPanel()).toBeVisible();
    await expect(blotter.tradeSymbol()).toHaveText('MSFT');
  });

  test('should cancel a pending trade', async ({ page }) => {
    await page.route('**/api/trades/*', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200 });
      }
      return route.continue();
    });

    const pendingRow = blotter.rows().filter({ hasText: 'Pending' }).first();
    await blotter.cancelButton(pendingRow).click();
    await expect(blotter.confirmDialog()).toBeVisible();
    await blotter.confirmYes().click();
    await expect(blotter.toastSuccess()).toContainText('Trade cancelled');
  });

  test('should sort trades by date', async () => {
    await blotter.sortDate().click();
    await expect(blotter.rows().first()).toContainText('2026-03-25');
    await blotter.sortDate().click();
    await expect(blotter.rows().first()).toContainText('2026-01-10');
  });
});
