#!/usr/bin/env node
'use strict';

/**
 * Registry Dashboard Generator
 *
 * Parses .orch/registry.yaml and calculates freshness metrics
 * for all registered skills and documentation entries.
 *
 * Usage: node scripts/registry-dashboard.js [--registry path/to/registry.yaml] [--stale-days 30]
 *
 * Output (stdout): JSON with freshness metrics, stale entries, and domain breakdown.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const registryPath = path.resolve(getFlag('--registry', '.orch/registry.yaml'));
const staleDays = parseInt(getFlag('--stale-days', '30'));
const log = (msg) => process.stderr.write(`[registry-dashboard] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Parsing registry: ${registryPath}`);
  log(`Stale threshold: ${staleDays} days`);

  const content = safeReadFile(registryPath);
  if (!content) {
    log(`ERROR: Registry file not found: ${registryPath}`);
    process.exit(1);
  }

  const entries = parseRegistry(content);
  log(`Found ${entries.length} registry entries`);

  const now = new Date();
  const staleThreshold = new Date(now);
  staleThreshold.setDate(staleThreshold.getDate() - staleDays);

  let currentCount = 0;
  let draftCount = 0;
  const staleEntries = [];
  const byDomain = {};

  for (const entry of entries) {
    const status = entry.status || 'draft';
    if (status === 'current') currentCount++;
    else draftCount++;

    // Check freshness
    const lastRefreshed = entry.last_refreshed ? new Date(entry.last_refreshed) : null;
    const isStale = !lastRefreshed || lastRefreshed < staleThreshold;
    const daysSinceRefresh = lastRefreshed
      ? Math.floor((now - lastRefreshed) / (1000 * 60 * 60 * 24))
      : null;

    if (isStale) {
      staleEntries.push({
        name: entry.name,
        domain: entry.domain,
        status,
        lastRefreshed: entry.last_refreshed || 'never',
        daysSinceRefresh,
      });
    }

    // Group by domain
    const domain = entry.domain || 'other';
    if (!byDomain[domain]) {
      byDomain[domain] = { total: 0, current: 0, draft: 0, stale: 0 };
    }
    byDomain[domain].total++;
    if (status === 'current') byDomain[domain].current++;
    else byDomain[domain].draft++;
    if (isStale) byDomain[domain].stale++;
  }

  const total = entries.length;
  const freshnessPercent = total > 0
    ? Math.round((currentCount / total) * 10000) / 100
    : 0;

  // Add freshness percent to each domain
  for (const domain of Object.values(byDomain)) {
    domain.freshnessPercent = domain.total > 0
      ? Math.round((domain.current / domain.total) * 10000) / 100
      : 0;
  }

  // Sort stale entries: never-refreshed first, then oldest
  staleEntries.sort((a, b) => {
    if (a.daysSinceRefresh === null) return -1;
    if (b.daysSinceRefresh === null) return 1;
    return b.daysSinceRefresh - a.daysSinceRefresh;
  });

  const result = {
    generatedAt: now.toISOString(),
    total,
    current: currentCount,
    draft: draftCount,
    freshnessPercent,
    staleThresholdDays: staleDays,
    staleCount: staleEntries.length,
    stale: staleEntries,
    byDomain,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Freshness: ${freshnessPercent}% (${currentCount}/${total} current)`);
  log(`Stale entries: ${staleEntries.length}`);
  log('Done.');
}

// ─── Registry Parsing ────────────────────────────────────────
/**
 * Parse a simplified registry.yaml into an array of entry objects.
 * Uses line-by-line parsing to avoid yaml dependency.
 * Expected format:
 *   - name: skill-name
 *     domain: angular
 *     status: current
 *     last_refreshed: 2026-03-20
 */
function parseRegistry(content) {
  const entries = [];
  let current = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- name:')) {
      if (current) entries.push(current);
      current = { name: trimmed.replace('- name:', '').trim() };
    } else if (current && trimmed.startsWith('domain:')) {
      current.domain = trimmed.replace('domain:', '').trim();
    } else if (current && trimmed.startsWith('status:')) {
      current.status = trimmed.replace('status:', '').trim();
    } else if (current && trimmed.startsWith('last_refreshed:')) {
      current.last_refreshed = trimmed.replace('last_refreshed:', '').trim();
    } else if (current && trimmed.startsWith('description:')) {
      current.description = trimmed.replace('description:', '').trim();
    }
  }

  if (current) entries.push(current);
  return entries;
}

// ─── Helpers ─────────────────────────────────────────────────
function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

// ─── Run ─────────────────────────────────────────────────────
main();
