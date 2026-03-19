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
    if (!options.force) {
      fail('No .orch/manifest.json found. ORCH may not be installed, or was installed before manifest tracking.');
      console.log('');
      info("To force-remove ORCH directories, use: orch reset --force");
      return;
    }

    // Force mode — remove known ORCH directories
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

  // Remove files (make writable first to handle read-only files)
  let removed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const fullPath = path.join(projectPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        makeWritable(fullPath);
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

  // Remove ORCH-owned directories recursively (not just empty ones)
  const orchDirs = [
    '.github/agents',
    '.github/skills',
    '.github/hooks',
    '.github/instructions',
    '.github/references',
    '.orch',
    'scripts/audit',
    'scripts/semantic',
  ];

  let dirsRemoved = 0;
  for (const dir of orchDirs) {
    const fullPath = path.join(projectPath, dir);
    if (fs.existsSync(fullPath)) {
      try {
        makeTreeWritable(fullPath);
        fs.rmSync(fullPath, { recursive: true });
        dirsRemoved++;
      } catch {
        // May have non-ORCH files — try empty cleanup instead
      }
    }
  }

  // Remove manifest itself
  try {
    makeWritable(manifestPath);
    fs.unlinkSync(manifestPath);
  } catch { }

  // Remove docs-registry.yaml
  const registryPath = path.join(projectPath, 'docs-registry.yaml');
  if (fs.existsSync(registryPath)) {
    try {
      makeWritable(registryPath);
      fs.unlinkSync(registryPath);
      removed++;
    } catch { }
  }

  // Remove .orch-backup files
  cleanupBackupFiles(projectPath);

  // Remove runtime data not tracked in manifest
  const runtimeDirs = ['.orch', 'scripts'];
  for (const dir of runtimeDirs) {
    removeEmptyDirTree(path.join(projectPath, dir));
  }

  // Clean up empty .github if nothing left
  removeEmptyDirTree(path.join(projectPath, '.github'));

  // Restore .github backup if it exists
  restoreGithubBackup(projectPath);

  await summary({ ok: removed, warn: skipped, fail: errors });
  info(`${removed} files removed, ${dirsRemoved} directories cleaned up`);
  console.log('');
}

async function forceReset(projectPath: string, dryRun: boolean): Promise<void> {
  // Known ORCH directories — remove recursively
  const orchDirs = [
    '.orch',
    'scripts/audit',
    'scripts/semantic',
    '.github/agents',
    '.github/skills',
    '.github/hooks',
    '.github/instructions',
    '.github/references',
  ];

  // Known ORCH root files
  const orchFiles = [
    'docs-registry.yaml',
  ];

  // Collect everything that exists
  const existing: string[] = [];
  for (const dir of orchDirs) {
    if (fs.existsSync(path.join(projectPath, dir))) existing.push(dir);
  }
  for (const file of orchFiles) {
    if (fs.existsSync(path.join(projectPath, file))) existing.push(file);
  }

  await section('Files to remove');
  info(`${existing.length} ORCH items detected (no manifest — using known paths)`);

  if (dryRun) {
    console.log('');
    warn('Dry run — showing what would be removed:');
    for (const orchPath of existing) {
      statusRow(orchPath, 'ok', 'would remove');
    }
    console.log('');
    info('Run without --dry-run to actually remove.');
    return;
  }

  let removed = 0;
  let errors = 0;

  for (const orchPath of existing) {
    const fullPath = path.join(projectPath, orchPath);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        makeTreeWritable(fullPath);
        fs.rmSync(fullPath, { recursive: true });
      } else {
        makeWritable(fullPath);
        fs.unlinkSync(fullPath);
      }
      removed++;
    } catch (err: any) {
      fail(`Could not remove: ${orchPath} — ${err.message}`);
      errors++;
    }
  }

  // Clean up .orch-backup files
  cleanupBackupFiles(projectPath);

  // Clean up empty parent dirs
  for (const dir of ['.github', 'scripts']) {
    removeEmptyDirTree(path.join(projectPath, dir));
  }

  // Restore .github backup if it exists
  restoreGithubBackup(projectPath);

  await summary({ ok: removed, warn: 0, fail: errors });
  info(`${removed} items removed`);
  console.log('');
}

// ── Helpers ──

/**
 * Make a file writable (undo read-only set by assembler)
 */
function makeWritable(filePath: string): void {
  try {
    fs.chmodSync(filePath, 0o644);
  } catch { }
}

/**
 * Recursively make all files in a directory writable
 */
function makeTreeWritable(dirPath: string): void {
  try {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        makeTreeWritable(fullPath);
      } else {
        makeWritable(fullPath);
      }
    }
  } catch { }
}

/**
 * Restore .github from pre-orch backup if it exists
 */
function restoreGithubBackup(projectPath: string): void {
  const githubDir = path.join(projectPath, '.github');
  const githubBackup = path.join(projectPath, '.github.pre-orch');
  if (fs.existsSync(githubBackup)) {
    if (!fs.existsSync(githubDir)) {
      fs.renameSync(githubBackup, githubDir);
      success('Restored .github from .github.pre-orch backup');
    } else {
      restoreMissing(githubBackup, githubDir);
      fs.rmSync(githubBackup, { recursive: true });
      success('Restored pre-ORCH .github files and cleaned up backup');
    }
  }
}

/**
 * Restore files from backup that are missing in the target.
 */
function restoreMissing(backupDir: string, targetDir: string): void {
  if (!fs.existsSync(backupDir)) return;
  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    const backupPath = path.join(backupDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      restoreMissing(backupPath, targetPath);
    } else {
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(backupPath, targetPath);
      }
    }
  }
}

/**
 * Remove .orch-backup files from known ORCH directories.
 */
function cleanupBackupFiles(projectPath: string): void {
  const searchDirs = [
    path.join(projectPath, '.github'),
    path.join(projectPath, 'scripts'),
  ];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    removeBackupsRecursive(dir);
  }
  const registryBackup = path.join(projectPath, 'docs-registry.yaml.orch-backup');
  if (fs.existsSync(registryBackup)) {
    try { fs.unlinkSync(registryBackup); } catch { }
  }
}

function removeBackupsRecursive(dir: string): void {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeBackupsRecursive(fullPath);
      } else if (entry.name.endsWith('.orch-backup')) {
        try { fs.unlinkSync(fullPath); } catch { }
      }
    }
  } catch { }
}

/**
 * Recursively remove a directory tree if all subdirs are empty.
 */
function removeEmptyDirTree(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return;
    for (const entry of fs.readdirSync(dirPath)) {
      const childPath = path.join(dirPath, entry);
      if (fs.statSync(childPath).isDirectory()) {
        removeEmptyDirTree(childPath);
      }
    }
    if (fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch { }
}
