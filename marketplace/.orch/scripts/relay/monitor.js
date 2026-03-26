'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  /**
   * Calculate progress metrics for a set of events.
   * @param {object[]} events - Array of event objects
   * @returns {object} Progress summary with counts and percentage
   */
  getProgress(events) {
    const total = events.length;
    const completed = events.filter(function (e) { return e.lifecycle.status === 'complete'; }).length;
    const failed = events.filter(function (e) { return e.lifecycle.status === 'dead' || e.lifecycle.status === 'failed'; }).length;
    const running = events.filter(function (e) { return e.lifecycle.status === 'running' || e.lifecycle.status === 'awaiting-ai'; }).length;
    const ready = events.filter(function (e) { return e.lifecycle.status === 'ready'; }).length;
    const queued = events.filter(function (e) { return e.lifecycle.status === 'queued'; }).length;
    const skipped = events.filter(function (e) { return e.lifecycle.status === 'skipped'; }).length;
    const pct = total > 0 ? Math.round((completed + skipped) / total * 100) : 0;
    return { total: total, completed: completed, failed: failed, running: running, ready: ready, queued: queued, skipped: skipped, pct: pct };
  },

  /**
   * Determine whether all events have reached a terminal state.
   * @param {object[]} events - Array of event objects
   * @returns {boolean} True if all events are complete, dead, or skipped
   */
  isWorkflowComplete(events) {
    if (events.length === 0) return false;
    return events.every(function (e) {
      return e.lifecycle.status === 'complete' ||
             e.lifecycle.status === 'dead' ||
             e.lifecycle.status === 'skipped';
    });
  },

  /**
   * Run post-workflow tasks: collect results, generate report, tag, write legacy state.
   * @param {string} runDir - Path to the run directory
   * @param {object} manifest - Workflow manifest
   * @param {object[]} events - Array of event objects
   * @param {string} projectRoot - Project root path
   */
  triggerPostWorkflow(runDir, manifest, events, projectRoot) {
    // Collect all results from completed phases
    const collected = {};
    for (const event of events) {
      if (event.result && event.result.collected) {
        collected[event.identity.event_id] = {
          phase: event.identity.phase_name,
          status: event.lifecycle.status
        };
        // Merge collected data
        const data = event.result.collected;
        if (data && typeof data === 'object') {
          Object.assign(collected[event.identity.event_id], data);
        }
      }
    }

    // Write aggregated collected data
    const collectedPath = path.join(runDir, 'collected-all.json');
    try {
      fs.writeFileSync(collectedPath, JSON.stringify(collected, null, 2));
    } catch (err) {
      process.stderr.write('Warning: failed to write collected-all.json: ' + err.message + '\n');
    }

    // Update manifest with final status
    const hasDead = events.some(function (e) { return e.lifecycle.status === 'dead'; });
    manifest.status = hasDead ? 'partial' : 'completed';
    manifest.completed_at = new Date().toISOString();

    const store = require('./event-store');
    try {
      store.writeManifest(runDir, manifest);
    } catch (err) {
      process.stderr.write('Warning: failed to update manifest: ' + err.message + '\n');
    }

    // Try to generate a report if the render script exists
    const reportScript = path.join(projectRoot, '.github/skills/present-report/scripts/render-report.js');
    if (fs.existsSync(reportScript)) {
      try {
        const template = (manifest.report && manifest.report.template)
          ? manifest.report.template
          : 'recap-report';
        const outputPath = path.join(projectRoot, '.orch/reports', manifest.workflow_name + '-report.html');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        execSync(
          'node "' + reportScript + '" "' + collectedPath + '"' +
          ' --template ' + template +
          ' --format html' +
          ' --output "' + outputPath + '"',
          { cwd: projectRoot, stdio: 'pipe' }
        );
        process.stderr.write('Report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('Report generation failed: ' + err.message + '\n');
      }
    }

    // Git tag for the completed workflow
    if (manifest.post_workflow && manifest.post_workflow.git_tag) {
      try {
        execSync('git tag "' + manifest.post_workflow.git_tag.replace(/"/g, '\\"') + '"', {
          cwd: projectRoot, stdio: 'pipe'
        });
      } catch (err) {
        process.stderr.write('Warning: git tag failed: ' + err.message + '\n');
      }
    }

    // Write legacy YAML state for backward compatibility
    this.writeLegacyState(manifest, events, projectRoot);
  },

  /**
   * Write a simplified YAML state file for tools that expect the older format.
   * @param {object} manifest - Workflow manifest
   * @param {object[]} events - Array of event objects
   * @param {string} projectRoot - Project root path
   */
  writeLegacyState(manifest, events, projectRoot) {
    const state = {
      workflow: manifest.workflow_name,
      status: manifest.status,
      started: manifest.created_at,
      completed: manifest.completed_at,
      stages: events.map(function (e) {
        return {
          name: e.identity.phase_name,
          status: e.lifecycle.status,
          started: e.lifecycle.started_at,
          completed: e.lifecycle.completed_at,
          notes: e.result ? e.result.summary : null
        };
      })
    };

    const outDir = path.join(projectRoot, '.orch/workflow-state');
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch (err) {
      // Directory may already exist
    }

    const outPath = path.join(outDir, manifest.workflow_name + '.yaml');

    // Build simple YAML output (no dependency on external YAML lib)
    let yaml = 'workflow: ' + escapeYamlValue(state.workflow) + '\n';
    yaml += 'status: ' + state.status + '\n';
    yaml += 'started: ' + state.started + '\n';
    if (state.completed) {
      yaml += 'completed: ' + state.completed + '\n';
    }
    yaml += 'stages:\n';
    for (const s of state.stages) {
      yaml += '  - name: "' + (s.name || '').replace(/"/g, '\\"') + '"\n';
      yaml += '    status: ' + s.status + '\n';
      if (s.started) yaml += '    started: ' + s.started + '\n';
      if (s.completed) yaml += '    completed: ' + s.completed + '\n';
      if (s.notes) yaml += '    notes: "' + s.notes.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"\n';
    }

    try {
      fs.writeFileSync(outPath, yaml);
    } catch (err) {
      process.stderr.write('Warning: failed to write legacy state: ' + err.message + '\n');
    }
  }
};

/**
 * Escape a string value for safe YAML output.
 * @param {string} val - Value to escape
 * @returns {string} Escaped value (quoted if necessary)
 */
function escapeYamlValue(val) {
  if (!val) return '""';
  if (/[:{}\[\],&*?|>!%@`#'"]/.test(val) || val.trim() !== val) {
    return '"' + val.replace(/"/g, '\\"') + '"';
  }
  return val;
}
