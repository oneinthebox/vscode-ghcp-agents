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
    // Collect all results from completed phases — read BOTH event.result AND output files
    const collected = {};
    for (const event of events) {
      collected[event.identity.event_id] = {
        phase: event.identity.phase_name,
        status: event.lifecycle.status
      };

      // Merge from event.result.collected (set by relay when script completes)
      if (event.result && event.result.collected && typeof event.result.collected === 'object') {
        Object.assign(collected[event.identity.event_id], event.result.collected);
      }

      // Also read the .output.json file (script output — the richest data source)
      var outputFile = path.join(runDir, event.identity.event_id + '.output.json');
      try {
        var outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        if (outputData && typeof outputData === 'object' && !Array.isArray(outputData)) {
          Object.assign(collected[event.identity.event_id], outputData);
        }
      } catch (e) { /* no output file — skip */ }

      // Also read .complete.json (AI phase output)
      var completeFile = path.join(runDir, event.identity.event_id + '.complete.json');
      try {
        var completeData = JSON.parse(fs.readFileSync(completeFile, 'utf8'));
        if (completeData && completeData.collected && typeof completeData.collected === 'object') {
          Object.assign(collected[event.identity.event_id], completeData.collected);
        }
        if (completeData && completeData.summary) {
          collected[event.identity.event_id].summary = completeData.summary;
        }
      } catch (e) { /* no complete file — skip */ }
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

    // Generate the HTML report
    const outputPath = path.join(projectRoot, '.orch/reports', manifest.workflow_name + '-report.html');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Route to dedicated builder based on workflow type
    let reportGenerated = false;

    if (manifest.workflow_name === 'angular-project-recap' ||
        (manifest.report && manifest.report.template === 'recap-report')) {
      try {
        const recapBuilder = require('./recap-report-builder');
        recapBuilder.buildReport(runDir, outputPath);
        reportGenerated = true;
        process.stderr.write('Recap report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('recap-report-builder failed: ' + err.message + '\n');
      }
    } else if (manifest.workflow_name === 'angular-migration' ||
        (manifest.report && manifest.report.template === 'migrate-report')) {
      try {
        const builder = require('./migrate-report-builder');
        builder.buildReport(runDir, outputPath);
        reportGenerated = true;
        process.stderr.write('Migration report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('migrate-report-builder failed: ' + err.message + '\n');
      }
    } else if (manifest.workflow_name === 'angular-new-feature' ||
        (manifest.report && manifest.report.template === 'create-report')) {
      try {
        const builder = require('./create-report-builder');
        builder.buildReport(runDir, outputPath);
        reportGenerated = true;
        process.stderr.write('Create report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('create-report-builder failed: ' + err.message + '\n');
      }
    } else if (manifest.workflow_name === 'docs-audit' || manifest.workflow_name === 'angular-docs' ||
        (manifest.report && manifest.report.template === 'docs-report')) {
      try {
        const builder = require('./docs-report-builder');
        builder.buildReport(runDir, outputPath);
        reportGenerated = true;
        process.stderr.write('Docs report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('docs-report-builder failed: ' + err.message + '\n');
      }
    } else if (manifest.workflow_name === 'local-setup' || manifest.workflow_name === 'angular-local-setup' ||
        (manifest.report && manifest.report.template === 'local-report')) {
      try {
        const builder = require('./local-report-builder');
        builder.buildReport(runDir, outputPath);
        reportGenerated = true;
        process.stderr.write('Local setup report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('local-report-builder failed: ' + err.message + '\n');
      }
    }

    // Try render-report.js for other workflows (or as fallback)
    if (!reportGenerated) {
      const reportScript = path.join(projectRoot, '.github/skills/present-report/scripts/render-report.js');
      if (fs.existsSync(reportScript)) {
        try {
          const template = (manifest.report && manifest.report.template)
            ? manifest.report.template
            : 'recap-report';
          execSync(
            'node "' + reportScript + '" "' + collectedPath + '"' +
            ' --template ' + template +
            ' --format html' +
            ' --output "' + outputPath + '"',
            { cwd: projectRoot, stdio: 'pipe', timeout: 30000 }
          );
          reportGenerated = true;
          process.stderr.write('Report generated: ' + outputPath + '\n');
        } catch (err) {
          process.stderr.write('render-report.js failed: ' + err.message + '\n');
        }
      }
    }

    // Fallback: generate a rich HTML report directly from phase outputs
    if (!reportGenerated) {
      try {
        const title = (manifest.report && manifest.report.title)
          ? manifest.report.title
          : manifest.workflow_name + ' Report';

        // Read each phase's output.json or complete.json for actual data
        var sections = '';
        for (var ei = 0; ei < events.length; ei++) {
          var ev = events[ei];
          var sectionTitle = ev.identity.phase_name;
          var sectionContent = '';

          // Try to read the phase's output file
          var outputFile = path.join(runDir, ev.identity.event_id + '.output.json');
          var completeFile = path.join(runDir, ev.identity.event_id + '.complete.json');
          var phaseData = null;

          try { phaseData = JSON.parse(fs.readFileSync(outputFile, 'utf8')); } catch (e1) {
            try { phaseData = JSON.parse(fs.readFileSync(completeFile, 'utf8')); } catch (e2) {}
          }

          if (!phaseData) {
            sectionContent = '<p class="meta">Status: ' + ev.lifecycle.status + (ev.lifecycle.status === 'skipped' ? ' (skipped)' : '') + '</p>';
          } else {
            // Render the data as tables based on content type
            sectionContent = renderPhaseData(sectionTitle, phaseData);
          }

          sections += '<section><h2>' + sectionTitle + '</h2>\n' + sectionContent + '</section>\n';
        }

        // Phase summary table
        var phaseRows = events.map(function (e) {
          var statusClass = e.lifecycle.status === 'complete' ? 'pass' : e.lifecycle.status === 'skipped' ? 'skip' : 'fail';
          return '<tr><td>' + e.identity.event_id + '</td>' +
            '<td>' + e.identity.phase_name + '</td>' +
            '<td class="' + statusClass + '">' + e.lifecycle.status + '</td>' +
            '<td>' + (e.result && e.result.summary ? e.result.summary : '-') + '</td>' +
            '<td>' + (e.result && e.result.duration_sec ? e.result.duration_sec.toFixed(1) + 's' : '-') + '</td></tr>';
        }).join('\n');

        var completedCount = events.filter(function(e) { return e.lifecycle.status === 'complete'; }).length;
        var skippedCount = events.filter(function(e) { return e.lifecycle.status === 'skipped'; }).length;

        var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
          '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
          '<title>' + title + '</title>\n' +
          '<link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600&family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">\n' +
          '<style>\n' +
          ':root{--bg:oklch(0.99 0.005 240);--fg:oklch(0.15 0.02 240);--fg-muted:oklch(0.45 0.02 240);--accent:oklch(0.45 0.15 240);--teal:oklch(0.55 0.12 170);--amber:oklch(0.65 0.15 85);--red:oklch(0.55 0.15 25);--border:oklch(0.88 0.01 240);--surface:oklch(0.96 0.005 240)}\n' +
          '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n' +
          'body{font-family:"Outfit",system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.65;max-width:960px;margin:0 auto;padding:2.5rem 2rem}\n' +
          'h1,h2,h3{font-family:"Newsreader",Georgia,serif;font-weight:600}\n' +
          'h1{font-size:2rem;margin-bottom:0.5rem;color:var(--accent)}\n' +
          'h2{font-size:1.35rem;margin:2.5rem 0 1rem;padding-bottom:0.5rem;border-bottom:2px solid var(--border)}\n' +
          'h3{font-size:1.1rem;margin:1.5rem 0 0.75rem}\n' +
          'p{margin-bottom:0.75rem}\n' +
          'table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem}\n' +
          'th,td{text-align:left;padding:0.6rem 0.8rem;border-bottom:1px solid var(--border)}\n' +
          'th{background:var(--surface);font-weight:600;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.03em}\n' +
          'tr:hover{background:var(--surface)}\n' +
          '.pass{color:oklch(0.5 0.15 150);font-weight:600}.fail{color:var(--red);font-weight:600}.skip{color:var(--fg-muted)}\n' +
          '.meta{color:var(--fg-muted);font-size:0.85rem}\n' +
          '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:1.5rem 0}\n' +
          '.kpi{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.25rem 1rem;text-align:center}\n' +
          '.kpi-val{font-size:1.8rem;font-weight:600;font-family:"Newsreader",serif;color:var(--accent)}\n' +
          '.kpi-lbl{color:var(--fg-muted);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.03em;margin-top:0.25rem}\n' +
          'pre{background:var(--surface);padding:1rem;border-radius:6px;overflow-x:auto;font-size:0.8rem;font-family:"IBM Plex Mono",monospace;border:1px solid var(--border)}\n' +
          'section{margin-bottom:1rem}\n' +
          'ul{padding-left:1.5rem;margin-bottom:1rem}li{margin-bottom:0.3rem}\n' +
          '@media print{body{max-width:100%}}\n' +
          '</style>\n</head>\n<body>\n' +
          '<h1>' + title + '</h1>\n' +
          '<p class="meta">Generated: ' + new Date().toISOString().slice(0,19) + ' | Workflow: ' + manifest.workflow_name + ' | Run: ' + manifest.run_id + '</p>\n\n' +
          '<div class="kpi-grid">\n' +
          '  <div class="kpi"><div class="kpi-val">' + events.length + '</div><div class="kpi-lbl">Phases</div></div>\n' +
          '  <div class="kpi"><div class="kpi-val">' + completedCount + '</div><div class="kpi-lbl">Completed</div></div>\n' +
          '  <div class="kpi"><div class="kpi-val">' + skippedCount + '</div><div class="kpi-lbl">Skipped</div></div>\n' +
          '  <div class="kpi"><div class="kpi-val">' + Math.round(completedCount/events.length*100) + '%</div><div class="kpi-lbl">Success</div></div>\n' +
          '</div>\n\n' +
          '<h2>Phase Summary</h2>\n' +
          '<table><thead><tr><th>ID</th><th>Phase</th><th>Status</th><th>Summary</th><th>Duration</th></tr></thead>\n' +
          '<tbody>\n' + phaseRows + '\n</tbody></table>\n\n' +
          sections + '\n' +
          '<hr style="margin:2rem 0;border:none;border-top:2px solid var(--border)">\n' +
          '<p class="meta">Generated by ORCH v1 | Workflow: ' + manifest.workflow_name + ' | Template: fallback renderer</p>\n' +
          '</body></html>';

        fs.writeFileSync(outputPath, html);
        reportGenerated = true;
        process.stderr.write('Fallback report generated: ' + outputPath + '\n');
      } catch (err) {
        process.stderr.write('Fallback report generation failed: ' + err.message + '\n');
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
      if (s.notes) {
        const noteStr = typeof s.notes === 'string' ? s.notes : JSON.stringify(s.notes);
        yaml += '    notes: "' + noteStr.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"\n';
      }
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
/**
 * Render phase data into HTML based on the data structure.
 * Handles: arrays (as tables), objects (as key-value tables), primitives (as text).
 */
function renderPhaseData(title, data) {
  if (!data || typeof data !== 'object') return '<p>' + String(data) + '</p>';

  var html = '';

  // If data has a "summary" field, show it first
  if (data.summary) {
    var sumText = typeof data.summary === 'string' ? data.summary : JSON.stringify(data.summary);
    html += '<p><strong>' + sumText + '</strong></p>\n';
  }

  // Render each top-level key as a subsection
  var keys = Object.keys(data).filter(function(k) { return k !== 'summary' && k !== 'status' && k !== 'error'; });

  for (var ki = 0; ki < keys.length; ki++) {
    var key = keys[ki];
    var val = data[key];
    var label = key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\w/, function(c) { return c.toUpperCase(); });

    if (val === null || val === undefined) continue;

    // Primitive values — show as key: value
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      html += '<p><strong>' + label + ':</strong> ' + String(val) + '</p>\n';
      continue;
    }

    // Arrays — render as table
    if (Array.isArray(val)) {
      if (val.length === 0) {
        html += '<p><strong>' + label + ':</strong> <em>none</em></p>\n';
        continue;
      }

      // Array of objects — table with columns from keys
      if (typeof val[0] === 'object' && val[0] !== null) {
        var cols = Object.keys(val[0]);
        html += '<h3>' + label + ' (' + val.length + ')</h3>\n';
        html += '<table><thead><tr>' + cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead>\n<tbody>\n';
        var maxRows = Math.min(val.length, 25); // cap at 25 rows
        for (var ri = 0; ri < maxRows; ri++) {
          html += '<tr>' + cols.map(function(c) {
            var cellVal = val[ri][c];
            if (cellVal === null || cellVal === undefined) return '<td>-</td>';
            if (typeof cellVal === 'object') return '<td><code>' + JSON.stringify(cellVal).slice(0,80) + '</code></td>';
            return '<td>' + String(cellVal) + '</td>';
          }).join('') + '</tr>\n';
        }
        if (val.length > 25) html += '<tr><td colspan="' + cols.length + '" class="meta">... and ' + (val.length - 25) + ' more</td></tr>\n';
        html += '</tbody></table>\n';
      } else {
        // Array of primitives — bullet list
        html += '<h3>' + label + ' (' + val.length + ')</h3>\n<ul>\n';
        var maxItems = Math.min(val.length, 20);
        for (var li = 0; li < maxItems; li++) {
          html += '<li>' + String(val[li]) + '</li>\n';
        }
        if (val.length > 20) html += '<li class="meta">... and ' + (val.length - 20) + ' more</li>\n';
        html += '</ul>\n';
      }
      continue;
    }

    // Nested object — render as key-value pairs or sub-table
    if (typeof val === 'object') {
      var subKeys = Object.keys(val);
      if (subKeys.length <= 8) {
        // Small object — key-value list
        html += '<h3>' + label + '</h3>\n<table><tbody>\n';
        for (var si = 0; si < subKeys.length; si++) {
          var sk = subKeys[si];
          var sv = val[sk];
          var svStr = (typeof sv === 'object') ? JSON.stringify(sv) : String(sv);
          html += '<tr><td><strong>' + sk + '</strong></td><td>' + svStr + '</td></tr>\n';
        }
        html += '</tbody></table>\n';
      } else {
        // Large object — collapsible JSON
        html += '<h3>' + label + '</h3>\n<pre>' + JSON.stringify(val, null, 2).slice(0, 2000) + '</pre>\n';
      }
    }
  }

  return html || '<p class="meta">No data collected for this phase.</p>';
}

function escapeYamlValue(val) {
  if (!val) return '""';
  if (/[:{}\[\],&*?|>!%@`#'"]/.test(val) || val.trim() !== val) {
    return '"' + val.replace(/"/g, '\\"') + '"';
  }
  return val;
}
