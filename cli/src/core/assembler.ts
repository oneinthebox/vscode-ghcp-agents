/**
 * ORCH CLI — Assembler
 *
 * Reads from marketplace/, customizes based on project detection,
 * and writes a tailored ORCH setup to the target project.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
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

export interface DocPackManifest {
  pack: string;
  description: string;
  sources: any[];
}

export interface OrchManifest {
  files: string[];
  directories: string[];
  checksums: Record<string, string>;
  installedAt: string;
  marketplace: string;
}

/**
 * Compute SHA-256 hash of a file
 */
export function computeChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verify integrity of installed files against manifest checksums.
 * Returns { matched, modified, missing } arrays of relative file paths.
 */
export function verifyIntegrity(
  projectPath: string,
  manifest: OrchManifest
): { matched: string[]; modified: string[]; missing: string[] } {
  const matched: string[] = [];
  const modified: string[] = [];
  const missing: string[] = [];

  for (const [relPath, expectedHash] of Object.entries(manifest.checksums)) {
    const fullPath = path.join(projectPath, relPath);
    if (!fs.existsSync(fullPath)) {
      missing.push(relPath);
    } else {
      const actualHash = computeChecksum(fullPath);
      if (actualHash === expectedHash) {
        matched.push(relPath);
      } else {
        modified.push(relPath);
      }
    }
  }

  return { matched, modified, missing };
}

/**
 * Load a doc pack from marketplace/doc-packs/{domain}.yaml,
 * replace {version} placeholders, and tag each source with managed_by.
 */
export function loadDocPack(
  marketplacePath: string,
  domain: string,
  version: string
): any[] {
  const packPath = path.join(path.resolve(marketplacePath), 'doc-packs', `${domain}.yaml`);
  if (!fs.existsSync(packPath)) {
    return [];
  }

  const raw = fs.readFileSync(packPath, 'utf8');
  const pack = yaml.parse(raw) as DocPackManifest;

  if (!pack || !Array.isArray(pack.sources)) {
    return [];
  }

  const seen = new Set<string>();
  const results: any[] = [];
  for (const source of pack.sources) {
    // Deep-clone and replace {version} placeholders in string fields
    const templated = JSON.parse(
      JSON.stringify(source).replace(/\{version\}/g, version)
    );
    templated.managed_by = `pack:${domain}`;
    // Deduplicate by id (e.g., templated v17 entry colliding with static v17 entry)
    if (!seen.has(templated.id)) {
      seen.add(templated.id);
      results.push(templated);
    }
  }
  return results;
}

/**
 * List all available doc packs from marketplace/doc-packs/
 */
export function listDocPacks(marketplacePath: string): DocPackManifest[] {
  const packsDir = path.join(path.resolve(marketplacePath), 'doc-packs');
  if (!fs.existsSync(packsDir)) {
    return [];
  }

  const packs: DocPackManifest[] = [];
  for (const file of fs.readdirSync(packsDir)) {
    if (!file.endsWith('.yaml')) continue;
    try {
      const raw = fs.readFileSync(path.join(packsDir, file), 'utf8');
      const pack = yaml.parse(raw) as DocPackManifest;
      if (pack && pack.pack && Array.isArray(pack.sources)) {
        packs.push(pack);
      }
    } catch {
      // Skip malformed pack files
    }
  }
  return packs;
}

/**
 * Create an assembly plan based on detected project and requested domains
 */
export function createAssemblyPlan(
  project: ProjectInfo,
  marketplace: MarketplaceContents,
  domains: string[],
  marketplacePath?: string
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

  // Audit hooks + scripts + config are always included (via plan.hooks and plan.auditScripts above)
  // But @audit AGENT is opt-in — install via: orch install @audit

  // Always include docs agent — every project needs scan, explain, drift, packs
  plan.agents.push('docs.agent.md', 'scan-worker.agent.md', 'doc-convert-worker.agent.md');
  plan.skills.push('packs', 'proof', 'drift', 'code-comment', 'version-matrix', 'explain');
  plan.instructions.push(
    'doc-conversion.instructions.md',
    'auto-mode.instructions.md',
    'workflows.instructions.md'
  );

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

        // Load full doc pack instead of 2 hardcoded sources
        if (marketplacePath) {
          const angularVersion = project.versions['@angular/core']?.match(/(\d+)/)?.[1] || '19';
          plan.registrySources.push(
            ...loadDocPack(marketplacePath, 'angular', angularVersion)
          );
        }
        break;

      case 'docs':
        // Already included by default — no additional action needed
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
  const manifest: OrchManifest = {
    files: [],
    directories: [],
    checksums: {},
    installedAt: new Date().toISOString(),
    marketplace: mp,
  };

  // Create target directories (no skill-overrides — dropped)
  const dirs = [
    '.github/agents', '.github/skills', '.github/instructions',
    '.github/hooks', '.github/references',
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
    if (result === 'copied') {
      copied++;
      manifest.files.push(relativeDest);

      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else if (result === 'skipped') {
      skipped++;
      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else {
      errors.push(`Agent not found: ${agent}`);
    }
  }

  // Copy skills (full directories)
  for (const skill of plan.skills) {
    const src = path.join(mp, '.github', 'skills', skill);
    const relativeDir = path.join('.github', 'skills', skill);
    const dest = path.join(target, relativeDir);
    if (fs.existsSync(src)) {
      const files = safeCopyDir(src, dest, relativeDir);
      for (const f of files) {
        manifest.files.push(f);
        const fullPath = path.join(target, f);

        manifest.checksums[f] = computeChecksum(fullPath);
      }
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
    if (result === 'copied') {
      copied++;
      manifest.files.push(relativeDest);

      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else if (result === 'skipped') {
      skipped++;
      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else {
      errors.push(`Instruction not found: ${instr}`);
    }
  }

  // Copy hooks
  for (const hook of plan.hooks) {
    const src = path.join(mp, '.github', 'hooks', hook);
    const relativeDest = path.join('.github', 'hooks', hook);
    const dest = path.join(target, relativeDest);
    const result = safeCopy(src, dest);
    if (result === 'copied') {
      copied++;
      manifest.files.push(relativeDest);

      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else if (result === 'skipped') {
      skipped++;
      manifest.checksums[relativeDest] = computeChecksum(dest);
    }
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
      manifest.checksums[relativeDest] = computeChecksum(dest);
    } else if (result === 'skipped') {
      skipped++;
      manifest.checksums[relativeDest] = computeChecksum(dest);
    }
  }

  // Copy semantic adapters
  for (const adapter of plan.semanticAdapters) {
    const src = path.join(mp, 'scripts', 'semantic', 'adapters', adapter);
    const relativeDir = path.join('scripts', 'semantic', 'adapters', adapter);
    const dest = path.join(target, relativeDir);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(target, 'scripts', 'semantic', 'adapters'), { recursive: true });
      const files = safeCopyDir(src, dest, relativeDir);
      for (const f of files) {
        manifest.files.push(f);
        manifest.checksums[f] = computeChecksum(path.join(target, f));
      }
      manifest.directories.push(relativeDir);
      copied++;
    }
  }

  // Copy adapter registry
  const adapterRegSrc = path.join(mp, 'scripts', 'semantic', 'adapters', 'registry.yaml');
  if (fs.existsSync(adapterRegSrc)) {
    const relDest = path.join('scripts', 'semantic', 'adapters', 'registry.yaml');
    const result = safeCopy(adapterRegSrc, path.join(target, relDest));
    if (result === 'copied') {
      manifest.files.push(relDest);
      manifest.checksums[relDest] = computeChecksum(path.join(target, relDest));
    }
  }

  // Copy audit config
  const configSrc = path.join(mp, '.orch', 'audit', 'config');
  const configRelDir = path.join('.orch', 'audit', 'config');
  const configDest = path.join(target, configRelDir);
  if (fs.existsSync(configSrc)) {
    const files = safeCopyDir(configSrc, configDest, configRelDir);
    for (const f of files) {
      manifest.files.push(f);
      manifest.checksums[f] = computeChecksum(path.join(target, f));
    }
    copied++;
  }

  // Copy pre-converted reference docs from marketplace
  const refscopied = copyReferenceDocs(mp, target, plan.registrySources, manifest);
  copied += refscopied;

  // Write docs-registry.yaml — set status: current for sources with .md files
  const registryRelPath = 'docs-registry.yaml';
  const registryDest = path.join(target, registryRelPath);
  if (plan.registrySources.length > 0 && !fs.existsSync(registryDest)) {
    const today = new Date().toISOString().split('T')[0];
    for (const source of plan.registrySources) {
      if (source.output) {
        const mdPath = path.join(target, source.output);
        if (fs.existsSync(mdPath)) {
          source.status = 'current';
          source.last_refreshed = today;
        }
      }
    }
    const registryContent = {
      version: 1,
      sources: plan.registrySources,
    };
    fs.writeFileSync(
      registryDest,
      `# ORCH Documentation Registry\n# Generated by: orch init\n# Manage with: @docs /packs status\n# Core-pack sources are maintained centrally. Run 'orch update' for latest.\n\n` +
      yaml.stringify(registryContent, { lineWidth: 0 })
    );
    manifest.files.push(registryRelPath);
    manifest.checksums[registryRelPath] = computeChecksum(registryDest);
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

/**
 * Copy pre-converted reference docs (.md files) from marketplace to target.
 * Only copies files that match output paths in the assembly plan's registry sources.
 */
function copyReferenceDocs(
  mp: string,
  target: string,
  registrySources: any[],
  manifest: OrchManifest
): number {
  let copied = 0;
  const refsDir = path.join(mp, '.github', 'references');
  if (!fs.existsSync(refsDir)) return 0;

  // Build a set of expected output paths from registry sources
  const expectedOutputs = new Set<string>();
  for (const source of registrySources) {
    if (source.output) {
      expectedOutputs.add(source.output);
    }
  }

  // Walk marketplace references and copy matching files
  const walk = (dir: string, relBase: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const srcPath = path.join(dir, entry.name);
      const relPath = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(srcPath, relPath);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
        const refRelPath = path.join('.github', 'references', relPath);
        // Copy if it matches an expected output or is in the references tree
        if (expectedOutputs.has(refRelPath) || expectedOutputs.size === 0) {
          const dest = path.join(target, refRelPath);
          const result = safeCopy(srcPath, dest);
          if (result === 'copied') {
            copied++;
            manifest.files.push(refRelPath);
      
            manifest.checksums[refRelPath] = computeChecksum(dest);
          }
        }
      }
    }
  };

  walk(refsDir, '');
  return copied;
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

