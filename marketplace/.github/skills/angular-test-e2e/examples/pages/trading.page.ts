import { Page, Locator } from 'playwright';

/**
 * Page Object Model for the Trading / Order Entry page.
 *
 * All locators use data-testid attributes exclusively.
 * Methods represent user actions — no assertions here.
 */
export class TradingPage {
  private readonly symbolSelect: Locator;
  private readonly quantityInput: Locator;
  private readonly orderTypeSelect: Locator;
  private readonly limitPriceInput: Locator;
  private readonly sideSelect: Locator;
  private readonly submitButton: Locator;
  private readonly confirmationBanner: Locator;
  private readonly validationMessage: Locator;

  constructor(private page: Page) {
    this.symbolSelect = page.locator('[data-testid="symbol-select"]');
    this.quantityInput = page.locator('[data-testid="quantity-input"]');
    this.orderTypeSelect = page.locator('[data-testid="order-type-select"]');
    this.limitPriceInput = page.locator('[data-testid="limit-price-input"]');
    this.sideSelect = page.locator('[data-testid="side-select"]');
    this.submitButton = page.locator('[data-testid="submit-order-btn"]');
    this.confirmationBanner = page.locator('[data-testid="confirmation-banner"]');
    this.validationMessage = page.locator('[data-testid="validation-message"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/trading');
    await this.page.waitForSelector('[data-testid="trading-page-loaded"]');
  }

  async selectSymbol(symbol: string): Promise<void> {
    await this.symbolSelect.selectOption(symbol);
  }

  async enterQuantity(quantity: string): Promise<void> {
    await this.quantityInput.clear();
    await this.quantityInput.fill(quantity);
    // Trigger Angular change detection by blurring the input
    await this.quantityInput.blur();
  }

  async selectOrderType(orderType: string): Promise<void> {
    await this.orderTypeSelect.selectOption(orderType);
  }

  async enterLimitPrice(price: string): Promise<void> {
    await this.limitPriceInput.waitFor({ state: 'visible' });
    await this.limitPriceInput.clear();
    await this.limitPriceInput.fill(price);
  }

  async selectSide(side: string): Promise<void> {
    await this.sideSelect.selectOption(side);
  }

  async clickButton(buttonText: string): Promise<void> {
    const button = this.page.locator(`[data-testid="btn-${buttonText.toLowerCase().replace(/\s+/g, '-')}"]`);
    await button.click();
  }

  async submitOrder(): Promise<void> {
    await this.submitButton.click();
    // Wait for the API response before proceeding
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/orders') && resp.status() === 201
    );
  }

  async getConfirmationText(): Promise<string> {
    await this.confirmationBanner.waitFor({ state: 'visible' });
    return await this.confirmationBanner.innerText();
  }

  async getValidationMessage(): Promise<string> {
    await this.validationMessage.waitFor({ state: 'visible' });
    return await this.validationMessage.innerText();
  }
}
