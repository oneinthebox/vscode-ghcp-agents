#!/usr/bin/env node
'use strict';

/**
 * Generates an HTML report from Cucumber JSON output.
 *
 * Reads:  e2e/reports/cucumber-report.json
 * Writes: e2e/reports/html/index.html
 *
 * Usage: node scripts/generate-report.js
 */

const fs = require('fs');
const path = require('path');

const REPORT_JSON = path.resolve(process.cwd(), 'e2e/reports/cucumber-report.json');
const REPORT_DIR = path.resolve(process.cwd(), 'e2e/reports');
const HTML_OUTPUT = path.resolve(REPORT_DIR, 'html');

// ---------------------------------------------------------------------------
// Validate input
// ---------------------------------------------------------------------------

if (!fs.existsSync(REPORT_JSON)) {
  console.error(`Error: Report file not found at ${REPORT_JSON}`);
  console.error('Run tests first: npm run e2e');
  process.exit(1);
}

console.log('Generating HTML report...');
console.log(`Reading: ${REPORT_JSON}`);

// ---------------------------------------------------------------------------
// Parse JSON and compute summary
// ---------------------------------------------------------------------------

let reportData;
try {
  reportData = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf-8'));
} catch (err) {
  console.error(`Error: Could not parse ${REPORT_JSON} — ${err.message}`);
  process.exit(1);
}

let scenariosPassed = 0;
let scenariosFailed = 0;
let stepsPassed = 0;
let stepsFailed = 0;
let stepsSkipped = 0;
let stepsPending = 0;

for (const feature of reportData) {
  for (const scenario of feature.elements || []) {
    let scenarioPassed = true;
    for (const step of scenario.steps || []) {
      const status = step.result?.status;
      if (status === 'passed') {
        stepsPassed++;
      } else if (status === 'failed') {
        stepsFailed++;
        scenarioPassed = false;
      } else if (status === 'skipped') {
        stepsSkipped++;
      } else if (status === 'pending') {
        stepsPending++;
        scenarioPassed = false;
      }
    }
    if (scenarioPassed) {
      scenariosPassed++;
    } else {
      scenariosFailed++;
    }
  }
}

const totalScenarios = scenariosPassed + scenariosFailed;
const totalSteps = stepsPassed + stepsFailed + stepsSkipped + stepsPending;

// ---------------------------------------------------------------------------
// Generate HTML report
// ---------------------------------------------------------------------------

try {
  const report = require('multiple-cucumber-html-reporter');
  report.generate({
    jsonDir: REPORT_DIR,
    reportPath: HTML_OUTPUT,
    reportName: 'Acme Trading Platform — E2E Test Report',
    pageTitle: 'E2E BDD Test Report',
    displayDuration: true,
    displayReportTime: true,
    metadata: {
      browser: { name: 'chromium', version: 'latest' },
      device: 'CI Server',
      platform: { name: process.platform, version: process.arch }
    },
    customData: {
      title: 'Run Info',
      data: [
        { label: 'Project', value: 'Acme Trading Platform' },
        { label: 'Framework', value: 'Cucumber + Playwright' },
        { label: 'Execution Date', value: new Date().toISOString() }
      ]
    }
  });
  console.log(`Report generated: ${HTML_OUTPUT}/index.html`);
} catch (err) {
  console.error('Warning: multiple-cucumber-html-reporter not installed.');
  console.error('Install it: npm install --save-dev multiple-cucumber-html-reporter');
  console.error('Falling back to summary only.\n');
}

// ---------------------------------------------------------------------------
// Print summary
// ---------------------------------------------------------------------------

console.log('\nSummary:');
console.log(`  Scenarios: ${totalScenarios} (${scenariosPassed} passed, ${scenariosFailed} failed)`);
console.log(`  Steps:     ${totalSteps} (${stepsPassed} passed, ${stepsFailed} failed, ${stepsSkipped} skipped, ${stepsPending} pending)`);
