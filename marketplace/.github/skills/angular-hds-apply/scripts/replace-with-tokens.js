#!/usr/bin/env node
'use strict';

/**
 * HDS Token Replacer
 *
 * Reads HDS violation JSON (from scan-hds-compliance.js) and auto-replaces
 * hardcoded values in SCSS files with the appropriate HDS design tokens.
 *
 * Usage:
 *   node scripts/replace-with-tokens.js <violations.json> [--dry-run]
 *
 * Input: JSON file with { violations: [{ type, value, file, line, context }] }
 * Output (stdout): JSON  { replacements: n, skipped: n, files: [] }
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Argument parsing ───────────────────────────────────────
const args = process.argv.slice(2);
const log = (msg) => process.stderr.write(`[replace-tokens] ${msg}\n`);
const dryRun = args.includes('--dry-run');
const jsonPath = args.find((a) => !a.startsWith('--'));

if (!jsonPath) {
  log('ERROR: Violations JSON file is required.\n  Usage: node replace-with-tokens.js <violations.json> [--dry-run]');
  process.exit(1);
}

// ─── Token mapping tables ────────────────────────────────────

const COLOR_MAP = {
  '#333': 'var(--hds-text-primary)',
  '#333333': 'var(--hds-text-primary)',
  '#212121': 'var(--hds-text-primary)',
  '#666': 'var(--hds-text-secondary)',
  '#666666': 'var(--hds-text-secondary)',
  '#999': 'var(--hds-text-tertiary)',
  '#999999': 'var(--hds-text-tertiary)',
  '#f5f5f5': 'var(--hds-surface-secondary)',
  '#fafafa': 'var(--hds-surface-tertiary)',
  '#e0e0e0': 'var(--hds-border-default)',
  '#d0d0d0': 'var(--hds-border-default)',
  '#ccc': 'var(--hds-border-subtle)',
  '#cccccc': 'var(--hds-border-subtle)',
  '#1976d2': 'var(--hds-interactive-primary)',
  '#2196f3': 'var(--hds-interactive-primary)',
  '#1565c0': 'var(--hds-interactive-primary-hover)',
  '#4caf50': 'var(--hds-feedback-success)',
  '#2e7d32': 'var(--hds-feedback-success)',
  '#f44336': 'var(--hds-feedback-error)',
  '#d32f2f': 'var(--hds-feedback-error)',
  '#ff9800': 'var(--hds-feedback-warning)',
  '#ed6c02': 'var(--hds-feedback-warning)',
  '#0288d1': 'var(--hds-feedback-info)',
  '#fff': 'var(--hds-surface-primary)',
  '#ffffff': 'var(--hds-surface-primary)',
};

const SPACING_MAP = {
  '2px': 'var(--hds-spacing-2xs)',
  '4px': 'var(--hds-spacing-xs)',
  '8px': 'var(--hds-spacing-sm)',
  '12px': 'var(--hds-spacing-sm)',
  '16px': 'var(--hds-spacing-md)',
  '20px': 'var(--hds-spacing-md)',
  '24px': 'var(--hds-spacing-lg)',
  '32px': 'var(--hds-spacing-xl)',
  '40px': 'var(--hds-spacing-xl)',
  '48px': 'var(--hds-spacing-2xl)',
  '64px': 'var(--hds-spacing-3xl)',
};

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Reading violations from: ${jsonPath}`);
  if (dryRun) log('DRY RUN — no files will be modified.');

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    log(`ERROR: Failed to parse violations JSON: ${e.message}`);
    process.exit(1);
  }

  const violations = data.violations || [];
  log(`Loaded ${violations.length} violation(s)`);

  // Group violations by file
  const byFile = new Map();
  for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }

  let replacements = 0;
  let skipped = 0;
  const modifiedFiles = [];

  for (const [relFile, fileViolations] of byFile) {
    const filePath = path.resolve(relFile);
    if (!fs.existsSync(filePath)) {
      log(`WARNING: File not found, skipping: ${relFile}`);
      skipped += fileViolations.length;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileReplacements = 0;

    for (const v of fileViolations) {
      let token = null;

      if (v.type === 'color') {
        token = COLOR_MAP[v.value.toLowerCase()];
      } else if (v.type === 'spacing') {
        token = SPACING_MAP[v.value];
      }

      if (token) {
        // Replace the first occurrence of the raw value on the relevant line
        const lines = content.split('\n');
        const lineIdx = v.line - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          const before = lines[lineIdx];
          lines[lineIdx] = before.replace(v.value, token);
          if (lines[lineIdx] !== before) {
            content = lines.join('\n');
            modified = true;
            fileReplacements++;
            replacements++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        // No mapping available — skip for manual review
        skipped++;
      }
    }

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    if (fileReplacements > 0) {
      modifiedFiles.push({ file: relFile, replacements: fileReplacements });
      log(`${dryRun ? '[DRY] ' : ''}${relFile}: ${fileReplacements} replacement(s)`);
    }
  }

  const result = {
    replacements,
    skipped,
    dryRun,
    files: modifiedFiles,
  };

  log(`Replacements: ${replacements}, Skipped: ${skipped}`);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── Run ─────────────────────────────────────────────────────
main();
