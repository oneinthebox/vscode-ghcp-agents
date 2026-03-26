#!/usr/bin/env node
'use strict';

/**
 * Angular Test Coverage Gap Analyzer
 *
 * Scans source files and checks for co-located spec files.
 * Counts exported symbols and test cases per file.
 *
 * Usage: node scripts/scan-tests.js [src-dir]
 *
 * Output (stdout): JSON with coverage metrics and untested file list.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const srcDir = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-tests] ${msg}\n`);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning test coverage in: ${srcDir}`);

  if (!fs.existsSync(srcDir)) {
    log(`ERROR: Directory not found: ${srcDir}`);
    process.exit(1);
  }

  // Collect all TypeScript source files (exclude specs, tests, node_modules)
  const allFiles = [];
  collectFiles(srcDir, allFiles, /\.ts$/);

  const sourceFiles = allFiles.filter(f =>
    !f.endsWith('.spec.ts') &&
    !f.endsWith('.test.ts') &&
    !f.includes('node_modules') &&
    !f.includes('/dist/') &&
    !f.endsWith('.d.ts') &&
    !f.endsWith('.module.ts') &&  // Modules rarely need direct tests
    !f.endsWith('environment.ts') &&
    !f.endsWith('environment.prod.ts')
  );

  const specFiles = allFiles.filter(f =>
    (f.endsWith('.spec.ts') || f.endsWith('.test.ts')) &&
    !f.includes('node_modules')
  );

  log(`Source files: ${sourceFiles.length}`);
  log(`Spec files: ${specFiles.length}`);

  // Build a set of spec file base paths for quick lookup
  const specBases = new Set();
  for (const sf of specFiles) {
    // foo.spec.ts → foo, foo.component.spec.ts → foo.component
    const base = sf.replace(/\.(spec|test)\.ts$/, '');
    specBases.add(base);
  }

  const testedFiles = [];
  const untestedFiles = [];
  const exportCounts = {};
  const testCounts = {};

  for (const file of sourceFiles) {
    const base = file.replace(/\.ts$/, '');
    const relPath = path.relative(srcDir, file);
    const content = safeReadFile(file);
    if (!content) continue;

    // Count exported symbols in this source file
    const exports = countExports(content);
    exportCounts[relPath] = exports;

    if (specBases.has(base)) {
      testedFiles.push(relPath);

      // Find and parse the matching spec file
      const specPath = specFiles.find(sf => sf.replace(/\.(spec|test)\.ts$/, '') === base);
      if (specPath) {
        const specContent = safeReadFile(specPath);
        if (specContent) {
          testCounts[relPath] = countTestCases(specContent);
        }
      }
    } else {
      untestedFiles.push(relPath);
    }
  }

  const totalFiles = sourceFiles.length;
  const testedCount = testedFiles.length;
  const coveragePercent = totalFiles > 0
    ? Math.round((testedCount / totalFiles) * 10000) / 100
    : 0;

  // Classify untested files by type for prioritization
  const untestedByType = classifyUntested(untestedFiles);

  const result = {
    totalFiles,
    testedFiles: testedCount,
    untestedCount: untestedFiles.length,
    coveragePercent,
    untestedFiles,
    untestedByType,
    exportCounts,
    testCounts,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Coverage: ${coveragePercent}% (${testedCount}/${totalFiles} files have specs)`);
  log('Done.');
}

// ─── Export counting ─────────────────────────────────────────
/**
 * Count exported symbols in a TypeScript source file.
 * Returns { classes, functions, constants, total }.
 */
function countExports(content) {
  const classes = (content.match(/export\s+class\s+/g) || []).length;
  const functions = (content.match(/export\s+function\s+/g) || []).length;
  const constants = (content.match(/export\s+const\s+/g) || []).length;
  const interfaces = (content.match(/export\s+interface\s+/g) || []).length;
  const enums = (content.match(/export\s+enum\s+/g) || []).length;
  const types = (content.match(/export\s+type\s+/g) || []).length;

  return {
    classes,
    functions,
    constants,
    interfaces,
    enums,
    types,
    total: classes + functions + constants + interfaces + enums + types,
  };
}

// ─── Test case counting ──────────────────────────────────────
/**
 * Count describe blocks and it/test blocks in a spec file.
 * Returns { describes, testCases }.
 */
function countTestCases(content) {
  // Match it('...'), it(`...`), test('...'), etc.
  const testCases = (content.match(/\b(it|test)\s*\(/g) || []).length;
  const describes = (content.match(/\bdescribe\s*\(/g) || []).length;
  const skipped = (content.match(/\b(xit|xdescribe|it\.skip|describe\.skip|test\.skip)\s*\(/g) || []).length;
  const focused = (content.match(/\b(fit|fdescribe|it\.only|describe\.only|test\.only)\s*\(/g) || []).length;

  return {
    describes,
    testCases,
    skipped,
    focused,
  };
}

// ─── File classification ─────────────────────────────────────
/**
 * Classify untested files by Angular artifact type.
 */
function classifyUntested(files) {
  const result = {
    components: [],
    services: [],
    pipes: [],
    directives: [],
    guards: [],
    interceptors: [],
    resolvers: [],
    utils: [],
    other: [],
  };

  for (const file of files) {
    if (file.includes('.component.')) result.components.push(file);
    else if (file.includes('.service.')) result.services.push(file);
    else if (file.includes('.pipe.')) result.pipes.push(file);
    else if (file.includes('.directive.')) result.directives.push(file);
    else if (file.includes('.guard.')) result.guards.push(file);
    else if (file.includes('.interceptor.')) result.interceptors.push(file);
    else if (file.includes('.resolver.')) result.resolvers.push(file);
    else if (file.includes('util') || file.includes('helper')) result.utils.push(file);
    else result.other.push(file);
  }

  return result;
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
