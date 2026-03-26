'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Resolve an npm package from ORCH's isolated node_modules.
 * Falls back to project-level node_modules if not found in .orch/.
 * Returns null if package is not installed anywhere.
 *
 * @param {string} packageName - npm package to resolve (e.g., 'ts-morph')
 * @param {string} [projectRoot] - project root directory (default: cwd)
 * @returns {any|null} - the required module, or null if not found
 */
function requireOrch(packageName, projectRoot) {
  const root = projectRoot || process.cwd();

  // 1. Try ORCH's isolated node_modules first
  const orchPath = path.join(root, '.orch', 'node_modules', packageName);
  try {
    return require(orchPath);
  } catch {}

  // 2. Fall back to project-level node_modules
  try {
    return require(packageName);
  } catch {}

  // 3. Not found
  return null;
}

/**
 * Same as requireOrch but throws with a helpful message if not found.
 */
function requireOrchOrFail(packageName, projectRoot) {
  const mod = requireOrch(packageName, projectRoot);
  if (mod === null) {
    const root = projectRoot || process.cwd();
    console.error(`ERROR: Package '${packageName}' not found.`);
    console.error(`Expected in: ${path.join(root, '.orch', 'node_modules', packageName)}`);
    console.error(`Fix: Run 'cd .orch && npm install' or 'orch init' to install ORCH dependencies.`);
    process.exit(1);
  }
  return mod;
}

/**
 * Check if ORCH deps are installed.
 * Returns { installed: boolean, path: string, missing: string[] }
 */
function checkOrchDeps(projectRoot) {
  const root = projectRoot || process.cwd();
  const orchPkgPath = path.join(root, '.orch', 'package.json');
  const orchNodeModules = path.join(root, '.orch', 'node_modules');

  if (!fs.existsSync(orchPkgPath)) {
    return { installed: false, path: orchNodeModules, missing: ['package.json not found'] };
  }

  if (!fs.existsSync(orchNodeModules)) {
    return { installed: false, path: orchNodeModules, missing: ['node_modules not found — run orch init'] };
  }

  // Check each required dep
  const pkg = JSON.parse(fs.readFileSync(orchPkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const missing = deps.filter(d => !fs.existsSync(path.join(orchNodeModules, d)));

  return {
    installed: missing.length === 0,
    path: orchNodeModules,
    missing: missing.length > 0 ? missing : [],
  };
}

module.exports = { requireOrch, requireOrchOrFail, checkOrchDeps };
