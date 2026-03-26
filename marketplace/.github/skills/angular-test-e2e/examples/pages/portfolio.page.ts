import { Page, Locator } from 'playwright';

/**
 * Page Object Model for the Portfolio Overview page.
 *
 * Handles portfolio summary, position table, filtering, sorting,
 * search, export, and position detail interactions.
 */
export class PortfolioPage {
  private readonly portfolioValue: Locator;
  private readonly pnlDisplay: Locator;
  private readonly positionRows: Locator;
  private readonly assetClassFilter: Locator;
  private readonly searchInput: Locator;
  private readonly resultsCount: Locator;
  private readonly detailPanel: Locator;
  private readonly tradeHistorySection: Locator;
  private readonly marketDataSection: Locator;

  constructor(private page: Page) {
    this.portfolioValue = page.locator('[data-testid="portfolio-total-value"]');
    this.pnlDisplay = page.locator('[data-testid="portfolio-pnl"]');
    this.positionRows = page.locator('[data-testid="position-row"]');
    this.assetClassFilter = page.locator('[data-testid="asset-class-filter"]');
    this.searchInput = page.locator('[data-testid="portfolio-search-input"]');
    this.resultsCount = page.locator('[data-testid="results-count"]');
    this.detailPanel = page.locator('[data-testid="position-detail-panel"]');
    this.tradeHistorySection = page.locator('[data-testid="trade-history"]');
    this.marketDataSection = page.locator('[data-testid="market-data"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/portfolio');
    await this.page.waitForSelector('[data-testid="portfolio-page-loaded"]');
  }

  async getPortfolioValue(): Promise<string> {
    return await this.portfolioValue.innerText();
  }

  async isPnLVisible(): Promise<boolean> {
    return await this.pnlDisplay.isVisible();
  }

  async getPositionCount(): Promise<number> {
    return await this.positionRows.count();
  }

  async filterByAssetClass(assetClass: string): Promise<void> {
    await this.assetClassFilter.selectOption(assetClass);
    // Wait for the filtered data to load
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/positions') && resp.status() === 200
    );
  }

  async getAllDisplayedAssetClasses(): Promise<string[]> {
    const cells = this.page.locator('[data-testid="position-asset-class"]');
    const count = await cells.count();
    const classes: string[] = [];
    for (let i = 0; i < count; i++) {
      classes.push(await cells.nth(i).innerText());
    }
    return classes;
  }

  async getAllDisplayedSymbols(): Promise<string[]> {
    const cells = this.page.locator('[data-testid="position-symbol"]');
    const count = await cells.count();
    const symbols: string[] = [];
    for (let i = 0; i < count; i++) {
      symbols.push(await cells.nth(i).innerText());
    }
    return symbols;
  }

  async clickColumnHeader(columnName: string): Promise<void> {
    const header = this.page.locator(
      `[data-testid="column-header-${columnName.toLowerCase().replace(/\s+/g, '-')}"]`
    );
    await header.click();
    // Allow time for sort animation and re-render
    await this.positionRows.first().waitFor({ state: 'visible' });
  }

  async getMarketValues(): Promise<number[]> {
    const cells = this.page.locator('[data-testid="position-market-value"]');
    const count = await cells.count();
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).innerText();
      values.push(parseFloat(text.replace(/[$,]/g, '')));
    }
    return values;
  }

  async search(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    // Wait for debounced search to trigger
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/positions') && resp.status() === 200
    );
  }

  async getResultsCountText(): Promise<string> {
    return await this.resultsCount.innerText();
  }

  async clickButton(buttonText: string): Promise<void> {
    const button = this.page.locator(
      `[data-testid="btn-${buttonText.toLowerCase().replace(/\s+/g, '-')}"]`
    );
    await button.click();
  }

  async clickPosition(symbol: string): Promise<void> {
    const row = this.page.locator(
      `[data-testid="position-row"]:has([data-testid="position-symbol"]:text("${symbol}"))`
    );
    await row.click();
  }

  async isDetailPanelVisible(): Promise<boolean> {
    return await this.detailPanel.isVisible();
  }

  async hasTradeHistory(symbol: string): Promise<boolean> {
    await this.tradeHistorySection.waitFor({ state: 'visible' });
    const header = this.tradeHistorySection.locator('[data-testid="trade-history-symbol"]');
    const text = await header.innerText();
    return text.includes(symbol);
  }

  async hasMarketData(symbol: string): Promise<boolean> {
    await this.marketDataSection.waitFor({ state: 'visible' });
    const header = this.marketDataSection.locator('[data-testid="market-data-symbol"]');
    const text = await header.innerText();
    return text.includes(symbol);
  }
}
