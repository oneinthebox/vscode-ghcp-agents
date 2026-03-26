#!/usr/bin/env node
'use strict';

/**
 * Angular Feature Scanner
 *
 * Scans route files and component directories to build a feature map.
 * Detects routes, lazy-loaded modules, and HttpClient calls per feature area.
 *
 * Usage: node scripts/scan-features.js [project-root]
 *
 * Output (stdout): JSON with features array containing routes, components, apiCalls, complexity.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-features] ${msg}\n`);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning features in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  // Determine source directory
  const srcDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  const allTsFiles = [];
  collectFiles(srcDir, allTsFiles, /\.ts$/);
  log(`Found ${allTsFiles.length} TypeScript files`);

  // 1. Parse route files
  const routeFiles = allTsFiles.filter(f =>
    /\.routes\.ts$|routing\.module\.ts$|app\.config\.ts$/.test(f)
  );
  const routes = parseRoutes(routeFiles);
  log(`Found ${routes.length} route(s)`);

  // 2. Discover feature directories
  const featureDirs = discoverFeatureDirs(srcDir);
  log(`Found ${featureDirs.length} feature directory/directories`);

  // 3. Group components by feature area
  const componentFiles = allTsFiles.filter(f =>
    /\.component\.ts$/.test(f) && !/\.spec\.ts$/.test(f) && !f.includes('node_modules')
  );

  // 4. Scan for HttpClient calls in services
  const serviceFiles = allTsFiles.filter(f =>
    /\.service\.ts$/.test(f) && !/\.spec\.ts$/.test(f) && !f.includes('node_modules')
  );
  const apiCalls = scanApiCalls(serviceFiles);
  log(`Found ${apiCalls.length} API call(s)`);

  // 5. Build feature map
  const features = buildFeatureMap(featureDirs, routes, componentFiles, apiCalls, serviceFiles);
  log(`Mapped ${features.length} feature(s)`);

  const result = {
    features,
    summary: {
      totalFeatures: features.length,
      totalRoutes: routes.length,
      totalComponents: componentFiles.length,
      totalApiCalls: apiCalls.length,
      lazyRoutes: routes.filter(r => r.lazy).length,
      eagerRoutes: routes.filter(r => !r.lazy).length,
    },
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── Route parsing ───────────────────────────────────────────
function parseRoutes(files) {
  const routes = [];

  for (const file of files) {
    const content = safeReadFile(file);
    if (!content) continue;

    const pathRegex = /path:\s*['"`]([^'"`]*)['"`]/g;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
      const routePath = match[1];
      const block = content.substring(
        Math.max(0, match.index - 300),
        Math.min(content.length, match.index + 400)
      );
      const isLazy = /loadComponent|loadChildren/.test(block);
      const componentMatch = block.match(/component:\s*(\w+)/);
      const loadCompMatch = block.match(/loadComponent:\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/);
      const loadChildMatch = block.match(/loadChildren:\s*\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)/);
      const guardMatch = block.match(/canActivate:\s*\[([^\]]*)\]/);
      const guards = guardMatch
        ? guardMatch[1].split(',').map(g => g.trim()).filter(Boolean)
        : [];

      routes.push({
        path: routePath,
        file: path.relative(root, file),
        lazy: isLazy,
        component: componentMatch ? componentMatch[1] : null,
        loadComponent: loadCompMatch ? loadCompMatch[1] : null,
        loadChildren: loadChildMatch ? loadChildMatch[1] : null,
        guards,
      });
    }
  }

  return routes;
}

// ─── Feature directory discovery ─────────────────────────────
function discoverFeatureDirs(srcDir) {
  const featureDirs = [];
  const conventions = ['features', 'pages', 'modules', 'app/features', 'app/pages', 'app/modules'];

  for (const convention of conventions) {
    const dir = path.join(srcDir, convention);
    if (!fs.existsSync(dir) || !safeIsDir(dir)) continue;

    const entries = safeReaddir(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (safeIsDir(full) && !entry.startsWith('.')) {
        featureDirs.push({
          name: entry,
          path: path.relative(root, full),
          absolutePath: full,
        });
      }
    }
  }

  // Fallback: scan for top-level directories under src/app/ that contain components
  if (featureDirs.length === 0) {
    const appDir = path.join(srcDir, 'app');
    if (fs.existsSync(appDir)) {
      const entries = safeReaddir(appDir);
      for (const entry of entries) {
        const full = path.join(appDir, entry);
        if (!safeIsDir(full) || ['shared', 'core', 'assets'].includes(entry)) continue;
        const hasComponents = safeReaddir(full).some(f => f.endsWith('.component.ts'));
        if (hasComponents) {
          featureDirs.push({
            name: entry,
            path: path.relative(root, full),
            absolutePath: full,
          });
        }
      }
    }
  }

  return featureDirs;
}

// ─── API call scanning ───────────────────────────────────────
function scanApiCalls(files) {
  const calls = [];
  const httpMethodRegex = /this\.\w+\.(get|post|put|patch|delete|head|options)\s*[<(]/g;
  const urlRegex = /['"`]([^'"`]*(?:\/api\/|\/v\d+\/|https?:\/\/)[^'"`]*)['"`]/;

  for (const file of files) {
    const content = safeReadFile(file);
    if (!content) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const methodMatch = httpMethodRegex.exec(line);
      if (methodMatch) {
        const method = methodMatch[1].toUpperCase();
        // Look at current and next few lines for URL
        const context = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
        const urlMatch = context.match(urlRegex);
        const url = urlMatch ? normalizeUrl(urlMatch[1]) : 'unknown';

        calls.push({
          method,
          url,
          file: path.relative(root, file),
          line: i + 1,
        });
      }
      httpMethodRegex.lastIndex = 0;
    }
  }

  return calls;
}

/** Normalize API URL by replacing interpolated IDs with :id */
function normalizeUrl(url) {
  return url
    .replace(/\$\{[^}]+\}/g, ':id')
    .replace(/`/g, '')
    .replace(/\/\/+/g, '/');
}

// ─── Feature map builder ─────────────────────────────────────
function buildFeatureMap(featureDirs, routes, componentFiles, apiCalls, serviceFiles) {
  const features = [];

  for (const dir of featureDirs) {
    const name = dir.name;
    const dirPrefix = dir.path;

    // Components in this feature directory
    const components = componentFiles
      .filter(f => path.relative(root, f).startsWith(dirPrefix))
      .map(f => path.relative(root, f));

    // Routes matching this feature (by first URL segment or file path)
    const featureRoutes = routes.filter(r =>
      r.path.startsWith(name) ||
      r.file.startsWith(dirPrefix) ||
      (r.loadChildren && r.loadChildren.includes(name)) ||
      (r.loadComponent && r.loadComponent.includes(name))
    );

    // API calls from services in this feature
    const featureApiCalls = apiCalls.filter(c => c.file.startsWith(dirPrefix));

    // Services in this feature
    const services = serviceFiles
      .filter(f => path.relative(root, f).startsWith(dirPrefix))
      .map(f => path.relative(root, f));

    // Complexity score
    const complexity = (components.length * 2) +
      (services.length * 3) +
      (featureRoutes.length * 1) +
      (featureApiCalls.length * 2);

    const complexityLabel = complexity < 10 ? 'Low' : complexity <= 25 ? 'Medium' : 'High';

    features.push({
      name,
      directory: dirPrefix,
      routes: featureRoutes.map(r => ({ path: r.path, lazy: r.lazy, guards: r.guards })),
      components,
      services,
      apiCalls: featureApiCalls.map(c => ({ method: c.method, url: c.url })),
      complexity,
      complexityLabel,
    });
  }

  return features;
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
