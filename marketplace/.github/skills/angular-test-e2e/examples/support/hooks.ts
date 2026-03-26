import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

/**
 * Cucumber lifecycle hooks for Playwright browser management.
 *
 * Before: launches a browser and creates a page for each scenario.
 * After:  captures a screenshot on failure and tears down the browser.
 */

BeforeAll(async function () {
  console.log('Starting Cucumber BDD test suite...');
  console.log(`Base URL: ${process.env.BASE_URL || 'http://localhost:4200'}`);
  console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);
});

Before(async function (this: CustomWorld) {
  await this.openBrowser();
});

Before({ tags: '@skip' }, async function () {
  return 'skipped';
});

After(async function (this: CustomWorld, scenario) {
  // Capture screenshot on failure and attach to Cucumber report
  if (scenario.result?.status === Status.FAILED && this.page) {
    try {
      const screenshot = await this.page.screenshot({
        fullPage: true,
        type: 'png'
      });
      this.attach(screenshot, 'image/png');

      // Also capture the page URL for debugging context
      const url = this.page.url();
      this.attach(`Failed on URL: ${url}`, 'text/plain');
    } catch (err) {
      // Page may have already closed; ignore screenshot errors
      console.warn('Could not capture failure screenshot:', (err as Error).message);
    }
  }

  await this.closeBrowser();
});

AfterAll(async function () {
  console.log('Cucumber BDD test suite complete.');
});
