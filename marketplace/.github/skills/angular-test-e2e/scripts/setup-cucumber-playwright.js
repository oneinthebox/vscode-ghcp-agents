#!/usr/bin/env node
'use strict';

/**
 * Setup script for Cucumber + Playwright BDD e2e testing.
 *
 * Installs dependencies, creates the e2e directory structure,
 * generates configuration files, and adds npm scripts.
 *
 * Usage: node scripts/setup-cucumber-playwright.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const createdFiles = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  const abs = path.resolve(ROOT, dirPath);
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, { recursive: true });
    console.log(`  [dir]  ${dirPath}/`);
  }
}

function writeFile(filePath, content) {
  const abs = path.resolve(ROOT, filePath);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(abs, content, 'utf-8');
  createdFiles.push(filePath);
  console.log(`  [file] ${filePath}`);
}

// ---------------------------------------------------------------------------
// 1. Install npm packages
// ---------------------------------------------------------------------------

console.log('\n=== Installing npm packages ===\n');

const packages = [
  '@cucumber/cucumber',
  'playwright',
  '@playwright/test',
  'ts-node',
  'multiple-cucumber-html-reporter',
  '@types/node'
];

try {
  execSync(`npm install --save-dev ${packages.join(' ')}`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
  console.log('\nPackages installed successfully.\n');
} catch (err) {
  console.error('Failed to install packages. Continuing with file generation...\n');
}

// Install Playwright browsers (chromium only for speed)
try {
  execSync('npx playwright install chromium', { cwd: ROOT, stdio: 'inherit' });
} catch (err) {
  console.error('Failed to install Playwright browsers. Run manually: npx playwright install chromium\n');
}

// ---------------------------------------------------------------------------
// 2. Create directory structure
// ---------------------------------------------------------------------------

console.log('\n=== Creating directory structure ===\n');

const dirs = [
  'e2e/features',
  'e2e/step-definitions',
  'e2e/pages',
  'e2e/support',
  'e2e/test-data',
  'e2e/reports'
];

dirs.forEach((d) => ensureDir(d));

// Add .gitkeep to reports so the dir is tracked but contents are ignored
writeFile('e2e/reports/.gitkeep', '');

// ---------------------------------------------------------------------------
// 3. Generate cucumber.js config
// ---------------------------------------------------------------------------

console.log('\n=== Generating configuration files ===\n');

writeFile(
  'cucumber.js',
  `// Cucumber profile configuration
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
  }
};
`
);

// ---------------------------------------------------------------------------
// 4. Generate playwright.config.ts
// ---------------------------------------------------------------------------

writeFile(
  'playwright.config.ts',
  `import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 }
  }
});
`
);

// ---------------------------------------------------------------------------
// 5. Generate tsconfig.e2e.json
// ---------------------------------------------------------------------------

writeFile(
  'tsconfig.e2e.json',
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        resolveJsonModule: true,
        strict: true,
        outDir: './dist-e2e',
        rootDir: '.',
        baseUrl: '.',
        paths: {
          '@pages/*': ['e2e/pages/*'],
          '@support/*': ['e2e/support/*'],
          '@test-data/*': ['e2e/test-data/*']
        }
      },
      include: ['e2e/**/*.ts']
    },
    null,
    2
  ) + '\n'
);

// ---------------------------------------------------------------------------
// 6. Generate e2e/support/world.ts
// ---------------------------------------------------------------------------

writeFile(
  'e2e/support/world.ts',
  `import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // Page Object references — assigned in step definitions as needed
  [key: string]: any;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async openBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false'
    });
    this.context = await this.browser.newContext({
      baseURL: process.env.BASE_URL || 'http://localhost:4200',
      viewport: { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();
  }

  async closeBrowser(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
}

setWorldConstructor(CustomWorld);
`
);

// ---------------------------------------------------------------------------
// 7. Generate e2e/support/hooks.ts
// ---------------------------------------------------------------------------

writeFile(
  'e2e/support/hooks.ts',
  `import { Before, After, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

Before(async function (this: CustomWorld) {
  await this.openBrowser();
});

After(async function (this: CustomWorld, scenario) {
  // Capture screenshot on failure and attach to report
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({
      fullPage: true,
      type: 'png'
    });
    this.attach(screenshot, 'image/png');
  }
  await this.closeBrowser();
});
`
);

// ---------------------------------------------------------------------------
// 8. Add npm scripts to package.json
// ---------------------------------------------------------------------------

console.log('\n=== Updating package.json scripts ===\n');

const pkgPath = path.resolve(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['e2e'] = 'cucumber-js --config cucumber.js';
    pkg.scripts['e2e:smoke'] = 'cucumber-js --config cucumber.js --tags @smoke';
    pkg.scripts['e2e:report'] = 'node scripts/generate-report.js';
    pkg.scripts['e2e:dry-run'] = 'cucumber-js --config cucumber.js --dry-run';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log('  Added scripts: e2e, e2e:smoke, e2e:report, e2e:dry-run');
  } catch (err) {
    console.error('  Could not update package.json:', err.message);
  }
} else {
  console.log('  package.json not found — skipping script injection.');
}

// ---------------------------------------------------------------------------
// 9. Append to .gitignore
// ---------------------------------------------------------------------------

const gitignorePath = path.resolve(ROOT, '.gitignore');
const gitignoreEntry = '\n# Cucumber e2e reports\ne2e/reports/*.json\ne2e/reports/*.html\ne2e/reports/html/\n';

if (fs.existsSync(gitignorePath)) {
  const existing = fs.readFileSync(gitignorePath, 'utf-8');
  if (!existing.includes('e2e/reports')) {
    fs.appendFileSync(gitignorePath, gitignoreEntry, 'utf-8');
    console.log('  Updated .gitignore with e2e/reports exclusions.');
  }
} else {
  fs.writeFileSync(gitignorePath, gitignoreEntry.trimStart(), 'utf-8');
  console.log('  Created .gitignore with e2e/reports exclusions.');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n=== Setup complete ===\n');
console.log(JSON.stringify({ createdFiles }, null, 2));
console.log('\nNext steps:');
console.log('  1. Write feature files in e2e/features/');
console.log('  2. Implement step definitions in e2e/step-definitions/');
console.log('  3. Create page objects in e2e/pages/');
console.log('  4. Run: npm run e2e');
console.log('  5. Generate report: npm run e2e:report\n');
