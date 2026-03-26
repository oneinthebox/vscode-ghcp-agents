#!/usr/bin/env node
'use strict';

/**
 * Agent Boundary Violation Checker
 *
 * Parses .orch/runs/*.json and boundaries.yaml to detect violations
 * where agents used unauthorized tools or wrote to disallowed file paths.
 *
 * Usage: node scripts/check-boundary-violations.js [runs-dir] [--boundaries path/to/boundaries.yaml] [--days 7]
 *
 * Output (stdout): JSON with per-agent adherence scores and violation details.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const runsDir = path.resolve(args.find(a => !a.startsWith('--')) || '.orch/runs');
const boundariesPath = path.resolve(getFlag('--boundaries', '.orch/audit/config/boundaries.yaml'));
const days = parseInt(getFlag('--days', '7'));
const log = (msg) => process.stderr.write(`[check-boundaries] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ─── Score Weights ───────────────────────────────────────────
const WEIGHTS = {
  boundaryRespect: 0.40,
  toolUsage:       0.30,
  fileScope:       0.20,
  outcome:         0.10,
};

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Checking boundary violations in: ${runsDir}`);
  log(`Boundaries file: ${boundariesPath}`);

  if (!fs.existsSync(runsDir)) {
    log(`ERROR: Runs directory not found: ${runsDir}`);
    process.exit(1);
  }

  const boundaries = loadBoundaries(boundariesPath);
  if (!boundaries) {
    log('WARNING: No boundaries.yaml found — using permissive defaults');
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const files = safeReaddir(runsDir).filter(f => f.endsWith('.json'));
  log(`Found ${files.length} run files`);

  const agents = {};

  for (const file of files) {
    const content = safeReadFile(path.join(runsDir, file));
    if (!content) continue;
    const run = safeParse(content);
    if (!run || !run.started_at) continue;

    const started = new Date(run.started_at);
    if (started < cutoff) continue;

    const agent = run.agent || 'unknown';
    if (!agents[agent]) {
      agents[agent] = { sessions: 0, successes: 0, violations: [], scores: [] };
    }

    agents[agent].sessions++;
    if (run.outcome === 'success') agents[agent].successes++;

    const agentBounds = boundaries ? boundaries[agent] : null;
    const sessionViolations = checkSession(run, agentBounds);
    const sessionScore = scoreSession(run, sessionViolations, agentBounds);

    agents[agent].scores.push(sessionScore);
    if (sessionViolations.length > 0) {
      agents[agent].violations.push(...sessionViolations.map(v => ({
        ...v,
        session: run.session_id || file,
        timestamp: run.started_at,
      })));
    }
  }

  // Calculate per-agent aggregate scores
  const agentResults = {};
  for (const [name, data] of Object.entries(agents)) {
    const avgScore = data.scores.length > 0
      ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
      : 1.0;

    // Deduplicate violations by rule, keeping count
    const violationSummary = summarizeViolations(data.violations);

    agentResults[name] = {
      sessions: data.sessions,
      successRate: data.sessions > 0 ? Math.round((data.successes / data.sessions) * 10000) / 100 : 0,
      score: avgScore,
      violationCount: data.violations.length,
      violations: violationSummary,
    };
  }

  // Overall score: weighted average by session count
  let totalWeightedScore = 0;
  let totalSessions = 0;
  for (const a of Object.values(agentResults)) {
    totalWeightedScore += a.score * a.sessions;
    totalSessions += a.sessions;
  }

  const overallScore = totalSessions > 0
    ? Math.round((totalWeightedScore / totalSessions) * 100) / 100
    : 1.0;

  const result = {
    period: { from: cutoff.toISOString(), to: new Date().toISOString(), days },
    overallScore,
    totalSessions,
    totalViolations: Object.values(agentResults).reduce((sum, a) => sum + a.violationCount, 0),
    agents: agentResults,
    weights: WEIGHTS,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Overall compliance score: ${overallScore}`);
  log(`Total violations: ${result.totalViolations}`);
  log('Done.');
}

// ─── Boundary Loading ────────────────────────────────────────
/**
 * Parse a simplified boundaries.yaml into a map of agent -> { tools, filePatterns }.
 * Uses basic line-by-line parsing to avoid yaml dependency.
 */
function loadBoundaries(filePath) {
  const content = safeReadFile(filePath);
  if (!content) return null;

  const result = {};
  let currentAgent = null;
  let currentKey = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0 && trimmed.endsWith(':')) {
      currentAgent = trimmed.slice(0, -1);
      result[currentAgent] = { tools: [], filePatterns: [] };
      currentKey = null;
    } else if (indent === 2 && trimmed.endsWith(':')) {
      currentKey = trimmed.trim().slice(0, -1);
    } else if (indent >= 4 && trimmed.trimStart().startsWith('- ') && currentAgent) {
      const value = trimmed.trimStart().slice(2).trim();
      if (currentKey === 'tools' || currentKey === 'allowed_tools') {
        result[currentAgent].tools.push(value);
      } else if (currentKey === 'file_patterns' || currentKey === 'allowed_files') {
        result[currentAgent].filePatterns.push(value);
      }
    }
  }

  return result;
}

// ─── Session Checking ────────────────────────────────────────
/**
 * Check a single run session against its agent boundaries.
 * Returns an array of violation objects.
 */
function checkSession(run, agentBounds) {
  const violations = [];
  if (!agentBounds) return violations;

  const toolsUsed = run.tools_used || [];
  const filesWritten = run.files_written || [];

  // Check tool usage against allowed tools
  if (agentBounds.tools.length > 0) {
    for (const tool of toolsUsed) {
      if (!agentBounds.tools.includes(tool)) {
        violations.push({
          rule: 'unauthorized_tool',
          severity: 'high',
          detail: `Tool "${tool}" is not in the allowed list for this agent`,
          tool,
        });
      }
    }
  }

  // Check file writes against allowed patterns
  if (agentBounds.filePatterns.length > 0) {
    for (const file of filesWritten) {
      const allowed = agentBounds.filePatterns.some(pattern => matchGlob(pattern, file));
      if (!allowed) {
        violations.push({
          rule: 'unauthorized_file_write',
          severity: 'high',
          detail: `File "${file}" does not match any allowed pattern`,
          file,
        });
      }
    }
  }

  return violations;
}

// ─── Session Scoring ─────────────────────────────────────────
/**
 * Score a single session: boundary_respect(40%) + tool_usage(30%) + file_scope(20%) + outcome(10%).
 */
function scoreSession(run, violations, agentBounds) {
  const toolViolations = violations.filter(v => v.rule === 'unauthorized_tool').length;
  const fileViolations = violations.filter(v => v.rule === 'unauthorized_file_write').length;

  const totalTools = (run.tools_used || []).length || 1;
  const totalFiles = (run.files_written || []).length || 1;

  const boundaryScore = violations.length === 0 ? 1.0 : Math.max(0, 1.0 - (violations.length * 0.25));
  const toolScore = Math.max(0, 1.0 - (toolViolations / totalTools));
  const fileScore = Math.max(0, 1.0 - (fileViolations / totalFiles));
  const outcomeScore = run.outcome === 'success' ? 1.0 : 0.0;

  return (
    boundaryScore * WEIGHTS.boundaryRespect +
    toolScore * WEIGHTS.toolUsage +
    fileScore * WEIGHTS.fileScope +
    outcomeScore * WEIGHTS.outcome
  );
}

// ─── Violation Summary ───────────────────────────────────────
function summarizeViolations(violations) {
  const map = {};
  for (const v of violations) {
    const key = `${v.rule}:${v.detail}`;
    if (!map[key]) {
      map[key] = { rule: v.rule, severity: v.severity, detail: v.detail, count: 0, firstSeen: v.timestamp };
    }
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

// ─── Glob Matching ───────────────────────────────────────────
/**
 * Minimal glob matcher supporting * and ** patterns.
 */
function matchGlob(pattern, filePath) {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(filePath);
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
