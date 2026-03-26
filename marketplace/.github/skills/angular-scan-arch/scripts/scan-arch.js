#!/usr/bin/env node
'use strict';

/**
 * Angular Architecture Scanner
 *
 * Scans an Angular project and outputs architecture data as JSON.
 * Detects Nx vs CLI workspaces, route definitions, services, and components.
 *
 * Usage: node scripts/scan-arch.js [project-root]
 *
 * Output (stdout): JSON with projects, routes, services, components, isNx flag.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-arch] ${msg}\n`);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning project at: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  const isNx = fs.existsSync(path.join(root, 'nx.json'));
  const hasAngularJson = fs.existsSync(path.join(root, 'angular.json'));
  const hasWorkspaceJson = fs.existsSync(path.join(root, 'workspace.json'));

  if (!isNx && !hasAngularJson && !hasWorkspaceJson) {
    log('WARNING: No angular.json, workspace.json, or nx.json found. Scanning files directly.');
  }

  const projects = scanProjects(isNx, hasAngularJson, hasWorkspaceJson);
  log(`Found ${projects.length} project(s)`);

  // Determine source directories to scan
  const srcDirs = projects.length > 0
    ? projects.map(p => path.join(root, p.sourceRoot || p.root || ''))
    : [path.join(root, 'src')];

  const allTsFiles = [];
  for (const dir of srcDirs) {
    if (fs.existsSync(dir)) {
      collectFiles(dir, allTsFiles, /\.ts$/);
    }
  }
  log(`Found ${allTsFiles.length} TypeScript files`);

  const routes = scanRoutes(allTsFiles);
  log(`Found ${routes.length} route(s)`);

  const services = scanServices(allTsFiles);
  log(`Found ${services.length} service(s)`);

  const components = scanComponents(allTsFiles);
  log(`Found ${components.length} component(s)`);

  // Read tsconfig paths if available
  const tsconfigPaths = readTsconfigPaths();

  const result = {
    isNx,
    projects,
    routes,
    services,
    components,
    tsconfigPaths,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── Project scanning ────────────────────────────────────────
function scanProjects(isNx, hasAngularJson, hasWorkspaceJson) {
  const projects = [];

  // Parse angular.json or workspace.json
  const configFile = hasAngularJson ? 'angular.json' : hasWorkspaceJson ? 'workspace.json' : null;
  if (configFile) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(root, configFile), 'utf8'));
      const projMap = config.projects || {};
      for (const [name, value] of Object.entries(projMap)) {
        const proj = typeof value === 'string' ? { root: value } : value;
        projects.push({
          name,
          root: proj.root || '',
          sourceRoot: proj.sourceRoot || (proj.root ? `${proj.root}/src` : 'src'),
          projectType: proj.projectType || 'application',
        });
      }
    } catch (e) {
      log(`WARNING: Failed to parse ${configFile}: ${e.message}`);
    }
  }

  // For Nx, also scan for project.json files in apps/ and libs/
  if (isNx) {
    for (const dir of ['apps', 'libs', 'packages']) {
      const dirPath = path.join(root, dir);
      if (!fs.existsSync(dirPath)) continue;
      scanNxProjectJsons(dirPath, projects);
    }
  }

  return projects;
}

/** Recursively find project.json files in Nx workspace directories */
function scanNxProjectJsons(dir, projects) {
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (!safeIsDir(full)) continue;
    const projJson = path.join(full, 'project.json');
    if (fs.existsSync(projJson)) {
      try {
        const proj = JSON.parse(fs.readFileSync(projJson, 'utf8'));
        const relRoot = path.relative(root, full);
        // Avoid duplicates from angular.json
        if (!projects.some(p => p.name === proj.name)) {
          projects.push({
            name: proj.name || entry,
            root: relRoot,
            sourceRoot: proj.sourceRoot || `${relRoot}/src`,
            projectType: proj.projectType || 'library',
            tags: proj.tags || [],
          });
        }
      } catch (e) {
        log(`WARNING: Failed to parse ${projJson}: ${e.message}`);
      }
    }
    // Recurse one level deeper for grouped libs (e.g., libs/shared/ui)
    scanNxProjectJsons(full, projects);
  }
}

// ─── Route scanning ──────────────────────────────────────────
function scanRoutes(files) {
  const routeFiles = files.filter(f => /\.routes\.ts$|routing\.module\.ts$|app\.config\.ts$/.test(f));
  const routes = [];

  for (const file of routeFiles) {
    const content = safeReadFile(file);
    if (!content) continue;

    // Match route path definitions: path: 'some-path'
    const pathRegex = /path:\s*['"`]([^'"`]*)['"`]/g;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
      const routePath = match[1];
      // Determine if lazy loaded
      const surroundingBlock = content.substring(
        Math.max(0, match.index - 200),
        Math.min(content.length, match.index + 300)
      );
      const isLazy = /loadComponent|loadChildren/.test(surroundingBlock);
      const guardMatch = surroundingBlock.match(/canActivate:\s*\[([^\]]*)\]/);
      const guards = guardMatch ? guardMatch[1].split(',').map(g => g.trim()).filter(Boolean) : [];

      routes.push({
        path: routePath,
        file: path.relative(root, file),
        lazy: isLazy,
        guards,
      });
    }
  }

  return routes;
}

// ─── Service scanning ────────────────────────────────────────
function scanServices(files) {
  const services = [];

  for (const file of files) {
    if (/\.spec\.ts$|\.test\.ts$|node_modules/.test(file)) continue;
    const content = safeReadFile(file);
    if (!content) continue;

    // Find @Injectable decorated classes
    const injectableRegex = /@Injectable\s*\(\s*\{([^}]*)\}\s*\)[\s\S]*?export\s+class\s+(\w+)/g;
    let match;
    while ((match = injectableRegex.exec(content)) !== null) {
      const decoratorBody = match[1];
      const className = match[2];

      // Extract providedIn scope
      const providedInMatch = decoratorBody.match(/providedIn:\s*['"`](\w+)['"`]/);
      const providedIn = providedInMatch ? providedInMatch[1] : 'none';

      // Extract constructor dependencies
      const deps = extractDependencies(content, className);

      services.push({
        name: className,
        file: path.relative(root, file),
        providedIn,
        dependencies: deps,
      });
    }

    // Also catch @Injectable() with no args or empty args
    const simpleInjectableRegex = /@Injectable\s*\(\s*\)[\s\S]*?export\s+class\s+(\w+)/g;
    while ((match = simpleInjectableRegex.exec(content)) !== null) {
      const className = match[1];
      if (services.some(s => s.name === className)) continue;
      const deps = extractDependencies(content, className);
      services.push({
        name: className,
        file: path.relative(root, file),
        providedIn: 'none',
        dependencies: deps,
      });
    }
  }

  return services;
}

/** Extract constructor-injected and inject() dependencies from a class */
function extractDependencies(content, className) {
  const deps = [];

  // Constructor injection: constructor(private foo: FooService, ...)
  const ctorRegex = new RegExp(
    `class\\s+${className}[^{]*\\{[\\s\\S]*?constructor\\s*\\(([^)]*)\\)`,
    'm'
  );
  const ctorMatch = content.match(ctorRegex);
  if (ctorMatch) {
    const params = ctorMatch[1];
    const paramRegex = /:\s*(\w+)/g;
    let pm;
    while ((pm = paramRegex.exec(params)) !== null) {
      if (!['string', 'number', 'boolean', 'any', 'void'].includes(pm[1])) {
        deps.push(pm[1]);
      }
    }
  }

  // inject() function pattern: private foo = inject(FooService)
  const classBlock = extractClassBlock(content, className);
  if (classBlock) {
    const injectRegex = /inject\(\s*(\w+)\s*\)/g;
    let im;
    while ((im = injectRegex.exec(classBlock)) !== null) {
      if (!deps.includes(im[1])) {
        deps.push(im[1]);
      }
    }
  }

  return deps;
}

// ─── Component scanning ─────────────────────────────────────
function scanComponents(files) {
  const components = [];

  for (const file of files) {
    if (/\.spec\.ts$|\.test\.ts$|node_modules/.test(file)) continue;
    const content = safeReadFile(file);
    if (!content) continue;

    // Find @Component decorated classes
    const compRegex = /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)[\s\S]*?export\s+class\s+(\w+)/g;
    let match;
    while ((match = compRegex.exec(content)) !== null) {
      const decoratorBody = match[1];
      const className = match[2];

      const standalone = /standalone\s*:\s*true/.test(decoratorBody);
      const selectorMatch = decoratorBody.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/);
      const onPush = /ChangeDetectionStrategy\s*\.\s*OnPush/.test(decoratorBody);

      // Extract imports array (standalone component imports)
      const importsMatch = decoratorBody.match(/imports\s*:\s*\[([\s\S]*?)\]/);
      const imports = importsMatch
        ? importsMatch[1].split(',').map(i => i.trim()).filter(i => i && !i.startsWith('//'))
        : [];

      components.push({
        name: className,
        file: path.relative(root, file),
        selector: selectorMatch ? selectorMatch[1] : null,
        standalone,
        onPush,
        imports,
      });
    }
  }

  return components;
}

// ─── TSConfig paths ──────────────────────────────────────────
function readTsconfigPaths() {
  const tsconfigPath = path.join(root, 'tsconfig.base.json');
  const fallback = path.join(root, 'tsconfig.json');
  const file = fs.existsSync(tsconfigPath) ? tsconfigPath : fs.existsSync(fallback) ? fallback : null;
  if (!file) return {};

  try {
    // Strip comments (simple approach) before parsing
    const raw = fs.readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const config = JSON.parse(raw);
    return (config.compilerOptions && config.compilerOptions.paths) || {};
  } catch (e) {
    log(`WARNING: Failed to parse tsconfig: ${e.message}`);
    return {};
  }
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

function extractClassBlock(content, className) {
  const idx = content.indexOf(`class ${className}`);
  if (idx === -1) return null;
  let braces = 0;
  let start = -1;
  for (let i = idx; i < content.length; i++) {
    if (content[i] === '{') {
      if (start === -1) start = i;
      braces++;
    } else if (content[i] === '}') {
      braces--;
      if (braces === 0 && start !== -1) {
        return content.substring(start, i + 1);
      }
    }
  }
  return null;
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
