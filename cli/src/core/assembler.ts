/**
 * ORCH CLI — Assembler
 *
 * Reads from marketplace/, customizes based on project detection,
 * and writes a tailored ORCH setup to the target project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectInfo } from './project-detector';
import { MarketplaceContents } from './marketplace';

export interface AssemblyPlan {
  agents: string[];         // agent filenames to copy
  skills: string[];         // skill directory names to copy
  instructions: string[];   // instruction filenames to copy
  hooks: string[];          // hook filenames to copy
  auditScripts: string[];   // audit script filenames to copy
  semanticAdapters: string[]; // adapter directory names to copy
  registrySources: any[];   // sources to add to docs-registry.yaml
  boundaryConfig: any;      // boundaries.yaml content for this project
}

/**
 * Create an assembly plan based on detected project and requested domains
 */
export function createAssemblyPlan(
  project: ProjectInfo,
  marketplace: MarketplaceContents,
  domains: string[]
): AssemblyPlan {
  const plan: AssemblyPlan = {
    agents: [],
    skills: [],
    instructions: [],
    hooks: [...marketplace.hooks], // always include audit hooks
    auditScripts: [...marketplace.auditScripts], // always include audit scripts
    semanticAdapters: [],
    registrySources: [],
    boundaryConfig: {},
  };

  // Always include audit agent
  plan.agents.push('audit.agent.md');
  plan.skills.push('report', 'benchmark', 'context');

  for (const domain of domains) {
    switch (domain) {
      case 'angular':
        plan.agents.push('angular.agent.md', 'migrate-worker.agent.md');
        plan.skills.push(
          'generate', 'migrate', 'test', 'review', 'refactor',
          'hds', 'elevate'
        );
        plan.instructions.push(
          'angular-typescript.instructions.md',
          'internal-component-lib.instructions.md'
        );
        plan.semanticAdapters.push('typescript');

        // Register reference docs based on detected Angular version
        plan.registrySources.push(
          ...getAngularRegistrySources(project.versions['@angular/core'])
        );
        break;

      case 'docs':
        plan.agents.push('docs.agent.md', 'scan-worker.agent.md', 'doc-convert-worker.agent.md');
        plan.skills.push('packs', 'proof', 'drift', 'code-comment', 'version-matrix');
        plan.instructions.push('doc-conversion.instructions.md');
        break;

      case 'springboot':
        // Future
        plan.agents.push('springboot.agent.md');
        plan.skills.push('generate', 'migrate', 'test', 'review', 'refactor');
        break;

      case 'fastapi':
        // Future
        plan.agents.push('fastapi.agent.md');
        plan.skills.push('generate', 'migrate', 'test', 'review', 'refactor');
        break;
    }
  }

  // Deduplicate
  plan.agents = [...new Set(plan.agents)];
  plan.skills = [...new Set(plan.skills)];
  plan.instructions = [...new Set(plan.instructions)];

  return plan;
}

/**
 * Execute the assembly plan — copy files from marketplace to target project
 */
export function executeAssembly(
  plan: AssemblyPlan,
  marketplacePath: string,
  targetPath: string
): { copied: number; errors: string[] } {
  const mp = path.resolve(marketplacePath);
  const target = path.resolve(targetPath);
  let copied = 0;
  const errors: string[] = [];

  // Create target directories
  const dirs = [
    '.github/agents', '.github/skills', '.github/instructions',
    '.github/hooks', '.github/skill-overrides',
    '.orch/audit/config', '.orch/audit/sessions', '.orch/audit/tokens',
    '.orch/audit/metrics/daily', '.orch/audit/metrics/weekly',
    '.orch/plans',
    'scripts/audit',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(target, dir), { recursive: true });
  }

  // Copy agents
  for (const agent of plan.agents) {
    const src = path.join(mp, '.github', 'agents', agent);
    const dest = path.join(target, '.github', 'agents', agent);
    if (copyFile(src, dest)) copied++;
    else errors.push(`Agent not found: ${agent}`);
  }

  // Copy skills (full directories)
  for (const skill of plan.skills) {
    const src = path.join(mp, '.github', 'skills', skill);
    const dest = path.join(target, '.github', 'skills', skill);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
      copied++;
    } else {
      errors.push(`Skill not found: ${skill}`);
    }
  }

  // Copy instructions
  for (const instr of plan.instructions) {
    const src = path.join(mp, '.github', 'instructions', instr);
    const dest = path.join(target, '.github', 'instructions', instr);
    if (copyFile(src, dest)) copied++;
    else errors.push(`Instruction not found: ${instr}`);
  }

  // Copy hooks
  for (const hook of plan.hooks) {
    const src = path.join(mp, '.github', 'hooks', hook);
    const dest = path.join(target, '.github', 'hooks', hook);
    if (copyFile(src, dest)) copied++;
  }

  // Copy audit scripts
  for (const script of plan.auditScripts) {
    const src = path.join(mp, 'scripts', 'audit', script);
    const dest = path.join(target, 'scripts', 'audit', script);
    if (copyFile(src, dest)) {
      copied++;
      // Preserve executable permission
      fs.chmodSync(dest, 0o755);
    }
  }

  // Copy semantic adapters
  for (const adapter of plan.semanticAdapters) {
    const src = path.join(mp, 'scripts', 'semantic', 'adapters', adapter);
    const dest = path.join(target, 'scripts', 'semantic', 'adapters', adapter);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(target, 'scripts', 'semantic', 'adapters'), { recursive: true });
      copyDir(src, dest);
      copied++;
    }
  }

  // Copy audit config
  const configSrc = path.join(mp, '.orch', 'audit', 'config');
  const configDest = path.join(target, '.orch', 'audit', 'config');
  if (fs.existsSync(configSrc)) {
    copyDir(configSrc, configDest);
    copied++;
  }

  // Copy skill-overrides README
  const overridesSrc = path.join(mp, '.github', 'skill-overrides', 'README.md');
  const overridesDest = path.join(target, '.github', 'skill-overrides', 'README.md');
  copyFile(overridesSrc, overridesDest);

  // Write docs-registry.yaml with project-specific sources
  if (plan.registrySources.length > 0) {
    const registryContent = {
      version: 1,
      sources: plan.registrySources,
    };
    fs.writeFileSync(
      path.join(target, 'docs-registry.yaml'),
      `# ORCH Documentation Registry\n# Generated by: orch init\n# Manage with: @docs /packs\n\n` +
      JSON.stringify(registryContent, null, 2) // simplified — should use yaml library
    );
    copied++;
  }

  return { copied, errors };
}

// ── Helpers ──

function copyFile(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getAngularRegistrySources(angularVersion: string | undefined): any[] {
  const version = angularVersion?.match(/(\d+)/)?.[1] || '19';
  const sources: any[] = [];

  // Add sources for the detected Angular version
  sources.push({
    id: `angular-essentials-v${version}`,
    name: `Angular Essentials v${version}`,
    type: 'url',
    origin: 'https://angular.dev/essentials',
    format: 'html',
    output: `.github/references/angular/v${version}/essentials-guide.md`,
    scope: 'frontend-ts-angular',
    version: `${version}.x`,
    last_refreshed: null,
    status: 'draft',
  });

  // Migration guides (always useful)
  sources.push({
    id: 'angular-migrations-overview',
    name: 'Angular Migrations Overview',
    type: 'url',
    origin: 'https://angular.dev/reference/migrations',
    format: 'html',
    output: '.github/references/angular/migrations/overview-guide.md',
    scope: 'frontend-ts-angular',
    last_refreshed: null,
    status: 'draft',
  });

  return sources;
}
