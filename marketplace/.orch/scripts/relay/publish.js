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

    // Parse pre-check and post-check nested blocks
    const extractNestedBlock = (blockName) => {
      const blockRe = new RegExp(`^\\s+${blockName}:\\s*$`, 'm');
      if (!blockRe.test(chunk)) return null;
      const blockStart = chunk.search(blockRe);
      const blockContent = chunk.slice(blockStart);
      const blockLines = blockContent.split('\n').slice(1); // skip the header line
      const block = {};
      for (const line of blockLines) {
        const kv = line.match(/^\s+(skill|args|capture):\s*["']?(.+?)["']?\s*$/);
        if (kv) block[kv[1]] = kv[2].trim();
        else if (line.trim() && !/^\s+\w+:/.test(line)) break; // end of nested block
      }
      return Object.keys(block).length > 0 ? block : null;
    };

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
      on_failure: extract('on-failure') || 'pause',
      depends_on: extractList('depends_on'),
      collect: extractList('collect'),
      pre_check: extractNestedBlock('pre-check'),
      post_check: extractNestedBlock('post-check'),
      report_section: extract('report-section') || null
    });
  }

  return { name, trigger, phases, report, post_workflow };
}

// ---------------------------------------------------------------------------
// Context config + phase decomposition helpers
// ---------------------------------------------------------------------------

function readContextConfig(projectRoot) {
  const defaults = { batch_size: 10, prompt_style: 'lazy', soft_budget_tokens: 8000, max_inherited_phases: 5 };
  try {
    const content = fs.readFileSync(path.join(projectRoot, '.orch/config.yaml'), 'utf8');
    const contextMatch = content.match(/context:([\s\S]*?)(?=\n\w|\n$|$)/);
    if (contextMatch) {
      const block = contextMatch[1];
      const extract = (key, fallback) => {
        const re = new RegExp(`${key}:\\s*(.+?)\\s*$`, 'm');
        const m = block.match(re);
        return m ? m[1].trim() : fallback;
      };
      defaults.batch_size = parseInt(extract('batch_size', defaults.batch_size), 10);
      defaults.prompt_style = extract('prompt_style', defaults.prompt_style);
      defaults.soft_budget_tokens = parseInt(extract('soft_budget_tokens', defaults.soft_budget_tokens), 10);
      defaults.max_inherited_phases = parseInt(extract('max_inherited_phases', defaults.max_inherited_phases), 10);
    }
  } catch (err) {
    // Config file not found — use defaults
  }
  return defaults;
}

function detectFilesForPhase(phase, projectRoot) {
  // Only decompose if the skill has a detection script
  const skill = phase.skill;
  if (!skill) return null;

  const skillName = skill.replace(/^\//, '');
  const scriptsDir = path.join(projectRoot, '.github/skills', skillName, 'scripts');

  try {
    const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js') && f.startsWith('detect'));
    if (scripts.length === 0) return null;

    // Run the detection script
    const { execSync } = require('child_process');
    const output = execSync(`node ${path.join(scriptsDir, scripts[0])} ${projectRoot}`, {
      cwd: projectRoot,
      timeout: 30000,
      encoding: 'utf8'
    });

    const result = JSON.parse(output);
    // Detection scripts output various formats — look for file lists
    const files = result.files || result.untestedFiles || result.modules || [];
    if (Array.isArray(files) && files.length > 0) {
      // Extract file paths from objects if needed
      return files.map(f => typeof f === 'string' ? f : f.file || f.path || f.name).filter(Boolean);
    }
  } catch (err) {
    // Detection script failed or not found — skip decomposition
  }

  return null;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
      git_tag: null,
      pre_check: phase.pre_check || null,
      post_check: phase.post_check || null
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
    const eventId = String(i + 1).padStart(3, '0');

    // Check if this phase should be decomposed into sub-phases
    const batchSize = readContextConfig(projectRoot).batch_size || 10;
    const filesToProcess = detectFilesForPhase(phase, projectRoot);

    if (filesToProcess && filesToProcess.length > batchSize) {
      // Split into sub-phases
      const batches = chunkArray(filesToProcess, batchSize);
      for (let b = 0; b < batches.length; b++) {
        const subPhaseId = eventId + String.fromCharCode(97 + b); // 001a, 001b, etc.
        const subEvent = buildEvent(
          runId, workflow.name, phase, i, workflow.phases.length,
          execInfo, previousEventId, context
        );
        subEvent.identity.event_id = subPhaseId;
        subEvent.identity.phase_name = `${phase.name} (batch ${b + 1} of ${batches.length})`;
        subEvent.context.batch_files = batches[b];
        subEvent.context.batch_index = b + 1;
        subEvent.context.batch_total = batches.length;
        // Sub-phases are sequential: each depends on the previous
        if (b > 0) {
          subEvent.dependencies.depends_on = [eventId + String.fromCharCode(96 + b)]; // depends on previous sub-phase
          subEvent.lifecycle.status = 'queued';
          subEvent.lifecycle.status_history = [{ status: 'queued', at: new Date().toISOString() }];
          subEvent.lifecycle.ready_at = null;
        }

        // At publish time: write skeleton prompt for AI sub-phases
        if (execInfo.type === 'ai') {
          try {
            promptBuilder.buildSkeletonPrompt(subEvent, runDir, projectRoot);
          } catch (err) {
            process.stderr.write(`Warning: prompt build failed for ${subPhaseId}: ${err.message}\n`);
          }
        }

        store.writeEvent(runDir, subEvent);
        eventIds.push(subPhaseId);
        previousEventId = subPhaseId;
        process.stderr.write(`  Phase ${subPhaseId}: ${phase.name} (batch ${b + 1}/${batches.length}) [${execInfo.type}] (${subEvent.lifecycle.status})\n`);
      }

      // BUG #22 fix: Create a synthetic "done" event with the original phase ID.
      // This preserves cross-phase dependencies — downstream phases that reference
      // the original ID (e.g., depends_on: ["005"]) will find this synthetic event.
      // It depends on the last sub-phase and auto-completes when the relay detects it.
      const lastSubId = eventId + String.fromCharCode(96 + batches.length); // last sub-phase
      const doneEvent = buildEvent(
        runId, workflow.name, phase, i, workflow.phases.length,
        { type: 'script', scriptPath: null }, lastSubId, context
      );
      doneEvent.identity.event_id = eventId; // original ID preserved
      doneEvent.identity.phase_name = `${phase.name} (done — synthetic)`;
      doneEvent.execution.type = 'synthetic'; // relay auto-completes this
      doneEvent.dependencies.depends_on = [lastSubId];
      doneEvent.lifecycle.status = 'queued';
      doneEvent.lifecycle.status_history = [{ status: 'queued', at: new Date().toISOString() }];
      store.writeEvent(runDir, doneEvent);
      eventIds.push(eventId);
      previousEventId = eventId; // downstream phases depend on the original ID
      process.stderr.write(`  Phase ${eventId}: ${phase.name} (synthetic done, depends on ${lastSubId})\n`);

      continue; // skip the normal single-event creation for this phase
    }

    // Version-step expansion: for angular-migrate-version with angular-core scope,
    // expand into one sub-phase per major version jump (16→17, 17→18, etc.)
    if (phase.skill === '/angular-migrate-version' &&
        phase.args && phase.args.includes('angular-core') &&
        context.from && context.to) {
      var fromMajor = parseInt(context.from, 10);
      var toMajor = parseInt(context.to, 10);

      if (!isNaN(fromMajor) && !isNaN(toMajor) && toMajor > fromMajor + 1) {
        // Multiple version jumps needed — create sub-phases
        var versionSteps = [];
        for (var v = fromMajor; v < toMajor; v++) {
          versionSteps.push({ from: v, to: v + 1 });
        }

        process.stderr.write(`  Expanding ${phase.name} into ${versionSteps.length} version steps: ${fromMajor}→${toMajor}\n`);

        for (var vs = 0; vs < versionSteps.length; vs++) {
          var step = versionSteps[vs];
          var subId = eventId + String.fromCharCode(97 + vs); // 004a, 004b, etc.
          var subEvent = buildEvent(
            runId, workflow.name, phase, i, workflow.phases.length,
            execInfo, previousEventId, context
          );
          subEvent.identity.event_id = subId;
          subEvent.identity.phase_name = `Upgrade Angular ${step.from} → ${step.to}`;
          subEvent.context = Object.assign({}, subEvent.context, {
            from: String(step.from),
            to: String(step.to),
            step_index: vs + 1,
            total_steps: versionSteps.length
          });
          if (vs > 0) {
            subEvent.dependencies.depends_on = [eventId + String.fromCharCode(96 + vs)];
            subEvent.lifecycle.status = 'queued';
            subEvent.lifecycle.status_history = [{ status: 'queued', at: new Date().toISOString() }];
            subEvent.lifecycle.ready_at = null;
          }

          if (execInfo.type === 'ai') {
            try { promptBuilder.buildSkeletonPrompt(subEvent, runDir, projectRoot); } catch (e) {}
          }

          store.writeEvent(runDir, subEvent);
          eventIds.push(subId);
          previousEventId = subId;
          process.stderr.write(`  Phase ${subId}: Upgrade Angular ${step.from} → ${step.to} [${execInfo.type}]\n`);
        }

        // Synthetic done event with original ID
        var lastVsId = eventId + String.fromCharCode(96 + versionSteps.length);
        var doneVsEvent = buildEvent(runId, workflow.name, phase, i, workflow.phases.length, { type: 'script', scriptPath: null }, lastVsId, context);
        doneVsEvent.identity.event_id = eventId;
        doneVsEvent.identity.phase_name = `${phase.name} (done — ${fromMajor}→${toMajor})`;
        doneVsEvent.execution.type = 'synthetic';
        doneVsEvent.dependencies.depends_on = [lastVsId];
        doneVsEvent.lifecycle.status = 'queued';
        doneVsEvent.lifecycle.status_history = [{ status: 'queued', at: new Date().toISOString() }];
        store.writeEvent(runDir, doneVsEvent);
        eventIds.push(eventId);
        previousEventId = eventId;

        continue;
      }
    }

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
