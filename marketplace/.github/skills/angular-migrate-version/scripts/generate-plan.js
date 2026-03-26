#!/usr/bin/env node
'use strict';

/**
 * Generate a migration plan document from package.json analysis.
 *
 * Usage: node generate-plan.js [project-root] [--to VERSION]
 * Output: writes plan to .orch/plans/migration-plan.md AND outputs JSON to stdout
 *
 * The plan shows:
 * - Current versions of all Angular ecosystem packages
 * - Target versions for each step
 * - Which packages will be upgraded, which stay, which are incompatible
 * - Ordered commands to run
 * - Known risks and breaking changes
 * - Library preferences comparison against org standards
 * - Code analysis via ts-morph (pattern adoption, files needing migration)
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';
let targetVersion = null;

// Parse --to flag
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--to' && process.argv[i + 1]) {
    targetVersion = parseInt(process.argv[i + 1], 10);
  }
}

// Read package.json
const pkgPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(pkgPath)) {
  process.stderr.write('Error: no package.json found at ' + pkgPath + '\n');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

// Detect current Angular version
const coreVersion = (allDeps['@angular/core'] || '').replace(/[\^~]/, '');
const currentMajor = parseInt(coreVersion.split('.')[0], 10);

if (isNaN(currentMajor)) {
  process.stderr.write('Error: cannot detect Angular version from @angular/core: ' + allDeps['@angular/core'] + '\n');
  process.exit(1);
}

if (!targetVersion) {
  targetVersion = currentMajor + 1; // default: one version up
}

if (targetVersion <= currentMajor) {
  process.stderr.write('Already on Angular ' + currentMajor + '. Target ' + targetVersion + ' is not higher.\n');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// READ ORG PREFERENCES FROM .orch/config.yaml (regex parse)
// ═══════════════════════════════════════════════════════════════

const orgPreferences = {};
try {
  const configPath = path.join(projectRoot, '.orch', 'config.yaml');
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Extract org_preferences block via regex (same approach as relay.js)
  const prefKeys = [
    'ui_library', 'grid', 'chart', 'e2e', 'test_runner',
    'state_management', 'di_pattern', 'component_style', 'control_flow'
  ];
  for (const key of prefKeys) {
    const match = configContent.match(new RegExp(key + ':\\s*(\\S+)'));
    if (match) {
      orgPreferences[key] = match[1];
    }
  }
} catch (e) {
  process.stderr.write('Warning: could not read .orch/config.yaml for org preferences: ' + e.message + '\n');
}

// ═══════════════════════════════════════════════════════════════
// CHECK CURRENT PROJECT AGAINST ORG PREFERENCES
// ═══════════════════════════════════════════════════════════════

function checkLibPreferences(deps, prefs) {
  const results = [];

  // UI library
  if (prefs.ui_library) {
    const hasMaterial = !!deps['@angular/material'];
    const hasPrimeng = !!deps['primeng'];
    const preferred = prefs.ui_library;
    let current = '(none)';
    let action = 'OK';
    let skill = '\u2014';
    if (hasMaterial) current = '@angular/material';
    if (hasPrimeng) current = 'primeng';
    if (hasMaterial && preferred === 'primeng') {
      action = 'MIGRATE';
      skill = '/angular-migrate-material-to-primeng';
    } else if (hasPrimeng && preferred === 'primeng') {
      action = 'OK';
    } else if (!hasMaterial && !hasPrimeng) {
      action = 'INSTALL (if needed)';
      skill = '/angular-elevate-add';
    }
    results.push({ category: 'UI', current, preferred: preferred === 'primeng' ? 'PrimeNG' : preferred, action, skill });
  }

  // E2E
  if (prefs.e2e) {
    const hasCypress = !!deps['cypress'];
    const hasProtractor = !!deps['protractor'];
    const hasPlaywright = !!deps['@playwright/test'];
    const preferred = prefs.e2e;
    let current = '(none)';
    let action = 'OK';
    let skill = '\u2014';
    if (hasCypress) current = 'cypress';
    if (hasProtractor) current = 'protractor';
    if (hasPlaywright) current = 'playwright';
    if ((hasCypress || hasProtractor) && preferred === 'playwright') {
      action = 'MIGRATE';
      skill = '/angular-migrate-playwright';
    } else if (hasPlaywright && preferred === 'playwright') {
      action = 'OK';
    } else if (!hasCypress && !hasProtractor && !hasPlaywright) {
      action = 'INSTALL (if needed)';
      skill = '/angular-elevate-add';
    }
    results.push({ category: 'E2E', current, preferred: preferred === 'playwright' ? 'Playwright' : preferred, action, skill });
  }

  // Test runner
  if (prefs.test_runner) {
    const hasKarma = !!deps['karma'];
    const hasJest = !!deps['jest'];
    const hasVitest = !!deps['vitest'];
    const preferred = prefs.test_runner;
    let current = '(none)';
    let action = 'OK';
    let skill = '\u2014';
    if (hasKarma) current = 'karma';
    if (hasVitest) current = 'vitest';
    if (hasJest) current = 'jest';
    if (hasKarma && preferred === 'jest') {
      action = 'MIGRATE';
      skill = '/angular-migrate-jest';
    } else if (hasVitest && preferred === 'jest') {
      action = 'MIGRATE';
      skill = '/angular-migrate-jest';
    } else if (hasJest && preferred === 'jest') {
      action = 'OK';
    } else if (!hasKarma && !hasJest && !hasVitest) {
      action = 'INSTALL (if needed)';
      skill = '/angular-elevate-add';
    }
    results.push({ category: 'Test Runner', current, preferred: preferred === 'jest' ? 'jest' : preferred, action, skill });
  }

  // Grid
  if (prefs.grid) {
    const hasAgGrid = !!deps['ag-grid-angular'] || !!deps['ag-grid-community'] || !!deps['@ag-grid-community/angular'];
    const preferred = prefs.grid;
    let current = '(none)';
    let action = 'OK';
    let skill = '\u2014';
    if (hasAgGrid) {
      current = 'ag-grid';
      action = 'OK';
    } else {
      action = 'INSTALL (if needed)';
      skill = '/angular-elevate-add common-grid';
    }
    results.push({ category: 'Grid', current, preferred: preferred === 'ag-grid' ? 'AG Grid' : preferred, action, skill });
  }

  // Chart
  if (prefs.chart) {
    const hasChartJs = !!deps['chart.js'];
    const hasHighcharts = !!deps['highcharts'];
    const hasPlotly = !!deps['plotly.js'] || !!deps['angular-plotly.js'] || !!deps['plotly.js-dist'];
    const preferred = prefs.chart;
    let current = '(none)';
    let action = 'OK';
    let skill = '\u2014';
    if (hasChartJs) current = 'chart.js';
    if (hasHighcharts) current = 'highcharts';
    if (hasPlotly) current = 'plotly';
    if ((hasChartJs || hasHighcharts) && preferred === 'plotly') {
      action = 'MIGRATE';
      skill = '/angular-elevate-add';
    } else if (hasPlotly && preferred === 'plotly') {
      action = 'OK';
    } else if (!hasChartJs && !hasHighcharts && !hasPlotly) {
      action = 'INSTALL (if needed)';
      skill = '/angular-elevate-add';
    }
    results.push({ category: 'Chart', current, preferred: preferred === 'plotly' ? 'Plotly' : preferred, action, skill });
  }

  return results;
}

const preferenceResults = Object.keys(orgPreferences).length > 0
  ? checkLibPreferences(allDeps, orgPreferences)
  : [];

// ═══════════════════════════════════════════════════════════════
// TS-MORPH SOURCE CODE ANALYSIS
// ═══════════════════════════════════════════════════════════════

let tsMorph = null;
try {
  tsMorph = require(path.join(projectRoot, '.orch', 'node_modules', 'ts-morph'));
} catch (e) {
  // ts-morph not available — skip code analysis
}

const codeAnalysis = {
  ngmodules: 0,
  constructor_injection: 0,
  inject_function: 0,
  legacy_templates: 0,
  modern_templates: 0,
  behavior_subjects: 0,
  signals: 0,
  input_decorators: 0,
  output_decorators: 0,
  subscribe_in_components: 0
};

const filesNeedingMigration = []; // { file, patterns[] }
let tsMorphAvailable = false;

if (tsMorph) {
  tsMorphAvailable = true;
  process.stderr.write('ts-morph available — running code analysis...\n');

  try {
    // Find a usable tsconfig
    let tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    if (!fs.existsSync(tsConfigPath)) {
      tsConfigPath = path.join(projectRoot, 'tsconfig.app.json');
    }
    if (!fs.existsSync(tsConfigPath)) {
      tsConfigPath = null;
    }

    let sourceFiles = [];

    if (tsConfigPath) {
      const project = new tsMorph.Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: false
      });
      sourceFiles = project.getSourceFiles();
    } else {
      // Fallback: manually add .ts files from src/
      const project = new tsMorph.Project({ skipAddingFilesFromTsConfig: true });
      const srcDir = path.join(projectRoot, 'src');
      if (fs.existsSync(srcDir)) {
        project.addSourceFilesAtPaths(path.join(srcDir, '**/*.ts'));
        sourceFiles = project.getSourceFiles();
      }
    }

    // Limit to 100 files for performance
    const filesToScan = sourceFiles.slice(0, 100);
    const SyntaxKind = tsMorph.SyntaxKind;

    for (const sf of filesToScan) {
      const filePath = sf.getFilePath();
      const relPath = path.relative(projectRoot, filePath);
      const filePatterns = [];

      // Skip node_modules and test config files
      if (relPath.includes('node_modules')) continue;

      const classes = sf.getClasses();

      for (const cls of classes) {
        // Check for @NgModule decorator
        const ngModuleDecorator = cls.getDecorator('NgModule');
        if (ngModuleDecorator) {
          codeAnalysis.ngmodules++;
          filePatterns.push('NgModule');
        }

        // Check for @Input() decorators
        for (const prop of cls.getProperties()) {
          const inputDec = prop.getDecorator('Input');
          if (inputDec) {
            codeAnalysis.input_decorators++;
            if (!filePatterns.includes('@Input')) filePatterns.push('@Input');
          }
          const outputDec = prop.getDecorator('Output');
          if (outputDec) {
            codeAnalysis.output_decorators++;
            if (!filePatterns.includes('@Output')) filePatterns.push('@Output');
          }
        }

        // Check constructor parameters (constructor injection)
        const ctors = cls.getConstructors();
        for (const ctor of ctors) {
          const params = ctor.getParameters();
          for (const param of params) {
            // Constructor parameters with type annotations indicate DI
            if (param.getTypeNode()) {
              codeAnalysis.constructor_injection++;
              if (!filePatterns.includes('constructor injection')) filePatterns.push('constructor injection');
            }
          }
        }
      }

      // Check for inject() function calls
      const callExpressions = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of callExpressions) {
        const expr = call.getExpression();
        const text = expr.getText();
        if (text === 'inject') {
          codeAnalysis.inject_function++;
          if (!filePatterns.includes('inject()')) filePatterns.push('inject()');
        }
        if (text === 'signal' || text === 'computed') {
          codeAnalysis.signals++;
          if (!filePatterns.includes('signal()/computed()')) filePatterns.push('signal()/computed()');
        }
      }

      // Check for BehaviorSubject
      const importDecls = sf.getImportDeclarations();
      for (const imp of importDecls) {
        const namedImports = imp.getNamedImports();
        for (const ni of namedImports) {
          if (ni.getName() === 'BehaviorSubject') {
            codeAnalysis.behavior_subjects++;
            if (!filePatterns.includes('BehaviorSubject')) filePatterns.push('BehaviorSubject');
          }
        }
      }

      // Check for .subscribe() in component files
      const isComponent = relPath.includes('.component.') || relPath.includes('.container.');
      if (isComponent) {
        const propAccesses = sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
        for (const pa of propAccesses) {
          if (pa.getName() === 'subscribe') {
            codeAnalysis.subscribe_in_components++;
            if (!filePatterns.includes('subscribe()')) filePatterns.push('subscribe()');
            break; // count once per file for subscribe
          }
        }
      }

      if (filePatterns.length > 0) {
        filesNeedingMigration.push({ file: relPath, patterns: filePatterns });
      }
    }

    // Template scanning (.html files) — regex-based, not ts-morph
    function scanHtmlFiles(dir) {
      let files = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.orch') {
            files = files.concat(scanHtmlFiles(fullPath));
          } else if (entry.isFile() && entry.name.endsWith('.component.html')) {
            files.push(fullPath);
          }
        }
      } catch (e) { /* skip unreadable dirs */ }
      return files;
    }

    const htmlFiles = scanHtmlFiles(projectRoot);
    for (const htmlFile of htmlFiles) {
      const content = fs.readFileSync(htmlFile, 'utf8');
      const relPath = path.relative(projectRoot, htmlFile);
      const templatePatterns = [];

      const ngIfCount = (content.match(/\*ngIf/g) || []).length;
      const ngForCount = (content.match(/\*ngFor/g) || []).length;
      const blockIfCount = (content.match(/@if\s*[(\s]/g) || []).length;
      const blockForCount = (content.match(/@for\s*[(\s]/g) || []).length;

      if (ngIfCount > 0 || ngForCount > 0) {
        codeAnalysis.legacy_templates += ngIfCount + ngForCount;
        templatePatterns.push('*ngIf/*ngFor');
      }
      if (blockIfCount > 0 || blockForCount > 0) {
        codeAnalysis.modern_templates += blockIfCount + blockForCount;
        templatePatterns.push('@if/@for');
      }

      if (templatePatterns.length > 0) {
        // Check if there's already a .ts entry for the same component
        const tsRelPath = relPath.replace('.component.html', '.component.ts');
        const existing = filesNeedingMigration.find(f => f.file === tsRelPath);
        if (existing) {
          existing.patterns.push(...templatePatterns);
        } else {
          filesNeedingMigration.push({ file: relPath, patterns: templatePatterns });
        }
      }
    }

    process.stderr.write('Code analysis complete.\n');
  } catch (e) {
    process.stderr.write('Warning: ts-morph code analysis failed: ' + e.message + '\n');
    tsMorphAvailable = false;
  }
} else {
  process.stderr.write('ts-morph not available at .orch/node_modules/ts-morph — skipping code analysis.\n');
}

// Categorize all packages
const categories = {
  'Angular Core': [],
  'Angular CDK/Material': [],
  'Angular Build Tools': [],
  'TypeScript': [],
  'RxJS': [],
  'Zone.js': [],
  'Testing': [],
  'Other': []
};

for (const [name, version] of Object.entries(allDeps)) {
  const ver = version.replace(/[\^~]/, '');
  const isDev = !!(pkg.devDependencies || {})[name];
  const entry = { name, version: ver, raw: version, isDev };

  if (name.startsWith('@angular/') && !name.includes('cdk') && !name.includes('material') && !name.includes('build')) {
    categories['Angular Core'].push(entry);
  } else if (name.includes('cdk') || name.includes('material')) {
    categories['Angular CDK/Material'].push(entry);
  } else if (name.includes('@angular/build') || name.includes('@angular-devkit')) {
    categories['Angular Build Tools'].push(entry);
  } else if (name === 'typescript') {
    categories['TypeScript'].push(entry);
  } else if (name === 'rxjs') {
    categories['RxJS'].push(entry);
  } else if (name.startsWith('zone')) {
    categories['Zone.js'].push(entry);
  } else if (['jest', 'jest-preset-angular', 'ts-jest', 'jest-environment-jsdom', '@types/jest', 'cypress', '@playwright/test', 'karma'].some(t => name.includes(t))) {
    categories['Testing'].push(entry);
  }
}

// Compute version steps
const steps = [];
for (let v = currentMajor; v < targetVersion; v++) {
  steps.push({ from: v, to: v + 1 });
}

// Known version requirements (simplified — real data should come from compatibility matrix)
const versionMatrix = {
  17: { typescript: '5.2-5.4', rxjs: '7.8+', zoneJs: '0.13-0.14', node: '18.13+' },
  18: { typescript: '5.4-5.5', rxjs: '7.8+', zoneJs: '0.14+', node: '18.19+' },
  19: { typescript: '5.5-5.7', rxjs: '7.8+', zoneJs: '0.14-0.15', node: '18.19+' },
  20: { typescript: '5.8+', rxjs: '7.8+', zoneJs: '0.15+', node: '20.19+' },
  21: { typescript: '5.9+', rxjs: '7.8+', zoneJs: '0.15+', node: '20.19+' },
};

// Known breaking changes
const breakingChanges = {
  17: ['Standalone components are now default', 'New control flow syntax (@if, @for) available', 'Signals API preview'],
  18: ['Control flow syntax stable', 'Signal inputs stable', 'esbuild is default builder'],
  19: ['Signals fully stable', 'Resource API', 'linkedSignal'],
  20: ['Signal forms preview', 'Mutation API'],
  21: ['Signal forms stable', 'ng migrate command'],
};

// Generate plan document
const lines = [];
lines.push('# Migration Plan');
lines.push('');
lines.push(`**Project:** ${pkg.name || path.basename(projectRoot)}`);
lines.push(`**Current:** Angular ${currentMajor} (${coreVersion})`);
lines.push(`**Target:** Angular ${targetVersion}`);
lines.push(`**Steps:** ${steps.length} major version jump${steps.length > 1 ? 's' : ''}`);
lines.push(`**Generated:** ${new Date().toISOString().slice(0, 19)}`);
lines.push('');

// Current state
lines.push('## Current State');
lines.push('');
lines.push('| Category | Package | Current Version | Dev? |');
lines.push('|----------|---------|----------------|------|');
for (const [cat, pkgs] of Object.entries(categories)) {
  for (const p of pkgs) {
    lines.push(`| ${cat} | \`${p.name}\` | ${p.version} | ${p.isDev ? 'Yes' : 'No'} |`);
  }
}
lines.push('');

// Step-by-step plan
lines.push('## Upgrade Steps');
lines.push('');

for (const step of steps) {
  const reqs = versionMatrix[step.to] || {};
  const changes = breakingChanges[step.to] || [];

  lines.push(`### Step ${steps.indexOf(step) + 1}: Angular ${step.from} \u2192 ${step.to}`);
  lines.push('');

  if (Object.keys(reqs).length > 0) {
    lines.push('**Requirements:**');
    lines.push('| Dependency | Required | Current |');
    lines.push('|-----------|----------|---------|');
    if (reqs.typescript) lines.push(`| TypeScript | ${reqs.typescript} | ${(allDeps['typescript'] || '?').replace(/[\^~]/, '')} |`);
    if (reqs.rxjs) lines.push(`| RxJS | ${reqs.rxjs} | ${(allDeps['rxjs'] || '?').replace(/[\^~]/, '')} |`);
    if (reqs.zoneJs) lines.push(`| Zone.js | ${reqs.zoneJs} | ${(allDeps['zone.js'] || '?').replace(/[\^~]/, '')} |`);
    if (reqs.node) lines.push(`| Node.js | ${reqs.node} | (check with node --version) |`);
    lines.push('');
  }

  lines.push('**Commands:**');
  lines.push('```bash');
  lines.push(`npx ng update @angular/core@${step.to} @angular/cli@${step.to} --force --allow-dirty`);
  if (categories['Angular CDK/Material'].length > 0) {
    lines.push(`npx ng update @angular/cdk@${step.to} @angular/material@${step.to} --force --allow-dirty`);
  }
  lines.push(`npx ng build`);
  lines.push(`npx ng test --watch=false`);
  lines.push('```');
  lines.push('');

  if (changes.length > 0) {
    lines.push('**Breaking changes / new features:**');
    for (const c of changes) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  // Packages that will be upgraded
  lines.push('**Packages upgrading:**');
  lines.push('| Package | From | To |');
  lines.push('|---------|------|-----|');
  for (const p of categories['Angular Core']) {
    lines.push(`| \`${p.name}\` | ${p.version} | ~${step.to}.x |`);
  }
  for (const p of categories['Angular CDK/Material']) {
    lines.push(`| \`${p.name}\` | ${p.version} | ~${step.to}.x |`);
  }
  for (const p of categories['Angular Build Tools']) {
    lines.push(`| \`${p.name}\` | ${p.version} | ~${step.to}.x |`);
  }
  lines.push('');

  // Packages staying
  lines.push('**Packages NOT upgrading (unchanged):**');
  for (const p of categories['Testing']) {
    lines.push(`- \`${p.name}\` (${p.version}) \u2014 update separately if peer conflict`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
}

// ═══════════════════════════════════════════════════════════════
// LIBRARY PREFERENCES SECTION
// ═══════════════════════════════════════════════════════════════

if (preferenceResults.length > 0) {
  lines.push('## Library Preferences (Org Standards)');
  lines.push('');
  lines.push('| Library | Current | Preferred | Action | Migration Skill |');
  lines.push('|---------|---------|-----------|--------|-----------------|');
  for (const pref of preferenceResults) {
    lines.push(`| ${pref.category} | ${pref.current} | ${pref.preferred} | ${pref.action} | ${pref.skill} |`);
  }
  lines.push('');
  lines.push('> Note: Library migrations are separate from version upgrade. Run after the Angular version upgrade completes.');
  lines.push('');
}

// ═══════════════════════════════════════════════════════════════
// CODE ANALYSIS SECTION
// ═══════════════════════════════════════════════════════════════

if (tsMorphAvailable) {
  lines.push('## Code Analysis (ts-morph)');
  lines.push('');

  lines.push('### Pattern Adoption');
  lines.push('| Pattern | Count | Status | Migration needed? |');
  lines.push('|---------|-------|--------|-------------------|');

  function patternRow(name, count, isModern, migrationNote) {
    let status, migration;
    if (isModern) {
      status = count > 0 ? 'Modern' : 'Not adopted';
      migration = 'No';
    } else {
      status = count > 0 ? 'Legacy' : 'Not found';
      migration = count > 0 ? 'Yes \u2014 ' + migrationNote : '\u2014';
    }
    lines.push(`| ${name} | ${count} | ${status} | ${migration} |`);
  }

  patternRow('NgModule declarations', codeAnalysis.ngmodules, false, '/angular-migrate-standalone');
  patternRow('Constructor injection', codeAnalysis.constructor_injection, false, 'refactor to inject()');
  patternRow('inject() function', codeAnalysis.inject_function, true, '');
  patternRow('*ngIf/*ngFor templates', codeAnalysis.legacy_templates, false, '/angular-migrate-control-flow');
  patternRow('@if/@for templates', codeAnalysis.modern_templates, true, '');
  patternRow('BehaviorSubject', codeAnalysis.behavior_subjects, false, '/angular-migrate-signals (v19+)');
  patternRow('signal()/computed()', codeAnalysis.signals, true, '');
  patternRow('@Input() decorators', codeAnalysis.input_decorators, false, '/angular-migrate-signals (v18+)');
  patternRow('@Output() decorators', codeAnalysis.output_decorators, false, '/angular-migrate-signals (v18+)');
  patternRow('subscribe() in components', codeAnalysis.subscribe_in_components, false, 'migrate to toSignal() (v19+)');
  lines.push('');

  // Files needing migration
  if (filesNeedingMigration.length > 0) {
    lines.push('### Files Needing Migration');
    lines.push('| File | Patterns Found |');
    lines.push('|------|---------------|');
    for (const f of filesNeedingMigration) {
      lines.push(`| ${f.file} | ${f.patterns.join(', ')} |`);
    }
    lines.push('');
  }

  // Summary
  lines.push('### Summary');
  if (codeAnalysis.ngmodules > 0) {
    lines.push(`- ${codeAnalysis.ngmodules} NgModules \u2192 standalone migration recommended`);
  }
  if (codeAnalysis.legacy_templates > 0) {
    lines.push(`- ${codeAnalysis.legacy_templates} legacy template directives \u2192 control flow migration recommended`);
  }
  if (codeAnalysis.behavior_subjects > 0) {
    lines.push(`- ${codeAnalysis.behavior_subjects} BehaviorSubjects \u2192 signals migration recommended (if target \u2265 19)`);
  }
  if (codeAnalysis.input_decorators > 0) {
    lines.push(`- ${codeAnalysis.input_decorators} @Input decorators \u2192 signal inputs recommended (if target \u2265 18)`);
  }
  if (codeAnalysis.output_decorators > 0) {
    lines.push(`- ${codeAnalysis.output_decorators} @Output decorators \u2192 output function recommended (if target \u2265 18)`);
  }
  if (codeAnalysis.subscribe_in_components > 0) {
    lines.push(`- ${codeAnalysis.subscribe_in_components} subscribe() calls in components \u2192 toSignal() recommended (if target \u2265 19)`);
  }
  if (codeAnalysis.constructor_injection > 0) {
    lines.push(`- ${codeAnalysis.constructor_injection} constructor injections \u2192 inject() refactor recommended`);
  }
  if (codeAnalysis.ngmodules === 0 && codeAnalysis.legacy_templates === 0 &&
      codeAnalysis.behavior_subjects === 0 && codeAnalysis.input_decorators === 0 &&
      codeAnalysis.subscribe_in_components === 0 && codeAnalysis.constructor_injection === 0) {
    lines.push('- No legacy patterns detected \u2014 codebase is already using modern patterns!');
  }
  lines.push('');
} else {
  lines.push('## Code Analysis');
  lines.push('');
  lines.push('> ts-morph is not installed at `.orch/node_modules/ts-morph`. Install it to enable source code analysis:');
  lines.push('> ```bash');
  lines.push('> cd .orch && npm install ts-morph');
  lines.push('> ```');
  lines.push('');
}

// Risks
lines.push('## Risks');
lines.push('');
lines.push('| Risk | Likelihood | Mitigation |');
lines.push('|------|-----------|-----------|');
lines.push('| Peer dependency conflicts | High | `--force` flag pre-applied |');
lines.push('| Bundle size increase | Medium | Budgets temporarily increased |');
lines.push('| Test failures | Medium | Fix or skip, address after upgrade |');
lines.push('| Third-party lib incompatibility | Low-Medium | Check npm for compatible versions |');
lines.push('');

// Write to disk
const planDir = path.join(projectRoot, '.orch', 'plans');
fs.mkdirSync(planDir, { recursive: true });
const planPath = path.join(planDir, 'migration-plan.md');
fs.writeFileSync(planPath, lines.join('\n'));
process.stderr.write('Plan written to: ' + planPath + '\n');

// Output JSON summary to stdout
const summary = {
  project: pkg.name || path.basename(projectRoot),
  current: currentMajor,
  target: targetVersion,
  steps: steps,
  packages: Object.fromEntries(
    Object.entries(categories).map(([cat, pkgs]) => [cat, pkgs.length])
  ),
  preferences: {},
  code_analysis: {
    ngmodules: codeAnalysis.ngmodules,
    constructor_injection: codeAnalysis.constructor_injection,
    inject_function: codeAnalysis.inject_function,
    legacy_templates: codeAnalysis.legacy_templates,
    modern_templates: codeAnalysis.modern_templates,
    behavior_subjects: codeAnalysis.behavior_subjects,
    signals: codeAnalysis.signals,
    input_decorators: codeAnalysis.input_decorators,
    output_decorators: codeAnalysis.output_decorators,
    subscribe_in_components: codeAnalysis.subscribe_in_components
  },
  plan_path: planPath
};

// Populate preferences JSON
for (const pref of preferenceResults) {
  const key = pref.category.toLowerCase().replace(/\s+/g, '_');
  summary.preferences[key] = {
    current: pref.current,
    preferred: pref.preferred,
    action: pref.action
  };
}

process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
