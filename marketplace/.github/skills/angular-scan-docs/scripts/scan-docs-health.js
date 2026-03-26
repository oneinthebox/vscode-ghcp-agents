#!/usr/bin/env node
'use strict';

/**
 * Angular Documentation Health Scanner
 *
 * Checks README.md completeness, TSDoc coverage on exported symbols,
 * and detects Compodoc/Storybook configuration.
 *
 * Usage: node scripts/scan-docs-health.js [project-root]
 *
 * Output (stdout): JSON with readme sections, tsdocCoverage, and tooling status.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-docs-health] ${msg}\n`);

const README_SECTIONS = [
  { key: 'description', patterns: [/^#\s+\w/m, /^>\s+\w/m] },
  { key: 'install', patterns: [/install/i, /npm\s+(ci|install)/i, /yarn\s+(install|add)/i, /prerequisites/i] },
  { key: 'usage', patterns: [/getting\s+started/i, /usage/i, /ng\s+serve/i, /npm\s+start/i, /development/i] },
  { key: 'config', patterns: [/config/i, /environment/i, /\.env/i, /setup/i] },
  { key: 'build', patterns: [/build/i, /deploy/i, /ng\s+build/i, /production/i] },
  { key: 'contributing', patterns: [/contribut/i, /pull\s+request/i, /CONTRIBUTING/i] },
  { key: 'license', patterns: [/license/i, /MIT/i, /Apache/i] },
];

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning documentation health in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  // 1. Assess README completeness
  const readme = assessReadme();
  log(`README sections: ${readme.presentCount}/${README_SECTIONS.length}`);

  // 2. Scan TSDoc coverage
  const srcDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  const allTsFiles = [];
  collectFiles(srcDir, allTsFiles, /\.ts$/);

  const sourceFiles = allTsFiles.filter(f =>
    !f.endsWith('.spec.ts') &&
    !f.endsWith('.test.ts') &&
    !f.endsWith('.stories.ts') &&
    !f.endsWith('.d.ts') &&
    !f.includes('node_modules') &&
    !f.includes('/dist/')
  );

  const tsdocCoverage = scanTsdocCoverage(sourceFiles);
  log(`TSDoc coverage: ${tsdocCoverage.percent}% (${tsdocCoverage.documented}/${tsdocCoverage.total})`);

  // 3. Detect documentation tooling
  const tooling = detectTooling();
  log(`Tooling detected: ${Object.keys(tooling).filter(k => tooling[k].configured).join(', ') || 'none'}`);

  // 4. Scan supplementary docs
  const supplementary = scanSupplementaryDocs();

  const result = {
    readme,
    tsdocCoverage,
    tooling,
    supplementary,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── README assessment ───────────────────────────────────────
function assessReadme() {
  const readmePath = path.join(root, 'README.md');
  if (!fs.existsSync(readmePath)) {
    return {
      exists: false,
      sections: README_SECTIONS.map(s => ({ key: s.key, status: 'missing' })),
      presentCount: 0,
      totalSections: README_SECTIONS.length,
    };
  }

  const content = safeReadFile(readmePath) || '';
  const sections = [];
  let presentCount = 0;

  for (const section of README_SECTIONS) {
    const found = section.patterns.some(p => p.test(content));
    sections.push({ key: section.key, status: found ? 'present' : 'missing' });
    if (found) presentCount++;
  }

  // Check for stale Angular version reference
  let angularVersionStale = false;
  const readmeVersionMatch = content.match(/Angular\s+(\d+)/i);
  if (readmeVersionMatch) {
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const coreVersion = (pkg.dependencies || {})['@angular/core'] || '';
        const majorMatch = coreVersion.match(/(\d+)/);
        if (majorMatch && majorMatch[1] !== readmeVersionMatch[1]) {
          angularVersionStale = true;
        }
      } catch { /* ignore */ }
    }
  }

  return {
    exists: true,
    sections,
    presentCount,
    totalSections: README_SECTIONS.length,
    completenessPercent: Math.round((presentCount / README_SECTIONS.length) * 100),
    angularVersionStale,
  };
}

// ─── TSDoc coverage ──────────────────────────────────────────
function scanTsdocCoverage(files) {
  let total = 0;
  let documented = 0;
  const undocumented = [];

  for (const file of files) {
    const content = safeReadFile(file);
    if (!content) continue;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match export declarations
      const exportMatch = line.match(/^\s*export\s+(class|interface|function|type|const|enum)\s+(\w+)/);
      if (!exportMatch) continue;

      total++;
      const symbolType = exportMatch[1];
      const symbolName = exportMatch[2];

      // Check if the previous non-empty line ends with */ (doc comment)
      let hasDoc = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        if (!prevLine) continue;
        if (prevLine.endsWith('*/')) {
          hasDoc = true;
        }
        break;
      }

      if (hasDoc) {
        documented++;
      } else {
        undocumented.push({
          file: path.relative(root, file),
          symbol: symbolName,
          type: symbolType,
          line: i + 1,
        });
      }
    }
  }

  const percent = total > 0 ? Math.round((documented / total) * 100) : 0;

  return {
    total,
    documented,
    undocumented: undocumented.slice(0, 50),
    percent,
  };
}

// ─── Tooling detection ───────────────────────────────────────
function detectTooling() {
  const pkgPath = path.join(root, 'package.json');
  let devDeps = {};
  let scripts = {};
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      devDeps = pkg.devDependencies || {};
      scripts = pkg.scripts || {};
    } catch { /* ignore */ }
  }

  // Compodoc
  const compodocInstalled = !!devDeps['@compodoc/compodoc'];
  const compodocConfig = fs.existsSync(path.join(root, 'tsconfig.doc.json')) ||
    fs.existsSync(path.join(root, '.compodocrc.json')) ||
    fs.existsSync(path.join(root, '.compodocrc.yaml'));
  const compodocScript = Object.values(scripts).some(s => s.includes('compodoc'));

  // Storybook
  const storybookInstalled = !!devDeps['@storybook/angular'];
  const storybookConfig = fs.existsSync(path.join(root, '.storybook', 'main.ts')) ||
    fs.existsSync(path.join(root, '.storybook', 'main.js'));
  const storyFiles = [];
  const srcDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  collectFiles(srcDir, storyFiles, /\.stories\.ts$/);

  // Typedoc
  const typedocInstalled = !!devDeps['typedoc'];
  const typedocConfig = fs.existsSync(path.join(root, 'typedoc.json')) ||
    fs.existsSync(path.join(root, 'typedoc.config.js'));

  return {
    compodoc: {
      configured: compodocInstalled && (compodocConfig || compodocScript),
      installed: compodocInstalled,
      configFile: compodocConfig,
      script: compodocScript,
    },
    storybook: {
      configured: storybookInstalled && storybookConfig,
      installed: storybookInstalled,
      configFile: storybookConfig,
      storyCount: storyFiles.length,
    },
    typedoc: {
      configured: typedocInstalled && typedocConfig,
      installed: typedocInstalled,
      configFile: typedocConfig,
    },
  };
}

// ─── Supplementary docs ──────────────────────────────────────
function scanSupplementaryDocs() {
  const result = {
    docsDirectory: false,
    adrDirectory: false,
    adrCount: 0,
    contributing: fs.existsSync(path.join(root, 'CONTRIBUTING.md')),
    codeOfConduct: fs.existsSync(path.join(root, 'CODE_OF_CONDUCT.md')),
    security: fs.existsSync(path.join(root, 'SECURITY.md')),
    changelog: fs.existsSync(path.join(root, 'CHANGELOG.md')),
  };

  for (const dir of ['docs', 'documentation']) {
    if (fs.existsSync(path.join(root, dir)) && safeIsDir(path.join(root, dir))) {
      result.docsDirectory = dir;
      break;
    }
  }

  for (const dir of ['adr', 'docs/decisions', 'docs/adr']) {
    const adrPath = path.join(root, dir);
    if (fs.existsSync(adrPath) && safeIsDir(adrPath)) {
      result.adrDirectory = dir;
      const adrFiles = safeReaddir(adrPath).filter(f => f.endsWith('.md'));
      result.adrCount = adrFiles.length;
      break;
    }
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
