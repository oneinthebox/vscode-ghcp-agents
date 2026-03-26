#!/usr/bin/env node
'use strict';

/**
 * Documentation Staleness Checker
 *
 * Parses .orch/registry.yaml (using regex-based YAML parsing — no yaml dependency)
 * and identifies stale documentation entries. An entry is stale when the number of
 * days since last_refreshed exceeds the threshold (default 30, configurable via --max-days).
 *
 * Usage: node scripts/check-staleness.js [project-root] [--max-days N]
 *
 * Output (stdout): JSON with total, current, stale entries, and fresh count.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const log = (msg) => process.stderr.write(`[check-staleness] ${msg}\n`);

// Parse arguments: first non-flag arg is root, --max-days N sets threshold
let root = '.';
let maxDays = 30;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max-days' && args[i + 1]) {
    maxDays = parseInt(args[i + 1], 10);
    if (isNaN(maxDays) || maxDays < 1) {
      log('ERROR: --max-days must be a positive integer');
      process.exit(1);
    }
    i++; // skip the value
  } else if (!args[i].startsWith('--')) {
    root = args[i];
  }
}

root = path.resolve(root);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Checking staleness in: ${root}`);
  log(`Max stale days threshold: ${maxDays}`);

  const registryPath = path.join(root, '.orch', 'registry.yaml');
  if (!fs.existsSync(registryPath)) {
    log(`ERROR: Registry file not found: ${registryPath}`);
    process.exit(1);
  }

  const registryContent = fs.readFileSync(registryPath, 'utf8');
  const entries = parseRegistryYaml(registryContent);

  log(`Parsed ${entries.length} registry entries`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter to entries with status: current
  const currentEntries = entries.filter(e => e.status === 'current');
  log(`Found ${currentEntries.length} entries with status: current`);

  const staleItems = [];
  let freshCount = 0;

  for (const entry of currentEntries) {
    if (!entry.last_refreshed) {
      // No refresh date means we treat it as stale
      staleItems.push({
        id: entry.id || 'unknown',
        name: entry.name || entry.id || 'unknown',
        lastRefreshed: null,
        daysSince: Infinity,
        origin: entry.source || entry.origin || 'unknown',
      });
      continue;
    }

    const refreshDate = parseDate(entry.last_refreshed);
    if (!refreshDate) {
      log(`WARNING: Could not parse date "${entry.last_refreshed}" for entry "${entry.id}"`);
      continue;
    }

    const daysSince = Math.floor((today - refreshDate) / (1000 * 60 * 60 * 24));
    // Use per-entry max_stale_days if available, otherwise use the global threshold
    const entryThreshold = entry.max_stale_days ? parseInt(entry.max_stale_days, 10) : maxDays;

    if (daysSince > entryThreshold) {
      staleItems.push({
        id: entry.id || 'unknown',
        name: entry.name || entry.id || 'unknown',
        lastRefreshed: entry.last_refreshed,
        daysSince,
        origin: entry.source || entry.origin || 'unknown',
      });
    } else {
      freshCount++;
    }
  }

  // Sort by staleness (most stale first)
  staleItems.sort((a, b) => {
    if (a.daysSince === Infinity) return -1;
    if (b.daysSince === Infinity) return 1;
    return b.daysSince - a.daysSince;
  });

  const result = {
    total: entries.length,
    current: currentEntries.length,
    stale: staleItems,
    fresh: freshCount,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Stale: ${staleItems.length}, Fresh: ${freshCount}`);
  log('Done.');
}

// ─── Basic YAML Parser (regex-based, no dependencies) ────────
/**
 * Parses a simple YAML list of objects from registry.yaml.
 * Handles the pattern:
 *   - id: value
 *     key: value
 *     key: "value"
 *
 * Does not handle nested objects, multi-line strings, or complex YAML features.
 */
function parseRegistryYaml(content) {
  const entries = [];
  const lines = content.split('\n');
  let currentEntry = null;

  for (const line of lines) {
    // Skip comments and blank lines
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;

    // New list item: "- key: value" or just "- key:"
    const listItemMatch = line.match(/^-\s+(\w[\w_]*):\s*(.*)/);
    if (listItemMatch) {
      // Save the previous entry
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {};
      const key = listItemMatch[1];
      const value = cleanYamlValue(listItemMatch[2]);
      currentEntry[key] = value;
      continue;
    }

    // Continuation of a list item: "  key: value"
    const propMatch = line.match(/^\s+(\w[\w_]*):\s*(.*)/);
    if (propMatch && currentEntry) {
      const key = propMatch[1];
      const value = cleanYamlValue(propMatch[2]);
      currentEntry[key] = value;
    }
  }

  // Push the last entry
  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Clean a YAML value: strip surrounding quotes, trim whitespace.
 */
function cleanYamlValue(raw) {
  let value = raw.trim();
  // Strip surrounding double or single quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

// ─── Date Parser ─────────────────────────────────────────────
/**
 * Parse a date string in YYYY-MM-DD format.
 * Returns a Date object or null if parsing fails.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const date = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  if (isNaN(date.getTime())) return null;
  return date;
}

// ─── Run ─────────────────────────────────────────────────────
main();
