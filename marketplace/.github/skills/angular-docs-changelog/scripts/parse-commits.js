#!/usr/bin/env node
'use strict';

/**
 * Conventional Commit Parser
 *
 * Parses git log output with conventional commit format and groups
 * commits by type. Detects breaking changes and determines the
 * appropriate semver bump.
 *
 * Usage: node scripts/parse-commits.js [--from tag-or-sha] [--to HEAD] [--current-version 1.2.3]
 *
 * Output (stdout): JSON with grouped commits, breaking changes, and version bump.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const { execSync } = require('child_process');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const fromRef = getFlag('--from', '');
const toRef = getFlag('--to', 'HEAD');
const currentVersion = getFlag('--current-version', '0.0.0');
const log = (msg) => process.stderr.write(`[parse-commits] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ─── Conventional Commit Types ───────────────────────────────
const COMMIT_TYPES = {
  feat:     { label: 'Features',          bump: 'minor' },
  fix:      { label: 'Bug Fixes',         bump: 'patch' },
  refactor: { label: 'Refactoring',       bump: 'patch' },
  perf:     { label: 'Performance',       bump: 'patch' },
  docs:     { label: 'Documentation',     bump: null    },
  test:     { label: 'Tests',             bump: null    },
  ci:       { label: 'CI/CD',             bump: null    },
  chore:    { label: 'Chores',            bump: null    },
  style:    { label: 'Code Style',        bump: null    },
  build:    { label: 'Build',             bump: 'patch' },
};

const SEPARATOR = '---COMMIT-SEP---';

// ─── Main ────────────────────────────────────────────────────
function main() {
  log('Parsing conventional commits from git log');

  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  const format = `%H${SEPARATOR}%s${SEPARATOR}%b${SEPARATOR}%an${SEPARATOR}%aI`;

  let rawLog;
  try {
    const cmd = fromRef
      ? `git log ${range} --format="${format}" --no-merges`
      : `git log ${toRef} --format="${format}" --no-merges -50`;
    rawLog = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    log(`ERROR: Failed to run git log: ${err.message}`);
    process.exit(1);
  }

  const lines = rawLog.trim().split('\n').filter(Boolean);
  log(`Found ${lines.length} commits to parse`);

  const groups = {};
  const breakingChanges = [];
  const unparsed = [];
  let highestBump = null; // null < patch < minor < major

  for (const line of lines) {
    const parts = line.split(SEPARATOR);
    if (parts.length < 4) continue;

    const [hash, subject, body, author, date] = parts;
    const parsed = parseSubject(subject);

    if (!parsed) {
      unparsed.push({ hash: hash.substring(0, 8), subject, author });
      continue;
    }

    const { type, scope, description, breaking } = parsed;
    const typeConfig = COMMIT_TYPES[type];

    if (!typeConfig) {
      unparsed.push({ hash: hash.substring(0, 8), subject, author });
      continue;
    }

    // Group by type
    if (!groups[type]) groups[type] = [];
    groups[type].push({
      hash: hash.substring(0, 8),
      scope: scope || null,
      description,
      author,
      date,
    });

    // Check for breaking changes in subject (!) or body
    const isBreaking = breaking || (body && body.includes('BREAKING CHANGE:'));
    if (isBreaking) {
      const breakingNote = body
        ? extractBreakingNote(body)
        : description;
      breakingChanges.push({
        hash: hash.substring(0, 8),
        scope: scope || null,
        description: breakingNote,
        type,
      });
    }

    // Determine bump level
    if (isBreaking) {
      highestBump = 'major';
    } else if (typeConfig.bump && highestBump !== 'major') {
      if (typeConfig.bump === 'minor' && highestBump !== 'major') {
        highestBump = 'minor';
      } else if (typeConfig.bump === 'patch' && !highestBump) {
        highestBump = 'patch';
      }
    }
  }

  // Sort groups by scope within each type
  for (const type of Object.keys(groups)) {
    groups[type].sort((a, b) => {
      if (a.scope && b.scope) return a.scope.localeCompare(b.scope);
      if (a.scope) return -1;
      if (b.scope) return 1;
      return 0;
    });
  }

  // Calculate next version
  const bump = highestBump || 'patch';
  const nextVersion = bumpVersion(currentVersion, bump);

  const result = {
    version: {
      bump,
      from: currentVersion,
      to: nextVersion,
    },
    groups: formatGroups(groups),
    breakingChanges,
    unparsed: unparsed.length > 0 ? unparsed : undefined,
    stats: {
      totalCommits: lines.length,
      parsedCommits: lines.length - unparsed.length,
      unparsedCommits: unparsed.length,
      types: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    },
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Version bump: ${bump} (${currentVersion} -> ${nextVersion})`);
  log(`Breaking changes: ${breakingChanges.length}`);
  log('Done.');
}

// ─── Subject Parsing ─────────────────────────────────────────
/**
 * Parse a conventional commit subject line.
 * Format: type(scope)!: description
 * Returns { type, scope, description, breaking } or null.
 */
function parseSubject(subject) {
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/);
  if (!match) return null;

  return {
    type: match[1].toLowerCase(),
    scope: match[2] || null,
    breaking: match[3] === '!',
    description: match[4].trim(),
  };
}

// ─── Breaking Change Extraction ──────────────────────────────
function extractBreakingNote(body) {
  const match = body.match(/BREAKING CHANGE:\s*(.+?)(?:\n\n|$)/s);
  return match ? match[1].trim() : body.trim();
}

// ─── Version Bumping ─────────────────────────────────────────
function bumpVersion(version, bump) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3) return '0.1.0';

  switch (bump) {
    case 'major': return `${parts[0] + 1}.0.0`;
    case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch': return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default: return version;
  }
}

// ─── Group Formatting ────────────────────────────────────────
function formatGroups(groups) {
  const formatted = {};
  for (const [type, commits] of Object.entries(groups)) {
    const config = COMMIT_TYPES[type];
    formatted[type] = {
      label: config ? config.label : type,
      commits,
    };
  }
  return formatted;
}

// ─── Run ─────────────────────────────────────────────────────
main();
