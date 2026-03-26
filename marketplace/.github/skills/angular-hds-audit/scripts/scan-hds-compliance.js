#!/usr/bin/env node
'use strict';

/**
 * HDS Compliance Scanner
 *
 * Scans SCSS/CSS files for violations of HDS design-token usage.
 * Detects hardcoded hex colors, raw pixel values, and raw font-family
 * declarations that should use var(--hds-*) tokens instead.
 *
 * Usage: node scripts/scan-hds-compliance.js [project-root]
 *
 * Output (stdout): JSON with violations array and summary.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[scan-hds] ${msg}\n`);

// Patterns that indicate proper token usage (skip these lines)
const TOKEN_USAGE = /var\s*\(--hds-/;
const CALC_USAGE = /calc\s*\(/;

// ─── Detection patterns ─────────────────────────────────────

/** Hex color not wrapped in var() — severity: high */
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3,8})\b/g;

/** Raw pixel value not inside var() or calc() — severity: medium */
const RAW_PX_RE = /(?<!\w)(\d+(?:\.\d+)?px)\b/g;

/** Raw font-family declaration — severity: high */
const RAW_FONT_RE = /font-family\s*:\s*(?!var\s*\()([^;]+)/g;

// Allowlisted values (common reset / framework patterns)
const PX_ALLOWLIST = new Set(['0px', '1px']);
const COLOR_ALLOWLIST = new Set(['#fff', '#ffffff', '#000', '#000000']);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning for HDS compliance in: ${root}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  const styleFiles = [];
  collectFiles(root, styleFiles, /\.(scss|css)$/);
  log(`Found ${styleFiles.length} style file(s)`);

  const violations = [];

  for (const filePath of styleFiles) {
    const content = safeReadFile(filePath);
    if (!content) continue;

    const lines = content.split('\n');
    const relFile = path.relative(root, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip lines that already use HDS tokens or calc()
      if (TOKEN_USAGE.test(line)) continue;

      // Skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      // Check hex colors
      let match;
      HEX_COLOR_RE.lastIndex = 0;
      while ((match = HEX_COLOR_RE.exec(line)) !== null) {
        const value = match[0].toLowerCase();
        if (COLOR_ALLOWLIST.has(value)) continue;
        violations.push({
          type: 'color',
          severity: 'high',
          value: match[0],
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }

      // Check raw px values
      RAW_PX_RE.lastIndex = 0;
      while ((match = RAW_PX_RE.exec(line)) !== null) {
        const value = match[1];
        if (PX_ALLOWLIST.has(value)) continue;
        // Skip if inside calc()
        if (CALC_USAGE.test(line)) continue;
        violations.push({
          type: 'spacing',
          severity: 'medium',
          value,
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }

      // Check raw font-family
      RAW_FONT_RE.lastIndex = 0;
      while ((match = RAW_FONT_RE.exec(line)) !== null) {
        violations.push({
          type: 'font',
          severity: 'high',
          value: match[1].trim(),
          file: relFile,
          line: lineNum,
          context: line.trim(),
        });
      }
    }
  }

  // Build summary
  const summary = {
    colors: violations.filter((v) => v.type === 'color').length,
    spacing: violations.filter((v) => v.type === 'spacing').length,
    fonts: violations.filter((v) => v.type === 'font').length,
    total: violations.length,
    filesScanned: styleFiles.length,
  };

  log(`Violations found: ${summary.total} (colors=${summary.colors}, spacing=${summary.spacing}, fonts=${summary.fonts})`);

  const result = { violations, summary };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── Helpers ─────────────────────────────────────────────────
function collectFiles(dir, results, pattern) {
  const entries = safeReaddir(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.angular') continue;
    const full = path.join(dir, entry);
    if (safeIsDir(full)) {
      collectFiles(full, results, pattern);
    } else if (pattern.test(entry)) {
      results.push(full);
    }
  }
}

function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function safeReaddir(dir) {
  try { return fs.readdirSync(dir); }
  catch { return []; }
}

function safeIsDir(p) {
  try { return fs.statSync(p).isDirectory(); }
  catch { return false; }
}

// ─── Run ─────────────────────────────────────────────────────
main();
