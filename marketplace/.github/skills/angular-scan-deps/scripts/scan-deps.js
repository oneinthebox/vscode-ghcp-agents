#!/usr/bin/env node
'use strict';

/**
 * Angular Dependency Analyzer
 *
 * Analyzes package.json dependencies: classifies packages, detects version
 * mismatches within Angular packages, and flags outdated patterns.
 *
 * Usage: node scripts/scan-deps.js [project-root]
 *
 * Output (stdout): JSON with angular info, third-party list, mismatches, outdated patterns.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-deps] ${msg}\n`);

// ─── Classification rules ────────────────────────────────────
const CATEGORIES = {
  'angular-core': pkg => /^@angular\/(core|common|compiler|platform-browser|platform-server|forms|router|animations|localize|service-worker|elements)$/.test(pkg),
  'angular-cdk-material': pkg => /^@angular\/(cdk|material|google-maps|youtube-player)/.test(pkg),
  'rxjs': pkg => pkg === 'rxjs' || pkg === 'rxjs-compat',
  'ngrx': pkg => /^@ngrx\//.test(pkg),
  'nx': pkg => /^@nx\//.test(pkg) || /^@nrwl\//.test(pkg) || pkg === 'nx',
  'primeng': pkg => pkg === 'primeng' || pkg === 'primeicons' || pkg === 'primeflex' || /^@primeng\//.test(pkg),
  'ag-grid': pkg => /^ag-grid/.test(pkg) || /^@ag-grid/.test(pkg),
  'testing': pkg => /^(jest|karma|jasmine|protractor|cypress|playwright|@testing-library|@types\/jest|@types\/jasmine|jest-preset-angular|@playwright\/test|ts-jest)/.test(pkg),
  'build-tools': pkg => /^(typescript|webpack|esbuild|vite|@angular-devkit|@angular-builders|@schematics|ng-packagr|ts-node|tslib)/.test(pkg),
  'zone': pkg => pkg === 'zone.js',
};

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning dependencies in: ${root}`);

  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    log('ERROR: No package.json found');
    process.exit(1);
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    log(`ERROR: Failed to parse package.json: ${e.message}`);
    process.exit(1);
  }

  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDeps };

  log(`Dependencies: ${Object.keys(deps).length}, DevDependencies: ${Object.keys(devDeps).length}`);

  // Classify all dependencies
  const classified = classifyDeps(allDeps, deps, devDeps);

  // Extract Angular core info
  const angular = extractAngularInfo(allDeps);

  // Detect version mismatches
  const mismatches = detectMismatches(allDeps);

  // Detect outdated patterns
  const outdated = detectOutdated(deps, devDeps);

  // Detect peer dependency hints from package-lock or lock files
  const lockInfo = detectLockFileInfo();

  const result = {
    projectName: pkg.name || path.basename(root),
    angular,
    classified,
    mismatches,
    outdated,
    lockFile: lockInfo,
    summary: {
      totalDeps: Object.keys(deps).length,
      totalDevDeps: Object.keys(devDeps).length,
      totalAll: Object.keys(allDeps).length,
      mismatchCount: mismatches.length,
      outdatedCount: outdated.length,
    },
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Angular version: ${angular.version || 'unknown'}`);
  log(`Mismatches: ${mismatches.length}, Outdated patterns: ${outdated.length}`);
  log('Done.');
}

// ─── Dependency classification ───────────────────────────────
function classifyDeps(allDeps, deps, devDeps) {
  const result = {};

  for (const [name, version] of Object.entries(allDeps)) {
    let category = 'unknown';
    for (const [cat, matcher] of Object.entries(CATEGORIES)) {
      if (matcher(name)) {
        category = cat;
        break;
      }
    }

    if (!result[category]) result[category] = [];
    result[category].push({
      name,
      version: cleanVersion(version),
      raw: version,
      isDev: name in devDeps && !(name in deps),
    });
  }

  // Sort each category alphabetically
  for (const cat of Object.keys(result)) {
    result[cat].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

// ─── Angular info extraction ─────────────────────────────────
function extractAngularInfo(allDeps) {
  const coreVersion = allDeps['@angular/core'] || null;
  const cliVersion = allDeps['@angular/cli'] || null;
  const tsVersion = allDeps['typescript'] || null;
  const rxjsVersion = allDeps['rxjs'] || null;
  const zoneVersion = allDeps['zone.js'] || null;

  // Collect all @angular/* packages and their versions
  const packages = {};
  for (const [name, version] of Object.entries(allDeps)) {
    if (name.startsWith('@angular/')) {
      packages[name] = cleanVersion(version);
    }
  }

  return {
    version: coreVersion ? cleanVersion(coreVersion) : null,
    cliVersion: cliVersion ? cleanVersion(cliVersion) : null,
    typescript: tsVersion ? cleanVersion(tsVersion) : null,
    rxjs: rxjsVersion ? cleanVersion(rxjsVersion) : null,
    zoneJs: zoneVersion ? cleanVersion(zoneVersion) : null,
    packages,
    packageCount: Object.keys(packages).length,
  };
}

// ─── Mismatch detection ─────────────────────────────────────
/**
 * Detect version mismatches within package groups that should be aligned.
 * For example, all @angular/* packages should be on the same major.minor version.
 */
function detectMismatches(allDeps) {
  const mismatches = [];

  // Group by prefix
  const groups = {
    '@angular/': {},
    '@ngrx/': {},
    '@nx/': {},
    '@nrwl/': {},
  };

  for (const [name, version] of Object.entries(allDeps)) {
    for (const prefix of Object.keys(groups)) {
      if (name.startsWith(prefix)) {
        groups[prefix][name] = cleanVersion(version);
      }
    }
  }

  for (const [prefix, packages] of Object.entries(groups)) {
    const versions = Object.values(packages);
    if (versions.length < 2) continue;

    // Extract major.minor for comparison
    const majorMinors = new Set(versions.map(v => {
      const match = v.match(/^(\d+\.\d+)/);
      return match ? match[1] : v;
    }));

    if (majorMinors.size > 1) {
      const details = Object.entries(packages).map(([n, v]) => ({ package: n, version: v }));
      mismatches.push({
        group: prefix.replace(/\/$/, ''),
        versions: Array.from(majorMinors),
        packages: details,
      });
    }
  }

  return mismatches;
}

// ─── Outdated pattern detection ──────────────────────────────
function detectOutdated(deps, devDeps) {
  const outdated = [];
  const allDeps = { ...deps, ...devDeps };

  // zone.js in dependencies (should typically be a polyfill loaded differently)
  if (deps['zone.js']) {
    outdated.push({
      package: 'zone.js',
      issue: 'zone.js in dependencies — consider zoneless mode (Angular 18+) or ensure it is loaded as a polyfill only',
      severity: 'info',
    });
  }

  // rxjs-compat (legacy migration shim)
  if (allDeps['rxjs-compat']) {
    outdated.push({
      package: 'rxjs-compat',
      issue: 'rxjs-compat is a legacy migration shim from RxJS 5→6 — remove it and update imports',
      severity: 'warning',
    });
  }

  // @nrwl/* packages (renamed to @nx/*)
  for (const name of Object.keys(allDeps)) {
    if (name.startsWith('@nrwl/')) {
      outdated.push({
        package: name,
        issue: `@nrwl/* packages have been renamed to @nx/* — migrate to ${name.replace('@nrwl/', '@nx/')}`,
        severity: 'warning',
      });
    }
  }

  // Protractor (deprecated)
  if (allDeps['protractor']) {
    outdated.push({
      package: 'protractor',
      issue: 'Protractor is deprecated — migrate to Playwright or Cypress',
      severity: 'error',
    });
  }

  // TSLint (deprecated in favor of ESLint)
  if (allDeps['tslint'] || allDeps['codelyzer']) {
    outdated.push({
      package: allDeps['tslint'] ? 'tslint' : 'codelyzer',
      issue: 'TSLint/Codelyzer are deprecated — migrate to ESLint with @angular-eslint',
      severity: 'error',
    });
  }

  // @angular/http (removed in Angular 8)
  if (allDeps['@angular/http']) {
    outdated.push({
      package: '@angular/http',
      issue: '@angular/http was removed in Angular 8 — use @angular/common/http (HttpClient)',
      severity: 'error',
    });
  }

  // Karma without Jest (potential migration target)
  if (allDeps['karma'] && !allDeps['jest'] && !allDeps['jest-preset-angular']) {
    outdated.push({
      package: 'karma',
      issue: 'Karma is deprecated — consider migrating to Jest with jest-preset-angular',
      severity: 'info',
    });
  }

  return outdated;
}

// ─── Lock file detection ─────────────────────────────────────
function detectLockFileInfo() {
  const lockFiles = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun',
  };

  for (const [file, manager] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(root, file))) {
      return { file, packageManager: manager };
    }
  }

  return { file: null, packageManager: 'unknown' };
}

// ─── Helpers ─────────────────────────────────────────────────
/**
 * Clean version string: remove ^, ~, >= prefixes for comparison.
 */
function cleanVersion(version) {
  if (!version) return 'unknown';
  return version.replace(/^[\^~>=<]*\s*/, '');
}

// ─── Run ─────────────────────────────────────────────────────
main();
