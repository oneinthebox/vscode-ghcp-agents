#!/usr/bin/env node
'use strict';

/**
 * Documentation Drift Detector
 *
 * Scans README.md and reference docs to detect divergence between documentation
 * and the actual codebase. Checks for:
 *   - Referenced file paths that no longer exist
 *   - Angular version mentions that mismatch package.json
 *   - npm script references that mismatch package.json scripts
 *   - Class/method names in doc comments that no longer exist in code
 *   - API URLs in .orch/references/ that mismatch proxy.conf.json or environment.ts
 *
 * Usage: node scripts/detect-doc-drift.js [project-root]
 *
 * Output (stdout): JSON with driftItems array and summary.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[doc-drift] ${msg}\n`);

// ─── Patterns ────────────────────────────────────────────────
const FILE_PATH_PATTERN = /(?:src\/|libs\/|projects\/)[\w./-]+/g;
const ANGULAR_VERSION_PATTERN = /Angular\s+(?:v?(\d+(?:\.\d+)*))/gi;
const NPM_SCRIPT_PATTERN = /(?:npm run|yarn|pnpm run?)\s+([\w:.-]+)/g;
const CLASS_METHOD_PATTERN = /`(\w+(?:\.\w+)?)`/g;
const API_URL_PATTERN = /(?:https?:\/\/[^\s"'`]+|\/api\/[^\s"'`]+)/g;

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Detecting documentation drift in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  const driftItems = [];

  // 1. Scan README.md for referenced file paths
  const readmePath = path.join(root, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const readmeLines = readmeContent.split('\n');

    log('Checking referenced file paths in README.md...');
    checkFilePaths(readmeLines, 'README.md', driftItems);

    log('Checking Angular version mentions in README.md...');
    checkAngularVersion(readmeLines, 'README.md', driftItems);

    log('Checking npm script references in README.md...');
    checkNpmScripts(readmeLines, 'README.md', driftItems);

    log('Checking class/method name references in README.md...');
    checkClassMethodNames(readmeLines, 'README.md', driftItems);
  } else {
    log('No README.md found, skipping README checks');
  }

  // 2. Scan .orch/references/ for API URLs
  const orchRefsDir = path.join(root, '.orch', 'references');
  if (fs.existsSync(orchRefsDir)) {
    log('Checking API URLs in .orch/references/...');
    const refFiles = safeReaddir(orchRefsDir).filter(f => f.endsWith('.md'));
    for (const refFile of refFiles) {
      const refPath = path.join(orchRefsDir, refFile);
      const content = fs.readFileSync(refPath, 'utf8');
      const lines = content.split('\n');
      checkApiUrls(lines, `.orch/references/${refFile}`, driftItems);
    }
  } else {
    log('No .orch/references/ directory found, skipping API URL checks');
  }

  // 3. Build summary
  const summary = {
    totalChecks: driftItems.length,
    byType: {},
  };
  for (const item of driftItems) {
    summary.byType[item.type] = (summary.byType[item.type] || 0) + 1;
  }

  const result = { driftItems, summary };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Found ${driftItems.length} drift item(s)`);
  log('Done.');
}

// ─── Check: File Paths ───────────────────────────────────────
function checkFilePaths(lines, sourceFile, driftItems) {
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].matchAll(FILE_PATH_PATTERN);
    for (const match of matches) {
      const refPath = match[0];
      const fullPath = path.join(root, refPath);
      if (!fs.existsSync(fullPath)) {
        driftItems.push({
          type: 'stale_file_path',
          source: sourceFile,
          expected: refPath,
          actual: 'File not found on disk',
          file: sourceFile,
          line: i + 1,
        });
      }
    }
  }
}

// ─── Check: Angular Version ─────────────────────────────────
function checkAngularVersion(lines, sourceFile, driftItems) {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  let actualVersion = null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const coreDep = (pkg.dependencies && pkg.dependencies['@angular/core'])
      || (pkg.devDependencies && pkg.devDependencies['@angular/core'])
      || null;
    if (coreDep) {
      // Extract major version from semver (e.g., "~19.0.0" -> "19", "^18.2.1" -> "18")
      const vMatch = coreDep.match(/(\d+)/);
      if (vMatch) actualVersion = vMatch[1];
    }
  } catch {
    return;
  }

  if (!actualVersion) return;

  for (let i = 0; i < lines.length; i++) {
    let match;
    ANGULAR_VERSION_PATTERN.lastIndex = 0;
    while ((match = ANGULAR_VERSION_PATTERN.exec(lines[i])) !== null) {
      const docVersion = match[1];
      const docMajor = docVersion.split('.')[0];
      if (docMajor !== actualVersion) {
        driftItems.push({
          type: 'angular_version_mismatch',
          source: sourceFile,
          expected: `Angular ${docVersion} (documented)`,
          actual: `Angular ${actualVersion}.x (package.json @angular/core)`,
          file: sourceFile,
          line: i + 1,
        });
      }
    }
  }
}

// ─── Check: npm Scripts ──────────────────────────────────────
function checkNpmScripts(lines, sourceFile, driftItems) {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  let scripts = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    scripts = pkg.scripts || {};
  } catch {
    return;
  }

  for (let i = 0; i < lines.length; i++) {
    let match;
    NPM_SCRIPT_PATTERN.lastIndex = 0;
    while ((match = NPM_SCRIPT_PATTERN.exec(lines[i])) !== null) {
      const scriptName = match[1];
      if (!scripts[scriptName]) {
        driftItems.push({
          type: 'npm_script_missing',
          source: sourceFile,
          expected: `Script "${scriptName}" referenced in docs`,
          actual: `Script "${scriptName}" not found in package.json scripts`,
          file: sourceFile,
          line: i + 1,
        });
      }
    }
  }
}

// ─── Check: Class/Method Names ───────────────────────────────
function checkClassMethodNames(lines, sourceFile, driftItems) {
  const srcDir = path.join(root, 'src');
  if (!fs.existsSync(srcDir)) return;

  // Collect all TypeScript source content for searching
  const tsFiles = [];
  collectFiles(srcDir, tsFiles, /\.ts$/);
  const allCode = tsFiles.map(f => safeReadFile(f)).filter(Boolean).join('\n');

  for (let i = 0; i < lines.length; i++) {
    let match;
    CLASS_METHOD_PATTERN.lastIndex = 0;
    while ((match = CLASS_METHOD_PATTERN.exec(lines[i])) !== null) {
      const name = match[1];
      // Only check names that look like class or method names (PascalCase or camelCase, 3+ chars)
      if (name.length < 3) continue;
      if (!/^[A-Z][a-zA-Z0-9]+$/.test(name) && !/^[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9]+$/.test(name)) continue;

      // Check if the name exists in any source file
      if (!allCode.includes(name)) {
        driftItems.push({
          type: 'class_method_not_found',
          source: sourceFile,
          expected: `"${name}" referenced in documentation`,
          actual: `"${name}" not found in any TypeScript source file under src/`,
          file: sourceFile,
          line: i + 1,
        });
      }
    }
  }
}

// ─── Check: API URLs ─────────────────────────────────────────
function checkApiUrls(lines, sourceFile, driftItems) {
  // Load proxy config and environment files for comparison
  const proxyPaths = [];
  const proxyConfPath = path.join(root, 'proxy.conf.json');
  if (fs.existsSync(proxyConfPath)) {
    try {
      const proxy = JSON.parse(fs.readFileSync(proxyConfPath, 'utf8'));
      proxyPaths.push(...Object.keys(proxy));
    } catch { /* ignore parse errors */ }
  }

  const envContent = loadEnvironmentFiles();

  for (let i = 0; i < lines.length; i++) {
    let match;
    API_URL_PATTERN.lastIndex = 0;
    while ((match = API_URL_PATTERN.exec(lines[i])) !== null) {
      const url = match[0];
      // Only check /api/ paths (skip full external URLs unless they look like API endpoints)
      if (!url.startsWith('/api/') && !url.includes('/api/')) continue;

      const apiPath = url.startsWith('http') ? new URL(url).pathname : url;

      // Check against proxy config paths
      const matchesProxy = proxyPaths.some(p => apiPath.startsWith(p));
      // Check against environment files
      const matchesEnv = envContent.includes(apiPath);

      if (!matchesProxy && !matchesEnv && proxyPaths.length > 0) {
        driftItems.push({
          type: 'api_url_mismatch',
          source: sourceFile,
          expected: `API path "${apiPath}" documented in references`,
          actual: `Path not found in proxy.conf.json or environment.ts`,
          file: sourceFile,
          line: i + 1,
        });
      }
    }
  }
}

// ─── Load Environment Files ──────────────────────────────────
function loadEnvironmentFiles() {
  const envDir = path.join(root, 'src', 'environments');
  if (!fs.existsSync(envDir)) return '';

  const envFiles = safeReaddir(envDir).filter(f => f.endsWith('.ts'));
  return envFiles.map(f => safeReadFile(path.join(envDir, f)) || '').join('\n');
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
