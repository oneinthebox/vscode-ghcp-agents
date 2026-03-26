#!/usr/bin/env node
'use strict';

/**
 * Angular Quality Scanner
 *
 * Runs quality checks and aggregates results into a quality score.
 * Checks: ESLint results, Angular budgets, TODO/FIXME/HACK comments,
 * and console.log usage in production code.
 *
 * Usage: node scripts/scan-quality.js [project-root]
 *
 * Output (stdout): JSON with lint errors, warnings, TODOs, console logs, budgets, quality score.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-quality] ${msg}\n`);

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/;
const CONSOLE_PATTERN = /\bconsole\.(log|debug|info|warn|error|trace)\s*\(/;

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning quality in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  // Collect source files
  const srcDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  const allTsFiles = [];
  collectFiles(srcDir, allTsFiles, /\.ts$/);

  const sourceFiles = allTsFiles.filter(f =>
    !f.endsWith('.spec.ts') &&
    !f.endsWith('.test.ts') &&
    !f.includes('node_modules') &&
    !f.includes('/dist/')
  );

  log(`Found ${sourceFiles.length} source files to analyze`);

  // 1. ESLint check
  const lintResult = runEslint();

  // 2. Angular budgets
  const budgets = extractBudgets();

  // 3. TODO/FIXME/HACK comments
  const todos = scanTodos(sourceFiles);

  // 4. Console.log usage in non-test files
  const consoleLogs = scanConsoleLogs(sourceFiles);

  // 5. Calculate quality score
  const qualityScore = calculateScore(lintResult, todos, consoleLogs);

  const result = {
    lintErrors: lintResult.errors,
    lintWarnings: lintResult.warnings,
    lintAvailable: lintResult.available,
    lintErrorDetails: lintResult.errorDetails.slice(0, 50), // Top 50 issues
    todos: {
      total: todos.total,
      byType: todos.byType,
      items: todos.items.slice(0, 100), // Top 100 TODOs
    },
    consoleLogs: {
      total: consoleLogs.total,
      items: consoleLogs.items.slice(0, 50), // Top 50
    },
    budgets,
    qualityScore,
    filesScanned: sourceFiles.length,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Quality score: ${qualityScore}/100`);
  log('Done.');
}

// ─── ESLint ──────────────────────────────────────────────────
function runEslint() {
  const result = { available: false, errors: 0, warnings: 0, errorDetails: [] };

  // Check if any ESLint config exists
  const eslintConfigs = [
    '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
    '.eslintrc', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
  ];
  const hasEslint = eslintConfigs.some(f => fs.existsSync(path.join(root, f)));

  if (!hasEslint) {
    log('No ESLint configuration found, skipping lint check');
    return result;
  }

  log('Running ESLint...');
  result.available = true;

  try {
    // Run ESLint with JSON output; it exits non-zero when there are errors
    const srcDir = fs.existsSync(path.join(root, 'src')) ? 'src/' : '.';
    const output = execSync(
      `npx eslint --format json ${srcDir} --no-error-on-unmatched-pattern 2>/dev/null`,
      { cwd: root, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    parseEslintOutput(output, result);
  } catch (e) {
    // ESLint exits with code 1 when there are linting errors
    if (e.stdout) {
      parseEslintOutput(e.stdout, result);
    } else {
      log(`WARNING: ESLint execution failed: ${e.message}`);
    }
  }

  log(`ESLint: ${result.errors} errors, ${result.warnings} warnings`);
  return result;
}

function parseEslintOutput(output, result) {
  try {
    const data = JSON.parse(output);
    for (const file of data) {
      result.errors += file.errorCount || 0;
      result.warnings += file.warningCount || 0;
      for (const msg of (file.messages || [])) {
        result.errorDetails.push({
          file: path.relative(root, file.filePath),
          line: msg.line,
          severity: msg.severity === 2 ? 'error' : 'warning',
          rule: msg.ruleId,
          message: msg.message,
        });
      }
    }
  } catch {
    log('WARNING: Failed to parse ESLint JSON output');
  }
}

// ─── Budget extraction ───────────────────────────────────────
function extractBudgets() {
  const angularJsonPath = path.join(root, 'angular.json');
  if (!fs.existsSync(angularJsonPath)) return [];

  try {
    const config = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
    const budgets = [];
    const projects = config.projects || {};

    for (const [projName, proj] of Object.entries(projects)) {
      const buildConfig = proj.architect?.build?.configurations?.production
        || proj.architect?.build?.options
        || {};
      if (buildConfig.budgets && Array.isArray(buildConfig.budgets)) {
        for (const budget of buildConfig.budgets) {
          budgets.push({
            project: projName,
            type: budget.type,
            name: budget.name || null,
            maximumWarning: budget.maximumWarning || null,
            maximumError: budget.maximumError || null,
          });
        }
      }
    }

    log(`Found ${budgets.length} budget rule(s)`);
    return budgets;
  } catch (e) {
    log(`WARNING: Failed to extract budgets: ${e.message}`);
    return [];
  }
}

// ─── TODO/FIXME/HACK scanning ───────────────────────────────
function scanTodos(files) {
  const items = [];
  const byType = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0, WORKAROUND: 0 };

  for (const file of files) {
    const content = safeReadFile(file);
    if (!content) continue;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(TODO_PATTERN);
      if (match) {
        const type = match[1];
        byType[type] = (byType[type] || 0) + 1;
        items.push({
          file: path.relative(root, file),
          line: i + 1,
          type,
          text: line.trim().substring(0, 120),
        });
      }
    }
  }

  return { total: items.length, byType, items };
}

// ─── Console.log scanning ────────────────────────────────────
function scanConsoleLogs(files) {
  const items = [];

  for (const file of files) {
    const content = safeReadFile(file);
    if (!content) continue;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (CONSOLE_PATTERN.test(line)) {
        // Skip if the line is a comment
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

        const methodMatch = line.match(/console\.(\w+)/);
        items.push({
          file: path.relative(root, file),
          line: i + 1,
          method: methodMatch ? methodMatch[1] : 'log',
          text: trimmed.substring(0, 120),
        });
      }
    }
  }

  return { total: items.length, items };
}

// ─── Quality score ───────────────────────────────────────────
/**
 * Calculate quality score starting at 100:
 *   -5 per lint error
 *   -2 per lint warning
 *   -1 per TODO/FIXME/HACK
 *   -1 per console.log in production code
 * Minimum score is 0.
 */
function calculateScore(lint, todos, consoleLogs) {
  let score = 100;
  score -= lint.errors * 5;
  score -= lint.warnings * 2;
  score -= todos.total * 1;
  score -= consoleLogs.total * 1;
  return Math.max(0, Math.min(100, score));
}

// ─── Helpers ─────────────────────────────────────────────────
function collectFiles(dir, results, pattern) {
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.angular') continue;
    const full = path.join(dir, entry);
    if (safeIsDir(full)) {
      collectFiles(full, results, pattern);
    } else if (pattern.test(entry)) {
      results.push(full);
    }
  }
}

function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function safeReaddir(dir) {
  try { return fs.readdirSync(dir); }
  catch { return []; }
}

function safeIsDir(p) {
  try { return fs.statSync(p).isDirectory(); }
  catch { return false; }
}

// ─── Run ─────────────────────────────────────────────────────
main();
