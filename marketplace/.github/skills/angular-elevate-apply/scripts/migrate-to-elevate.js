#!/usr/bin/env node
'use strict';

/**
 * Elevate Migration Tool
 *
 * Detects and optionally auto-replaces patterns that violate Elevate conventions.
 * By default runs in detection-only mode; use --apply to write changes.
 *
 * Usage:
 *   node scripts/migrate-to-elevate.js [project-root] [--apply]
 *
 * Options:
 *   --apply   Write changes to files (default: detection only)
 *
 * Output (stdout): JSON  { candidates: [], summary: { logging, config } }
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Argument parsing ───────────────────────────────────────
const args = process.argv.slice(2);
const log = (msg) => process.stderr.write(`[migrate-elevate] ${msg}\n`);
const applyMode = args.includes('--apply');
const root = path.resolve(args.find((a) => !a.startsWith('--')) || '.');

// Files to skip
const SKIP_PATTERNS = [
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /node_modules/,
  /\.d\.ts$/,
  /environments?\//,
];

// ─── Migration rules ─────────────────────────────────────────

/**
 * Each rule defines:
 *  - type: category for summary
 *  - pattern: regex to detect the violation
 *  - replace: function(match) returning the replacement string
 *  - needsImport: service that must be injected
 */
const RULES = [
  {
    type: 'logging',
    name: 'console.log → this.logger.info',
    pattern: /\bconsole\.log\s*\(/g,
    replace: () => 'this.logger.info(',
    needsImport: 'LoggingService',
    needsInject: 'private readonly logger = inject(LoggingService);',
  },
  {
    type: 'logging',
    name: 'console.error → this.logger.error',
    pattern: /\bconsole\.error\s*\(/g,
    replace: () => 'this.logger.error(',
    needsImport: 'LoggingService',
    needsInject: 'private readonly logger = inject(LoggingService);',
  },
  {
    type: 'logging',
    name: 'console.warn → this.logger.warn',
    pattern: /\bconsole\.warn\s*\(/g,
    replace: () => 'this.logger.warn(',
    needsImport: 'LoggingService',
    needsInject: 'private readonly logger = inject(LoggingService);',
  },
  {
    type: 'logging',
    name: 'console.info → this.logger.info',
    pattern: /\bconsole\.info\s*\(/g,
    replace: () => 'this.logger.info(',
    needsImport: 'LoggingService',
    needsInject: 'private readonly logger = inject(LoggingService);',
  },
  {
    type: 'config',
    name: 'localStorage.getItem → this.config.get',
    pattern: /\blocalStorage\.getItem\s*\(/g,
    replace: () => 'this.config.get(',
    needsImport: 'ConfigService',
    needsInject: 'private readonly config = inject(ConfigService);',
  },
  {
    type: 'config',
    name: 'localStorage.setItem → this.config.set',
    pattern: /\blocalStorage\.setItem\s*\(/g,
    replace: () => 'this.config.set(',
    needsImport: 'ConfigService',
    needsInject: 'private readonly config = inject(ConfigService);',
  },
  {
    type: 'config',
    name: 'localStorage.removeItem → this.config.remove',
    pattern: /\blocalStorage\.removeItem\s*\(/g,
    replace: () => 'this.config.remove(',
    needsImport: 'ConfigService',
    needsInject: 'private readonly config = inject(ConfigService);',
  },
  {
    type: 'config',
    name: 'sessionStorage.getItem → this.config.get',
    pattern: /\bsessionStorage\.getItem\s*\(/g,
    replace: () => 'this.config.get(',
    needsImport: 'ConfigService',
    needsInject: 'private readonly config = inject(ConfigService);',
  },
  {
    type: 'config',
    name: 'sessionStorage.setItem → this.config.set',
    pattern: /\bsessionStorage\.setItem\s*\(/g,
    replace: () => 'this.config.set(',
    needsImport: 'ConfigService',
    needsInject: 'private readonly config = inject(ConfigService);',
  },
];

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning for migration candidates in: ${root}`);
  log(`Mode: ${applyMode ? 'APPLY (will write files)' : 'DETECT ONLY'}`);

  if (!fs.existsSync(root)) {
    log(`ERROR: Directory not found: ${root}`);
    process.exit(1);
  }

  const tsFiles = [];
  collectFiles(root, tsFiles, /\.ts$/);

  const targetFiles = tsFiles.filter(
    (f) => !SKIP_PATTERNS.some((p) => p.test(f))
  );
  log(`Found ${targetFiles.length} TypeScript file(s) to scan`);

  const candidates = [];

  for (const filePath of targetFiles) {
    const content = safeReadFile(filePath);
    if (!content) continue;

    const relFile = path.relative(root, filePath);
    const lines = content.split('\n');
    const fileMatches = [];
    const neededServices = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          fileMatches.push({
            rule: rule.name,
            type: rule.type,
            line: lineNum,
            before: line.trim(),
            after: line.replace(new RegExp(rule.pattern.source, 'g'), rule.replace()).trim(),
          });
          neededServices.add(rule.needsImport);
        }
      }
    }

    if (fileMatches.length > 0) {
      candidates.push({
        file: relFile,
        matches: fileMatches,
        neededServices: [...neededServices],
      });

      // Apply changes if --apply flag is set
      if (applyMode) {
        let modified = content;
        for (const rule of RULES) {
          modified = modified.replace(new RegExp(rule.pattern.source, 'g'), rule.replace());
        }

        // Add missing inject() statements if the class doesn't have them
        for (const serviceName of neededServices) {
          const rule = RULES.find((r) => r.needsImport === serviceName);
          if (!rule) continue;

          // Check if inject statement already exists
          if (!modified.includes(rule.needsInject) && !modified.includes(`inject(${serviceName})`)) {
            // Find the first line after class declaration opening brace
            const classMatch = modified.match(/export\s+class\s+\w+[^{]*\{/);
            if (classMatch) {
              const insertPos = modified.indexOf(classMatch[0]) + classMatch[0].length;
              modified =
                modified.slice(0, insertPos) +
                `\n  ${rule.needsInject}` +
                modified.slice(insertPos);
            }
          }
        }

        fs.writeFileSync(filePath, modified, 'utf8');
        log(`APPLIED: ${relFile} (${fileMatches.length} replacement(s))`);
      } else {
        log(`FOUND: ${relFile} (${fileMatches.length} candidate(s))`);
      }
    }
  }

  // Build summary
  const allMatches = candidates.flatMap((c) => c.matches);
  const summary = {
    logging: allMatches.filter((m) => m.type === 'logging').length,
    config: allMatches.filter((m) => m.type === 'config').length,
    total: allMatches.length,
    filesAffected: candidates.length,
    applied: applyMode,
  };

  log(`Candidates: ${summary.total} (logging=${summary.logging}, config=${summary.config}) in ${summary.filesAffected} file(s)`);

  const result = { candidates, summary };
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
