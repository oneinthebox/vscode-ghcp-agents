#!/usr/bin/env node
'use strict';

/**
 * add-elevate-lib.js
 *
 * Helper script for the /angular-elevate-add skill.
 * Resolves the correct package name for an elevate library,
 * runs npm install, and reports the result.
 *
 * Usage:
 *   node .github/skills/angular-elevate-add/scripts/add-elevate-lib.js <lib-name> [project-root]
 *
 * Output: JSON to stdout with install result.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const libName = process.argv[2];
const projectRoot = process.argv[3] || '.';

if (!libName) {
  console.error('Usage: add-elevate-lib.js <lib-name> [project-root]');
  process.exit(1);
}

// Component-scoped libraries (under @yourorg/elevate-components/)
const COMPONENT_LIBS = [
  'common-grid',
  'common-chart',
  'common-search',
  'common-chat',
  'common-dialog',
];

// Libraries that need a provider in app.config.ts
const PROVIDER_LIBS = {
  'client-core': 'provideElevateCore',
  'angular-adapter': 'provideElevateAngular',
  'authentication': 'provideElevateAuth',
  'authorization': 'provideElevateAuthz',
  'configuration': 'provideElevateConfig',
  'logging': 'provideElevateLogging',
  'preferences': 'provideElevatePreferences',
  'interop': 'provideElevateInterop',
  'data-connector': 'provideElevateDataConnector',
  'websocket': 'provideElevateWebSocket',
  'power-bi': 'provideElevatePowerBI',
  'tableau': 'provideElevateTableau',
  'document-renderer': 'provideElevateDocumentRenderer',
  'notification-consumer': 'provideElevateNotificationConsumer',
  'notification-publisher': 'provideElevateNotificationPublisher',
  'platform-detection': 'provideElevatePlatformDetection',
  'usage-stats': 'provideElevateUsageStats',
};

// All known library names
const ALL_LIBS = [
  'client-core', 'angular-adapter', 'authentication', 'authorization',
  'configuration', 'logging', 'preferences',
  'common-grid', 'common-chart', 'common-search', 'common-chat', 'common-dialog',
  'interop', 'data-connector', 'websocket', 'power-bi', 'tableau',
  'document-renderer', 'notification-consumer', 'notification-publisher',
  'platform-detection', 'usage-stats',
  'hds',
];

function resolvePackageName(lib) {
  if (lib === 'hds') return '@yourorg/hds';
  if (COMPONENT_LIBS.includes(lib)) return `@yourorg/elevate-components/${lib}`;
  return `@yourorg/elevate/${lib}`;
}

function main() {
  // Validate lib name
  if (!ALL_LIBS.includes(libName)) {
    console.error(JSON.stringify({
      error: `Unknown library: ${libName}`,
      available: ALL_LIBS,
    }, null, 2));
    process.exit(1);
  }

  const packageName = resolvePackageName(libName);
  const needsProvider = libName in PROVIDER_LIBS;
  const providerName = PROVIDER_LIBS[libName] || null;

  // Run npm install
  try {
    const installCmd = `npm install ${packageName}`;
    execSync(installCmd, { cwd: path.resolve(projectRoot), stdio: 'pipe' });
  } catch (err) {
    console.error(JSON.stringify({
      error: `Failed to install ${packageName}`,
      details: err.stderr ? err.stderr.toString() : err.message,
    }, null, 2));
    process.exit(1);
  }

  // Read installed version from package.json
  const pkgPath = path.resolve(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  const version = (allDeps[packageName] || 'unknown').replace(/^[\^~>=<]*/, '');

  const result = {
    installed: true,
    package: packageName,
    version,
    needsProvider,
    providerName,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
