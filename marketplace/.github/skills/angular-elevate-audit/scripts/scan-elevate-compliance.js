#!/usr/bin/env node
'use strict';

/**
 * Elevate Compliance Scanner
 *
 * Scans TypeScript files for violations of Elevate platform conventions.
 * Detects direct console usage, raw localStorage/sessionStorage access,
 * hardcoded URLs, and custom auth patterns that should use Elevate services.
 *
 * Usage: node scripts/scan-elevate-compliance.js [project-root]
 *
 * Output (stdout): JSON with violations array and summary.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-elevate] ${msg}\n`);

// ─── Detection patterns ─────────────────────────────────────

/** console.log/warn/error instead of LoggingService — severity: high */
const CONSOLE_RE = /\bconsole\.(log|warn|error|info|debug)\s*\(/g;

/** localStorage/sessionStorage instead of ConfigService — severity: high */
const STORAGE_RE = /\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\s*\(/g;

/** Hardcoded URLs instead of ConfigService.get() — severity: medium */
const HARDCODED_URL_RE = /['"`](https?:\/\/[^'"`\s]{5,})['"`]/g;

/** Custom auth patterns instead of AuthService — severity: high */
const AUTH_PATTERNS = [
  { re: /\bnew\s+Headers\b[\s\S]{0,80}[Aa]uthoriz/g, label: 'manual Authorization header' },
  { re: /\batob\s*\(|btoa\s*\(/g, label: 'manual token encoding' },
  { re: /\bjwt[_-]?decode\b/gi, label: 'manual JWT decode' },
  { re: /\bdocument\.cookie\b/g, label: 'direct cookie access' },
];

// Files to skip
const SKIP_PATTERNS = [
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /node_modules/,
  /\.d\.ts$/,
  /environments?\//,
];

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning for Elevate compliance in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  const tsFiles = [];
  collectFiles(root, tsFiles, /\.ts$/);

  // Filter out skipped patterns
  const targetFiles = tsFiles.filter(
    (f) => !SKIP_PATTERNS.some((p) => p.test(f))
  );
  log(`Found ${targetFiles.length} TypeScript file(s) to scan`);

  const violations = [];

  for (const filePath of targetFiles) {
    const content = safeReadFile(filePath);
    if (!content) continue;

    const lines = content.split('\n');
    const relFile = path.relative(root, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      // Check console usage
      let match;
      CONSOLE_RE.lastIndex = 0;
      while ((match = CONSOLE_RE.exec(line)) !== null) {
        violations.push({
          type: 'logging',
          severity: 'high',
          value: `console.${match[1]}()`,
          replacement: `this.logger.${match[1] === 'log' ? 'info' : match[1]}()`,
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }

      // Check localStorage/sessionStorage
      STORAGE_RE.lastIndex = 0;
      while ((match = STORAGE_RE.exec(line)) !== null) {
        violations.push({
          type: 'config',
          severity: 'high',
          value: `${match[1]}.${match[2]}()`,
          replacement: `this.config.get() / this.config.set()`,
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }

      // Check hardcoded URLs
      HARDCODED_URL_RE.lastIndex = 0;
      while ((match = HARDCODED_URL_RE.exec(line)) !== null) {
        // Skip import statements and comments
        if (/^\s*import\s/.test(line)) continue;
        violations.push({
          type: 'url',
          severity: 'medium',
          value: match[1],
          replacement: `this.config.getApiBaseUrl()`,
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }

      // Check custom auth patterns
      for (const pattern of AUTH_PATTERNS) {
        pattern.re.lastIndex = 0;
        while ((match = pattern.re.exec(line)) !== null) {
          violations.push({
            type: 'auth',
            severity: 'high',
            value: pattern.label,
            replacement: 'Use ElevateAuthService',
            file: relFile,
            line: lineNum,
            context: line.trim(),
          });
        }
      }
    }
  }

  // Build summary
  const summary = {
    logging: violations.filter((v) => v.type === 'logging').length,
    config: violations.filter((v) => v.type === 'config').length,
    url: violations.filter((v) => v.type === 'url').length,
    auth: violations.filter((v) => v.type === 'auth').length,
    total: violations.length,
    filesScanned: targetFiles.length,
  };

  log(`Violations found: ${summary.total} (logging=${summary.logging}, config=${summary.config}, url=${summary.url}, auth=${summary.auth})`);

  const result = { violations, summary };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
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
