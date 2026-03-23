/**
 * ORCH Semantic Analysis — TypeScript Migration Analyzer
 * Analyzes what specific migrations are needed per file using ts-morph.
 *
 * Unlike grep-based counting, this resolves:
 * - Which imports each component actually uses (for standalone migration)
 * - What the observable chain looks like (for signal migration)
 * - Constructor param types (for inject() migration)
 *
 * Usage: npx ts-node scripts/semantic/adapters/typescript/analyze-migrations.ts <src-path> --target <angular-version>
 *
 * Output: migration-plan.md with per-file migration instructions
 */

import { Project, SyntaxKind, ClassDeclaration, Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const srcPath = process.argv[2] || 'src';
const targetArg = process.argv.indexOf('--target');
const targetVersion = targetArg !== -1 ? parseInt(process.argv[targetArg + 1]) : 19;

const tsConfigPath = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.base.json']
  .find(f => fs.existsSync(f));

const project = new Project({
  tsConfigFilePath: tsConfigPath,
  skipAddingFilesFromTsConfig: !tsConfigPath,
});

if (!tsConfigPath) {
  project.addSourceFilesAtPaths(`${srcPath}/**/*.ts`);
}

const output: string[] = [];
output.push(`## Migration Plan — Target: Angular ${targetVersion}`);
output.push(`Generated: ${new Date().toISOString()}`);
output.push('');

// ── Standalone Migration Plan ──
if (targetVersion >= 17) {
  output.push('### Standalone Migration');
  output.push('| Component | Current Module | Imports Needed (resolved) | Removable Module? |');
  output.push('|-----------|---------------|-------------------------|------------------|');

  for (const sf of project.getSourceFiles()) {
    for (const cls of sf.getClasses()) {
      const componentDec = cls.getDecorator('Component');
      if (!componentDec) continue;
      if (decoratorHasProp(componentDec, 'standalone', 'true')) continue; // already standalone

      const name = cls.getName() || 'Unknown';
      const filePath = sf.getFilePath();

      // Find which module declares this component
      const declaringModule = findDeclaringModule(project, name);

      // Resolve what imports this component actually uses from that module
      const usedImports = resolveUsedImports(cls, declaringModule);

      output.push(`| ${name} | ${declaringModule || 'none found'} | ${usedImports.join(', ') || 'none'} | ${declaringModule ? 'check after all consumers migrate' : 'N/A'} |`);
    }
  }
  output.push('');
}

// ── inject() Migration Plan ──
if (targetVersion >= 18) {
  output.push('### inject() Migration');
  output.push('| Service/Component | Constructor Params | Converted inject() |');
  output.push('|-------------------|-------------------|-------------------|');

  for (const sf of project.getSourceFiles()) {
    for (const cls of sf.getClasses()) {
      const ctor = cls.getConstructors()[0];
      if (!ctor || ctor.getParameters().length === 0) continue;

      const name = cls.getName() || 'Unknown';
      const params = ctor.getParameters().map(p => {
        const paramName = p.getName();
        const paramType = p.getType().getText().split('.').pop() || p.getType().getText();
        const decorators = p.getDecorators().map(d => `@${d.getName()}`).join(' ');
        return `${decorators ? decorators + ' ' : ''}${paramName}: ${paramType}`;
      });

      const injectVersion = params.map(p => {
        // Convert "private readonly http: HttpClient" to "inject(HttpClient)"
        const match = p.match(/(\w+):\s*(\w+)/);
        if (match) return `${match[1]} = inject(${match[2]})`;
        return p;
      });

      output.push(`| ${name} | ${params.join('; ')} | ${injectVersion.join('; ')} |`);
    }
  }
  output.push('');
}

// ── Signal Input Migration Plan ──
if (targetVersion >= 19) {
  output.push('### Signal Input/Output Migration');
  output.push('| Component | @Input() props | @Output() events | Signal equivalent |');
  output.push('|-----------|---------------|-----------------|------------------|');

  for (const sf of project.getSourceFiles()) {
    for (const cls of sf.getClasses()) {
      if (!cls.getDecorator('Component')) continue;

      const inputs = cls.getProperties()
        .filter(p => p.getDecorator('Input'))
        .map(p => {
          const name = p.getName();
          const type = p.getType().getText().split('.').pop() || 'unknown';
          const required = p.hasExclamationToken();
          return { name, type, required };
        });

      const outputs = cls.getProperties()
        .filter(p => p.getDecorator('Output'))
        .map(p => p.getName());

      if (inputs.length === 0 && outputs.length === 0) continue;

      const name = cls.getName() || 'Unknown';
      const inputStr = inputs.map(i => `${i.name}: ${i.type}${i.required ? ' (required)' : ''}`).join(', ');
      const outputStr = outputs.join(', ');
      const signalStr = [
        ...inputs.map(i => `${i.name} = input${i.required ? '.required' : ''}<${i.type}>()`),
        ...outputs.map(o => `${o} = output<void>()`)
      ].join('; ');

      output.push(`| ${name} | ${inputStr || 'none'} | ${outputStr || 'none'} | ${signalStr} |`);
    }
  }
  output.push('');
}

// ── Subscribe Analysis ──
output.push('### Subscribe → Async Pipe / Signal Analysis');
output.push('| File:Line | Observable Source | Can async pipe? | Can signal? | Recommendation |');
output.push('|-----------|-----------------|----------------|------------|---------------|');

for (const sf of project.getSourceFiles()) {
  for (const cls of sf.getClasses()) {
    if (!cls.getDecorator('Component')) continue;

    const subscribeCalls = cls.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => {
        const expr = c.getExpression();
        return Node.isPropertyAccessExpression(expr) && expr.getName() === 'subscribe';
      });

    for (const call of subscribeCalls) {
      const line = call.getStartLineNumber();
      const expr = call.getExpression();
      const source = Node.isPropertyAccessExpression(expr)
        ? expr.getExpression().getText()
        : 'unknown';

      // Determine if it can be replaced
      const isInNgOnInit = call.getFirstAncestorByKind(SyntaxKind.MethodDeclaration)?.getName() === 'ngOnInit';
      const canAsyncPipe = isInNgOnInit; // If in ngOnInit, likely fetching data for template
      const recommendation = canAsyncPipe
        ? 'Replace with async pipe in template'
        : 'Add takeUntilDestroyed()';

      output.push(`| ${sf.getBaseName()}:${line} | ${source} | ${canAsyncPipe ? 'Yes' : 'No'} | ${targetVersion >= 19 ? 'Yes (toSignal)' : 'No'} | ${recommendation} |`);
    }
  }
}

console.log(output.join('\n'));

// ── Helper Functions ──

function findDeclaringModule(project: Project, componentName: string): string | null {
  for (const sf of project.getSourceFiles()) {
    for (const cls of sf.getClasses()) {
      const ngModuleDec = cls.getDecorator('NgModule');
      if (!ngModuleDec) continue;
      const declarations = extractDecoratorArrayProp(ngModuleDec, 'declarations');
      if (declarations.includes(componentName)) {
        return cls.getName() || null;
      }
    }
  }
  return null;
}

function resolveUsedImports(cls: ClassDeclaration, moduleName: string | null): string[] {
  // Simplified: return imports from the source file that come from Angular/PrimeNG/etc
  const sf = cls.getSourceFile();
  const imports = sf.getImportDeclarations()
    .filter(i => {
      const mod = i.getModuleSpecifierValue();
      return mod.startsWith('@angular') || mod.startsWith('primeng') || mod.startsWith('@yourorg');
    })
    .flatMap(i => i.getNamedImports().map(n => n.getName()));
  return [...new Set(imports)];
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
    return init.getElements().map((e: any) => e.getText().replace(/['"]/g, ''));
  } catch {
    return [];
  }
}

function decoratorHasProp(decorator: any, propName: string, value: string): boolean {
  try {
    const args = decorator.getArguments();
    if (args.length === 0) return false;
    const prop = args[0].getProperty(propName);
    return prop?.getInitializer()?.getText().includes(value) || false;
  } catch {
    return false;
  }
}
