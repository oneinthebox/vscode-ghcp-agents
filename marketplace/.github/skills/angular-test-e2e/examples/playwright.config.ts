import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for the Acme Trading Platform e2e tests.
 *
 * Note: When using Cucumber as the test runner, this config is imported
 * by the custom World / hooks rather than used directly by Playwright CLI.
 * It serves as the single source of truth for browser settings.
 */
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000
  },
  expect: {
    timeout: 5_000
  }
});
