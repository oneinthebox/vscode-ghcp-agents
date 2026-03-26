#!/usr/bin/env node
'use strict';

/**
 * Angular Undocumented Public API Scanner
 *
 * Finds public APIs (exports, public methods) that lack JSDoc/TSDoc comments.
 *
 * Usage: node scripts/scan-undocumented.js [src-dir]
 *
 * Output (stdout): JSON with documented vs undocumented counts and per-file gap details.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const srcDir = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-undocumented] ${msg}\n`);

// Patterns for exported symbols
const EXPORT_PATTERNS = [
  { regex: /^(\s*)export\s+class\s+(\w+)/,          type: 'class' },
  { regex: /^(\s*)export\s+abstract\s+class\s+(\w+)/, type: 'abstract class' },
  { regex: /^(\s*)export\s+function\s+(\w+)/,        type: 'function' },
  { regex: /^(\s*)export\s+interface\s+(\w+)/,       type: 'interface' },
  { regex: /^(\s*)export\s+type\s+(\w+)/,            type: 'type' },
  { regex: /^(\s*)export\s+enum\s+(\w+)/,            type: 'enum' },
  { regex: /^(\s*)export\s+const\s+(\w+)/,           type: 'const' },
];

// Pattern for public methods inside classes (not private/protected, not constructor)
const PUBLIC_METHOD_REGEX = /^\s+(?!private\s|protected\s|constructor|static\s+private|static\s+protected|readonly\s|get\s|set\s|\/\/|\/\*|\*)(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/;

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning for undocumented APIs in: ${srcDir}`);

  if (!fs.existsSync(srcDir)) {
    log(`ERROR: Directory not found: ${srcDir}`);
    process.exit(1);
  }

  const allFiles = [];
  collectFiles(srcDir, allFiles, /\.ts$/);

  // Filter out spec, test, node_modules, dist, .d.ts files
  const sourceFiles = allFiles.filter(f =>
    !f.endsWith('.spec.ts') &&
    !f.endsWith('.test.ts') &&
    !f.includes('node_modules') &&
    !f.includes('/dist/') &&
    !f.endsWith('.d.ts')
  );

  log(`Found ${sourceFiles.length} source files to analyze`);

  let totalApis = 0;
  let documented = 0;
  let undocumented = 0;
  const filesWithGaps = [];

  for (const file of sourceFiles) {
    const content = safeReadFile(file);
    if (!content) continue;

    const lines = content.split('\n');
    const gaps = [];

    // Scan for exported symbols
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of EXPORT_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          totalApis++;
          const symbol = match[2];
          const hasDoc = hasJsDocBefore(lines, i);

          if (hasDoc) {
            documented++;
          } else {
            undocumented++;
            gaps.push({
              line: i + 1,
              symbol,
              type: pattern.type,
            });
          }
          break; // Only match one pattern per line
        }
      }
    }

    // Scan for public methods inside classes
    const classRanges = findClassRanges(lines);
    for (const range of classRanges) {
      for (let i = range.start; i <= range.end && i < lines.length; i++) {
        const line = lines[i];
        const methodMatch = line.match(PUBLIC_METHOD_REGEX);
        if (methodMatch) {
          const methodName = methodMatch[1];
          // Skip common lifecycle hooks and property assignments
          if (isLifecycleHook(methodName)) continue;
          if (methodName.startsWith('_')) continue; // Convention for private

          totalApis++;
          const hasDoc = hasJsDocBefore(lines, i);

          if (hasDoc) {
            documented++;
          } else {
            undocumented++;
            gaps.push({
              line: i + 1,
              symbol: `${range.className}.${methodName}`,
              type: 'method',
            });
          }
        }
      }
    }

    if (gaps.length > 0) {
      filesWithGaps.push({
        path: path.relative(srcDir, file),
        gaps,
      });
    }
  }

  const result = {
    totalApis,
    documented,
    undocumented,
    coveragePercent: totalApis > 0
      ? Math.round((documented / totalApis) * 10000) / 100
      : 100,
    files: filesWithGaps,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Documentation coverage: ${result.coveragePercent}% (${documented}/${totalApis} APIs documented)`);
  log(`Files with gaps: ${filesWithGaps.length}`);
  log('Done.');
}

// ─── JSDoc detection ─────────────────────────────────────────
/**
 * Check if the line(s) immediately before `lineIndex` contain a closing JSDoc comment.
 * Looks for a `* /` (end of block comment) pattern within the 10 lines above.
 */
function hasJsDocBefore(lines, lineIndex) {
  // Walk backwards from the line above, skipping blank lines and decorators
  for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 15; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;                // Skip blank lines
    if (trimmed.startsWith('@')) continue;        // Skip decorators (@Component, etc.)

    // Found end of JSDoc block comment
    if (trimmed.endsWith('*/')) return true;

    // Found a single-line JSDoc: /** ... */
    if (trimmed.startsWith('/**') && trimmed.endsWith('*/')) return true;

    // Found something else (code, non-doc comment) → no JSDoc
    return false;
  }
  return false;
}

// ─── Class range detection ───────────────────────────────────
/**
 * Find the line ranges of class bodies to scan for public methods.
 * Returns [{ className, start, end }].
 */
function findClassRanges(lines) {
  const ranges = [];
  const content = lines.join('\n');

  // Find each class declaration
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (!classMatch) continue;

    const className = classMatch[1];
    // Find the opening brace
    let braceStart = -1;
    let braces = 0;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') {
          if (braceStart === -1) braceStart = j;
          braces++;
        } else if (ch === '}') {
          braces--;
          if (braces === 0 && braceStart !== -1) {
            ranges.push({ className, start: braceStart + 1, end: j - 1 });
            // Jump past this class
            i = j;
            j = lines.length; // Break outer
            break;
          }
        }
      }
    }
  }

  return ranges;
}

// ─── Lifecycle hook detection ────────────────────────────────
const LIFECYCLE_HOOKS = new Set([
  'ngOnInit', 'ngOnDestroy', 'ngOnChanges', 'ngDoCheck',
  'ngAfterContentInit', 'ngAfterContentChecked',
  'ngAfterViewInit', 'ngAfterViewChecked',
  'canActivate', 'canDeactivate', 'canMatch', 'resolve',
  'intercept', 'transform', 'validate',
]);

function isLifecycleHook(name) {
  return LIFECYCLE_HOOKS.has(name);
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
