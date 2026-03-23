/**
 * orch update — Pull latest from marketplace
 *
 * Compares installed versions against marketplace, shows diff, applies updates.
 * Pack-aware: updates pack-managed sources, preserves user-added sources.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { loadDocPack, computeChecksum, OrchManifest } from '../core/assembler';
import { detectProject } from '../core/project-detector';
import { banner, section, statusRow, info, warn, divider, success, badge } from '../utils/ui';

interface RegistrySource {
  id: string;
  managed_by?: string;
  [key: string]: any;
}

interface Registry {
  version: number;
  sources: RegistrySource[];
}

export async function updateCommand(options: any): Promise<void> {
  const projectPath = process.cwd();
  const dryRun = options.dryRun || false;

  banner('update');

  // Locate marketplace
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('  No .orch/manifest.json found. Run orch init first.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const marketplacePath = manifest.marketplace;

  if (!marketplacePath || !fs.existsSync(marketplacePath)) {
    console.log('  Marketplace path not found. Run orch init to re-link.');
    return;
  }

  // ── Update doc packs ──
  await section('Doc Packs');
  await updateDocPacks(projectPath, marketplacePath, dryRun);

  // ── Update agents and skills ──
  await section('Agents & Skills');
  await updateAgentsAndSkills(projectPath, marketplacePath, dryRun);

  // ── Recompute checksums ──
  if (!dryRun) {
    const updatedManifest: OrchManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const newChecksums: Record<string, string> = {};
    for (const file of updatedManifest.files) {
      const fullPath = path.join(projectPath, file);
      if (fs.existsSync(fullPath)) {
        newChecksums[file] = computeChecksum(fullPath);
      }
    }
    updatedManifest.checksums = newChecksums;
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2));
  }

  console.log('');
}

async function updateDocPacks(projectPath: string, marketplacePath: string, dryRun: boolean): Promise<void> {
  const registryPath = path.join(projectPath, '.orch/registry.yaml');
  if (!fs.existsSync(registryPath)) {
    info('No .orch/registry.yaml found — skipping pack update');
    return;
  }

  const registryRaw = fs.readFileSync(registryPath, 'utf8');
  let registry: Registry | undefined;
  try {
    registry = yaml.parse(registryRaw) as Registry;
  } catch {
    try {
      registry = JSON.parse(registryRaw);
    } catch {
      warn('Could not parse .orch/registry.yaml — skipping pack update');
      return;
    }
  }

  if (!registry || !Array.isArray(registry.sources)) {
    warn('.orch/registry.yaml has no sources array — skipping');
    return;
  }

  // Find which packs are in use
  const packDomains = new Set<string>();
  for (const source of registry.sources) {
    if (source.managed_by && source.managed_by.startsWith('pack:')) {
      packDomains.add(source.managed_by.replace('pack:', ''));
    }
  }

  if (packDomains.size === 0) {
    info('No pack-managed sources found in registry');
    return;
  }

  // Detect version from project's package.json (authoritative source)
  let projectVersion = '19';
  try {
    const project = detectProject(projectPath);
    const angularVer = project.versions['@angular/core']?.match(/(\d+)/)?.[1];
    if (angularVer) projectVersion = angularVer;
  } catch {
    // Fall back to registry-derived version below
  }

  let added = 0;
  let updated = 0;
  let deprecated = 0;
  const userSources = registry.sources.filter(
    s => !s.managed_by || s.managed_by === 'user'
  );

  for (const domain of packDomains) {
    // Use project-detected version, fall back to registry-derived version
    let version = projectVersion;
    if (domain !== 'angular') {
      // For non-angular packs, derive version from existing sources
      const packSources = registry.sources.filter(s => s.managed_by === `pack:${domain}`);
      for (const s of packSources) {
        if (s.version) {
          const match = s.version.match(/^(\d+)/);
          if (match) { version = match[1]; break; }
        }
      }
    }

    const packSources = registry.sources.filter(s => s.managed_by === `pack:${domain}`);
    const freshSources = loadDocPack(marketplacePath, domain, version);
    if (freshSources.length === 0) {
      warn(`Pack "${domain}" not found in marketplace — skipping`);
      continue;
    }

    const freshById = new Map(freshSources.map(s => [s.id, s]));
    const existingById = new Map(packSources.map(s => [s.id, s]));

    // Update existing pack sources
    for (const [id, fresh] of freshById) {
      if (existingById.has(id)) {
        const existing = existingById.get(id)!;
        // Check if source changed (compare origin, output, name)
        if (existing.origin !== fresh.origin || existing.output !== fresh.output || existing.name !== fresh.name) {
          updated++;
          if (!dryRun) {
            const idx = registry.sources.findIndex(s => s.id === id);
            if (idx !== -1) {
              // Preserve last_refreshed and status if source was already converted
              fresh.last_refreshed = existing.last_refreshed;
              fresh.status = existing.status;
              registry.sources[idx] = fresh;
            }
          }
          statusRow(id, 'info', 'updated');
        }
      } else {
        // New source from pack
        added++;
        if (!dryRun) {
          registry.sources.push(fresh);
        }
        statusRow(id, 'ok', 'added');
      }
    }

    // Check for deprecated (in registry but removed from pack)
    for (const [id] of existingById) {
      if (!freshById.has(id)) {
        deprecated++;
        warn(`${id} — removed from pack, consider removing`);
      }
    }
  }

  // Ensure user sources are untouched
  const finalUserSources = registry.sources.filter(
    s => !s.managed_by || s.managed_by === 'user'
  );
  if (finalUserSources.length !== userSources.length) {
    warn('User sources were unexpectedly modified');
  }

  if (added === 0 && updated === 0 && deprecated === 0) {
    success('All pack sources are up to date');
  } else {
    console.log('');
    divider();
    if (added > 0) badge('new sources', added, 'green');
    if (updated > 0) badge('updated sources', updated, 'cyan');
    if (deprecated > 0) badge('deprecated sources', deprecated, 'yellow');

    if (dryRun) {
      console.log('');
      info('Dry run — no changes written');
    } else {
      const header = '# ORCH Documentation Registry\n# Generated by: orch init\n# Manage with: @docs /packs status\n# Core-pack sources are maintained centrally. Run \'orch update\' for latest.\n\n';
      fs.writeFileSync(registryPath, header + yaml.stringify(
        { version: registry.version, sources: registry.sources },
        { lineWidth: 0 }
      ));
      console.log('');
      success('.orch/registry.yaml updated');
    }
  }
}

async function updateAgentsAndSkills(projectPath: string, marketplacePath: string, dryRun: boolean): Promise<void> {
  info('Comparing installed files against marketplace...');

  const agentsDir = path.join(projectPath, '.github', 'agents');
  const mpAgentsDir = path.join(marketplacePath, '.github', 'agents');
  let agentUpdates = 0;

  if (fs.existsSync(agentsDir) && fs.existsSync(mpAgentsDir)) {
    for (const file of fs.readdirSync(agentsDir)) {
      if (!file.endsWith('.agent.md')) continue;
      const installed = path.join(agentsDir, file);
      const latest = path.join(mpAgentsDir, file);
      if (!fs.existsSync(latest)) continue;

      const installedContent = fs.readFileSync(installed, 'utf8');
      const latestContent = fs.readFileSync(latest, 'utf8');

      if (installedContent !== latestContent) {
        agentUpdates++;
        if (dryRun) {
          statusRow(file, 'info', 'update available');
        } else {
          const backupPath = installed + '.orch-backup';
          fs.copyFileSync(installed, backupPath);
          fs.copyFileSync(latest, installed);
          statusRow(file, 'ok', 'updated (backup saved)');
        }
      }
    }
  }

  const skillsDir = path.join(projectPath, '.github', 'skills');
  const mpSkillsDir = path.join(marketplacePath, '.github', 'skills');
  let skillUpdates = 0;

  if (fs.existsSync(skillsDir) && fs.existsSync(mpSkillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const installedSkill = path.join(skillsDir, skill, 'SKILL.md');
      const latestSkill = path.join(mpSkillsDir, skill, 'SKILL.md');
      if (!fs.existsSync(installedSkill) || !fs.existsSync(latestSkill)) continue;

      const installedContent = fs.readFileSync(installedSkill, 'utf8');
      const latestContent = fs.readFileSync(latestSkill, 'utf8');

      if (installedContent !== latestContent) {
        skillUpdates++;
        if (dryRun) {
          statusRow(`/${skill}`, 'info', 'update available');
        } else {
          const backupPath = installedSkill + '.orch-backup';
          fs.copyFileSync(installedSkill, backupPath);
          fs.copyFileSync(latestSkill, installedSkill);
          statusRow(`/${skill}`, 'ok', 'updated (backup saved)');
        }
      }
    }
  }

  if (agentUpdates === 0 && skillUpdates === 0) {
    success('All agents and skills are up to date');
  } else {
    console.log('');
    divider();
    if (agentUpdates > 0) badge('agent updates', agentUpdates, 'cyan');
    if (skillUpdates > 0) badge('skill updates', skillUpdates, 'cyan');
    if (dryRun) {
      console.log('');
      info('Dry run — no changes written');
    }
  }
}
