#!/usr/bin/env node
'use strict';

/**
 * Agent Usage Aggregator
 *
 * Parses .orch/runs/*.json files and aggregates usage metrics
 * across agents, skills, and time periods.
 *
 * Usage: node scripts/aggregate-usage-logs.js [runs-dir] [--days 7]
 *
 * Output (stdout): JSON with session counts, success rates, durations, and trends.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const runsDir = path.resolve(args.find(a => !a.startsWith('--')) || '.orch/runs');
const days = parseInt(getFlag('--days', '7'));
const log = (msg) => process.stderr.write(`[aggregate-usage] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Aggregating usage from: ${runsDir}`);
  log(`Period: last ${days} days`);

  if (!fs.existsSync(runsDir)) {
    log(`ERROR: Runs directory not found: ${runsDir}`);
    process.exit(1);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const prevCutoff = new Date(cutoff);
  prevCutoff.setDate(prevCutoff.getDate() - days);

  const files = safeReaddir(runsDir).filter(f => f.endsWith('.json'));
  log(`Found ${files.length} run files`);

  const currentRuns = [];
  const previousRuns = [];

  for (const file of files) {
    const content = safeReadFile(path.join(runsDir, file));
    if (!content) continue;
    const run = safeParse(content);
    if (!run || !run.started_at) continue;

    const started = new Date(run.started_at);
    if (started >= cutoff) {
      currentRuns.push(run);
    } else if (started >= prevCutoff) {
      previousRuns.push(run);
    }
  }

  log(`Current period runs: ${currentRuns.length}`);
  log(`Previous period runs: ${previousRuns.length}`);

  const byAgent = {};
  const bySkill = {};
  const byDay = {};

  for (const run of currentRuns) {
    const agent = run.agent || 'unknown';
    const skill = run.skill || 'unknown';
    const day = run.started_at.substring(0, 10);
    const success = run.outcome === 'success';
    const duration = run.duration_ms || 0;

    // Aggregate by agent
    if (!byAgent[agent]) byAgent[agent] = { sessions: 0, successes: 0, totalDuration: 0 };
    byAgent[agent].sessions++;
    if (success) byAgent[agent].successes++;
    byAgent[agent].totalDuration += duration;

    // Aggregate by skill
    if (!bySkill[skill]) bySkill[skill] = { invocations: 0, successes: 0, totalDuration: 0 };
    bySkill[skill].invocations++;
    if (success) bySkill[skill].successes++;
    bySkill[skill].totalDuration += duration;

    // Aggregate by day
    if (!byDay[day]) byDay[day] = { sessions: 0, successes: 0 };
    byDay[day].sessions++;
    if (success) byDay[day].successes++;
  }

  // Calculate rates and averages
  for (const agent of Object.keys(byAgent)) {
    const a = byAgent[agent];
    a.successRate = a.sessions > 0 ? Math.round((a.successes / a.sessions) * 10000) / 100 : 0;
    a.avgDurationMs = a.sessions > 0 ? Math.round(a.totalDuration / a.sessions) : 0;
    delete a.totalDuration;
  }

  for (const skill of Object.keys(bySkill)) {
    const s = bySkill[skill];
    s.successRate = s.invocations > 0 ? Math.round((s.successes / s.invocations) * 10000) / 100 : 0;
    s.avgDurationMs = s.invocations > 0 ? Math.round(s.totalDuration / s.invocations) : 0;
    delete s.totalDuration;
  }

  // Detect week-over-week trends (>20% change = flagged)
  const trends = detectTrends(currentRuns, previousRuns, byAgent);

  const totalSessions = currentRuns.length;
  const totalSuccesses = currentRuns.filter(r => r.outcome === 'success').length;

  const result = {
    period: {
      from: cutoff.toISOString(),
      to: new Date().toISOString(),
      days,
    },
    sessions: totalSessions,
    successRate: totalSessions > 0 ? Math.round((totalSuccesses / totalSessions) * 10000) / 100 : 0,
    byAgent,
    bySkill,
    byDay,
    trends,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Total sessions: ${totalSessions}, Success rate: ${result.successRate}%`);
  log(`Trends flagged: ${trends.length}`);
  log('Done.');
}

// ─── Trend detection ─────────────────────────────────────────
/**
 * Compare current vs previous period metrics per agent.
 * Flag any metric with >20% week-over-week change.
 */
function detectTrends(currentRuns, previousRuns, currentByAgent) {
  const trends = [];
  const THRESHOLD = 0.20;

  // Build previous period agent counts
  const prevByAgent = {};
  for (const run of previousRuns) {
    const agent = run.agent || 'unknown';
    if (!prevByAgent[agent]) prevByAgent[agent] = { sessions: 0, successes: 0 };
    prevByAgent[agent].sessions++;
    if (run.outcome === 'success') prevByAgent[agent].successes++;
  }

  // Compare each agent
  const allAgents = new Set([...Object.keys(currentByAgent), ...Object.keys(prevByAgent)]);

  for (const agent of allAgents) {
    const curr = currentByAgent[agent] || { sessions: 0, successRate: 0 };
    const prev = prevByAgent[agent] || { sessions: 0, successes: 0 };
    const prevRate = prev.sessions > 0 ? (prev.successes / prev.sessions) * 100 : 0;

    // Session volume change
    if (prev.sessions > 0) {
      const delta = (curr.sessions - prev.sessions) / prev.sessions;
      if (Math.abs(delta) > THRESHOLD) {
        trends.push({
          agent,
          metric: 'session_volume',
          previousValue: prev.sessions,
          currentValue: curr.sessions,
          changePercent: Math.round(delta * 10000) / 100,
          direction: delta > 0 ? 'increasing' : 'decreasing',
          severity: Math.abs(delta) > 0.5 ? 'high' : 'medium',
        });
      }
    }

    // Success rate change
    if (prev.sessions >= 5) {
      const rateDelta = curr.successRate - prevRate;
      if (Math.abs(rateDelta) > THRESHOLD * 100) {
        trends.push({
          agent,
          metric: 'success_rate',
          previousValue: Math.round(prevRate * 100) / 100,
          currentValue: curr.successRate,
          changePercent: Math.round(rateDelta * 100) / 100,
          direction: rateDelta > 0 ? 'improving' : 'degrading',
          severity: rateDelta < -20 ? 'high' : 'medium',
        });
      }
    }
  }

  return trends;
}

// ─── Helpers ─────────────────────────────────────────────────
function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function safeReaddir(dir) {
  try { return fs.readdirSync(dir); }
  catch { return []; }
}

function safeParse(content) {
  try { return JSON.parse(content); }
  catch { return null; }
}

// ─── Run ─────────────────────────────────────────────────────
main();
