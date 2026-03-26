#!/usr/bin/env node
'use strict';

/**
 * Angular Anti-Pattern Detector
 *
 * Scans TypeScript and HTML files for common code review violations
 * including console.log usage, `any` types, legacy directives,
 * constructor injection, missing trackBy, and hardcoded strings.
 *
 * Usage: node scripts/detect-antipatterns.js [src-dir]
 *
 * Output (stdout): JSON with findings grouped by category and severity summary.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const srcDir = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[detect-antipatterns] ${msg}\n`);

// ─── Pattern Definitions ─────────────────────────────────────
const TS_PATTERNS = [
  {
    category: 'debugging',
    severity: 'medium',
    regex: /\bconsole\.(log|debug|info|warn|error)\s*\(/g,
    message: 'console.log statement found — remove before merge',
    excludeTest: true,
  },
  {
    category: 'type-safety',
    severity: 'high',
    regex: /:\s*any\b/g,
    message: '`any` type usage — replace with a specific type or `unknown`',
    excludeTest: false,
  },
  {
    category: 'type-safety',
    severity: 'medium',
    regex: /as\s+any\b/g,
    message: '`as any` type assertion — use proper type narrowing instead',
    excludeTest: false,
  },
  {
    category: 'angular-patterns',
    severity: 'high',
    regex: /constructor\s*\(\s*(?:private|public|protected|readonly)\s+\w+\s*:/g,
    message: 'Constructor injection detected — use `inject()` function instead',
    excludeTest: true,
  },
  {
    category: 'hardcoded-values',
    severity: 'medium',
    regex: /['"`](https?:\/\/(?!cdn\.)[^\s'"`)]+)['"`]/g,
    message: 'Hardcoded URL found — use environment config or injection token',
    excludeTest: true,
  },
  {
    category: 'hardcoded-values',
    severity: 'low',
    regex: /['"`](\/api\/[^\s'"`)]+)['"`]/g,
    message: 'Hardcoded API path — consider using a centralized API_BASE_URL token',
    excludeTest: true,
  },
];

const HTML_PATTERNS = [
  {
    category: 'legacy-directives',
    severity: 'high',
    regex: /\*ngIf\s*=/g,
    message: '`*ngIf` detected — migrate to `@if` control flow block',
    excludeTest: false,
  },
  {
    category: 'legacy-directives',
    severity: 'high',
    regex: /\*ngFor\s*=/g,
    message: '`*ngFor` detected — migrate to `@for` control flow block',
    excludeTest: false,
  },
  {
    category: 'legacy-directives',
    severity: 'medium',
    regex: /\*ngSwitch\s*=/g,
    message: '`*ngSwitch` detected — migrate to `@switch` control flow block',
    excludeTest: false,
  },
  {
    category: 'performance',
    severity: 'high',
    regex: /\*ngFor\s*=\s*"[^"]*"(?![^"]*trackBy)/g,
    message: '`*ngFor` without `trackBy` — add trackBy function for DOM reuse',
    excludeTest: false,
  },
  {
    category: 'performance',
    severity: 'high',
    regex: /@for\s*\([^)]*\)\s*\{(?!\s*track\b)/g,
    message: '`@for` without `track` expression — add `track item.id`',
    excludeTest: false,
  },
  {
    category: 'security',
    severity: 'high',
    regex: /\[innerHTML\]\s*=/g,
    message: 'Raw `innerHTML` binding — use `[textContent]` or `DomSanitizer`',
    excludeTest: false,
  },
];

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning for anti-patterns in: ${srcDir}`);

  if (!fs.existsSync(srcDir)) {
    log(`ERROR: Directory not found: ${srcDir}`);
    process.exit(1);
  }

  const allFiles = [];
  collectFiles(srcDir, allFiles, /\.(ts|html)$/);

  const sourceFiles = allFiles.filter(f =>
    !f.includes('node_modules') &&
    !f.includes('/dist/') &&
    !f.endsWith('.d.ts')
  );

  log(`Found ${sourceFiles.length} files to scan`);

  const findings = [];
  const summary = { total: 0, high: 0, medium: 0, low: 0, byCategory: {} };

  for (const file of sourceFiles) {
    const content = safeReadFile(file);
    if (!content) continue;

    const relPath = path.relative(srcDir, file);
    const isTest = relPath.includes('.spec.') || relPath.includes('.test.');
    const isTs = file.endsWith('.ts');
    const isHtml = file.endsWith('.html');
    const lines = content.split('\n');

    const patterns = [];
    if (isTs) patterns.push(...TS_PATTERNS);
    if (isHtml) patterns.push(...HTML_PATTERNS);

    for (const pattern of patterns) {
      if (pattern.excludeTest && isTest) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        pattern.regex.lastIndex = 0;

        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          findings.push({
            category: pattern.category,
            severity: pattern.severity,
            file: relPath,
            line: i + 1,
            column: match.index + 1,
            message: pattern.message,
            snippet: line.trim().substring(0, 120),
          });

          summary.total++;
          summary[pattern.severity]++;
          if (!summary.byCategory[pattern.category]) {
            summary.byCategory[pattern.category] = 0;
          }
          summary.byCategory[pattern.category]++;
        }
      }
    }
  }

  // Sort findings: high severity first, then by file path
  findings.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sevDiff = (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    if (sevDiff !== 0) return sevDiff;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });

  const result = {
    scannedFiles: sourceFiles.length,
    findings,
    summary,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Findings: ${summary.total} (${summary.high} high, ${summary.medium} medium, ${summary.low} low)`);
  log(`Categories: ${Object.entries(summary.byCategory).map(([k, v]) => `${k}=${v}`).join(', ')}`);
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
