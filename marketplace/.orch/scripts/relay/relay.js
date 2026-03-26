#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const store = require('./event-store');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const projectRoot = process.cwd();

function loadConfig() {
  const defaults = {
    poll_interval_ms: 5000,
    max_concurrent_scripts: 4,
    max_concurrent_ai: 1,
    script_timeout_sec: 300,
    ai_timeout_sec: 600,
    retry_backoff_sec: [10, 30, 60],
    verbose: false
  };

  const configPath = path.join(projectRoot, '.orch/config.yaml');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    // Regex-parse the relay section
    const relayMatch = content.match(/relay:([\s\S]*?)(?=\n\w|\n$|$)/);
    if (relayMatch) {
      const block = relayMatch[1];
      const extract = (key, fallback) => {
        const re = new RegExp(`${key}:\\s*(.+?)\\s*$`, 'm');
        const m = block.match(re);
        return m ? m[1].trim() : fallback;
      };
      defaults.poll_interval_ms = parseInt(extract('poll_interval_ms', defaults.poll_interval_ms), 10);
      defaults.max_concurrent_scripts = parseInt(extract('max_concurrent_scripts', defaults.max_concurrent_scripts), 10);
      defaults.max_concurrent_ai = parseInt(extract('max_concurrent_ai', defaults.max_concurrent_ai), 10);
      defaults.script_timeout_sec = parseInt(extract('script_timeout_sec', defaults.script_timeout_sec), 10);
      defaults.ai_timeout_sec = parseInt(extract('ai_timeout_sec', defaults.ai_timeout_sec), 10);

      const backoffMatch = block.match(/retry_backoff_sec:\s*\[(.+?)\]/);
      if (backoffMatch) {
        defaults.retry_backoff_sec = backoffMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      }
    }
  } catch (err) {
    // Config file not found — use defaults
  }

  return defaults;
}

// Parse CLI arguments
const cliArgs = process.argv.slice(2);
const config = loadConfig();

// AI dispatch mode: "safe" (default) pauses before AI phases, "auto" dispatches via code chat
config.ai_mode = 'safe';

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === '--poll-interval' && cliArgs[i + 1]) {
    config.poll_interval_ms = parseInt(cliArgs[++i], 10);
  } else if (cliArgs[i] === '--max-scripts' && cliArgs[i + 1]) {
    config.max_concurrent_scripts = parseInt(cliArgs[++i], 10);
  } else if (cliArgs[i] === '--verbose') {
    config.verbose = true;
  } else if (cliArgs[i] === '--auto') {
    config.ai_mode = 'auto';
  }
}

// Also check config.yaml auto_mode
try {
  const configContent = fs.readFileSync(path.join(projectRoot, '.orch/config.yaml'), 'utf8');
  const modeMatch = configContent.match(/auto_mode:\s*(\w+)/);
  if (modeMatch && modeMatch[1] === 'all' && config.ai_mode === 'safe') {
    config.ai_mode = 'auto'; // config says all, upgrade from safe
  }
} catch {}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const runningScripts = new Map(); // eventId -> child process
let runningAI = null;             // eventId or null
let pollTimer = null;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[relay ${ts}] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Handle phase failure using the on_failure strategy from the YAML
// ---------------------------------------------------------------------------

function handlePhaseFailure(event, events, runDir) {
  const strategy = event.verify?.on_failure || event.on_failure || 'pause';

  switch (strategy) {
    case 'stop':
      // Halt everything — set all non-terminal events to 'dead'
      for (const e of events) {
        if (!['complete', 'dead', 'skipped'].includes(e.lifecycle.status)) {
          store.updateStatus(e, 'dead');
          store.writeEvent(runDir, e);
        }
      }
      log('STOP: Workflow halted due to failure in ' + event.identity.phase_name);
      break;

    case 'pause':
      // Mark as awaiting-approval — user must decide
      store.updateStatus(event, 'awaiting-approval');
      store.writeEvent(runDir, event);
      log('PAUSED: ' + event.identity.phase_name + ' failed. Review and approve/skip to continue.');
      break;

    case 'rollback-to-checkpoint':
      // Find the previous checkpoint tag and reset
      const prevCompleted = events
        .filter(e => e.lifecycle.status === 'complete' && e.checkpoint?.git_tag)
        .sort((a, b) => (a.lifecycle.completed_at || '').localeCompare(b.lifecycle.completed_at || ''))
        .pop();
      if (prevCompleted?.checkpoint?.git_tag) {
        try {
          execSync('git reset --hard ' + prevCompleted.checkpoint.git_tag, { cwd: projectRoot, stdio: 'pipe' });
          log('ROLLBACK: Reset to checkpoint ' + prevCompleted.checkpoint.git_tag);
        } catch (err) {
          log('ROLLBACK FAILED: ' + err.message);
        }
      }
      // After rollback, pause for user review
      store.updateStatus(event, 'awaiting-approval');
      store.writeEvent(runDir, event);
      break;

    case 'continue':
      // Skip this phase and let dependents continue
      store.updateStatus(event, 'skipped');
      store.writeEvent(runDir, event);
      log('SKIPPED: ' + event.identity.phase_name + ' (on-failure: continue)');
      break;

    case 'report-as-partial':
      // Skip and mark for partial reporting
      store.updateStatus(event, 'skipped');
      event.result = event.result || {};
      event.result.partial = true;
      store.writeEvent(runDir, event);
      log('PARTIAL: ' + event.identity.phase_name + ' skipped, will report as partial');
      break;

    default:
      // Default to pause
      store.updateStatus(event, 'awaiting-approval');
      store.writeEvent(runDir, event);
      log('PAUSED: ' + event.identity.phase_name + ' failed (unknown strategy: ' + strategy + ')');
  }
}

// ---------------------------------------------------------------------------
// Process completion marker (AI phases)
// ---------------------------------------------------------------------------

function processCompletion(event, marker, runDir, events) {
  if (marker.status === 'complete') {
    event.result = {
      exit_code: 0,
      summary: marker.summary || '',
      files_modified: marker.files_modified || [],
      collected: marker.collected || {},
      duration_sec: (Date.now() - new Date(event.lifecycle.started_at).getTime()) / 1000
    };

    // Git checkpoint
    if (event.checkpoint && event.checkpoint.enabled) {
      try {
        execSync('git add -A && git commit -m "orch: ' + event.identity.phase_name.replace(/"/g, '\\"') + '"', {
          cwd: projectRoot, stdio: 'pipe'
        });
      } catch (err) {
        // Commit may fail if nothing changed — not fatal
      }
    }

    store.updateStatus(event, 'complete');
    store.writeEvent(runDir, event);
    log('Complete (AI): ' + event.identity.phase_name);
  } else {
    event.retry.last_error = marker.error || 'AI phase failed';
    if (event.retry.attempt < event.retry.max_retries) {
      store.updateStatus(event, 'retrying');
      store.writeEvent(runDir, event);
      log('Retrying (AI): ' + event.identity.phase_name + ' (' + event.retry.attempt + '/' + event.retry.max_retries + ')');
    } else {
      handlePhaseFailure(event, events, runDir);
      log('Failed (AI): ' + event.identity.phase_name + ' — max retries exhausted, strategy: ' + (event.on_failure || 'pause'));
    }
  }

  runningAI = null;
}

// ---------------------------------------------------------------------------
// Handle timeout
// ---------------------------------------------------------------------------

function handleTimeout(event, runDir, events) {
  event.retry.last_error = 'Timeout after ' + config.ai_timeout_sec + 's';
  if (event.retry.attempt < event.retry.max_retries) {
    store.updateStatus(event, 'retrying');
    store.writeEvent(runDir, event);
    log('Timeout (AI): ' + event.identity.phase_name + ' — will retry');
  } else {
    handlePhaseFailure(event, events, runDir);
    log('Timeout (AI): ' + event.identity.phase_name + ' — max retries exhausted, strategy: ' + (event.on_failure || 'pause'));
  }
  runningAI = null;
}

// ---------------------------------------------------------------------------
// Dispatch a script phase
// ---------------------------------------------------------------------------

function dispatchScript(event, runDir, events) {
  store.updateStatus(event, 'running');
  event.retry.attempt++;
  store.writeEvent(runDir, event);

  const scriptPath = event.execution.script_path;
  log('Script start: ' + event.identity.phase_name + ' (' + scriptPath + ')');

  const child = spawn('node', [scriptPath, projectRoot], {
    cwd: projectRoot,
    timeout: config.script_timeout_sec * 1000,
    env: Object.assign({}, process.env, {
      ORCH_EVENT_ID: event.identity.event_id,
      ORCH_RUN_DIR: runDir
    })
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', function (d) { stdout += d; });
  child.stderr.on('data', function (d) {
    stderr += d;
    if (config.verbose) process.stderr.write(d);
  });

  child.on('error', function (err) {
    event.retry.last_error = 'Spawn error: ' + err.message;
    event.result = { exit_code: -1, duration_sec: (Date.now() - new Date(event.lifecycle.started_at).getTime()) / 1000 };
    if (event.retry.attempt < event.retry.max_retries) {
      store.updateStatus(event, 'retrying');
      store.writeEvent(runDir, event);
      log('Failed (spawn): ' + event.identity.phase_name + ' — ' + err.message);
    } else {
      handlePhaseFailure(event, events, runDir);
      log('Failed (spawn): ' + event.identity.phase_name + ' — ' + err.message + ' — strategy: ' + (event.on_failure || 'pause'));
    }
    runningScripts.delete(event.identity.event_id);
  });

  child.on('close', function (code) {
    const durationSec = (Date.now() - new Date(event.lifecycle.started_at).getTime()) / 1000;

    if (code === 0) {
      let output = {};
      try { output = JSON.parse(stdout); } catch (err) {
        // stdout might not be JSON — wrap it
        output = { raw: stdout.trim() };
      }

      event.result = {
        exit_code: 0,
        output_path: path.join(runDir, event.identity.event_id + '.output.json'),
        files_modified: output.files_modified || [],
        duration_sec: durationSec,
        collected: output.collected || output,
        summary: output.summary || 'Script completed successfully'
      };

      try {
        fs.writeFileSync(event.result.output_path, JSON.stringify(output, null, 2));
      } catch (err) {
        log('Warning: could not write output file: ' + err.message);
      }

      // Git checkpoint
      if (event.checkpoint && event.checkpoint.enabled) {
        try {
          execSync('git add -A && git commit -m "orch: ' + event.identity.phase_name.replace(/"/g, '\\"') + '"', {
            cwd: projectRoot, stdio: 'pipe'
          });
          event.checkpoint.git_tag = 'orch/' + event.identity.event_id;
          execSync('git tag ' + event.checkpoint.git_tag, { cwd: projectRoot, stdio: 'pipe' });
        } catch (err) {
          // Git operations may fail — not fatal
        }
      }

      store.updateStatus(event, 'complete');
      store.writeEvent(runDir, event);
      log('Complete (script): ' + event.identity.phase_name + ' (' + durationSec.toFixed(1) + 's)');
    } else {
      event.retry.last_error = stderr.slice(-500);
      event.result = { exit_code: code, duration_sec: durationSec };

      if (event.retry.attempt < event.retry.max_retries) {
        store.updateStatus(event, 'retrying');
        store.writeEvent(runDir, event);
        log('Failed (script): ' + event.identity.phase_name + ' — retrying (' + event.retry.attempt + '/' + event.retry.max_retries + ')');
      } else {
        handlePhaseFailure(event, events, runDir);
        log('Failed (script): ' + event.identity.phase_name + ' — max retries exhausted, strategy: ' + (event.on_failure || 'pause'));
      }
    }

    runningScripts.delete(event.identity.event_id);
  });

  runningScripts.set(event.identity.event_id, child);
}

// ---------------------------------------------------------------------------
// Dispatch an AI phase
// ---------------------------------------------------------------------------

function dispatchAI(event, runDir) {
  const promptFile = path.join(runDir, event.identity.event_id + '.prompt.md');

  // ── Safe mode: pause and wait for user approval ──
  if (config.ai_mode === 'safe') {
    store.updateStatus(event, 'awaiting-approval');
    store.writeEvent(runDir, event);
    log('');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('⏸  AI phase ready: ' + event.identity.phase_name);
    log('   Skill: ' + event.identity.skill);
    log('   Prompt: ' + promptFile);
    log('');
    log('   Review the prompt, then:');
    log('     @angular approve          → execute this phase');
    log('     @angular approve-all      → execute all remaining phases (auto mode)');
    log('     @angular skip             → skip this phase');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('');
    return; // don't dispatch — wait for user action
  }

  // ── Auto mode: dispatch via code chat immediately ──
  store.updateStatus(event, 'running');
  event.retry.attempt++;
  store.writeEvent(runDir, event);
  runningAI = event.identity.event_id;

  // Rebuild prompt with collected data from completed dependencies
  try {
    const promptBuilder = require('./prompt-builder');
    promptBuilder.buildPrompt(event, runDir, projectRoot);
    log('  Prompt rebuilt with dependency data');
  } catch (err) {
    log('  Warning: prompt rebuild failed: ' + err.message);
  }

  log('AI start: ' + event.identity.phase_name + ' — sending to Copilot Chat');

  try {
    // Map short agent names from YAML to full VS Code agent names
    var rawAgent = event.identity.agent || 'angular';
    var agentMap = {
      'planner': 'angular-planner',
      'engineer': 'angular-engineer',
      'verifier': 'angular-verifier',
      'angular': 'angular',
      'orch': 'orch',
      'docs': 'docs',
      'audit': 'audit',
      'local': 'local'
    };
    const agentName = agentMap[rawAgent] || rawAgent;
    const cmd = 'code chat --mode agent --reuse-window --add-file "' + promptFile + '" "@' + agentName + ' Execute the phase described in the attached prompt file. When complete, you MUST create the completion marker file specified at the end of the prompt. Do NOT ask follow-up questions. Do NOT offer next steps. Just execute, write the marker, and stop."';
    const child = spawn('sh', ['-c', cmd], { detached: true, stdio: 'ignore' });
    child.unref();
    log('  Sent to @' + agentName + ' via code chat');
  } catch (err) {
    log('  code chat failed: ' + err.message + '. Prompt file ready for manual invocation.');
    store.updateStatus(event, 'awaiting-ai');
    store.writeEvent(runDir, event);
    runningAI = null;
  }
}

// Handle user approval commands (read from a signal file)
function checkApprovalSignals(runDir, events) {
  const signalFile = path.join(runDir, 'approval-signal.json');
  try {
    const signal = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    fs.unlinkSync(signalFile); // consume the signal

    if (signal.action === 'approve') {
      // Approve one specific phase
      const event = events.find(e => e.lifecycle.status === 'awaiting-approval');
      if (event) {
        config.ai_mode = 'auto'; // temporarily switch for this dispatch
        dispatchAI(event, runDir);
        config.ai_mode = 'safe'; // switch back for next phase
      }
    } else if (signal.action === 'approve-all') {
      // Switch to auto mode for all remaining phases
      config.ai_mode = 'auto';
      log('✓ Switched to auto mode — all remaining AI phases will run automatically');
      const event = events.find(e => e.lifecycle.status === 'awaiting-approval');
      if (event) {
        dispatchAI(event, runDir);
      }
    } else if (signal.action === 'skip') {
      const event = events.find(e => e.lifecycle.status === 'awaiting-approval');
      if (event) {
        store.updateStatus(event, 'skipped');
        store.writeEvent(runDir, event);
        log('⏭ Skipped: ' + event.identity.phase_name);
      }
    }
  } catch {
    // No signal file — normal, just continue polling
  }
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------

function poll() {
  const activeRun = store.readActiveRun(projectRoot);
  if (!activeRun) return;

  const runDir = path.join(projectRoot, '.orch/workflow-state/events', activeRun.run_id);
  const events = store.readAllEvents(runDir);
  if (!events.length) return;

  // 0. Check for user approval signals (safe mode)
  checkApprovalSignals(runDir, events);

  // 1. Check completion markers for running AI phases
  for (const event of events) {
    if (event.lifecycle.status === 'running' && event.execution.type === 'ai') {
      const marker = store.checkCompletionMarker(runDir, event.identity.event_id);
      if (marker) {
        processCompletion(event, marker, runDir, events);
      } else if (event.lifecycle.started_at) {
        // Check timeout
        const elapsed = (Date.now() - new Date(event.lifecycle.started_at).getTime()) / 1000;
        if (elapsed > config.ai_timeout_sec) {
          handleTimeout(event, runDir, events);
        }
      }
    }
    // Also check awaiting-ai phases for manual completion
    if (event.lifecycle.status === 'awaiting-ai') {
      const marker = store.checkCompletionMarker(runDir, event.identity.event_id);
      if (marker) {
        processCompletion(event, marker, runDir, events);
      }
    }
  }

  // 2. Resolve dependencies: queued -> ready
  for (const event of events) {
    if (event.lifecycle.status === 'queued') {
      const deps = event.dependencies.depends_on;
      if (!deps || deps.length === 0) {
        store.updateStatus(event, 'ready');
        store.writeEvent(runDir, event);
        log('Phase ' + event.identity.event_id + ' (' + event.identity.phase_name + ') -> ready (no deps)');
        continue;
      }
      // BUG #15 fix: treat both 'complete' and 'skipped' as satisfied dependencies
      const allSatisfied = deps.every(function (depId) {
        const dep = events.find(function (e) { return e.identity.event_id === depId; });
        return dep && (dep.lifecycle.status === 'complete' || dep.lifecycle.status === 'skipped');
      });
      if (allSatisfied) {
        store.updateStatus(event, 'ready');
        store.writeEvent(runDir, event);
        log('Phase ' + event.identity.event_id + ' (' + event.identity.phase_name + ') -> ready');
      }
      // Check if any dependency is dead — skip this phase
      const anyDead = deps.some(function (depId) {
        const dep = events.find(function (e) { return e.identity.event_id === depId; });
        return dep && dep.lifecycle.status === 'dead';
      });
      if (anyDead) {
        store.updateStatus(event, 'skipped');
        store.writeEvent(runDir, event);
        log('Phase ' + event.identity.event_id + ' (' + event.identity.phase_name + ') -> skipped (dead dependency)');
      }
    }
  }

  // 3. Handle retries with backoff
  for (const event of events) {
    if (event.lifecycle.status === 'retrying') {
      const attemptIdx = Math.min(event.retry.attempt - 1, config.retry_backoff_sec.length - 1);
      const backoffSec = config.retry_backoff_sec[attemptIdx] || 60;
      const failedEntries = event.lifecycle.status_history.filter(function (h) {
        return h.status === 'failed' || h.status === 'retrying';
      });
      const lastFailedAt = failedEntries.length > 0
        ? new Date(failedEntries[failedEntries.length - 1].at).getTime()
        : 0;
      if (Date.now() - lastFailedAt > backoffSec * 1000) {
        store.updateStatus(event, 'ready');
        store.writeEvent(runDir, event);
        log('Phase ' + event.identity.event_id + ' retry ' + event.retry.attempt + ' -> ready');
      }
    }
  }

  // 4. Dispatch ready events
  const readyEvents = events.filter(function (e) { return e.lifecycle.status === 'ready'; });
  for (const event of readyEvents) {
    if (event.execution.type === 'synthetic') {
      // BUG #22: Synthetic "done" events auto-complete when they become ready.
      // Their dependency (last sub-phase) is already complete — just mark done.
      store.updateStatus(event, 'complete');
      event.result = { exit_code: 0, summary: 'Batch complete (synthetic)', duration_sec: 0 };
      store.writeEvent(runDir, event);
      log('Complete (synthetic): ' + event.identity.phase_name);
    } else if (event.execution.type === 'script') {
      if (runningScripts.size < config.max_concurrent_scripts) {
        dispatchScript(event, runDir, events);
      }
    } else if (event.execution.type === 'ai') {
      if (!runningAI) {
        dispatchAI(event, runDir);
      }
    }
  }

  // 5. Check workflow completion
  const monitor = require('./monitor');
  const progress = monitor.getProgress(events);

  if (monitor.isWorkflowComplete(events)) {
    const manifest = store.readManifest(runDir);
    if (manifest) {
      monitor.triggerPostWorkflow(runDir, manifest, events, projectRoot);
    }
    store.clearActiveRun(projectRoot);
    log('Workflow complete! ' + progress.completed + '/' + progress.total + ' phases.');

    // Clean up running processes
    for (const [, child] of runningScripts) {
      try { child.kill(); } catch (err) { /* ignore */ }
    }
    if (pollTimer) clearInterval(pollTimer);
    process.exit(0);
  }

  // 6. Print progress
  log('Progress: ' + progress.completed + '/' + progress.total +
    ' (' + progress.pct + '%) | running: ' + progress.running +
    ' | ready: ' + progress.ready +
    ' | queued: ' + progress.queued +
    (progress.failed > 0 ? ' | failed: ' + progress.failed : ''));
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  log('Received ' + signal + ' — shutting down');
  if (pollTimer) clearInterval(pollTimer);
  for (const [eventId, child] of runningScripts) {
    log('Killing script process for ' + eventId);
    try { child.kill('SIGTERM'); } catch (err) { /* ignore */ }
  }
  process.exit(0);
}

process.on('SIGINT', function () { shutdown('SIGINT'); });
process.on('SIGTERM', function () { shutdown('SIGTERM'); });

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

log('ORCH Relay started. Polling every ' + config.poll_interval_ms + 'ms');
log('Config: max_scripts=' + config.max_concurrent_scripts +
  ' max_ai=' + config.max_concurrent_ai +
  ' script_timeout=' + config.script_timeout_sec + 's' +
  ' ai_timeout=' + config.ai_timeout_sec + 's');

poll(); // Run immediately on startup
pollTimer = setInterval(poll, config.poll_interval_ms);
