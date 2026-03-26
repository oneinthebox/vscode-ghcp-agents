import { Page, Locator } from 'playwright';

/**
 * Page Object Model for the Order Blotter page.
 *
 * Displays a grid of orders with status, symbol, quantity, and actions.
 */
export class BlotterPage {
  private readonly orderRows: Locator;
  private readonly statusCells: Locator;
  private readonly cancelButtons: Locator;

  constructor(private page: Page) {
    this.orderRows = page.locator('[data-testid="order-row"]');
    this.statusCells = page.locator('[data-testid="order-status"]');
    this.cancelButtons = page.locator('[data-testid="cancel-order-btn"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/trading/blotter');
    await this.orderRows.first().waitFor({ state: 'attached' });
  }

  async getOrderCount(): Promise<number> {
    return await this.orderRows.count();
  }

  async getLatestOrderStatus(): Promise<string> {
    const firstStatus = this.orderRows.first().locator('[data-testid="order-status"]');
    await firstStatus.waitFor({ state: 'visible' });
    return await firstStatus.innerText();
  }

  async getOrderStatusForSymbol(symbol: string): Promise<string> {
    const row = this.page.locator(`[data-testid="order-row"]:has([data-testid="order-symbol"]:text("${symbol}"))`);
    await row.first().waitFor({ state: 'visible' });
    return await row.first().locator('[data-testid="order-status"]').innerText();
  }

  async cancelFirstPendingOrder(): Promise<void> {
    const pendingRow = this.page.locator(
      '[data-testid="order-row"]:has([data-testid="order-status"]:text("Pending"))'
    );
    const cancelBtn = pendingRow.first().locator('[data-testid="cancel-order-btn"]');
    await cancelBtn.click();

    // Wait for the cancellation API call to complete
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.request().method() === 'DELETE'
    );
  }
}
