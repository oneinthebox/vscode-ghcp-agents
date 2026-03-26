#!/usr/bin/env node
'use strict';

/**
 * detect-elevate.js
 *
 * Reads package.json and reports which Elevate / HDS libraries are installed.
 * Checks for both @yourorg/elevate/* and @yourorg/hds packages.
 *
 * Usage:
 *   node .orch/scripts/detect-elevate.js [project-root]
 *
 * Output: JSON to stdout with installed core, optional, missing_core, hds info.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';

const CORE_LIBS = [
  'client-core',
  'angular-adapter',
  'authentication',
  'authorization',
  'configuration',
  'logging',
  'preferences',
];

const OPTIONAL_LIBS = [
  'common-grid',
  'common-chart',
  'common-search',
  'common-chat',
  'common-dialog',
  'interop',
  'data-connector',
  'websocket',
  'power-bi',
  'tableau',
  'document-renderer',
  'notification-consumer',
  'notification-publisher',
  'platform-detection',
  'usage-stats',
];

const COMPONENT_SCOPE_LIBS = [
  'common-grid',
  'common-chart',
  'common-search',
  'common-chat',
  'common-dialog',
];

function readPackageJson(root) {
  const pkgPath = path.resolve(root, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`Error: package.json not found at ${pkgPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function getVersion(deps, packageName) {
  if (!deps) return null;
  const ver = deps[packageName];
  if (!ver) return null;
  // Strip semver range prefixes (^, ~, >=, etc.)
  return ver.replace(/^[\^~>=<]*/, '');
}

function detectLibs(pkg) {
  const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  const core = {};
  const missingCore = [];
  const optional = {};

  // Check core libs — all under @yourorg/elevate/{name}
  for (const lib of CORE_LIBS) {
    const packageName = `@yourorg/elevate/${lib}`;
    const version = getVersion(allDeps, packageName);
    if (version) {
      core[lib] = version;
    } else {
      missingCore.push(lib);
    }
  }

  // Check optional libs — components under @yourorg/elevate-components/{name},
  // others under @yourorg/elevate/{name}
  for (const lib of OPTIONAL_LIBS) {
    const isComponent = COMPONENT_SCOPE_LIBS.includes(lib);
    const packageName = isComponent
      ? `@yourorg/elevate-components/${lib}`
      : `@yourorg/elevate/${lib}`;
    const version = getVersion(allDeps, packageName);
    if (version) {
      optional[lib] = version;
    }
  }

  // Check HDS
  const hdsVersion = getVersion(allDeps, '@yourorg/hds');

  const totalInstalled =
    Object.keys(core).length + Object.keys(optional).length + (hdsVersion ? 1 : 0);
  const totalAvailable = CORE_LIBS.length + OPTIONAL_LIBS.length + 1; // +1 for HDS

  return {
    core,
    optional,
    missing_core: missingCore,
    hds: hdsVersion || null,
    total_installed: totalInstalled,
    total_available: totalAvailable,
  };
}

// Main
const pkg = readPackageJson(projectRoot);
const result = detectLibs(pkg);
console.log(JSON.stringify(result, null, 2));
