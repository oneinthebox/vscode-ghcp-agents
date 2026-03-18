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
): { copied: number; skipped: number; errors: string[] } {
  const mp = path.resolve(marketplacePath);
  const target = path.resolve(targetPath);
  let copied = 0;
  let skipped = 0;
  const errors: string[] = [];
  const manifest: { files: string[]; directories: string[]; installedAt: string; marketplace: string } = {
    files: [],
    directories: [],
    installedAt: new Date().toISOString(),
    marketplace: mp,
  };

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
    manifest.directories.push(dir);
  }

  // Copy agents
  for (const agent of plan.agents) {
    const src = path.join(mp, '.github', 'agents', agent);
    const relativeDest = path.join('.github', 'agents', agent);
    const dest = path.join(target, relativeDest);
    const result = safeCopy(src, dest);
    if (result === 'copied') { copied++; manifest.files.push(relativeDest); }
    else if (result === 'skipped') skipped++;
    else errors.push(`Agent not found: ${agent}`);
  }

  // Copy skills (full directories)
  for (const skill of plan.skills) {
    const src = path.join(mp, '.github', 'skills', skill);
    const relativeDir = path.join('.github', 'skills', skill);
    const dest = path.join(target, relativeDir);
    if (fs.existsSync(src)) {
      const files = safeCopyDir(src, dest, relativeDir);
      manifest.files.push(...files);
      manifest.directories.push(relativeDir);
      copied++;
    } else {
      errors.push(`Skill not found: ${skill}`);
    }
  }

  // Copy instructions
  for (const instr of plan.instructions) {
    const src = path.join(mp, '.github', 'instructions', instr);
    const relativeDest = path.join('.github', 'instructions', instr);
    const dest = path.join(target, relativeDest);
    const result = safeCopy(src, dest);
    if (result === 'copied') { copied++; manifest.files.push(relativeDest); }
    else if (result === 'skipped') skipped++;
    else errors.push(`Instruction not found: ${instr}`);
  }

  // Copy hooks
  for (const hook of plan.hooks) {
    const src = path.join(mp, '.github', 'hooks', hook);
    const relativeDest = path.join('.github', 'hooks', hook);
    const dest = path.join(target, relativeDest);
    const result = safeCopy(src, dest);
    if (result === 'copied') { copied++; manifest.files.push(relativeDest); }
    else if (result === 'skipped') skipped++;
  }

  // Copy audit scripts
  for (const script of plan.auditScripts) {
    const src = path.join(mp, 'scripts', 'audit', script);
    const relativeDest = path.join('scripts', 'audit', script);
    const dest = path.join(target, relativeDest);
    const result = safeCopy(src, dest);
    if (result === 'copied') {
      copied++;
      manifest.files.push(relativeDest);
      fs.chmodSync(dest, 0o755);
    } else if (result === 'skipped') skipped++;
  }

  // Copy semantic adapters
  for (const adapter of plan.semanticAdapters) {
    const src = path.join(mp, 'scripts', 'semantic', 'adapters', adapter);
    const relativeDir = path.join('scripts', 'semantic', 'adapters', adapter);
    const dest = path.join(target, relativeDir);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(target, 'scripts', 'semantic', 'adapters'), { recursive: true });
      const files = safeCopyDir(src, dest, relativeDir);
      manifest.files.push(...files);
      manifest.directories.push(relativeDir);
      copied++;
    }
  }

  // Copy adapter registry
  const adapterRegSrc = path.join(mp, 'scripts', 'semantic', 'adapters', 'registry.yaml');
  if (fs.existsSync(adapterRegSrc)) {
    const relDest = path.join('scripts', 'semantic', 'adapters', 'registry.yaml');
    const result = safeCopy(adapterRegSrc, path.join(target, relDest));
    if (result === 'copied') { manifest.files.push(relDest); }
  }

  // Copy audit config
  const configSrc = path.join(mp, '.orch', 'audit', 'config');
  const configRelDir = path.join('.orch', 'audit', 'config');
  const configDest = path.join(target, configRelDir);
  if (fs.existsSync(configSrc)) {
    const files = safeCopyDir(configSrc, configDest, configRelDir);
    manifest.files.push(...files);
    copied++;
  }

  // Copy skill-overrides README
  const overridesSrc = path.join(mp, '.github', 'skill-overrides', 'README.md');
  const overridesRelDest = path.join('.github', 'skill-overrides', 'README.md');
  const overridesResult = safeCopy(overridesSrc, path.join(target, overridesRelDest));
  if (overridesResult === 'copied') manifest.files.push(overridesRelDest);

  // Write docs-registry.yaml
  const registryRelPath = 'docs-registry.yaml';
  const registryDest = path.join(target, registryRelPath);
  if (plan.registrySources.length > 0 && !fs.existsSync(registryDest)) {
    const registryContent = {
      version: 1,
      sources: plan.registrySources,
    };
    fs.writeFileSync(
      registryDest,
      `# ORCH Documentation Registry\n# Generated by: orch init\n# Manage with: @docs /packs\n\n` +
      JSON.stringify(registryContent, null, 2)
    );
    manifest.files.push(registryRelPath);
    copied++;
  } else if (fs.existsSync(registryDest)) {
    skipped++;
  }

  // Write manifest (always overwrite — it's ORCH's own file)
  const manifestPath = path.join(target, '.orch', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { copied, skipped, errors };
}

// ── Helpers ──

/**
 * Copy a file safely — skip if destination exists and is different (user may have customized)
 * Returns: 'copied' | 'skipped' | 'not-found'
 */
function safeCopy(src: string, dest: string): 'copied' | 'skipped' | 'not-found' {
  if (!fs.existsSync(src)) return 'not-found';
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest)) {
    // File exists — check if it's the same content
    const srcContent = fs.readFileSync(src);
    const destContent = fs.readFileSync(dest);
    if (srcContent.equals(destContent)) {
      return 'skipped'; // Same content, no action needed
    }
    // Different content — back up existing, then overwrite
    const backupPath = dest + '.orch-backup';
    fs.copyFileSync(dest, backupPath);
  }

  fs.copyFileSync(src, dest);
  return 'copied';
}

/**
 * Copy a directory safely, returns list of relative file paths copied
 */
function safeCopyDir(src: string, dest: string, relativeBase: string): string[] {
  const files: string[] = [];
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.join(relativeBase, entry.name);
    if (entry.isDirectory()) {
      files.push(...safeCopyDir(srcPath, destPath, relativePath));
    } else {
      const result = safeCopy(srcPath, destPath);
      if (result === 'copied' || result === 'skipped') {
        files.push(relativePath);
      }
    }
  }
  return files;
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
