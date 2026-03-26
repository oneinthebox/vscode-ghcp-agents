#!/usr/bin/env node
'use strict';

/**
 * track-trends.js
 *
 * Manages report snapshots and computes trend deltas for ORCH reports.
 * Pure Node.js — no npm dependencies.
 *
 * Exports:
 *   saveSnapshot(reportType, data)      — persist current run's data
 *   loadPreviousSnapshot(reportType)    — load the most recent previous snapshot
 *   computeTrends(current, previous)    — compute deltas and trend arrows
 *   loadHistory(reportType, limit)      — load last N snapshots for sparklines
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');
const MAX_SNAPSHOTS = 30;

// Metric name keywords that determine trend direction
const HIGHER_IS_BETTER = [
  'coverage', 'adherence', 'quality', 'documented', 'pass_rate', 'success_rate',
  'score', 'components', 'bus_factor', 'compliance',
];
const LOWER_IS_BETTER = [
  'errors', 'warnings', 'violations', 'cost', 'tokens', 'duration', 'stale',
  'bundle_size', 'size',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the directory for a given report type's snapshots.
 */
function snapshotDir(reportType) {
  return path.join(REPORTS_DIR, reportType);
}

/**
 * Ensure directory exists (recursive).
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * List snapshot filenames in a directory, sorted ascending by name (oldest first).
 */
function listSnapshots(reportType) {
  const dir = snapshotDir(reportType);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort(); // filenames are date-based, so lexicographic = chronological
}

/**
 * Generate a timestamp string suitable for a snapshot filename.
 * Format: YYYY-MM-DDTHH-MM-SS
 */
function timestampFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    '-', pad(now.getMonth() + 1),
    '-', pad(now.getDate()),
    'T',
    pad(now.getHours()),
    '-', pad(now.getMinutes()),
    '-', pad(now.getSeconds()),
  ].join('');
}

/**
 * Normalize a metric name for keyword matching.
 * "TSDoc coverage" -> "tsdoc_coverage"
 */
function normalizeMetricName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Determine whether higher values are "good" for a metric.
 * Returns: 'higher' | 'lower' | 'neutral'
 */
function metricDirection(metricName) {
  const norm = normalizeMetricName(metricName);
  for (const kw of HIGHER_IS_BETTER) {
    if (norm.includes(kw)) return 'higher';
  }
  for (const kw of LOWER_IS_BETTER) {
    if (norm.includes(kw)) return 'lower';
  }
  return 'neutral';
}

/**
 * Format a delta value for display.
 */
function formatDelta(delta, unit) {
  const sign = delta > 0 ? '+' : '';
  if (unit === '%') {
    return `${sign}${delta}%`;
  }
  // Round to reasonable precision
  const rounded = Math.abs(delta) < 1
    ? parseFloat(delta.toFixed(4))
    : parseFloat(delta.toFixed(2));
  return `${sign}${rounded}`;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Save the current report run's data as a timestamped snapshot.
 *
 * @param {string} reportType  e.g. "recap", "audit", "coverage"
 * @param {object} data        the report-data JSON object
 */
function saveSnapshot(reportType, data) {
  const dir = snapshotDir(reportType);
  ensureDir(dir);

  const filename = `${timestampFilename()}.json`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

  // Prune old snapshots if we exceed the limit
  const snapshots = listSnapshots(reportType);
  if (snapshots.length > MAX_SNAPSHOTS) {
    const toDelete = snapshots.slice(0, snapshots.length - MAX_SNAPSHOTS);
    for (const old of toDelete) {
      fs.unlinkSync(path.join(dir, old));
    }
  }

  return filepath;
}

/**
 * Load the most recent previous snapshot (second-most-recent file).
 * Returns null if no previous snapshot exists.
 *
 * @param {string} reportType  e.g. "recap", "audit"
 * @returns {object|null}      parsed JSON or null
 */
function loadPreviousSnapshot(reportType) {
  const snapshots = listSnapshots(reportType);
  // We need at least 2 snapshots: current (just saved) + previous
  // But if called BEFORE saving current, the most recent IS the previous.
  // Convention: call loadPreviousSnapshot BEFORE saveSnapshot.
  if (snapshots.length === 0) {
    return null;
  }

  // The most recent snapshot is the previous run's data
  const prevFile = snapshots[snapshots.length - 1];
  const filepath = path.join(snapshotDir(reportType), prevFile);

  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

/**
 * Compute trend deltas between current and previous metric arrays.
 *
 * @param {Array} currentMetrics   array of { name, value, unit?, ... }
 * @param {Array} previousMetrics  array of { name, value, unit?, ... }
 * @returns {Array}                enriched metrics with previous, delta, trend, trend_color
 */
function computeTrends(currentMetrics, previousMetrics) {
  if (!Array.isArray(currentMetrics)) return currentMetrics;
  if (!Array.isArray(previousMetrics)) return currentMetrics;

  // Build a lookup from the previous metrics by name
  const prevMap = new Map();
  for (const m of previousMetrics) {
    const key = (m.name || m.label || '').toLowerCase();
    if (key) prevMap.set(key, m);
  }

  return currentMetrics.map((metric) => {
    const name = metric.name || metric.label || '';
    const key = name.toLowerCase();
    const prev = prevMap.get(key);

    if (!prev) {
      // New metric — no previous data
      return {
        ...metric,
        previous: null,
        delta: null,
        trend: 'new',
        trend_color: 'flat',
      };
    }

    const currentVal = typeof metric.value === 'number' ? metric.value : parseFloat(metric.value);
    const previousVal = typeof prev.value === 'number' ? prev.value : parseFloat(prev.value);

    if (isNaN(currentVal) || isNaN(previousVal)) {
      return {
        ...metric,
        previous: prev.value,
        delta: null,
        trend: '\u2192',
        trend_color: 'flat',
      };
    }

    const delta = currentVal - previousVal;
    const unit = metric.unit || '';

    // Determine arrow direction
    let trend;
    if (delta > 0) trend = '\u2191';
    else if (delta < 0) trend = '\u2193';
    else trend = '\u2192';

    // Determine color based on metric direction
    const direction = metricDirection(name);
    let trend_color = 'flat';
    if (delta !== 0) {
      if (direction === 'higher') {
        trend_color = delta > 0 ? 'good' : 'bad';
      } else if (direction === 'lower') {
        trend_color = delta < 0 ? 'good' : 'bad';
      } else {
        // Neutral — no opinion on good/bad
        trend_color = delta > 0 ? 'up' : 'down';
      }
    }

    return {
      ...metric,
      previous: previousVal,
      delta: formatDelta(delta, unit),
      trend,
      trend_color,
    };
  });
}

/**
 * Load the last N snapshots for historical trend display / sparklines.
 *
 * @param {string} reportType  e.g. "recap"
 * @param {number} limit       max snapshots to return (default 10)
 * @returns {Array}            array of { date, metrics }
 */
function loadHistory(reportType, limit) {
  if (limit === undefined || limit === null) limit = 10;

  const snapshots = listSnapshots(reportType);
  const recent = snapshots.slice(-limit);

  return recent.map((filename) => {
    const filepath = path.join(snapshotDir(reportType), filename);
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(raw);

      // Extract date from filename: YYYY-MM-DDTHH-MM-SS.json -> ISO date
      const datePart = filename.replace('.json', '').replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');

      // Build a flat metrics map
      const metricsMap = {};
      if (Array.isArray(data.metrics)) {
        for (const m of data.metrics) {
          const name = m.name || m.label || '';
          if (name) metricsMap[name] = m.value;
        }
      }

      return {
        date: datePart,
        metrics: metricsMap,
      };
    } catch (_err) {
      return null;
    }
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------
module.exports = {
  saveSnapshot,
  loadPreviousSnapshot,
  computeTrends,
  loadHistory,
};
