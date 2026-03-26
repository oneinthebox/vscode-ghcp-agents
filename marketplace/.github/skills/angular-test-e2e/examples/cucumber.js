/**
 * Cucumber profile configuration for the Acme Trading Platform.
 *
 * Profiles:
 *   default  — runs all features with progress bar and JSON/HTML output
 *   smoke    — runs only @smoke-tagged scenarios
 *   ci       — runs all features with stricter settings for CI pipelines
 */
module.exports = {
  default: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'json:e2e/reports/cucumber-report.json',
      'html:e2e/reports/cucumber-report.html'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  },
  smoke: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    tags: '@smoke',
    format: [
      'progress-bar',
      'json:e2e/reports/cucumber-report.json'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  },
  ci: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    tags: 'not @wip',
    parallel: 4,
    format: [
      'json:e2e/reports/cucumber-report.json',
      'html:e2e/reports/cucumber-report.html'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  }
};
