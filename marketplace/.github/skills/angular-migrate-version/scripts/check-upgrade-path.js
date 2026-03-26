#!/usr/bin/env node
// Detection script for /angular-migrate-version — see SKILL.md for usage
// Reads package.json, detects current Angular version, and outputs an upgrade plan.
// Usage: node check-upgrade-path.js <project-root>
// Output: JSON to stdout

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';

// ---------- compatibility matrix (hardcoded fallback) ----------

const COMPAT_MATRIX = {
  16: { typescript: '4.9 - 5.1', rxjs: '6.6 - 7.8', zonejs: '0.13.x', node: '16 | 18' },
  17: { typescript: '5.2 - 5.3', rxjs: '7.4 - 7.8', zonejs: '0.14.x', node: '18 | 20' },
  18: { typescript: '5.4 - 5.5', rxjs: '7.4 - 7.8', zonejs: '0.14.x', node: '18 | 20' },
  19: { typescript: '5.5 - 5.7', rxjs: '7.4 - 7.8', zonejs: '0.14 - 0.15', node: '18 | 20 | 22' },
  20: { typescript: '5.8+', rxjs: '7.4 - 7.8', zonejs: '0.15.x', node: '20 | 22' },
};

const BREAKING_CHANGES = {
  17: [
    'Standalone components are now the default',
    'New control flow syntax (@if, @for, @switch) introduced',
    'View Engine fully removed',
    'Node.js 16 minimum required',
  ],
  18: [
    'Zoneless change detection (experimental)',
    'Stable signal inputs, outputs, and view queries',
    'Route redirects can use functions',
    'Fallback content for ng-content',
  ],
  19: [
    'Signal inputs, outputs, and queries are stable',
    'Incremental hydration (experimental)',
    'Standalone defaults everywhere',
    'linkedSignal() introduced',
    'Resource API (experimental)',
  ],
  20: [
    'Zoneless change detection (stable)',
    'Signal-based forms (experimental)',
    'Effect scheduling changes',
    'Stricter type checking in templates',
  ],
};

const TARGET_VERSION = 19; // default target

// ---------- helpers ----------

function extractMajor(versionStr) {
  if (!versionStr) return null;
  // Handle ~, ^, >=, ranges
  const cleaned = versionStr.replace(/^[\^~>=<]*/, '').trim();
  const match = cleaned.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function readPackageJson() {
  const pkgPath = path.resolve(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`package.json not found at: ${pkgPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function tryLoadCompatMatrix() {
  // Try to read from .orch references first
  const matrixPaths = [
    path.resolve(projectRoot, '.orch/references/angular/v19/compatibility-matrix.md'),
    path.resolve(projectRoot, 'references/angular/v19/compatibility-matrix.md'),
  ];
  for (const mp of matrixPaths) {
    if (fs.existsSync(mp)) {
      return { source: mp, loaded: true };
    }
  }
  return { source: 'hardcoded-fallback', loaded: false };
}

// ---------- detection ----------

const pkg = readPackageJson();
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

const angularCoreVersion = allDeps['@angular/core'] || null;
const currentMajor = extractMajor(angularCoreVersion);

if (!currentMajor) {
  console.error('Could not detect @angular/core version from package.json');
  process.exit(1);
}

const matrixInfo = tryLoadCompatMatrix();

// Gather current dependency versions
const currentDeps = {
  '@angular/core': angularCoreVersion,
  '@angular/cli': allDeps['@angular/cli'] || null,
  '@angular/cdk': allDeps['@angular/cdk'] || null,
  '@angular/material': allDeps['@angular/material'] || null,
  typescript: allDeps['typescript'] || null,
  rxjs: allDeps['rxjs'] || null,
  'zone.js': allDeps['zone.js'] || null,
};

// Generate upgrade steps
const steps = [];
const targetVersion = TARGET_VERSION;

if (currentMajor >= targetVersion) {
  // Already at or above target
  steps.push({
    from: currentMajor,
    to: currentMajor,
    status: 'already-current',
    commands: [],
    breakingChanges: [],
  });
} else {
  for (let v = currentMajor + 1; v <= targetVersion; v++) {
    const compat = COMPAT_MATRIX[v] || {};
    const breaking = BREAKING_CHANGES[v] || [];
    steps.push({
      from: v - 1,
      to: v,
      commands: [
        `ng update @angular/core@${v} @angular/cli@${v}`,
        allDeps['@angular/cdk'] ? `ng update @angular/cdk@${v}` : null,
        allDeps['@angular/material'] ? `ng update @angular/material@${v}` : null,
      ].filter(Boolean),
      requiredVersions: {
        typescript: compat.typescript || 'check angular.dev',
        rxjs: compat.rxjs || 'check angular.dev',
        zonejs: compat.zonejs || 'check angular.dev',
        node: compat.node || 'check angular.dev',
      },
      breakingChanges: breaking,
    });
  }
}

const result = {
  currentVersion: {
    major: currentMajor,
    raw: angularCoreVersion,
  },
  targetVersion,
  currentDependencies: currentDeps,
  compatibilityMatrixSource: matrixInfo.source,
  stepsRequired: steps.length,
  steps,
  warnings: [
    currentMajor < 16 ? 'Angular versions below 16 are not supported by this tool — manual migration required' : null,
    !allDeps['zone.js'] ? 'zone.js not found — project may already use zoneless change detection' : null,
  ].filter(Boolean),
};

console.log(JSON.stringify(result, null, 2));
