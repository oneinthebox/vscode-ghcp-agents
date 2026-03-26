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
  registrySources: any[];   // sources to add to .orch/registry.yaml
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

  // Shared agents — always installed, every project needs these
  // @orch: master orchestrator + workflow coordination
  plan.agents.push('orch.agent.md', 'orch-preflight.agent.md');
  plan.skills.push('present-report', 'present-deck', 'present-dashboard');

  // @docs: reference supply chain
  plan.agents.push('docs.agent.md', 'doc-convert-worker.agent.md');
  plan.skills.push('docs-fetch', 'docs-status', 'docs-refresh', 'docs-drift');

  // @audit: observability
  plan.agents.push('audit.agent.md');
  plan.skills.push('audit-usage', 'audit-tokens', 'audit-compliance', 'audit-drift', 'audit-benchmark', 'audit-context');

  // @local: environment setup + mock pipeline
  plan.agents.push('local.agent.md');
  plan.skills.push(
    'local-setup-env', 'local-setup-docker', 'local-setup-deps', 'local-diagnose',
    'local-mock-capture', 'local-mock-generate', 'local-mock-server', 'local-create-workspace',
  );

  // Instructions
  plan.instructions.push(
    'auto-mode.instructions.md'
  );

  for (const domain of domains) {
    switch (domain) {
      case 'angular':
        plan.agents.push(
          'angular.agent.md', 'angular-planner.agent.md',
          'angular-engineer.agent.md', 'angular-verifier.agent.md',
          'migrate-worker.agent.md'
        );
        plan.skills.push(
          'angular-scan-deps', 'angular-scan-arch', 'angular-scan-quality',
          'angular-scan-tests', 'angular-scan-deploy', 'angular-scan-git',
          'angular-scan-docs', 'angular-scan-features', 'angular-explain',
          'angular-compatibility',
          'angular-generate-component', 'angular-generate-service', 'angular-generate-route',
          'angular-migrate-standalone', 'angular-migrate-signals', 'angular-migrate-control-flow',
          'angular-migrate-jest', 'angular-migrate-playwright', 'angular-migrate-version',
          'angular-refactor', 'angular-docs-generate', 'angular-docs-repair',
          'angular-test-unit', 'angular-test-e2e', 'angular-test-lint',
          'angular-review', 'angular-docs-audit',
          'angular-hds-audit', 'angular-hds-apply', 'angular-hds-generate',
          'angular-elevate-audit', 'angular-elevate-apply', 'angular-elevate-generate',
          'angular-docs-comment', 'angular-docs-readme', 'angular-docs-changelog', 'angular-docs-api',
          'angular-mock-wire', 'angular-create-app',
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
        // Future — skills will be domain-prefixed (springboot-generate-endpoint, etc.)
        // Placeholder: no skills to copy until Spring Boot domain is built
        plan.agents.push('springboot.agent.md');
        break;

      case 'fastapi':
        // Future — skills will be domain-prefixed (fastapi-generate-route, etc.)
        // Placeholder: no skills to copy until FastAPI domain is built
        plan.agents.push('fastapi.agent.md');
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
    '.github/hooks',
    '.orch/config', '.orch/runs',
    '.orch/audit/metrics', '.orch/audit/tokens',
    '.orch/plans',
    '.orch/references',
    '.orch/scripts/audit',
    '.orch/workflow',
    '.orch/workflows',
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
    const src = path.join(mp, '.orch', 'scripts', 'audit', script);
    const relativeDest = path.join('.orch', 'scripts', 'audit', script);
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

  // Copy hook scripts (.orch/scripts/hooks/)
  const hookScriptsDir = path.join(mp, '.orch', 'scripts', 'hooks');
  if (fs.existsSync(hookScriptsDir)) {
    const hookScripts = fs.readdirSync(hookScriptsDir).filter(f => f.endsWith('.sh') || f.endsWith('.js'));
    for (const script of hookScripts) {
      const src = path.join(hookScriptsDir, script);
      const relativeDest = path.join('.orch', 'scripts', 'hooks', script);
      const dest = path.join(target, relativeDest);
      fs.mkdirSync(path.join(target, '.orch', 'scripts', 'hooks'), { recursive: true });
      const result = safeCopy(src, dest);
      if (result === 'copied') {
        copied++;
        manifest.files.push(relativeDest);
        fs.chmodSync(dest, 0o755);
        manifest.checksums[relativeDest] = computeChecksum(dest);
      }
    }
  }

  // Copy relay scripts (.orch/scripts/relay/)
  const relayScriptsDir = path.join(mp, '.orch', 'scripts', 'relay');
  if (fs.existsSync(relayScriptsDir)) {
    const relayScripts = fs.readdirSync(relayScriptsDir).filter(f => f.endsWith('.js'));
    for (const script of relayScripts) {
      const src = path.join(relayScriptsDir, script);
      const relativeDest = path.join('.orch', 'scripts', 'relay', script);
      const dest = path.join(target, relativeDest);
      fs.mkdirSync(path.join(target, '.orch', 'scripts', 'relay'), { recursive: true });
      const result = safeCopy(src, dest);
      if (result === 'copied') {
        copied++;
        manifest.files.push(relativeDest);
        fs.chmodSync(dest, 0o755);
        manifest.checksums[relativeDest] = computeChecksum(dest);
      }
    }
  }

  // Copy shared lib scripts (.orch/scripts/lib/)
  const libScriptsDir = path.join(mp, '.orch', 'scripts', 'lib');
  if (fs.existsSync(libScriptsDir)) {
    const libScripts = fs.readdirSync(libScriptsDir).filter(f => f.endsWith('.js'));
    for (const script of libScripts) {
      const src = path.join(libScriptsDir, script);
      const relativeDest = path.join('.orch', 'scripts', 'lib', script);
      const dest = path.join(target, relativeDest);
      fs.mkdirSync(path.join(target, '.orch', 'scripts', 'lib'), { recursive: true });
      const result = safeCopy(src, dest);
      if (result === 'copied') {
        copied++;
        manifest.files.push(relativeDest);
        manifest.checksums[relativeDest] = computeChecksum(dest);
      }
    }
  }

  // Copy detection scripts (.orch/scripts/detect-*.js)
  const orchScriptsDir = path.join(mp, '.orch', 'scripts');
  if (fs.existsSync(orchScriptsDir)) {
    const detectScripts = fs.readdirSync(orchScriptsDir).filter(f => f.startsWith('detect-') && f.endsWith('.js'));
    for (const script of detectScripts) {
      const src = path.join(orchScriptsDir, script);
      const relativeDest = path.join('.orch', 'scripts', script);
      const dest = path.join(target, relativeDest);
      const result = safeCopy(src, dest);
      if (result === 'copied') {
        copied++;
        manifest.files.push(relativeDest);
        fs.chmodSync(dest, 0o755);
        manifest.checksums[relativeDest] = computeChecksum(dest);
      }
    }
  }

  // Copy .orch/hooks/ (check-stack.js, resolve-references.js)
  const orchHooksDir = path.join(mp, '.orch', 'hooks');
  if (fs.existsSync(orchHooksDir)) {
    const orchHooks = fs.readdirSync(orchHooksDir).filter(f => f.endsWith('.js'));
    for (const hook of orchHooks) {
      const src = path.join(orchHooksDir, hook);
      const relativeDest = path.join('.orch', 'hooks', hook);
      const dest = path.join(target, relativeDest);
      fs.mkdirSync(path.join(target, '.orch', 'hooks'), { recursive: true });
      const result = safeCopy(src, dest);
      if (result === 'copied') {
        copied++;
        manifest.files.push(relativeDest);
        manifest.checksums[relativeDest] = computeChecksum(dest);
      }
    }
  }

  // Copy semantic adapters
  for (const adapter of plan.semanticAdapters) {
    const src = path.join(mp, '.orch', 'scripts', 'semantic', 'adapters', adapter);
    const relativeDir = path.join('.orch', 'scripts', 'semantic', 'adapters', adapter);
    const dest = path.join(target, relativeDir);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(target, '.orch', 'scripts', 'semantic', 'adapters'), { recursive: true });
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
  const adapterRegSrc = path.join(mp, '.orch', 'scripts', 'semantic', 'adapters', 'registry.yaml');
  if (fs.existsSync(adapterRegSrc)) {
    const relDest = path.join('.orch', 'scripts', 'semantic', 'adapters', 'registry.yaml');
    const result = safeCopy(adapterRegSrc, path.join(target, relDest));
    if (result === 'copied') {
      manifest.files.push(relDest);
      manifest.checksums[relDest] = computeChecksum(path.join(target, relDest));
    }
  }

  // Copy audit config (boundaries + adherence rules)
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

  // Copy .orch/config.yaml from marketplace
  const orchConfigSrc = path.join(mp, '.orch', 'config.yaml');
  if (fs.existsSync(orchConfigSrc)) {
    const orchConfigRelDest = path.join('.orch', 'config.yaml');
    const orchConfigDest = path.join(target, orchConfigRelDest);
    const orchConfigResult = safeCopy(orchConfigSrc, orchConfigDest);
    if (orchConfigResult === 'copied') {
      copied++;
      manifest.files.push(orchConfigRelDest);
      manifest.checksums[orchConfigRelDest] = computeChecksum(orchConfigDest);
    } else if (orchConfigResult === 'skipped') {
      skipped++;
      manifest.checksums[orchConfigRelDest] = computeChecksum(orchConfigDest);
    }
  }

  // Copy workflow definitions from marketplace
  const workflowsSrc = path.join(mp, '.orch', 'workflows');
  if (fs.existsSync(workflowsSrc)) {
    const workflowsRelDir = path.join('.orch', 'workflows');
    const workflowsDest = path.join(target, workflowsRelDir);
    const wfFiles = safeCopyDir(workflowsSrc, workflowsDest, workflowsRelDir);
    for (const f of wfFiles) {
      manifest.files.push(f);
      manifest.checksums[f] = computeChecksum(path.join(target, f));
    }
    copied++;
  }

  // Copy .github/copilot-instructions.md from marketplace
  const copilotInstrSrc = path.join(mp, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotInstrSrc)) {
    const copilotInstrRelDest = path.join('.github', 'copilot-instructions.md');
    const copilotInstrDest = path.join(target, copilotInstrRelDest);
    const copilotInstrResult = safeCopy(copilotInstrSrc, copilotInstrDest);
    if (copilotInstrResult === 'copied') {
      copied++;
      manifest.files.push(copilotInstrRelDest);
      manifest.checksums[copilotInstrRelDest] = computeChecksum(copilotInstrDest);
    } else if (copilotInstrResult === 'skipped') {
      skipped++;
      manifest.checksums[copilotInstrRelDest] = computeChecksum(copilotInstrDest);
    }
  }

  // Copy .orch/package.json (isolated dependencies)
  const orchPkgSrc = path.join(mp, '.orch', 'package.json');
  if (fs.existsSync(orchPkgSrc)) {
    const orchPkgRelDest = path.join('.orch', 'package.json');
    const orchPkgDest = path.join(target, orchPkgRelDest);
    const orchPkgResult = safeCopy(orchPkgSrc, orchPkgDest);
    if (orchPkgResult === 'copied') { copied++; manifest.files.push(orchPkgRelDest); }
  }

  // Copy .orch/templates/ (report templates)
  const templatesSrc = path.join(mp, '.orch', 'templates');
  if (fs.existsSync(templatesSrc)) {
    const templatesRelDir = path.join('.orch', 'templates');
    const templatesDest = path.join(target, templatesRelDir);
    const tFiles = safeCopyDir(templatesSrc, templatesDest, templatesRelDir);
    for (const f of tFiles) { manifest.files.push(f); }
    copied += tFiles.length;
  }

  // Copy .vscode/settings.json (recommended Copilot settings)
  const vsSettingsSrc = path.join(mp, '.vscode', 'settings.json');
  if (fs.existsSync(vsSettingsSrc)) {
    const vsSettingsRelDest = path.join('.vscode', 'settings.json');
    const vsSettingsDest = path.join(target, vsSettingsRelDest);
    fs.mkdirSync(path.join(target, '.vscode'), { recursive: true });
    const vsResult = safeCopy(vsSettingsSrc, vsSettingsDest);
    if (vsResult === 'copied') { copied++; manifest.files.push(vsSettingsRelDest); }
  }

  // Copy .orch/references/angular/resolver.yaml (version-aware resolution)
  const resolverSrc = path.join(mp, '.orch', 'references', 'angular', 'resolver.yaml');
  if (fs.existsSync(resolverSrc)) {
    const resolverRelDest = path.join('.orch', 'references', 'angular', 'resolver.yaml');
    const resolverDest = path.join(target, resolverRelDest);
    fs.mkdirSync(path.dirname(resolverDest), { recursive: true });
    const resolverResult = safeCopy(resolverSrc, resolverDest);
    if (resolverResult === 'copied') { copied++; manifest.files.push(resolverRelDest); }
  }

  // Copy pre-converted reference docs from marketplace
  const refscopied = copyReferenceDocs(mp, target, plan.registrySources, manifest);
  copied += refscopied;

  // Write .orch/registry.yaml — set status: current for sources with .md files
  const registryRelPath = path.join('.orch', 'registry.yaml');
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
      `# ORCH Documentation Registry\n# Generated by: orch init\n# Manage with: @docs /docs-status\n# Core-pack sources are maintained centrally. Run 'orch update' for latest.\n\n` +
      yaml.stringify(registryContent, { lineWidth: 0 })
    );
    manifest.files.push(registryRelPath);
    manifest.checksums[registryRelPath] = computeChecksum(registryDest);
    copied++;
  } else if (fs.existsSync(registryDest)) {
    skipped++;
  }

  // Create standard directories (gitkeep files)
  const standardDirs = ['.orch/runs', '.orch/reports', '.orch/workflow-state', '.orch/cache'];
  for (const dir of standardDirs) {
    const dirPath = path.join(target, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    const gitkeep = path.join(dirPath, '.gitkeep');
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, '');
    }
  }

  // Install ORCH runtime dependencies (ts-morph, json-server, ws)
  const orchPkgJson = path.join(target, '.orch', 'package.json');
  if (fs.existsSync(orchPkgJson)) {
    try {
      const { execSync } = require('child_process');
      console.log('Installing ORCH runtime dependencies...');
      execSync('npm install --prefix .orch/', { cwd: target, stdio: 'inherit', timeout: 120000 });
      console.log('✔ ORCH dependencies installed');
    } catch (err: any) {
      console.warn('⚠ Failed to install ORCH dependencies. Run manually: cd .orch && npm install');
      console.warn('  Error:', err.message?.split('\n')[0] || 'unknown');
    }
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
  const refsDir = path.join(mp, '.orch', 'references');
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
        const refRelPath = path.join('.orch', 'references', relPath);
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

