/**
 * ORCH Semantic Analysis — TypeScript Adapter
 * Generates a lossless semantic summary from TypeScript/Angular source code.
 *
 * Uses ts-morph (TypeScript Compiler API wrapper) to build a full LST,
 * then extracts a token-efficient summary for agent consumption.
 *
 * Usage: npx ts-node scripts/semantic/adapters/typescript/generate-summary.ts <src-path> [--output <path>]
 *
 * Output: semantic-summary.md (~150-300 lines, ~2-4K tokens)
 * The full LST stays in memory and is discarded — only the summary is persisted.
 */

import { Project, SyntaxKind, ClassDeclaration, SourceFile, Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const srcPath = process.argv[2] || 'src';
const outputPath = process.argv[3] === '--output' ? process.argv[4] : null;

// Initialize ts-morph project
const tsConfigPath = findTsConfig(srcPath);
const project = new Project({
  tsConfigFilePath: tsConfigPath,
  skipAddingFilesFromTsConfig: false,
});

// If no tsconfig found, add files manually
if (!tsConfigPath) {
  project.addSourceFilesAtPaths(`${srcPath}/**/*.ts`);
}

const sourceFiles = project.getSourceFiles();
const output: string[] = [];

output.push(`## Semantic Summary — ${path.basename(path.resolve(srcPath))}`);
output.push(`Generated: ${new Date().toISOString()}`);
output.push(`Files analyzed: ${sourceFiles.length}`);
output.push('');

// ── Technology Detection ──
output.push('### Technology Inventory');
output.push('| Item | Value |');
output.push('|------|-------|');

const packageJson = findPackageJson(srcPath);
if (packageJson) {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const keyDeps = [
    '@angular/core', '@angular/cli', 'typescript', 'rxjs', 'zone.js',
    '@angular/material', 'primeng', 'ag-grid-angular', 'angular-plotly.js',
    '@yourorg/elevate', '@yourorg/elevate-common', '@yourorg/hds',
    '@interopio/ng', '@glue42/ng', '@nx/angular', 'jest', '@playwright/test', 'cypress', 'karma'
  ];
  for (const dep of keyDeps) {
    if (deps[dep]) output.push(`| ${dep} | ${deps[dep]} |`);
  }
}
output.push('');

// ── Module Dependency Graph ──
output.push('### Module Dependency Graph');
output.push('```mermaid');
output.push('graph TD');

const modules = new Map<string, string[]>();
for (const sf of sourceFiles) {
  const classes = sf.getClasses();
  for (const cls of classes) {
    const ngModuleDecorator = cls.getDecorator('NgModule');
    if (ngModuleDecorator) {
      const moduleName = cls.getName() || 'UnknownModule';
      const imports = extractDecoratorArrayProp(ngModuleDecorator, 'imports');
      modules.set(moduleName, imports);
      for (const imp of imports) {
        output.push(`    ${moduleName} --> ${imp}`);
      }
    }
  }
}
output.push('```');
output.push('');

// ── Component Analysis ──
output.push('### Component Inventory');
output.push('| Component | Standalone | ChangeDetection | Inputs | Outputs | Injects | Template Subscribes |');
output.push('|-----------|-----------|----------------|--------|---------|---------|-------------------|');

let totalComponents = 0;
let standaloneCount = 0;
let onPushCount = 0;
let subscribeInComponentCount = 0;

for (const sf of sourceFiles) {
  for (const cls of sf.getClasses()) {
    const componentDec = cls.getDecorator('Component');
    if (!componentDec) continue;
    totalComponents++;

    const name = cls.getName() || 'Unknown';
    const isStandalone = decoratorHasProp(componentDec, 'standalone', 'true');
    const isOnPush = decoratorHasProp(componentDec, 'changeDetection', 'OnPush');
    if (isStandalone) standaloneCount++;
    if (isOnPush) onPushCount++;

    const inputs = cls.getProperties().filter(p => p.getDecorator('Input')).length
      + cls.getGetAccessors().filter(g => g.getDecorator('Input')).length;
    const outputs = cls.getProperties().filter(p => p.getDecorator('Output')).length;

    // Count constructor params (inject pattern)
    const constructorParams = cls.getConstructors()[0]?.getParameters().length || 0;
    const injectCalls = cls.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => c.getExpression().getText() === 'inject').length;
    const totalInjects = constructorParams + injectCalls;

    // Check for .subscribe() in component
    const subscribes = cls.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => {
        const expr = c.getExpression();
        return Node.isPropertyAccessExpression(expr) && expr.getName() === 'subscribe';
      }).length;
    if (subscribes > 0) subscribeInComponentCount++;

    output.push(`| ${name} | ${isStandalone ? '✅' : '❌'} | ${isOnPush ? 'OnPush' : 'Default'} | ${inputs} | ${outputs} | ${totalInjects} | ${subscribes} |`);
  }
}
output.push('');

// ── Pattern Summary ──
output.push('### Pattern Summary');
output.push('| Pattern | Count | Target | Migration |');
output.push('|---------|-------|--------|-----------|');
output.push(`| Components total | ${totalComponents} | — | — |`);
output.push(`| Standalone components | ${standaloneCount} | ${totalComponents} | /migrate standalone |`);
output.push(`| OnPush components | ${onPushCount} | ${totalComponents} | /refactor |`);
output.push(`| Components with .subscribe() | ${subscribeInComponentCount} | 0 | /migrate signals or /refactor |`);
output.push(`| NgModules | ${modules.size} | 0 (standalone) | /migrate standalone |`);

// Count other patterns across all files
let ngIfCount = 0;
let ngForCount = 0;
let constructorInjectionCount = 0;
let injectFunctionCount = 0;
let consoleLogCount = 0;
let anyTypeCount = 0;

for (const sf of sourceFiles) {
  const text = sf.getFullText();
  ngIfCount += (text.match(/\*ngIf/g) || []).length;
  ngForCount += (text.match(/\*ngFor/g) || []).length;
  consoleLogCount += (text.match(/console\.(log|warn|error)/g) || []).length;
  anyTypeCount += (text.match(/:\s*any\b/g) || []).length;

  for (const cls of sf.getClasses()) {
    const ctor = cls.getConstructors()[0];
    if (ctor && ctor.getParameters().length > 0) {
      const isService = cls.getDecorator('Injectable');
      if (isService) constructorInjectionCount++;
    }
    injectFunctionCount += cls.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => c.getExpression().getText() === 'inject').length;
  }
}

output.push(`| *ngIf directives | ${ngIfCount} | 0 | /migrate control-flow |`);
output.push(`| *ngFor directives | ${ngForCount} | 0 | /migrate control-flow |`);
output.push(`| Constructor injection (services) | ${constructorInjectionCount} | 0 | /migrate inject |`);
output.push(`| inject() function calls | ${injectFunctionCount} | all | — (target pattern) |`);
output.push(`| console.log/warn/error | ${consoleLogCount} | 0 | /refactor (use LoggingService) |`);
output.push(`| 'any' type usage | ${anyTypeCount} | 0 | /refactor |`);
output.push('');

// ── Injectable/Service Dependency Map ──
output.push('### Service Dependency Map');
output.push('| Service | Injection Style | Dependencies |');
output.push('|---------|----------------|-------------|');

for (const sf of sourceFiles) {
  for (const cls of sf.getClasses()) {
    if (!cls.getDecorator('Injectable')) continue;
    const name = cls.getName() || 'Unknown';
    const ctor = cls.getConstructors()[0];
    const deps: string[] = [];
    let style = 'none';

    if (ctor) {
      style = 'constructor';
      for (const param of ctor.getParameters()) {
        const paramType = param.getType().getText();
        deps.push(paramType.split('.').pop() || paramType);
      }
    }

    // Check for inject() calls
    const injectCalls = cls.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => c.getExpression().getText() === 'inject');
    if (injectCalls.length > 0) {
      style = style === 'constructor' ? 'mixed' : 'inject()';
      for (const call of injectCalls) {
        const args = call.getArguments();
        if (args.length > 0) deps.push(args[0].getText());
      }
    }

    output.push(`| ${name} | ${style} | ${deps.join(', ') || 'none'} |`);
  }
}
output.push('');

// ── Inline Doc Coverage ──
output.push('### Documentation Coverage');
let filesWithDocs = 0;
let filesWithoutDocs = 0;
let publicMethodsDocumented = 0;
let publicMethodsUndocumented = 0;

for (const sf of sourceFiles) {
  const hasJsDoc = sf.getDescendantsOfKind(SyntaxKind.JSDoc).length > 0;
  if (hasJsDoc) filesWithDocs++;
  else filesWithoutDocs++;

  for (const cls of sf.getClasses()) {
    for (const method of cls.getMethods()) {
      if (method.getScope() === 'public' || !method.getScope()) {
        if (method.getJsDocs().length > 0) publicMethodsDocumented++;
        else publicMethodsUndocumented++;
      }
    }
  }
}

output.push(`| Metric | Value |`);
output.push(`|--------|-------|`);
output.push(`| Files with JSDoc/TSDoc | ${filesWithDocs} / ${sourceFiles.length} (${Math.round(filesWithDocs / sourceFiles.length * 100)}%) |`);
output.push(`| Public methods documented | ${publicMethodsDocumented} / ${publicMethodsDocumented + publicMethodsUndocumented} (${Math.round(publicMethodsDocumented / (publicMethodsDocumented + publicMethodsUndocumented || 1) * 100)}%) |`);
output.push('');

// ── Migration Readiness Score ──
const standaloneReadiness = totalComponents > 0 ? Math.round(standaloneCount / totalComponents * 100) : 100;
const onPushReadiness = totalComponents > 0 ? Math.round(onPushCount / totalComponents * 100) : 100;
const subscribeReadiness = totalComponents > 0 ? Math.round((totalComponents - subscribeInComponentCount) / totalComponents * 100) : 100;

output.push('### Migration Readiness');
output.push(`| Area | Readiness | Action needed |`);
output.push(`|------|-----------|--------------|`);
output.push(`| Standalone | ${standaloneReadiness}% | ${standaloneReadiness < 100 ? `${totalComponents - standaloneCount} components to migrate` : 'Ready ✓'} |`);
output.push(`| OnPush | ${onPushReadiness}% | ${onPushReadiness < 100 ? `${totalComponents - onPushCount} components to update` : 'Ready ✓'} |`);
output.push(`| No subscribe in components | ${subscribeReadiness}% | ${subscribeReadiness < 100 ? `${subscribeInComponentCount} components to refactor` : 'Ready ✓'} |`);
output.push(`| Control flow (@if/@for) | ${ngIfCount + ngForCount === 0 ? '100' : '0'}% | ${ngIfCount + ngForCount > 0 ? `${ngIfCount + ngForCount} directives to migrate` : 'Ready ✓'} |`);
output.push(`| inject() function | ${constructorInjectionCount === 0 ? '100' : Math.round(injectFunctionCount / (constructorInjectionCount + injectFunctionCount || 1) * 100)}% | ${constructorInjectionCount > 0 ? `${constructorInjectionCount} services to migrate` : 'Ready ✓'} |`);

// Write output
const result = output.join('\n');

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result);
  console.error(`Semantic summary written to: ${outputPath}`);
} else {
  console.log(result);
}

// ── Helper Functions ──

function findTsConfig(srcPath: string): string | undefined {
  const candidates = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.base.json'];
  for (const candidate of candidates) {
    const fullPath = path.resolve(srcPath, '..', candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  const rootPath = path.resolve(candidate);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function findPackageJson(srcPath: string): any | null {
  const candidates = [
    path.resolve(srcPath, '..', 'package.json'),
    path.resolve('package.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    }
  }
  return null;
}

function extractDecoratorArrayProp(decorator: any, propName: string): string[] {
  try {
    const args = decorator.getArguments();
    if (args.length === 0) return [];
    const obj = args[0];
    const prop = obj.getProperty(propName);
    if (!prop) return [];
    const init = prop.getInitializer();
    if (!init || !Node.isArrayLiteralExpression(init)) return [];
    return init.getElements().map((e: any) => e.getText().replace(/'/g, '').replace(/"/g, ''));
  } catch {
    return [];
  }
}

function decoratorHasProp(decorator: any, propName: string, value: string): boolean {
  try {
    const args = decorator.getArguments();
    if (args.length === 0) return false;
    const obj = args[0];
    const prop = obj.getProperty(propName);
    if (!prop) return false;
    return prop.getInitializer()?.getText().includes(value) || false;
  } catch {
    return false;
  }
}
