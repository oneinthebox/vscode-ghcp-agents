import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { PortfolioPage } from '../pages/portfolio.page';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

Given('I navigate to the portfolio page', async function (this: CustomWorld) {
  this.portfolioPage = new PortfolioPage(this.page);
  await this.portfolioPage.goto();
});

// ---------------------------------------------------------------------------
// Portfolio summary assertions
// ---------------------------------------------------------------------------

Then('I should see the portfolio value displayed', async function (this: CustomWorld) {
  const value = await this.portfolioPage.getPortfolioValue();
  expect(value).toBeTruthy();
});

Then('I should see at least {int} position in the table', async function (this: CustomWorld, min: number) {
  const count = await this.portfolioPage.getPositionCount();
  expect(count).toBeGreaterThanOrEqual(min);
});

Then('the total P&L should be visible', async function (this: CustomWorld) {
  const isVisible = await this.portfolioPage.isPnLVisible();
  expect(isVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

When('I select asset class filter {string}', async function (this: CustomWorld, assetClass: string) {
  await this.portfolioPage.filterByAssetClass(assetClass);
});

Then(
  'all displayed positions should have asset class {string}',
  async function (this: CustomWorld, assetClass: string) {
    const classes = await this.portfolioPage.getAllDisplayedAssetClasses();
    for (const cls of classes) {
      expect(cls).toBe(assetClass);
    }
  }
);

Then('the position count should update', async function (this: CustomWorld) {
  const count = await this.portfolioPage.getPositionCount();
  expect(count).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

When('I click the {string} column header', async function (this: CustomWorld, column: string) {
  await this.portfolioPage.clickColumnHeader(column);
});

When('I click the {string} column header again', async function (this: CustomWorld, column: string) {
  await this.portfolioPage.clickColumnHeader(column);
});

Then(
  'positions should be sorted by market value descending',
  async function (this: CustomWorld) {
    const values = await this.portfolioPage.getMarketValues();
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  }
);

Then(
  'positions should be sorted by market value ascending',
  async function (this: CustomWorld) {
    const values = await this.portfolioPage.getMarketValues();
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  }
);

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

When('I enter {string} in the search box', async function (this: CustomWorld, query: string) {
  await this.portfolioPage.search(query);
});

Then('I should see only positions matching {string}', async function (this: CustomWorld, query: string) {
  const symbols = await this.portfolioPage.getAllDisplayedSymbols();
  for (const symbol of symbols) {
    expect(symbol.toUpperCase()).toContain(query.toUpperCase());
  }
});

Then('the search results count should be displayed', async function (this: CustomWorld) {
  const countText = await this.portfolioPage.getResultsCountText();
  expect(countText).toMatch(/\d+ result/);
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

When('I click the {string} button', async function (this: CustomWorld, buttonText: string) {
  const [download] = await Promise.all([
    this.page.waitForEvent('download'),
    this.portfolioPage.clickButton(buttonText)
  ]);
  this.lastDownload = download;
});

Then('a CSV file should be downloaded', async function (this: CustomWorld) {
  expect(this.lastDownload).toBeTruthy();
  const filename = this.lastDownload.suggestedFilename();
  expect(filename).toMatch(/\.csv$/);
});

Then('the CSV should contain headers {string}', async function (this: CustomWorld, headers: string) {
  const filePath = await this.lastDownload.path();
  const fs = require('fs');
  const content = fs.readFileSync(filePath!, 'utf-8');
  const firstLine = content.split('\n')[0];
  expect(firstLine.trim()).toBe(headers);
});

Then(
  'the CSV row count should match the displayed position count',
  async function (this: CustomWorld) {
    const filePath = await this.lastDownload.path();
    const fs = require('fs');
    const content = fs.readFileSync(filePath!, 'utf-8');
    const csvRows = content.trim().split('\n').length - 1; // minus header
    const displayedCount = await this.portfolioPage.getPositionCount();
    expect(csvRows).toBe(displayedCount);
  }
);

// ---------------------------------------------------------------------------
// Position details
// ---------------------------------------------------------------------------

When('I click on position {string}', async function (this: CustomWorld, symbol: string) {
  await this.portfolioPage.clickPosition(symbol);
});

Then('the position detail panel should open', async function (this: CustomWorld) {
  const isVisible = await this.portfolioPage.isDetailPanelVisible();
  expect(isVisible).toBe(true);
});

Then('I should see the trade history for {string}', async function (this: CustomWorld, symbol: string) {
  const hasHistory = await this.portfolioPage.hasTradeHistory(symbol);
  expect(hasHistory).toBe(true);
});

Then('I should see the current market data for {string}', async function (this: CustomWorld, symbol: string) {
  const hasMarketData = await this.portfolioPage.hasMarketData(symbol);
  expect(hasMarketData).toBe(true);
});
