#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const store = require('./event-store');
const promptBuilder = require('./prompt-builder');

// ---------------------------------------------------------------------------
// Template variable resolution
// ---------------------------------------------------------------------------

/**
 * Resolve template variables like {{from}}, {{to}}, {{feature-name}} in a string.
 * Looks up values from the context object. Handles both dash-case and underscore_case.
 * Returns the string with resolved values. Unresolved variables are left as-is.
 */
function resolveTemplates(str, context) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w[\w-]*)\}\}/g, (match, key) => {
    // Try exact key, then normalized (dash to underscore)
    const normalized = key.replace(/-/g, '_');
    if (context[key] !== undefined) return String(context[key]);
    if (context[normalized] !== undefined) return String(context[normalized]);
    // Special: {{date}} resolves to YYYY-MM-DD
    if (key === 'date') return new Date().toISOString().slice(0, 10);
    return match; // leave unresolved
  });
}

// ---------------------------------------------------------------------------
// Simple regex-based YAML parser (avoids external dependencies)
// ---------------------------------------------------------------------------

function parseWorkflowYaml(content) {
  const nameMatch = content.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  const triggerMatch = content.match(/^trigger:\s*["']?(.+?)["']?\s*$/m);

  const name = nameMatch ? nameMatch[1].trim() : 'unnamed-workflow';
  const trigger = triggerMatch ? triggerMatch[1].trim() : 'manual';

  // Extract report section
  const reportTitleMatch = content.match(/^\s+title:\s*["']?(.+?)["']?\s*$/m);
  const reportTemplateMatch = content.match(/^\s+template:\s*["']?(.+?)["']?\s*$/m);
  const report = reportTitleMatch ? {
    title: reportTitleMatch[1].trim(),
    template: reportTemplateMatch ? reportTemplateMatch[1].trim() : null
  } : null;

  // Extract post-workflow git section
  const gitMsgMatch = content.match(/^\s+message:\s*["']?(.+?)["']?\s*$/m);
  const gitTagMatch = content.match(/^\s+tag:\s*["']?(.+?)["']?\s*$/m);
  const post_workflow = (gitMsgMatch || gitTagMatch) ? {
    git_message: gitMsgMatch ? gitMsgMatch[1].trim() : null,
    git_tag: gitTagMatch ? gitTagMatch[1].trim() : null
  } : null;

  const phases = [];
  const phasesStart = content.indexOf('phases:');
  if (phasesStart === -1) return { name, trigger, phases, report, post_workflow };

  const phasesBlock = content.slice(phasesStart);
  // Split on `  - name:` entries (two-space indent before dash)
  const phaseChunks = phasesBlock.split(/\n\s*-\s+name:\s*/);
  phaseChunks.shift(); // discard the `phases:` header chunk

  for (const chunk of phaseChunks) {
    const lines = chunk.split('\n');
    const phaseName = lines[0].replace(/["']/g, '').trim();

    const extract = (key) => {
      const re = new RegExp(`^\\s+${key}:\\s*["']?(.+?)["']?\\s*$`, 'm');
      const m = chunk.match(re);
      return m ? m[1].trim() : null;
    };

    const extractBool = (key) => {
      const v = extract(key);
      if (v === null) return false;
      return v === 'true' || v === 'yes';
    };

    const extractList = (key) => {
      // Check for inline empty array: `key: []`
      const emptyRe = new RegExp(`^\\s+${key}:\\s*\\[\\s*\\]`, 'm');
      if (emptyRe.test(chunk)) return [];

      // Check for inline populated array: `key: ["a", "b"]`
      const re = new RegExp(`^\\s+${key}:\\s*\\[(.+?)\\]`, 'm');
      const m = chunk.match(re);
      if (m) {
        return m[1].split(',').map(s => s.replace(/["'\s]/g, '').trim()).filter(Boolean);
      }

      // Try multi-line list (key followed by newline then dash items)
      const mlRe = new RegExp(`^\\s+${key}:\\s*$`, 'm');
      if (mlRe.test(chunk)) {
        const idx = chunk.search(mlRe);
        const after = chunk.slice(idx);
        const items = [];
        const afterLines = after.split('\n').slice(1);
        for (const line of afterLines) {
          const im = line.match(/^\s+-\s+["']?(.+?)["']?\s*$/);
          if (im) items.push(im[1].trim());
          else if (line.trim() && !/^\s+-/.test(line)) break;
        }
        return items;
      }

      // Key not present at all — return null to distinguish from explicit empty
      return null;
    };

    // Handle both skill: (singular) and skills: (plural multi-line list)
    const singleSkill = extract('skill');
    const multiSkills = extractList('skills');
    const skill = singleSkill || (multiSkills && multiSkills.length > 0 ? multiSkills[0] : null);
    const allSkills = multiSkills && multiSkills.length > 0 ? multiSkills : (singleSkill ? [singleSkill] : []);

    phases.push({
      name: phaseName,
      id: extract('id') || phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      agent: extract('agent') || null,
      skill: skill,
      skills: allSkills,
      args: extract('args') || null,
      execution_type: extract('execution_type') || null,
      checkpoint: extractBool('checkpoint'),
      verify: extract('verify') || null,
      approval: extract('approval') || null,
      on_failure: extract('on-failure') || 'retry',
      depends_on: extractList('depends_on'),
      collect: extractList('collect'),
      report_section: extract('report-section') || null
    });
  }

  return { name, trigger, phases, report, post_workflow };
}

// ---------------------------------------------------------------------------
// Determine execution type for a phase
// ---------------------------------------------------------------------------

function resolveExecutionType(phase, projectRoot) {
  // Check explicit execution_type from YAML before auto-detection
  if (phase.execution_type === 'ai') return { type: 'ai', scriptPath: null };
  if (phase.execution_type === 'script') {
    // Still try to locate the script file for script-typed phases
    const skill = phase.skill;
    if (skill) {
      const skillName = skill.replace(/^\//, '');
      const scriptsDir = path.join(projectRoot, '.github/skills', skillName, 'scripts');
      try {
        const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
        if (files.length > 0) {
          return { type: 'script', scriptPath: path.join(scriptsDir, files[0]) };
        }
      } catch (err) { /* fall through */ }
    }
    return { type: 'script', scriptPath: null };
  }

  // Auto-detect from scripts/ directory (original behavior)
  const skill = phase.skill;
  if (!skill) return { type: 'ai', scriptPath: null };

  const skillName = skill.replace(/^\//, '');
  const scriptsDir = path.join(projectRoot, '.github/skills', skillName, 'scripts');

  try {
    const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js')).sort();
    if (files.length > 0) {
      // Pick the best script: prefer index.js, main.js, or name matching the skill
      const shortName = skillName.replace('angular-', '').replace('local-', '').replace('audit-', '').replace('docs-', '').replace('present-', '');
      const preferred = files.find(f => f === 'index.js')
        || files.find(f => f === 'main.js')
        || files.find(f => f.replace('.js', '').includes(shortName.replace(/-/g, '')))
        || files.find(f => shortName.includes(f.replace('.js', '').replace('scan-', '').replace('detect-', '').replace('aggregate-', '')))
        || files[0];
      return {
        type: 'script',
        scriptPath: path.join(scriptsDir, preferred)
      };
    }
  } catch (err) {
    // Directory doesn't exist or unreadable — treat as AI phase
  }

  return { type: 'ai', scriptPath: null };
}

// ---------------------------------------------------------------------------
// Build a full event object
// ---------------------------------------------------------------------------

function buildEvent(runId, workflowName, phase, index, totalPhases, execInfo, previousEventId, context) {
  const eventId = String(index + 1).padStart(3, '0');
  const deps = Array.isArray(phase.depends_on)
    ? phase.depends_on    // trust the YAML (even if empty = no deps = parallel)
    : (previousEventId ? [previousEventId] : []);  // fallback only when depends_on not declared
  const initialStatus = deps.length === 0 ? 'ready' : 'queued';
  const now = new Date().toISOString();

  // Resolve template variables in phase fields
  const resolvedArgs = resolveTemplates(phase.args, context || {});
  const resolvedReportSection = resolveTemplates(phase.report_section, context || {});

  return {
    identity: {
      event_id: eventId,
      run_id: runId,
      workflow_name: workflowName,
      phase_name: phase.name,
      phase_id: phase.id,
      agent: phase.agent,
      skill: phase.skill,
      skills: phase.skills || (phase.skill ? [phase.skill] : []),
      sequence: index + 1,
      total_phases: totalPhases
    },
    execution: {
      type: execInfo.type,
      script_path: execInfo.scriptPath,
      args: resolvedArgs
    },
    dependencies: {
      depends_on: deps
    },
    lifecycle: {
      status: initialStatus,
      status_history: [{ status: initialStatus, at: now }],
      created_at: now,
      ready_at: initialStatus === 'ready' ? now : null,
      started_at: null,
      completed_at: null
    },
    checkpoint: {
      enabled: phase.checkpoint,
      git_tag: null
    },
    retry: {
      max_retries: phase.on_failure === 'skip' ? 0 : 3,
      attempt: 0,
      last_error: null
    },
    collect: phase.collect,
    report_section: resolvedReportSection,
    verify: phase.verify,
    approval: phase.approval,
    on_failure: phase.on_failure,
    context: context || {},
    result: null
  };
}

// ---------------------------------------------------------------------------
// Main publish routine
// ---------------------------------------------------------------------------

function publish(args) {
  const dryRun = args.includes('--dry-run');
  const positional = args.filter(a => !a.startsWith('--'));

  if (positional.length < 1) {
    process.stderr.write('Usage: node publish.js <workflow-yaml> [context-json] [--dry-run]\n');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const yamlPath = path.resolve(positional[0]);

  if (!fs.existsSync(yamlPath)) {
    process.stderr.write(`Error: workflow file not found: ${yamlPath}\n`);
    process.exit(1);
  }

  // Parse context
  let context = {};
  if (positional[1]) {
    try {
      context = JSON.parse(positional[1]);
    } catch (err) {
      // Maybe it's a file path
      try {
        context = JSON.parse(fs.readFileSync(path.resolve(positional[1]), 'utf8'));
      } catch (err2) {
        process.stderr.write(`Warning: could not parse context argument, using empty context\n`);
      }
    }
  }

  // Parse workflow YAML
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const workflow = parseWorkflowYaml(yamlContent);

  if (workflow.phases.length === 0) {
    process.stderr.write('Error: no phases found in workflow YAML\n');
    process.exit(1);
  }

  // Generate run ID
  const now = new Date();
  const runId = 'run-' + now.toISOString().replace(/[:.]/g, '-').replace('Z', 'Z');

  // Create run directory
  const runDir = store.createRunDir(runId, projectRoot);
  process.stderr.write(`Run: ${runId}\n`);
  process.stderr.write(`Directory: ${runDir}\n`);

  // Build and write events
  let previousEventId = null;
  const eventIds = [];

  for (let i = 0; i < workflow.phases.length; i++) {
    const phase = workflow.phases[i];
    const execInfo = resolveExecutionType(phase, projectRoot);
    const event = buildEvent(
      runId, workflow.name, phase, i, workflow.phases.length,
      execInfo, previousEventId, context
    );

    // At publish time: write skeleton prompt (no dependency data yet)
    if (execInfo.type === 'ai') {
      try {
        promptBuilder.buildSkeletonPrompt(event, runDir, projectRoot);
      } catch (err) {
        process.stderr.write(`Warning: prompt build failed for ${event.identity.event_id}: ${err.message}\n`);
      }
    }

    store.writeEvent(runDir, event);
    eventIds.push(event.identity.event_id);
    previousEventId = event.identity.event_id;
    process.stderr.write(`  Phase ${event.identity.event_id}: ${phase.name} [${execInfo.type}] (${event.lifecycle.status})\n`);
  }

  // Write manifest (with template resolution for report/post_workflow)
  const manifest = {
    workflow_name: workflow.name,
    trigger: workflow.trigger,
    run_id: runId,
    created_at: now.toISOString(),
    completed_at: null,
    status: 'running',
    total_phases: workflow.phases.length,
    event_ids: eventIds,
    context: context,
    report: workflow.report ? {
      title: resolveTemplates(workflow.report.title, context),
      template: workflow.report.template
    } : null,
    post_workflow: workflow.post_workflow ? {
      git_message: resolveTemplates(workflow.post_workflow.git_message, context),
      git_tag: resolveTemplates(workflow.post_workflow.git_tag, context)
    } : null
  };
  store.writeManifest(runDir, manifest);

  // Write active run marker (unless dry run)
  if (!dryRun) {
    store.writeActiveRun(runId, workflow.name, projectRoot);
  } else {
    process.stderr.write('(dry-run: skipping active-run.json)\n');
  }

  // Output run ID to stdout for scripting
  process.stdout.write(runId + '\n');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  publish(process.argv.slice(2));
}

module.exports = { publish, parseWorkflowYaml, resolveTemplates };
