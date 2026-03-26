#!/usr/bin/env node
'use strict';

/**
 * TSDoc Coverage Calculator
 *
 * Calculates TSDoc/JSDoc coverage percentage for Angular projects.
 * Provides per-file and per-module breakdown with quality checks
 * for @param correctness and @returns presence.
 *
 * Usage: node scripts/tsdoc-coverage.js [src-dir] [--min-coverage 80]
 *
 * Output (stdout): JSON with coverage metrics, per-file breakdown, quality analysis.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success (or if coverage >= min), 1 if below threshold.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const srcDir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const minCoverage = parseInt(getFlag('--min-coverage', '0'));
const log = (msg) => process.stderr.write(`[tsdoc-coverage] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// Patterns for exported symbols that should be documented
const EXPORT_PATTERNS = [
  { regex: /^(\s*)export\s+class\s+(\w+)/,            type: 'class' },
  { regex: /^(\s*)export\s+abstract\s+class\s+(\w+)/, type: 'abstract class' },
  { regex: /^(\s*)export\s+function\s+(\w+)/,          type: 'function' },
  { regex: /^(\s*)export\s+interface\s+(\w+)/,         type: 'interface' },
  { regex: /^(\s*)export\s+type\s+(\w+)/,              type: 'type' },
  { regex: /^(\s*)export\s+enum\s+(\w+)/,              type: 'enum' },
  { regex: /^(\s*)export\s+const\s+(\w+)/,             type: 'const' },
];

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Calculating TSDoc coverage in: ${srcDir}`);
  if (minCoverage > 0) {
    log(`Minimum coverage threshold: ${minCoverage}%`);
  }

  if (!fs.existsSync(srcDir)) {
    log(`ERROR: Directory not found: ${srcDir}`);
    process.exit(1);
  }

  const allFiles = [];
  collectFiles(srcDir, allFiles, /\.ts$/);

  const sourceFiles = allFiles.filter(f =>
    !f.endsWith('.spec.ts') &&
    !f.endsWith('.test.ts') &&
    !f.includes('node_modules') &&
    !f.includes('/dist/') &&
    !f.endsWith('.d.ts')
  );

  log(`Found ${sourceFiles.length} source files to analyze`);

  let globalTotal = 0;
  let globalDocumented = 0;
  const byFile = [];
  const quality = { correctParams: 0, incorrectParams: 0, missingReturns: 0, totalFunctions: 0 };

  for (const file of sourceFiles) {
    const content = safeReadFile(file);
    if (!content) continue;

    const lines = content.split('\n');
    let fileTotal = 0;
    let fileDocumented = 0;

    // Scan for exported symbols
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of EXPORT_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          fileTotal++;
          const docBlock = getJsDocBefore(lines, i);

          if (docBlock) {
            fileDocumented++;

            // Quality check for functions and methods
            if (pattern.type === 'function') {
              checkFunctionDocQuality(lines, i, docBlock, quality);
            }
          }
          break;
        }
      }
    }

    // Also scan public methods in exported classes
    const classRanges = findExportedClassRanges(lines);
    for (const range of classRanges) {
      for (let i = range.start; i <= range.end && i < lines.length; i++) {
        const methodMatch = lines[i].match(
          /^\s+(?!private\s|protected\s|constructor|static\s+private|static\s+protected|readonly\s|get\s|set\s|\/\/|\/\*|\*)(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/
        );
        if (methodMatch) {
          const methodName = methodMatch[1];
          if (isLifecycleHook(methodName) || methodName.startsWith('_')) continue;

          fileTotal++;
          const docBlock = getJsDocBefore(lines, i);

          if (docBlock) {
            fileDocumented++;
            // Quality: check @param and @returns for methods
            const params = methodMatch[2];
            const returnType = methodMatch[3] ? methodMatch[3].trim() : null;
            checkMethodDocQuality(params, returnType, docBlock, quality);
          }

          quality.totalFunctions++;
        }
      }
    }

    globalTotal += fileTotal;
    globalDocumented += fileDocumented;

    if (fileTotal > 0) {
      byFile.push({
        path: path.relative(srcDir, file),
        total: fileTotal,
        documented: fileDocumented,
        percent: Math.round((fileDocumented / fileTotal) * 10000) / 100,
      });
    }
  }

  // Sort byFile: lowest coverage first for easy identification of gaps
  byFile.sort((a, b) => a.percent - b.percent);

  const coveragePercent = globalTotal > 0
    ? Math.round((globalDocumented / globalTotal) * 10000) / 100
    : 100;

  const result = {
    coveragePercent,
    totalApis: globalTotal,
    documented: globalDocumented,
    undocumented: globalTotal - globalDocumented,
    byFile,
    quality: {
      totalFunctions: quality.totalFunctions,
      correctParams: quality.correctParams,
      incorrectParams: quality.incorrectParams,
      missingReturns: quality.missingReturns,
    },
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`TSDoc coverage: ${coveragePercent}% (${globalDocumented}/${globalTotal} APIs)`);
  log(`Quality: ${quality.correctParams} correct @params, ${quality.incorrectParams} incorrect, ${quality.missingReturns} missing @returns`);

  // Exit with error if below threshold
  if (minCoverage > 0 && coveragePercent < minCoverage) {
    log(`FAIL: Coverage ${coveragePercent}% is below minimum ${minCoverage}%`);
    process.exit(1);
  }

  log('Done.');
}

// ─── JSDoc extraction ────────────────────────────────────────
/**
 * Get the JSDoc block comment immediately before `lineIndex`.
 * Returns the full doc block string, or null if none found.
 */
function getJsDocBefore(lines, lineIndex) {
  // Walk backwards to find closing */
  let endLine = -1;
  for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 20; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('@')) continue; // Decorators

    if (trimmed.endsWith('*/')) {
      endLine = i;
      break;
    }
    // Not a doc comment
    return null;
  }

  if (endLine === -1) return null;

  // Walk further backwards to find opening /**
  let startLine = endLine;
  for (let i = endLine; i >= 0 && i >= endLine - 50; i--) {
    if (lines[i].trim().startsWith('/**')) {
      startLine = i;
      break;
    }
  }

  return lines.slice(startLine, endLine + 1).join('\n');
}

// ─── Quality checks ─────────────────────────────────────────
function checkFunctionDocQuality(lines, lineIndex, docBlock, quality) {
  // Extract function parameters from the line
  const funcLine = lines[lineIndex];
  const paramsMatch = funcLine.match(/function\s+\w+\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);
  const params = paramsMatch ? paramsMatch[1] : '';
  const returnTypeMatch = funcLine.match(/\)\s*:\s*([^{]+)/);
  const returnType = returnTypeMatch ? returnTypeMatch[1].trim() : null;

  checkMethodDocQuality(params, returnType, docBlock, quality);
}

function checkMethodDocQuality(paramsStr, returnType, docBlock, quality) {
  // Count actual parameters
  const actualParams = paramsStr
    ? paramsStr.split(',').map(p => p.trim()).filter(p => p && p !== '')
    : [];
  const actualParamCount = actualParams.length;

  // Count @param tags in doc
  const docParamCount = (docBlock.match(/@param/g) || []).length;

  if (actualParamCount === docParamCount) {
    quality.correctParams++;
  } else {
    quality.incorrectParams++;
  }

  // Check @returns for non-void functions
  if (returnType && returnType !== 'void' && returnType !== 'void ' && !returnType.startsWith('void')) {
    const hasReturns = /@returns?/.test(docBlock);
    if (!hasReturns) {
      quality.missingReturns++;
    }
  }
}

// ─── Class range detection ───────────────────────────────────
function findExportedClassRanges(lines) {
  const ranges = [];

  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/export\s+(?:abstract\s+)?class\s+(\w+)/);
    if (!classMatch) continue;

    const className = classMatch[1];
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
            i = j;
            j = lines.length;
            break;
          }
        }
      }
    }
  }

  return ranges;
}

// ─── Lifecycle hooks ─────────────────────────────────────────
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
