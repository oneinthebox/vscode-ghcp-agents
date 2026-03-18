/**
 * ORCH Semantic Analysis — TypeScript Transform Engine
 * Executes precise, type-aware, formatting-preserving transformations using ts-morph.
 *
 * The agent PLANS the migration. This script EXECUTES it precisely.
 * Unlike agent-based editing (which guesses and can break formatting),
 * ts-morph transforms are type-resolved and formatting-preserving.
 *
 * Usage: npx ts-node scripts/semantic/adapters/typescript/transform.ts <type> <src-path> [options]
 *
 * Types:
 *   standalone   — convert NgModule components to standalone
 *   inject       — convert constructor injection to inject() function
 *   signals      — convert @Input/@Output to signal inputs/outputs
 *
 * Options:
 *   --dry-run    — show what would change without writing
 *   --file       — transform a specific file only
 */

import { Project, SyntaxKind, ClassDeclaration, Node, StructureKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const transformType = process.argv[2];
const srcPath = process.argv[3] || 'src';
const dryRun = process.argv.includes('--dry-run');
const specificFile = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : null;

if (!transformType) {
  console.error('Usage: transform.ts <standalone|inject|signals> <src-path> [--dry-run] [--file <path>]');
  process.exit(1);
}

const tsConfigPath = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.base.json']
  .find(f => fs.existsSync(f));

const project = new Project({
  tsConfigFilePath: tsConfigPath,
  skipAddingFilesFromTsConfig: !tsConfigPath,
});

if (!tsConfigPath) {
  project.addSourceFilesAtPaths(`${srcPath}/**/*.ts`);
}

let filesChanged = 0;
let transformsApplied = 0;

switch (transformType) {
  case 'standalone':
    transformStandalone();
    break;
  case 'inject':
    transformInject();
    break;
  case 'signals':
    transformSignals();
    break;
  default:
    console.error(`Unknown transform type: ${transformType}`);
    process.exit(1);
}

// Save changes
if (!dryRun) {
  project.saveSync();
}

console.log(`\n## Transform Summary`);
console.log(`| Metric | Value |`);
console.log(`|--------|-------|`);
console.log(`| Transform type | ${transformType} |`);
console.log(`| Files changed | ${filesChanged} |`);
console.log(`| Transforms applied | ${transformsApplied} |`);
console.log(`| Dry run | ${dryRun} |`);

// ── Transform: Standalone ──
function transformStandalone() {
  const sourceFiles = getTargetFiles();

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      const componentDec = cls.getDecorator('Component');
      if (!componentDec) continue;
      if (decoratorHasProp(componentDec, 'standalone', 'true')) continue;

      const name = cls.getName() || 'Unknown';
      console.log(`Converting ${name} to standalone...`);

      // Add standalone: true to decorator
      const args = componentDec.getArguments();
      if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
        const obj = args[0];

        // Add standalone: true
        if (!obj.getProperty('standalone')) {
          obj.addPropertyAssignment({ name: 'standalone', initializer: 'true' });
        }

        // Add imports array if not present
        if (!obj.getProperty('imports')) {
          // Resolve what this component needs to import
          const neededImports = resolveComponentImports(cls);
          if (neededImports.length > 0) {
            obj.addPropertyAssignment({
              name: 'imports',
              initializer: `[${neededImports.join(', ')}]`
            });
          }
        }
      }

      transformsApplied++;
      filesChanged++;

      if (dryRun) {
        console.log(`  [DRY RUN] Would convert ${name} to standalone with imports`);
      }
    }
  }
}

// ── Transform: inject() ──
function transformInject() {
  const sourceFiles = getTargetFiles();

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      const ctor = cls.getConstructors()[0];
      if (!ctor || ctor.getParameters().length === 0) continue;

      const name = cls.getName() || 'Unknown';
      const params = ctor.getParameters();

      console.log(`Converting ${name} constructor to inject()...`);

      // For each constructor param, create a class property with inject()
      for (const param of params) {
        const paramName = param.getName();
        const paramType = param.getType().getText();
        const shortType = paramType.split('.').pop() || paramType;
        const isReadonly = param.isReadonly();
        const scope = param.getScope();

        // Add property: private readonly x = inject(Type)
        cls.insertProperty(0, {
          name: paramName,
          scope: scope || 'private',
          isReadonly: true,
          initializer: `inject(${shortType})`,
        });

        transformsApplied++;
      }

      // Ensure inject is imported
      ensureImport(sf, 'inject', '@angular/core');

      // Remove constructor params (but keep constructor body if it has logic)
      const ctorBody = ctor.getBody()?.getStatements() || [];
      const hasLogic = ctorBody.some(s => !s.getText().trim().startsWith('//'));

      if (!hasLogic || ctorBody.length === 0) {
        ctor.remove(); // Remove empty constructor entirely
      } else {
        // Remove params but keep body
        for (const param of [...params].reverse()) {
          param.remove();
        }
      }

      filesChanged++;

      if (dryRun) {
        console.log(`  [DRY RUN] Would convert ${params.length} constructor params to inject() calls`);
      }
    }
  }
}

// ── Transform: Signal Inputs/Outputs ──
function transformSignals() {
  const sourceFiles = getTargetFiles();

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      if (!cls.getDecorator('Component') && !cls.getDecorator('Directive')) continue;

      const name = cls.getName() || 'Unknown';
      let changed = false;

      // Convert @Input() to input()
      for (const prop of cls.getProperties()) {
        const inputDec = prop.getDecorator('Input');
        if (!inputDec) continue;

        const propName = prop.getName();
        const propType = prop.getType().getText();
        const shortType = propType.split('.').pop() || propType;
        const isRequired = prop.hasExclamationToken();

        console.log(`  Converting @Input() ${propName} to signal input...`);

        // Replace: @Input() name!: Type → name = input.required<Type>()
        // Replace: @Input() name: Type = default → name = input<Type>(default)
        inputDec.remove();
        const initializer = prop.getInitializer();

        if (isRequired) {
          prop.setInitializer(`input.required<${shortType}>()`);
          prop.setHasExclamationToken(false);
        } else if (initializer) {
          prop.setInitializer(`input<${shortType}>(${initializer.getText()})`);
        } else {
          prop.setInitializer(`input<${shortType}>()`);
        }

        prop.removeType(); // Type is now in the generic
        transformsApplied++;
        changed = true;
      }

      // Convert @Output() to output()
      for (const prop of cls.getProperties()) {
        const outputDec = prop.getDecorator('Output');
        if (!outputDec) continue;

        const propName = prop.getName();
        console.log(`  Converting @Output() ${propName} to output()...`);

        outputDec.remove();
        // @Output() event = new EventEmitter<Type>() → event = output<Type>()
        const init = prop.getInitializer();
        if (init) {
          const typeMatch = init.getText().match(/EventEmitter<(.+?)>/);
          const emitType = typeMatch ? typeMatch[1] : 'void';
          prop.setInitializer(`output<${emitType}>()`);
        }

        transformsApplied++;
        changed = true;
      }

      if (changed) {
        ensureImport(sf, 'input', '@angular/core');
        ensureImport(sf, 'output', '@angular/core');
        filesChanged++;
      }
    }
  }
}

// ── Helper Functions ──

function getTargetFiles() {
  if (specificFile) {
    const sf = project.getSourceFile(specificFile);
    return sf ? [sf] : [];
  }
  return project.getSourceFiles().filter(sf => sf.getFilePath().includes(srcPath));
}

function resolveComponentImports(cls: ClassDeclaration): string[] {
  const sf = cls.getSourceFile();
  const imports = sf.getImportDeclarations()
    .filter(i => {
      const mod = i.getModuleSpecifierValue();
      return mod.startsWith('@angular') || mod.startsWith('primeng') || mod.startsWith('@yourorg');
    })
    .flatMap(i => i.getNamedImports().map(n => n.getName()))
    .filter(name => name.endsWith('Module') || name.endsWith('Component') || name.endsWith('Pipe') || name.endsWith('Directive'));
  return [...new Set(imports)];
}

function ensureImport(sf: any, name: string, moduleSpecifier: string) {
  const existingImport = sf.getImportDeclaration(moduleSpecifier);
  if (existingImport) {
    const namedImports = existingImport.getNamedImports().map((n: any) => n.getName());
    if (!namedImports.includes(name)) {
      existingImport.addNamedImport(name);
    }
  } else {
    sf.addImportDeclaration({ namedImports: [name], moduleSpecifier });
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
