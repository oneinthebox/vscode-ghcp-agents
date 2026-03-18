/**
 * orch reset — Remove all ORCH files from a project
 *
 * Removes only files that ORCH installed. Does not touch user-created files.
 * Uses .orch/manifest.json to know exactly what was installed.
 */

import { banner, section, statusRow, success, fail, warn, info, withSpinner, summary, sleep } from '../utils/ui';
import * as fs from 'fs';
import * as path from 'path';

export async function resetCommand(options: any): Promise<void> {
  const projectPath = process.cwd();
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');

  banner('reset');

  // Check for manifest
  if (!fs.existsSync(manifestPath)) {
    fail('No .orch/manifest.json found. ORCH may not be installed, or was installed before manifest tracking.');
    console.log('');
    info("To force-remove ORCH directories, use: orch reset --force");

    if (!options.force) {
      return;
    }

    // Force mode — remove known ORCH directories
    console.log('');
    warn('Force mode — removing known ORCH directories');
    await forceReset(projectPath, options.dryRun);
    return;
  }

  // Read manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files: string[] = manifest.files || [];
  const dirs: string[] = manifest.directories || [];

  await section('Files to remove');
  info(`${files.length} files tracked in manifest`);

  if (options.dryRun) {
    console.log('');
    warn('Dry run — showing what would be removed:');
    for (const file of files) {
      const exists = fs.existsSync(path.join(projectPath, file));
      statusRow(file, exists ? 'ok' : 'warn', exists ? 'would remove' : 'already gone');
    }
    console.log('');
    info('Run without --dry-run to actually remove.');
    return;
  }

  // Remove files
  let removed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const fullPath = path.join(projectPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        removed++;
      } else {
        skipped++;
      }
    } catch (err: any) {
      fail(`Could not remove: ${file} — ${err.message}`);
      errors++;
    }
  }

  // Remove empty directories (bottom-up)
  const sortedDirs = [...dirs].sort((a, b) => b.length - a.length); // deepest first
  let dirsRemoved = 0;
  for (const dir of sortedDirs) {
    const fullPath = path.join(projectPath, dir);
    try {
      if (fs.existsSync(fullPath)) {
        const contents = fs.readdirSync(fullPath);
        if (contents.length === 0) {
          fs.rmdirSync(fullPath);
          dirsRemoved++;
        }
      }
    } catch {
      // Directory not empty or doesn't exist — skip
    }
  }

  // Remove manifest itself
  try {
    fs.unlinkSync(manifestPath);
    // Try removing .orch if empty
    const orchDir = path.join(projectPath, '.orch');
    if (fs.existsSync(orchDir) && fs.readdirSync(orchDir).length === 0) {
      fs.rmdirSync(orchDir);
    }
  } catch { }

  await summary({ ok: removed, warn: skipped, fail: errors });
  info(`${removed} files removed, ${dirsRemoved} directories cleaned up`);
  console.log('');
}

async function forceReset(projectPath: string, dryRun: boolean): Promise<void> {
  // Known ORCH directories/files
  const orchPaths = [
    '.orch',
    'scripts/audit',
    'scripts/semantic',
    'docs-registry.yaml',
    '.github/agents/angular.agent.md',
    '.github/agents/audit.agent.md',
    '.github/agents/docs.agent.md',
    '.github/agents/showcase.agent.md',
    '.github/agents/orch.agent.md',
    '.github/agents/scan-worker.agent.md',
    '.github/agents/migrate-worker.agent.md',
    '.github/agents/doc-convert-worker.agent.md',
    '.github/hooks/audit-lifecycle.json',
    '.github/hooks/audit-prompts.json',
    '.github/hooks/audit-tools.json',
    '.github/hooks/audit-scope.json',
    '.github/instructions/angular-typescript.instructions.md',
    '.github/instructions/internal-component-lib.instructions.md',
    '.github/instructions/doc-conversion.instructions.md',
    '.github/skill-overrides',
  ];

  // ORCH skill directories (only remove if they have a SKILL.md — confirms it's an ORCH skill)
  const skillsDir = path.join(projectPath, '.github', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const skillPath = path.join(skillsDir, skill);
      if (fs.statSync(skillPath).isDirectory() && fs.existsSync(path.join(skillPath, 'SKILL.md'))) {
        orchPaths.push(`.github/skills/${skill}`);
      }
    }
  }

  let removed = 0;
  for (const orchPath of orchPaths) {
    const fullPath = path.join(projectPath, orchPath);
    if (!fs.existsSync(fullPath)) continue;

    if (dryRun) {
      statusRow(orchPath, 'ok', 'would remove');
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      success(`Removed: ${orchPath}`);
      removed++;
    } catch (err: any) {
      fail(`Could not remove: ${orchPath} — ${err.message}`);
    }
  }

  // Clean up empty parent dirs
  for (const dir of ['.github/agents', '.github/hooks', '.github/instructions', '.github/skills', '.github', 'scripts']) {
    const fullPath = path.join(projectPath, dir);
    try {
      if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length === 0) {
        fs.rmdirSync(fullPath);
      }
    } catch { }
  }

  console.log('');
  if (dryRun) {
    info('Run without --dry-run to actually remove.');
  } else {
    info(`${removed} items removed.`);
  }
}
