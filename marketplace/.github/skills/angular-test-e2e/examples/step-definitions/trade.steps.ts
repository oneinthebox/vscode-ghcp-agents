import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { TradingPage } from '../pages/trading.page';
import { BlotterPage } from '../pages/blotter.page';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

Given('I navigate to the trading page', async function (this: CustomWorld) {
  this.tradingPage = new TradingPage(this.page);
  await this.tradingPage.goto();
});

// ---------------------------------------------------------------------------
// Order entry actions
// ---------------------------------------------------------------------------

When('I select symbol {string}', async function (this: CustomWorld, symbol: string) {
  await this.tradingPage.selectSymbol(symbol);
});

When('I enter quantity {string}', async function (this: CustomWorld, quantity: string) {
  await this.tradingPage.enterQuantity(quantity);
});

When('I select order type {string}', async function (this: CustomWorld, orderType: string) {
  await this.tradingPage.selectOrderType(orderType);
});

When('I enter limit price {string}', async function (this: CustomWorld, price: string) {
  await this.tradingPage.enterLimitPrice(price);
});

When('I select side {string}', async function (this: CustomWorld, side: string) {
  await this.tradingPage.selectSide(side);
});

When('I click {string}', async function (this: CustomWorld, buttonText: string) {
  await this.tradingPage.clickButton(buttonText);
});

// ---------------------------------------------------------------------------
// Order assertions
// ---------------------------------------------------------------------------

Then('I should see confirmation {string}', async function (this: CustomWorld, message: string) {
  const text = await this.tradingPage.getConfirmationText();
  expect(text).toContain(message);
});

Then(
  'the order should appear in the blotter with status {string}',
  async function (this: CustomWorld, status: string) {
    this.blotterPage = new BlotterPage(this.page);
    const latestStatus = await this.blotterPage.getLatestOrderStatus();
    expect(latestStatus).toBe(status);
  }
);

Then('I should see validation message {string}', async function (this: CustomWorld, message: string) {
  const validationText = await this.tradingPage.getValidationMessage();
  expect(validationText).toContain(message);
});

Then('I should see notification {string}', async function (this: CustomWorld, message: string) {
  const notification = this.page.locator('[data-testid="notification-toast"]');
  await expect(notification).toContainText(message);
});

// ---------------------------------------------------------------------------
// Cancel flow
// ---------------------------------------------------------------------------

Given('I have a pending order for {string}', async function (this: CustomWorld, symbol: string) {
  this.blotterPage = new BlotterPage(this.page);
  await this.blotterPage.goto();
  const status = await this.blotterPage.getOrderStatusForSymbol(symbol);
  expect(status).toBe('Pending');
});

When('I click cancel on the order', async function (this: CustomWorld) {
  await this.blotterPage.cancelFirstPendingOrder();
});

Then(
  'the order status should change to {string}',
  async function (this: CustomWorld, expectedStatus: string) {
    const status = await this.blotterPage.getLatestOrderStatus();
    expect(status).toBe(expectedStatus);
  }
);
