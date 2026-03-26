#!/usr/bin/env node
'use strict';

// Usage: node local-report-builder.js <run-dir> [--output path]
//
// Reads local setup workflow phase .output.json and .complete.json files from a run
// directory and generates a self-contained HTML local setup report matching the ORCH
// design system.

const fs = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return null; }
}

function readPhaseOutput(runDir, prefix) {
  var output = readJSON(path.join(runDir, prefix + '.output.json'));
  var complete = readJSON(path.join(runDir, prefix + '.complete.json'));
  if (!output && !complete) return null;
  var merged = {};
  if (complete) {
    if (complete.collected) Object.assign(merged, complete.collected);
    if (complete.summary) merged.summary = complete.summary;
    Object.keys(complete).forEach(function (k) {
      if (k !== 'collected' && k !== 'status' && k !== 'event_id' && k !== 'phase_name') {
        if (merged[k] === undefined) merged[k] = complete[k];
      }
    });
  }
  if (output) Object.assign(merged, output);
  return Object.keys(merged).length > 0 ? merged : null;
}

function readManifest(runDir) {
  return readJSON(path.join(runDir, 'manifest.json')) || {};
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeVal(obj, key, fallback) {
  if (!obj) return fallback !== undefined ? fallback : '\u2014';
  var val = obj[key];
  return (val !== null && val !== undefined) ? val : (fallback !== undefined ? fallback : '\u2014');
}

function progressColor(pct) {
  if (pct >= 75) return 'green';
  if (pct >= 40) return 'amber';
  return 'red';
}

function statusTag(status) {
  if (!status) return '';
  var s = String(status).toLowerCase();
  var cls = 'tag-info';
  if (/pass|ok|running|healthy|success|available|set|verified|resolved|installed/.test(s)) cls = 'tag-ok';
  else if (/warn|in use|empty|partial|medium/.test(s)) cls = 'tag-warn';
  else if (/fail|bad|missing|error|critical|not|dead|down/.test(s)) cls = 'tag-bad';
  return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
}

function renderTable(headers, rows) {
  if (!rows || rows.length === 0) {
    return '<p class="meta">No data available.</p>';
  }
  var html = '<table><thead><tr>';
  headers.forEach(function (h) { html += '<th>' + esc(h) + '</th>'; });
  html += '</tr></thead>\n<tbody>\n';
  var max = Math.min(rows.length, 50);
  for (var i = 0; i < max; i++) {
    html += '<tr>';
    for (var j = 0; j < headers.length; j++) {
      var cell = (rows[i] && rows[i][j] !== undefined && rows[i][j] !== null) ? rows[i][j] : '\u2014';
      html += '<td>' + String(cell) + '</td>';
    }
    html += '</tr>\n';
  }
  if (rows.length > 50) {
    html += '<tr><td colspan="' + headers.length + '" class="meta">\u2026 and ' + (rows.length - 50) + ' more</td></tr>\n';
  }
  html += '</tbody></table>\n';
  return html;
}

function renderProgressBar(label, pct) {
  var p = Number(pct) || 0;
  return '<div class="progress">' +
    '<span style="font-size:0.8rem;min-width:120px;">' + esc(label) + '</span>' +
    '<div class="bar"><div class="fill ' + progressColor(p) + '" style="width:' + p + '%;"></div></div>' +
    '<span class="pct">' + p + '%</span>' +
    '</div>\n';
}

function renderNotAvailable(sectionName) {
  return '<p class="meta">Data not available \u2014 the ' + esc(sectionName) + ' phase did not produce output.</p>\n';
}

// ─── CSS ────────────────────────────────────────────────────────────────────

function getCSS() {
  return [
    ':root {',
    '  --neutral-50:oklch(0.98 0.005 240);--neutral-100:oklch(0.96 0.006 240);--neutral-200:oklch(0.91 0.008 240);',
    '  --neutral-300:oklch(0.85 0.008 240);--neutral-400:oklch(0.68 0.01 240);--neutral-500:oklch(0.55 0.01 240);',
    '  --neutral-600:oklch(0.45 0.012 240);--neutral-700:oklch(0.35 0.012 240);--neutral-800:oklch(0.25 0.01 240);',
    '  --neutral-900:oklch(0.15 0.008 240);--neutral-950:oklch(0.10 0.006 240);',
    '  --brand-100:oklch(0.94 0.03 240);--brand-500:oklch(0.48 0.14 240);--brand-600:oklch(0.40 0.12 240);',
    '  --teal-100:oklch(0.94 0.04 175);--teal-500:oklch(0.55 0.12 175);',
    '  --fg-primary:var(--neutral-900);--fg-secondary:var(--neutral-600);--fg-muted:var(--neutral-400);',
    '  --fg-faint:var(--neutral-300);--fg-accent:var(--brand-500);--fg-teal:var(--teal-500);--fg-inverse:var(--neutral-50);',
    '  --bg-page:var(--neutral-50);--bg-surface:var(--neutral-100);--bg-warm:var(--neutral-200);--bg-inset:var(--neutral-950);',
    '  --bg-teal:var(--teal-100);--bg-accent:var(--brand-100);',
    '  --border-default:oklch(0 0 0 / 0.08);--border-subtle:oklch(0 0 0 / 0.05);--border-strong:oklch(0 0 0 / 0.14);',
    '  --border-rule:var(--neutral-900);',
    '  --f-display:\'Newsreader\',Georgia,serif;--f-body:\'Outfit\',-apple-system,sans-serif;--f-mono:\'IBM Plex Mono\',\'Menlo\',monospace;',
    '}',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family:var(--f-body); color:var(--fg-primary); background:var(--bg-page); line-height:1.65; max-width:960px; margin:0 auto; padding:48px 32px 80px; font-size:15px; }',
    '',
    '.report-header { border-bottom:2px solid var(--fg-primary); padding-bottom:20px; margin-bottom:40px; }',
    '.report-header .overline { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.12em; color:var(--fg-accent); margin-bottom:8px; }',
    '.report-header h1 { font-family:var(--f-display); font-size:2rem; font-weight:400; font-style:italic; line-height:1.2; margin-bottom:8px; }',
    '.report-header .meta { font-size:0.75rem; color:var(--fg-muted); font-family:var(--f-mono); }',
    '',
    '.exec-summary { background:var(--bg-surface); padding:24px; margin-bottom:40px; border-left:3px solid var(--fg-accent); }',
    '.exec-summary h2 { font-family:var(--f-display); font-size:1.15rem; margin-bottom:12px; }',
    '.exec-summary p { font-size:0.85rem; color:var(--fg-secondary); margin-bottom:8px; }',
    '',
    '.stat-strip { display:flex; gap:32px; padding:16px 0; border-top:1.5px solid var(--fg-primary); border-bottom:1.5px solid var(--fg-primary); margin:24px 0; flex-wrap:wrap; }',
    '.stat-strip .stat .val { font-family:var(--f-display); font-size:1.6rem; color:var(--fg-primary); line-height:1; }',
    '.stat-strip .stat .lbl { font-size:0.65rem; color:var(--fg-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:2px; }',
    '.stat-strip .stat.accent .val { color:var(--fg-accent); }',
    '.stat-strip .stat.teal .val { color:var(--fg-teal); }',
    '.stat-strip .stat.warn .val { color:oklch(0.55 0.15 85); }',
    '',
    '.section { margin-bottom:48px; }',
    '.section h2 { font-family:var(--f-display); font-size:1.35rem; font-weight:400; margin-bottom:4px; }',
    '.section .section-sub { font-size:0.75rem; color:var(--fg-muted); margin-bottom:16px; }',
    '.section h3 { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin:24px 0 8px; }',
    '.section p { font-size:0.85rem; color:var(--fg-secondary); margin-bottom:8px; }',
    '',
    'table { width:100%; border-collapse:collapse; font-size:0.8rem; margin:12px 0 20px; }',
    'th { font-weight:600; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg-muted); padding:6px 12px; text-align:left; border-bottom:1.5px solid var(--fg-primary); }',
    'td { padding:6px 12px; border-bottom:0.5px solid oklch(0 0 0 / 0.08); color:var(--fg-primary); }',
    'tr:last-child td { border-bottom:1.5px solid var(--fg-primary); }',
    'td code { font-family:var(--f-mono); font-size:0.85em; color:var(--fg-accent); background:var(--bg-surface); padding:1px 4px; border-radius:2px; }',
    '',
    '.tag { display:inline-block; font-size:0.65rem; font-weight:600; padding:1px 6px; border-radius:2px; }',
    '.tag-ok { background:oklch(0.94 0.04 175); color:oklch(0.55 0.12 175); }',
    '.tag-warn { background:oklch(0.94 0.04 85); color:oklch(0.45 0.12 85); }',
    '.tag-bad { background:oklch(0.94 0.04 25); color:oklch(0.48 0.14 25); }',
    '.tag-info { background:var(--brand-100); color:var(--brand-500); }',
    '',
    '.progress { display:flex; align-items:center; gap:8px; margin:4px 0; }',
    '.progress > span:first-child { font-size:0.8rem; min-width:120px; }',
    '.progress .bar { flex:1; height:6px; background:var(--bg-warm); border-radius:3px; overflow:hidden; }',
    '.progress .bar .fill { height:100%; border-radius:3px; }',
    '.progress .bar .fill.green { background:oklch(0.55 0.12 175); }',
    '.progress .bar .fill.amber { background:oklch(0.6 0.15 85); }',
    '.progress .bar .fill.red { background:oklch(0.55 0.18 25); }',
    '.progress .pct { font-family:var(--f-mono); font-size:0.75rem; color:var(--fg-muted); min-width:36px; text-align:right; }',
    '',
    'pre { background:var(--neutral-950); border-radius:4px; padding:16px 20px; margin:12px 0; overflow-x:auto; }',
    'pre code { font-family:var(--f-mono); font-size:0.75rem; color:oklch(0.91 0.008 240); line-height:1.7; }',
    '',
    '.diagram { margin:20px 0; padding:20px; background:var(--bg-surface); border-radius:4px; text-align:center; }',
    '.diagram-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin-bottom:12px; text-align:left; }',
    '.diagram-caption { font-size:0.7rem; color:var(--fg-muted); margin-top:8px; font-style:italic; text-align:left; }',
    '.diagram pre.mermaid { background:transparent; padding:0; margin:0; }',
    '',
    '.rec-list { margin:12px 0; }',
    '.rec-item { display:grid; grid-template-columns:32px 1fr; gap:8px; padding:10px 0; border-bottom:0.5px solid oklch(0 0 0 / 0.08); font-size:0.82rem; }',
    '.rec-item:last-child { border-bottom:none; }',
    '.rec-item .num { font-family:var(--f-display); font-size:1.1rem; color:var(--fg-accent); }',
    '.rec-item .body { color:var(--fg-secondary); }',
    '.rec-item strong { color:var(--fg-primary); }',
    '',
    '.report-footer { border-top:1.5px solid var(--fg-primary); padding-top:16px; margin-top:48px; font-size:0.7rem; color:var(--fg-muted); font-family:var(--f-mono); }',
    '@media print { body { max-width:100%; padding:24px; } .section { page-break-inside:avoid; } }'
  ].join('\n');
}

// ─── Data loading ───────────────────────────────────────────────────────────

/**
 * Load local setup data from the run directory.
 * Since local workflow doesn't have a YAML yet, we try multiple strategies.
 */
function loadLocalData(runDir) {
  var data = {};

  var namedPrefixes = [
    'local-diagnose', 'local-setup-env', 'local-setup-deps', 'local-setup-docker',
    'local-setup-ports', 'local-setup-build', 'local-check', 'local-verify',
    'platform', 'runtimes', 'dependencies', 'docker', 'env-vars', 'ports',
    'build-verify', 'diagnostics', 'quick-start'
  ];

  namedPrefixes.forEach(function (prefix) {
    var d = readPhaseOutput(runDir, prefix);
    if (d) data[prefix] = d;
  });

  for (var i = 1; i <= 15; i++) {
    var numPrefix = String(i).padStart(3, '0');
    var d = readPhaseOutput(runDir, numPrefix);
    if (d && !data[numPrefix]) data[numPrefix] = d;
  }

  var collected = readJSON(path.join(runDir, 'collected.json'));
  if (collected) data._collected = collected;

  return data;
}

function findData(allData, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (allData[keys[i]]) return allData[keys[i]];
  }
  if (allData._collected) {
    for (var j = 0; j < keys.length; j++) {
      if (allData._collected[keys[j]]) return allData._collected[keys[j]];
    }
  }
  return null;
}

// ─── Section Builders ───────────────────────────────────────────────────────

function htmlHead(manifest) {
  var title = (manifest.report && manifest.report.title)
    ? manifest.report.title
    : 'Local Setup Report';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>' + esc(title) + '</title>\n' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
    '  <style>\n' + getCSS() + '\n  </style>\n</head>\n<body>\n';
}

function headerSection(manifest) {
  var title = (manifest.report && manifest.report.title)
    ? manifest.report.title
    : 'Development Environment Setup';
  var date = manifest.created_at ? manifest.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);

  var meta = 'Date: ' + date;
  var os = process.platform;
  var arch = process.arch;
  meta += ' &bull; OS: ' + os + ' (' + arch + ')';
  var shell = process.env.SHELL || 'unknown';
  meta += ' &bull; Shell: ' + path.basename(shell);

  return '<div class="report-header">\n' +
    '  <div class="overline">Local Setup Report &mdash; generated by @local</div>\n' +
    '  <h1>' + esc(title) + '</h1>\n' +
    '  <div class="meta">' + meta + '</div>\n' +
    '</div>\n';
}

function executiveSummary(allData) {
  var text = '';
  var keys = Object.keys(allData);
  for (var i = 0; i < keys.length; i++) {
    var d = allData[keys[i]];
    if (d && d.summary && typeof d.summary === 'string') {
      text = d.summary;
      break;
    }
  }
  if (!text) {
    text = 'Local environment check completed. See detailed sections below for platform detection, runtime versions, dependencies, Docker status, environment variables, port availability, and build verification.';
  }

  return '<div class="exec-summary">\n' +
    '  <h2>Executive Summary</h2>\n' +
    '  <p>' + esc(text) + '</p>\n' +
    '</div>\n';
}

function kpiCards(allData) {
  // Collect check results across all data
  var checks = 0;
  var passed = 0;
  var warnings = 0;
  var failed = 0;

  Object.keys(allData).forEach(function (key) {
    if (key === '_collected') return;
    var d = allData[key];
    if (!d) return;
    // Count individual checks
    var items = d.checks || d.items || d.runtimes || d.tools || d.containers || d.variables || d.ports || d.results;
    if (items && Array.isArray(items)) {
      items.forEach(function (item) {
        checks++;
        var s = String(item.status || item.health || '').toLowerCase();
        if (/pass|ok|running|healthy|available|set|verified|success|installed|resolved/.test(s)) passed++;
        else if (/warn|in use|empty|partial/.test(s)) warnings++;
        else if (/fail|missing|error|bad|not|dead|down/.test(s)) failed++;
        else passed++; // Default to passed
      });
    }
    // Also count top-level check totals
    if (d.checks_run || d.total_checks) {
      checks = Math.max(checks, Number(d.checks_run || d.total_checks) || 0);
      if (d.passed) passed = Number(d.passed) || 0;
      if (d.warnings) warnings = Number(d.warnings) || 0;
      if (d.failed) failed = Number(d.failed) || 0;
    }
  });

  if (checks === 0) { checks = '\u2014'; passed = '\u2014'; warnings = '\u2014'; failed = '\u2014'; }

  return '<div class="stat-strip">\n' +
    '  <div class="stat teal"><div class="val">' + esc(String(checks)) + '</div><div class="lbl">Checks run</div></div>\n' +
    '  <div class="stat teal"><div class="val">' + esc(String(passed)) + '</div><div class="lbl">Passed</div></div>\n' +
    '  <div class="stat warn"><div class="val">' + esc(String(warnings)) + '</div><div class="lbl">Warnings</div></div>\n' +
    '  <div class="stat" style="color:oklch(0.55 0.18 25);"><div class="val">' + esc(String(failed)) + '</div><div class="lbl">Failed</div></div>\n' +
    '</div>\n';
}

function platformSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>1. Platform Detection</h2>\n' +
    '  <div class="section-sub">Generated by /local-diagnose</div>\n';

  var platform = findData(allData, ['local-diagnose', 'platform', '001']);

  if (!platform) {
    html += renderNotAvailable('platform detection');
    html += '</div>\n';
    return html;
  }

  var props = platform.properties || platform.platform || platform.system;
  if (props && Array.isArray(props)) {
    var pRows = props.map(function (p) {
      if (typeof p === 'string') return [esc(p), '\u2014'];
      return [esc(p.property || p.name || p.key || ''), esc(String(p.value || ''))];
    });
    html += renderTable(['Property', 'Value'], pRows);
  } else if (typeof props === 'object' && props !== null) {
    var kvRows = Object.keys(props).map(function (k) {
      return [esc(k), esc(String(props[k]))];
    });
    html += renderTable(['Property', 'Value'], kvRows);
  } else {
    // Build from individual keys
    var kvRows = [];
    ['os', 'architecture', 'shell', 'memory', 'disk_free', 'package_managers'].forEach(function (k) {
      var v = safeVal(platform, k, null);
      if (v !== null && v !== '\u2014') kvRows.push([esc(k.replace(/_/g, ' ')), esc(String(v))]);
    });
    if (kvRows.length > 0) html += renderTable(['Property', 'Value'], kvRows);
    else html += renderNotAvailable('platform properties');
  }

  html += '</div>\n';
  return html;
}

function runtimesSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>2. Runtime Versions</h2>\n' +
    '  <div class="section-sub">Generated by /local-setup-env</div>\n';

  var runtimes = findData(allData, ['local-setup-env', 'runtimes', '002']);

  if (!runtimes) {
    html += renderNotAvailable('runtime versions');
    html += '</div>\n';
    return html;
  }

  var tools = runtimes.tools || runtimes.runtimes || runtimes.checks || runtimes.versions;
  if (tools && Array.isArray(tools)) {
    var tRows = tools.map(function (t) {
      return [
        '<code>' + esc(t.tool || t.name || '') + '</code>',
        esc(String(t.required || '\u2014')),
        esc(String(t.installed || t.version || '\u2014')),
        statusTag(t.status || 'ok'),
        esc(String(t.action || '\u2014'))
      ];
    });
    html += renderTable(['Tool', 'Required', 'Installed', 'Status', 'Action'], tRows);
  }

  // Action required messages
  var actions = runtimes.actions || runtimes.action_required;
  if (actions && Array.isArray(actions)) {
    actions.forEach(function (a) {
      html += '  <p><strong>Action required:</strong> ' + esc(typeof a === 'string' ? a : a.message || JSON.stringify(a)) + '</p>\n';
    });
  }

  html += '</div>\n';
  return html;
}

function dependenciesSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>3. Dependencies</h2>\n' +
    '  <div class="section-sub">Generated by /local-setup-deps</div>\n';

  var deps = findData(allData, ['local-setup-deps', 'dependencies', '003']);

  if (!deps) {
    html += renderNotAvailable('dependency installation');
    html += '</div>\n';
    return html;
  }

  var checks = deps.checks || deps.results || deps.items;
  if (checks && Array.isArray(checks)) {
    var cRows = checks.map(function (c) {
      if (typeof c === 'string') return [esc(c), statusTag('ok'), '\u2014'];
      return [
        '<code>' + esc(c.check || c.name || c.command || '') + '</code>',
        statusTag(c.result || c.status || 'ok'),
        esc(String(c.details || c.detail || '\u2014'))
      ];
    });
    html += renderTable(['Check', 'Result', 'Details'], cRows);
  }

  html += '</div>\n';
  return html;
}

function dockerSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>4. Docker &amp; Containers</h2>\n' +
    '  <div class="section-sub">Generated by /local-setup-docker</div>\n';

  var docker = findData(allData, ['local-setup-docker', 'docker', '004']);

  if (!docker) {
    html += renderNotAvailable('Docker setup');
    html += '</div>\n';
    return html;
  }

  var containers = docker.containers || docker.services || docker.items;
  if (containers && Array.isArray(containers)) {
    var cRows = containers.map(function (c) {
      return [
        esc(c.name || c.container || ''),
        esc(String(c.image || '\u2014')),
        esc(String(c.port || c.ports || '\u2014')),
        statusTag(c.status || 'running'),
        statusTag(c.health || 'healthy')
      ];
    });
    html += renderTable(['Container', 'Image', 'Port', 'Status', 'Health'], cRows);
  }

  // Docker topology diagram
  var diagram = docker.diagram || docker.mermaid || docker.topology;
  if (diagram) {
    html += '  <div class="diagram">\n' +
      '    <div class="diagram-title">Container Topology</div>\n' +
      '    <pre class="mermaid">\n' + diagram + '\n    </pre>\n' +
      '    <div class="diagram-caption">Docker container topology for local development.</div>\n' +
      '  </div>\n';
  } else {
    // Generate a default topology diagram
    html += '  <div class="diagram">\n' +
      '    <div class="diagram-title">Container Topology</div>\n' +
      '    <pre class="mermaid">\ngraph LR\n';
    if (containers && Array.isArray(containers)) {
      html += '    subgraph Docker["Docker Network"]\n';
      containers.forEach(function (c, i) {
        var name = (c.name || c.container || 'svc' + i).replace(/[^a-zA-Z0-9]/g, '');
        var label = (c.name || c.container || 'Service') + '\\n:' + (c.port || c.ports || '');
        html += '        ' + name + '[' + label + ']\n';
      });
      html += '    end\n';
      html += '    APP[Dev Server] --> Docker\n';
      html += '    style Docker fill:#f0eef4,stroke:#8a84a0\n';
      html += '    style APP fill:#e8e6f0,stroke:#6a6480\n';
    }
    html += '    </pre>\n' +
      '    <div class="diagram-caption">Containers on shared Docker network.</div>\n' +
      '  </div>\n';
  }

  html += '</div>\n';
  return html;
}

function envVarsSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>5. Environment Variables</h2>\n' +
    '  <div class="section-sub">Generated by /local-setup-env</div>\n';

  var envData = findData(allData, ['local-setup-env', 'env-vars', '005']);

  if (!envData) {
    html += renderNotAvailable('environment variables');
    html += '</div>\n';
    return html;
  }

  var vars = envData.variables || envData.env_vars || envData.items || envData.checks;
  if (vars && Array.isArray(vars)) {
    var vRows = vars.map(function (v) {
      if (typeof v === 'string') return ['<code>' + esc(v) + '</code>', '\u2014', statusTag('set'), '\u2014'];
      return [
        '<code>' + esc(v.variable || v.name || v.key || '') + '</code>',
        esc(String(v.source || '\u2014')),
        statusTag(v.status || 'set'),
        esc(String(v.value || v.masked_value || '\u2014'))
      ];
    });
    html += renderTable(['Variable', 'Source', 'Status', 'Value (masked)'], vRows);
  }

  // Warnings
  var warnings = envData.warnings;
  if (warnings && Array.isArray(warnings)) {
    warnings.forEach(function (w) {
      html += '  <p><strong>Warning:</strong> ' + esc(typeof w === 'string' ? w : w.message || JSON.stringify(w)) + '</p>\n';
    });
  }

  html += '</div>\n';
  return html;
}

function portsSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>6. Port Availability</h2>\n' +
    '  <div class="section-sub">Generated by /local-diagnose</div>\n';

  var portData = findData(allData, ['local-setup-ports', 'ports', '006', 'local-diagnose']);

  if (!portData) {
    html += renderNotAvailable('port availability');
    html += '</div>\n';
    return html;
  }

  var ports = portData.ports || portData.items || portData.checks;
  if (ports && Array.isArray(ports)) {
    var pRows = ports.map(function (p) {
      return [
        esc(String(p.port || '')),
        esc(String(p.used_by || p.service || '\u2014')),
        statusTag(p.status || 'available'),
        esc(String(p.conflict || '\u2014'))
      ];
    });
    html += renderTable(['Port', 'Used by', 'Status', 'Conflict'], pRows);
  }

  // Warnings
  if (portData.warnings && Array.isArray(portData.warnings)) {
    portData.warnings.forEach(function (w) {
      html += '  <p><strong>Warning:</strong> ' + esc(typeof w === 'string' ? w : w.message || JSON.stringify(w)) + '</p>\n';
    });
  }

  html += '</div>\n';
  return html;
}

function buildVerifySection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>7. Build &amp; Test Verification</h2>\n' +
    '  <div class="section-sub">Generated by /local-diagnose</div>\n';

  var buildData = findData(allData, ['local-setup-build', 'local-verify', 'build-verify', '007', 'local-diagnose']);

  if (!buildData) {
    html += renderNotAvailable('build verification');
    html += '</div>\n';
    return html;
  }

  var results = buildData.results || buildData.checks || buildData.commands || buildData.items;
  if (results && Array.isArray(results)) {
    var rRows = results.map(function (r) {
      return [
        '<code>' + esc(r.command || r.name || r.check || '') + '</code>',
        statusTag(r.result || r.status || 'pass'),
        esc(String(r.duration || r.time || '\u2014')),
        esc(String(r.details || r.detail || '\u2014'))
      ];
    });
    html += renderTable(['Command', 'Result', 'Duration', 'Details'], rRows);
  }

  // Build health progress bar
  var buildHealth = safeVal(buildData, 'build_health', safeVal(buildData, 'health', null));
  if (buildHealth !== null && buildHealth !== '\u2014') {
    html += renderProgressBar('Build health', Number(buildHealth) || 100);
  }

  var testPass = safeVal(buildData, 'test_pass_rate', safeVal(buildData, 'pass_rate', null));
  if (testPass !== null && testPass !== '\u2014') {
    html += renderProgressBar('Test pass rate', Number(testPass) || 100);
  }

  html += '</div>\n';
  return html;
}

function diagnosticsSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>8. Diagnostic Issues</h2>\n' +
    '  <div class="section-sub">Generated by /local-diagnose</div>\n';

  // Collect issues from all phases
  var allIssues = [];
  Object.keys(allData).forEach(function (key) {
    if (key === '_collected') return;
    var d = allData[key];
    if (!d) return;
    var issues = d.issues || d.diagnostics || d.problems || d.errors;
    if (issues && Array.isArray(issues)) {
      issues.forEach(function (issue) {
        if (typeof issue === 'string') {
          allIssues.push({ issue: issue, severity: 'warning' });
        } else {
          allIssues.push(issue);
        }
      });
    }
  });

  if (allIssues.length > 0) {
    var iRows = allIssues.map(function (i) {
      return [
        esc(i.issue || i.name || i.message || ''),
        statusTag(i.severity || 'warning'),
        esc(String(i.impact || '\u2014')),
        esc(String(i.remediation || i.fix || i.action || '\u2014'))
      ];
    });
    html += renderTable(['Issue', 'Severity', 'Impact', 'Remediation'], iRows);
  } else {
    html += '  <p class="meta">No diagnostic issues found.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function quickStartSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>9. Quick Start</h2>\n' +
    '  <div class="section-sub">Everything you need to start developing</div>\n';

  var qsData = findData(allData, ['quick-start', 'local-verify']);

  if (qsData && qsData.commands && Array.isArray(qsData.commands)) {
    qsData.commands.forEach(function (cmd) {
      if (typeof cmd === 'string') {
        html += '  <pre><code>' + esc(cmd) + '</code></pre>\n';
      } else {
        if (cmd.title || cmd.label) html += '  <h3>' + esc(cmd.title || cmd.label) + '</h3>\n';
        if (cmd.command) html += '  <pre><code>' + esc(cmd.command) + '</code></pre>\n';
        if (cmd.description) html += '  <p>' + esc(cmd.description) + '</p>\n';
      }
    });
  } else {
    // Default quick start commands
    html += '  <h3>Start the backend (Docker)</h3>\n';
    html += '  <pre><code>docker-compose up -d\n# Verify: docker ps</code></pre>\n';
    html += '  <h3>Start the dev server</h3>\n';
    html += '  <pre><code>nx serve\n# Opens at http://localhost:4200</code></pre>\n';
    html += '  <h3>Run tests</h3>\n';
    html += '  <pre><code>nx test --all\nnx lint --all</code></pre>\n';
  }

  html += '</div>\n';
  return html;
}

function recommendationsSection(allData) {
  var html = '<div class="section">\n' +
    '  <h2>10. Recommendations</h2>\n';

  var recs = [];
  Object.keys(allData).forEach(function (key) {
    if (key === '_collected') return;
    var d = allData[key];
    if (!d) return;
    var r = d.recommendations || d.next_steps;
    if (r && Array.isArray(r)) {
      r.forEach(function (rec) {
        if (typeof rec === 'string') recs.push(rec);
        else recs.push(rec.text || rec.description || rec.message || JSON.stringify(rec));
      });
    }
  });

  if (recs.length > 0) {
    html += '  <div class="rec-list">\n';
    recs.forEach(function (rec, i) {
      html += '    <div class="rec-item">\n' +
        '      <div class="num">' + (i + 1) + '</div>\n' +
        '      <div class="body">' + esc(rec) + '</div>\n' +
        '    </div>\n';
    });
    html += '  </div>\n';
  } else {
    html += '  <div class="rec-list">\n' +
      '    <div class="rec-item"><div class="num">1</div><div class="body"><strong>Resolve any failed checks above.</strong> Install missing tools and fix configuration issues before starting development.</div></div>\n' +
      '    <div class="rec-item"><div class="num">2</div><div class="body"><strong>Run project recap.</strong> Once your environment is set up, run the project recap workflow to understand the codebase.</div></div>\n' +
      '  </div>\n';
  }

  html += '</div>\n';
  return html;
}

function footer(manifest) {
  var wfName = manifest.workflow_name || 'local-setup';
  var date = manifest.completed_at
    ? manifest.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return '<div class="report-footer">\n' +
    '  Generated by ORCH &bull; @local /local-setup-* + /local-diagnose &bull; ' + date + '\n' +
    '</div>\n\n' +
    '<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>\n' +
    '<script>\n' +
    '  mermaid.initialize({\n' +
    '    startOnLoad: true,\n' +
    '    theme: \'base\',\n' +
    '    themeVariables: {\n' +
    '      primaryColor: \'#e8e6f0\',\n' +
    '      primaryTextColor: \'#1a1620\',\n' +
    '      primaryBorderColor: \'#8a84a0\',\n' +
    '      lineColor: \'#6a6480\',\n' +
    '      secondaryColor: \'#f0eef4\',\n' +
    '      tertiaryColor: \'#f8f7fa\',\n' +
    '      fontFamily: \'Outfit, sans-serif\',\n' +
    '      fontSize: \'13px\',\n' +
    '    }\n' +
    '  });\n' +
    '</script>\n' +
    '</body>\n</html>';
}

// ─── Main Builder ───────────────────────────────────────────────────────────

function buildReport(runDir, outputPath) {
  var manifest = readManifest(runDir);
  var allData = loadLocalData(runDir);

  var html = [
    htmlHead(manifest),
    headerSection(manifest),
    executiveSummary(allData),
    kpiCards(allData),
    platformSection(allData),
    runtimesSection(allData),
    dependenciesSection(allData),
    dockerSection(allData),
    envVarsSection(allData),
    portsSection(allData),
    buildVerifySection(allData),
    diagnosticsSection(allData),
    quickStartSection(allData),
    recommendationsSection(allData),
    footer(manifest)
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  process.stderr.write('Local setup report generated: ' + outputPath + '\n');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('Usage: node local-report-builder.js <run-dir> [--output path]\n');
    process.exit(1);
  }

  var runDir = path.resolve(args[0]);
  var outputPath = null;
  for (var i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  if (!outputPath) {
    var m = readManifest(runDir);
    var name = (m && m.workflow_name) ? m.workflow_name : 'local-setup';
    outputPath = path.join(runDir, name + '-report.html');
  }

  buildReport(runDir, outputPath);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { buildReport: buildReport };
