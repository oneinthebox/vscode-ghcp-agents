#!/usr/bin/env node
'use strict';

/**
 * Angular Lint Analysis Script
 *
 * Runs ESLint on an Angular project and produces a categorized lint report.
 * Groups violations by rule category (Angular-specific, TypeScript, import order,
 * template accessibility, code quality), counts auto-fixable vs manual-fix issues,
 * and calculates a quality score.
 *
 * Usage: node scripts/run-lint-analysis.js [project-root]
 *
 * Output (stdout): JSON with categories, autoFixable, manualFix, qualityScore.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[lint-analysis] ${msg}\n`);

// ─── Rule Category Definitions ───────────────────────────────
const CATEGORY_MATCHERS = [
  { name: 'Angular-specific',        test: (rule) => /^@angular-eslint\/(?!template\/)/.test(rule) },
  { name: 'Template accessibility',  test: (rule) => /^@angular-eslint\/template\//.test(rule) },
  { name: 'TypeScript',              test: (rule) => /^@typescript-eslint\//.test(rule) },
  { name: 'Import order',            test: (rule) => /^import\//.test(rule) || rule === 'sort-imports' },
  { name: 'Code quality',            test: () => true }, // catch-all for everything else
];

/**
 * Classify a rule into its category.
 * The first matching category wins; "Code quality" is the fallback.
 */
function categorizeRule(ruleId) {
  if (!ruleId) return 'Code quality';
  for (const cat of CATEGORY_MATCHERS) {
    if (cat.test(ruleId)) return cat.name;
  }
  return 'Code quality';
}

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Analyzing lint results in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  // Determine ESLint source directory
  const srcDir = fs.existsSync(path.join(root, 'src')) ? 'src/' : '.';

  // Run ESLint with JSON output
  let eslintOutput = '';
  try {
    eslintOutput = execSync(
      `npx eslint --format json ${srcDir} --no-error-on-unmatched-pattern 2>/dev/null`,
      { cwd: root, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) {
    // ESLint exits non-zero when there are linting errors — stdout still has JSON
    if (e.stdout) {
      eslintOutput = e.stdout;
    } else {
      log(`ERROR: ESLint execution failed: ${e.message}`);
      process.exit(1);
    }
  }

  // Parse the JSON output
  let files;
  try {
    files = JSON.parse(eslintOutput);
  } catch {
    log('ERROR: Failed to parse ESLint JSON output');
    process.exit(1);
  }

  // ─── Aggregate Results ───────────────────────────────────
  const categories = {};
  let totalAutoFixable = 0;
  let totalManualFix = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const ruleFrequency = {};

  for (const file of files) {
    for (const msg of (file.messages || [])) {
      const ruleId = msg.ruleId || 'unknown';
      const category = categorizeRule(ruleId);
      const severity = msg.severity === 2 ? 'error' : 'warning';
      const isFixable = !!msg.fix;

      // Initialize category bucket
      if (!categories[category]) {
        categories[category] = { errors: 0, warnings: 0, autoFixable: 0, manualFix: 0, rules: {} };
      }

      // Increment category counters
      categories[category][severity === 'error' ? 'errors' : 'warnings'] += 1;

      if (isFixable) {
        categories[category].autoFixable += 1;
        totalAutoFixable += 1;
      } else {
        categories[category].manualFix += 1;
        totalManualFix += 1;
      }

      // Track per-rule frequency within the category
      if (!categories[category].rules[ruleId]) {
        categories[category].rules[ruleId] = { count: 0, severity, fixable: isFixable };
      }
      categories[category].rules[ruleId].count += 1;

      // Global severity counters
      if (severity === 'error') totalErrors += 1;
      else totalWarnings += 1;

      // Global rule frequency for top-N ranking
      ruleFrequency[ruleId] = (ruleFrequency[ruleId] || 0) + 1;
    }
  }

  // ─── Quality Score ─────────────────────────────────────────
  // 100 - (5 x errors) - (2 x warnings), clamped to [0, 100]
  const qualityScore = Math.max(0, Math.min(100, 100 - (5 * totalErrors) - (2 * totalWarnings)));

  // ─── Build Output ──────────────────────────────────────────
  const result = {
    categories,
    autoFixable: totalAutoFixable,
    manualFix: totalManualFix,
    qualityScore,
    totalErrors,
    totalWarnings,
    filesScanned: files.length,
    topRulesByFrequency: Object.entries(ruleFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rule, count]) => ({ rule, count })),
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Quality score: ${qualityScore}/100 (${totalErrors} errors, ${totalWarnings} warnings)`);
  log(`Auto-fixable: ${totalAutoFixable}, Manual-fix: ${totalManualFix}`);
  log('Done.');
}

// ─── Run ─────────────────────────────────────────────────────
main();
