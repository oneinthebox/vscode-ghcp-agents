import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';

/**
 * Custom Cucumber World that manages a Playwright browser session.
 *
 * Each scenario gets its own browser context and page. Step definitions
 * access the page via `this.page` and can attach Page Object instances
 * as dynamic properties.
 */
export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // Dynamic Page Object references — assigned in step definitions
  [key: string]: any;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Launch a Chromium browser and create a fresh context + page.
   * Called in the Before hook for each scenario.
   */
  async openBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false'
    });

    this.context = await this.browser.newContext({
      baseURL: process.env.BASE_URL || 'http://localhost:4200',
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    // Enable request interception at the context level
    this.page = await this.context.newPage();
  }

  /**
   * Close page, context, and browser.
   * Called in the After hook for each scenario.
   */
  async closeBrowser(): Promise<void> {
    if (this.page) await this.page.close().catch(() => {});
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});
  }
}

setWorldConstructor(CustomWorld);
