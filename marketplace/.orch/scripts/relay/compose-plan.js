#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const store = require('./event-store');

// Usage: node compose-plan.js <plan-json-file> [--dry-run]
// plan-json-file contains: { tasks: [{ domain, action, skill, type, depends_on, args }] }

const projectRoot = process.cwd();
const planFile = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!planFile) {
  process.stderr.write('Usage: node compose-plan.js <plan.json> [--dry-run]\n');
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const now = new Date();
const runId = 'run-' + now.toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
const runDir = store.createRunDir(runId, projectRoot);

const eventIds = [];

for (let i = 0; i < plan.tasks.length; i++) {
  const task = plan.tasks[i];
  const eventId = String(i + 1).padStart(3, '0');

  // Resolve dependencies
  let deps;
  if (Array.isArray(task.depends_on)) {
    deps = task.depends_on;
  } else if (i > 0 && !task.parallel) {
    deps = [eventIds[i - 1]]; // sequential default
  } else {
    deps = [];
  }

  const event = {
    identity: {
      event_id: eventId,
      run_id: runId,
      workflow_name: plan.name || 'ad-hoc',
      phase_name: task.action,
      phase_id: task.id || eventId,
      agent: task.agent || task.domain || 'angular',
      skill: task.skill || null,
      skills: task.skills || (task.skill ? [task.skill] : []),
      sequence: i + 1,
      total_phases: plan.tasks.length
    },
    execution: {
      type: task.type || 'ai',
      script_path: task.script_path || null,
      timeout_sec: task.type === 'script' ? 300 : 600
    },
    dependencies: {
      depends_on: deps,
      dependents: []
    },
    lifecycle: {
      status: deps.length === 0 ? 'ready' : 'queued',
      status_history: [
        { status: 'created', at: now.toISOString() },
        { status: deps.length === 0 ? 'ready' : 'queued', at: now.toISOString() }
      ],
      created_at: now.toISOString(),
      ready_at: deps.length === 0 ? now.toISOString() : null,
      started_at: null,
      completed_at: null
    },
    context: task.context || plan.context || {},
    result: null,
    retry: {
      attempt: 0,
      max_retries: 3,
      last_error: null,
      backoff_sec: [10, 30, 60]
    },
    checkpoint: {
      enabled: task.checkpoint !== false,
      git_tag: null
    },
    on_failure: task.on_failure || 'pause',
    report: {
      section: task.report_section || task.action,
      collect: task.collect || []
    }
  };

  // Compute dependents for all previous events
  for (const depId of deps) {
    const depEvent = store.readEvent(runDir, depId);
    if (depEvent) {
      depEvent.dependencies.dependents.push(eventId);
      store.writeEvent(runDir, depEvent);
    }
  }

  store.writeEvent(runDir, event);
  eventIds.push(eventId);
  process.stderr.write(`  Phase ${eventId}: ${task.action} [${event.execution.type}] (${event.lifecycle.status})\n`);

  // Build prompt for ALL AI phases (with or without a skill)
  if (event.execution.type === 'ai') {
    try {
      const promptBuilder = require('./prompt-builder');
      promptBuilder.buildSkeletonPrompt(event, runDir, projectRoot);
    } catch (err) {
      // If prompt build fails (e.g., no skill), write a minimal prompt
      const promptPath = path.join(runDir, `${eventId}.prompt.md`);
      const minimalPrompt = `---\nevent_id: "${eventId}"\nworkflow: "${plan.name || 'ad-hoc'}"\nphase: "${task.action}"\nagent: "${task.agent || task.domain || 'orch'}"\n---\n\n## Task\n\n${task.action}\n\n${task.description || ''}\n\n## Completion Protocol\n\nWhen done, create: \`${path.join(runDir, eventId + '.complete.json')}\`\nWith: \`{"status": "complete", "summary": "<what you did>", "files_modified": [], "collected": {}}\`\n`;
      fs.writeFileSync(promptPath, minimalPrompt);
      process.stderr.write(`  Wrote minimal prompt for skill-less AI phase\n`);
    }
  }
}

// Write manifest
const manifest = {
  workflow_name: plan.name || 'ad-hoc',
  run_id: runId,
  created_at: now.toISOString(),
  completed_at: null,
  status: 'running',
  total_phases: plan.tasks.length,
  event_ids: eventIds,
  source: plan.source || 'dynamic',
  context: plan.context || {},
  report: plan.report || { template: 'recap-report', title: plan.name || 'Workflow Report' }
};
store.writeManifest(runDir, manifest);

if (!dryRun) {
  store.writeActiveRun(runId, manifest.workflow_name, projectRoot);
}

process.stdout.write(JSON.stringify({ run_id: runId, phases: eventIds.length, dry_run: dryRun }) + '\n');
