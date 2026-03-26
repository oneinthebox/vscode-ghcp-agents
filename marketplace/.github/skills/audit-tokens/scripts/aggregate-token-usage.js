#!/usr/bin/env node
'use strict';

/**
 * Token Usage Aggregator
 *
 * Parses .orch/runs/*.json files and aggregates token consumption
 * across agents, skills, and models. Calculates costs using a
 * configurable model pricing table.
 *
 * Usage: node scripts/aggregate-token-usage.js [runs-dir] [--days 7]
 *
 * Output (stdout): JSON with token totals, cost breakdown, and efficiency metrics.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────
const args = process.argv.slice(2);
const runsDir = path.resolve(args.find(a => !a.startsWith('--')) || '.orch/runs');
const days = parseInt(getFlag('--days', '7'));
const log = (msg) => process.stderr.write(`[aggregate-tokens] ${msg}\n`);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ─── Model Pricing (USD per 1M tokens) ──────────────────────
const MODEL_PRICING = {
  'gpt-4o':       { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':  { input: 0.15,  output: 0.60  },
  'gpt-4.1':      { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini': { input: 0.40,  output: 1.60  },
  'gpt-4.1-nano': { input: 0.10,  output: 0.40  },
  'claude-sonnet': { input: 3.00, output: 15.00 },
  'claude-haiku':  { input: 0.25, output: 1.25  },
};

const DEFAULT_PRICING = { input: 5.00, output: 15.00 };

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Aggregating token usage from: ${runsDir}`);
  log(`Period: last ${days} days`);

  if (!fs.existsSync(runsDir)) {
    log(`ERROR: Runs directory not found: ${runsDir}`);
    process.exit(1);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const files = safeReaddir(runsDir).filter(f => f.endsWith('.json'));
  log(`Found ${files.length} run files`);

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let totalFilesWritten = 0;
  let totalSuccessful = 0;
  let totalSessions = 0;

  const byAgent = {};
  const byModel = {};
  const bySkill = {};

  for (const file of files) {
    const content = safeReadFile(path.join(runsDir, file));
    if (!content) continue;
    const run = safeParse(content);
    if (!run || !run.started_at) continue;

    const started = new Date(run.started_at);
    if (started < cutoff) continue;

    const agent = run.agent || 'unknown';
    const skill = run.skill || 'unknown';
    const model = run.model || 'gpt-4o';
    const inputTokens = run.input_tokens || 0;
    const outputTokens = run.output_tokens || 0;
    const filesWritten = (run.files_written || []).length;
    const success = run.outcome === 'success';

    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
    const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

    totalInput += inputTokens;
    totalOutput += outputTokens;
    totalCost += cost;
    totalFilesWritten += filesWritten;
    totalSessions++;
    if (success) totalSuccessful++;

    // By agent
    if (!byAgent[agent]) byAgent[agent] = { sessions: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    byAgent[agent].sessions++;
    byAgent[agent].inputTokens += inputTokens;
    byAgent[agent].outputTokens += outputTokens;
    byAgent[agent].cost += cost;

    // By model
    if (!byModel[model]) byModel[model] = { sessions: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    byModel[model].sessions++;
    byModel[model].inputTokens += inputTokens;
    byModel[model].outputTokens += outputTokens;
    byModel[model].cost += cost;

    // By skill
    if (!bySkill[skill]) bySkill[skill] = { invocations: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    bySkill[skill].invocations++;
    bySkill[skill].inputTokens += inputTokens;
    bySkill[skill].outputTokens += outputTokens;
    bySkill[skill].cost += cost;
  }

  // Round costs
  for (const a of Object.values(byAgent)) a.cost = roundCost(a.cost);
  for (const m of Object.values(byModel)) m.cost = roundCost(m.cost);
  for (const s of Object.values(bySkill)) s.cost = roundCost(s.cost);

  // Efficiency metrics
  const efficiency = {
    avgTokensPerSession: totalSessions > 0 ? Math.round((totalInput + totalOutput) / totalSessions) : 0,
    avgCostPerSession: totalSessions > 0 ? roundCost(totalCost / totalSessions) : 0,
    tokensPerFileWritten: totalFilesWritten > 0 ? Math.round((totalInput + totalOutput) / totalFilesWritten) : 0,
    tokensPerSuccessfulOutcome: totalSuccessful > 0 ? Math.round((totalInput + totalOutput) / totalSuccessful) : 0,
    inputOutputRatio: totalOutput > 0 ? Math.round((totalInput / totalOutput) * 100) / 100 : 0,
  };

  const result = {
    period: {
      from: cutoff.toISOString(),
      to: new Date().toISOString(),
      days,
    },
    totalTokens: totalInput + totalOutput,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCost: roundCost(totalCost),
    sessions: totalSessions,
    byAgent,
    byModel,
    bySkill,
    efficiency,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Total tokens: ${(totalInput + totalOutput).toLocaleString()}`);
  log(`Total cost: $${roundCost(totalCost)}`);
  log(`Efficiency: ${efficiency.avgTokensPerSession} tokens/session, $${efficiency.avgCostPerSession}/session`);
  log('Done.');
}

// ─── Helpers ─────────────────────────────────────────────────
function roundCost(n) {
  return Math.round(n * 100) / 100;
}

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
