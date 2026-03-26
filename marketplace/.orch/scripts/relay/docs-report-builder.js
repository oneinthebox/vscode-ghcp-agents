#!/usr/bin/env node
'use strict';

// Usage: node docs-report-builder.js <run-dir> [--output path]
//
// Reads documentation workflow phase .output.json and .complete.json files from a run
// directory and generates a self-contained HTML documentation report matching the ORCH
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
  if (/pass|ok|current|refreshed|complete|good|yes/.test(s)) cls = 'tag-ok';
  else if (/warn|stale|partial|medium|over|needs/.test(s)) cls = 'tag-warn';
  else if (/fail|bad|critical|missing|draft|error|needs trimming/.test(s)) cls = 'tag-bad';
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
    '<span style="font-size:0.8rem;min-width:140px;">' + esc(label) + '</span>' +
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
    'body { font-family:var(--f-body); color:var(--fg-primary); background:var(--bg-page); line-height:1.65; max-width:960px; margin:0 auto; padding:48px 32px 80px; }',
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
    '.toc { margin-bottom:40px; }',
    '.toc h2 { font-family:var(--f-display); font-size:1.15rem; margin-bottom:12px; }',
    '.toc ol { padding-left:1.5em; font-size:0.85rem; color:var(--fg-secondary); }',
    '.toc li { margin-bottom:4px; }',
    '.toc a { color:var(--fg-accent); text-decoration:none; }',
    '.toc a:hover { text-decoration:underline; }',
    '',
    '.section { margin-bottom:48px; }',
    '.section h2 { font-family:var(--f-display); font-size:1.35rem; font-weight:400; margin-bottom:4px; }',
    '.section .section-sub { font-size:0.75rem; color:var(--fg-muted); margin-bottom:16px; }',
    '.section h3 { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin:24px 0 8px; }',
    '.section p { font-size:0.85rem; color:var(--fg-secondary); margin-bottom:8px; }',
    '',
    'table { width:100%; border-collapse:collapse; font-size:0.8rem; margin:12px 0 20px; }',
    'th { font-weight:600; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg-muted); padding:6px 12px; text-align:left; border-bottom:1.5px solid var(--fg-primary); }',
    'td { padding:6px 12px; border-bottom:0.5px solid var(--border-default); color:var(--fg-primary); }',
    'tr:last-child td { border-bottom:1.5px solid var(--fg-primary); }',
    'td code { font-family:var(--f-mono); font-size:0.85em; color:var(--fg-accent); background:var(--bg-surface); padding:1px 4px; border-radius:2px; }',
    '',
    '.tag { display:inline-block; font-size:0.65rem; font-weight:600; padding:1px 6px; border-radius:2px; }',
    '.tag-ok { background:var(--teal-100); color:var(--teal-500); }',
    '.tag-warn { background:oklch(0.94 0.04 85); color:oklch(0.45 0.12 85); }',
    '.tag-bad { background:oklch(0.94 0.04 25); color:oklch(0.48 0.14 25); }',
    '.tag-info { background:var(--brand-100); color:var(--brand-500); }',
    '',
    '.diagram { margin:20px 0; padding:20px; background:var(--bg-surface); border-radius:4px; text-align:center; }',
    '.diagram-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin-bottom:12px; text-align:left; }',
    '.diagram-caption { font-size:0.7rem; color:var(--fg-muted); margin-top:8px; font-style:italic; text-align:left; }',
    '.diagram pre.mermaid { background:transparent; padding:0; margin:0; text-align:center; }',
    '',
    'pre { background:var(--neutral-950); border-radius:4px; padding:16px 20px; margin:12px 0; overflow-x:auto; }',
    'pre code { font-family:var(--f-mono); font-size:0.75rem; color:var(--neutral-200); line-height:1.7; }',
    '',
    '.progress { display:flex; align-items:center; gap:8px; margin:4px 0; }',
    '.progress .bar { flex:1; height:6px; background:var(--bg-warm); border-radius:3px; overflow:hidden; }',
    '.progress .bar .fill { height:100%; border-radius:3px; }',
    '.progress .bar .fill.green { background:var(--teal-500); }',
    '.progress .bar .fill.amber { background:oklch(0.6 0.15 85); }',
    '.progress .bar .fill.red { background:oklch(0.55 0.18 25); }',
    '.progress .pct { font-family:var(--f-mono); font-size:0.75rem; color:var(--fg-muted); min-width:36px; text-align:right; }',
    '',
    '.rec-list { margin:12px 0; }',
    '.rec-item { display:grid; grid-template-columns:32px 1fr; gap:8px; padding:10px 0; border-bottom:0.5px solid var(--border-default); font-size:0.82rem; }',
    '.rec-item:last-child { border-bottom:none; }',
    '.rec-item .num { font-family:var(--f-display); font-size:1.1rem; color:var(--fg-accent); }',
    '.rec-item .body { color:var(--fg-secondary); }',
    '.rec-item strong { color:var(--fg-primary); }',
    '',
    '.report-footer { border-top:1.5px solid var(--fg-primary); padding-top:16px; margin-top:48px; font-size:0.7rem; color:var(--fg-muted); font-family:var(--f-mono); }',
    '@media print { body { max-width:100%; padding:24px; } .diagram { break-inside:avoid; } .section { break-inside:avoid; } }'
  ].join('\n');
}

// ─── Data loading ───────────────────────────────────────────────────────────

/**
 * Load documentation data from the run directory.
 * Since docs workflow doesn't have a YAML yet, we try multiple strategies:
 * - Named prefixes (docs-audit, docs-drift, etc.)
 * - Numeric prefixes (001, 002, ...)
 * - A single collected.json
 */
function loadDocsData(runDir) {
  var data = {};

  // Try named prefixes typical for docs workflows
  var namedPrefixes = [
    'docs-audit', 'docs-registry', 'docs-stale', 'docs-drift',
    'docs-convert', 'docs-coverage', 'docs-refresh', 'docs-generate',
    'scan-docs', 'scan-tsdoc', 'compodoc'
  ];

  namedPrefixes.forEach(function (prefix) {
    var d = readPhaseOutput(runDir, prefix);
    if (d) data[prefix] = d;
  });

  // Try numeric prefixes
  for (var i = 1; i <= 15; i++) {
    var numPrefix = String(i).padStart(3, '0');
    var d = readPhaseOutput(runDir, numPrefix);
    if (d && !data[numPrefix]) data[numPrefix] = d;
  }

  // Try collected.json
  var collected = readJSON(path.join(runDir, 'collected.json'));
  if (collected) data._collected = collected;

  return data;
}

/**
 * Find a data object from the loaded phases matching any of the given keys.
 */
function findData(allData, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (allData[keys[i]]) return allData[keys[i]];
  }
  // Search in _collected
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
    : 'Documentation Report';
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
    : 'Reference Documentation Audit';
  var date = manifest.created_at ? manifest.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);

  return '<div class="report-header">\n' +
    '  <div class="overline">Documentation Report &mdash; generated by @docs</div>\n' +
    '  <h1>' + esc(title) + '</h1>\n' +
    '  <div class="meta">Audited: ' + date + '</div>\n' +
    '</div>\n';
}

function executiveSummary(allData) {
  var text = '';
  // Try to find a summary from any phase
  var keys = Object.keys(allData);
  for (var i = 0; i < keys.length; i++) {
    var d = allData[keys[i]];
    if (d && d.summary && typeof d.summary === 'string') {
      text = d.summary;
      break;
    }
    if (d && d.executive_summary) {
      text = typeof d.executive_summary === 'string' ? d.executive_summary : JSON.stringify(d.executive_summary);
      break;
    }
  }
  if (!text) {
    text = 'Documentation audit completed. See detailed sections below for registry status, staleness, drift detection, and coverage analysis.';
  }

  return '<div class="exec-summary">\n' +
    '  <h2>Executive Summary</h2>\n' +
    '  <p>' + esc(text) + '</p>\n' +
    '</div>\n';
}

function kpiCards(allData) {
  var registry = findData(allData, ['docs-registry', 'docs-audit', 'scan-docs', '001']);
  var drift = findData(allData, ['docs-drift', '003']);

  var sources = '\u2014';
  var current = '\u2014';
  var stale = '\u2014';
  var draftCount = '\u2014';
  var driftItems = '\u2014';

  if (registry) {
    sources = safeVal(registry, 'total_sources', safeVal(registry, 'source_count', safeVal(registry, 'total', '\u2014')));
    current = safeVal(registry, 'current_count', safeVal(registry, 'current', '\u2014'));
    stale = safeVal(registry, 'stale_count', safeVal(registry, 'stale', '\u2014'));
    draftCount = safeVal(registry, 'draft_count', safeVal(registry, 'draft', '\u2014'));
  }
  if (drift) {
    driftItems = safeVal(drift, 'drift_count', safeVal(drift, 'drift_items', safeVal(drift, 'total', '\u2014')));
  }

  return '<div class="stat-strip">\n' +
    '  <div class="stat accent"><div class="val">' + esc(String(sources)) + '</div><div class="lbl">Sources</div></div>\n' +
    '  <div class="stat teal"><div class="val">' + esc(String(current)) + '</div><div class="lbl">Current</div></div>\n' +
    '  <div class="stat warn"><div class="val">' + esc(String(stale)) + '</div><div class="lbl">Stale</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(String(draftCount)) + '</div><div class="lbl">Draft</div></div>\n' +
    '  <div class="stat" style="color:oklch(0.55 0.18 25);"><div class="val" style="color:oklch(0.55 0.18 25);">' + esc(String(driftItems)) + '</div><div class="lbl">Drift Items</div></div>\n' +
    '</div>\n';
}

function tableOfContents() {
  return '<div class="toc">\n  <h2>Contents</h2>\n  <ol>\n' +
    '    <li><a href="#registry">Registry Status</a></li>\n' +
    '    <li><a href="#stale">Staleness Report</a></li>\n' +
    '    <li><a href="#drift">Drift Detection</a></li>\n' +
    '    <li><a href="#conversion">Conversion Quality</a></li>\n' +
    '    <li><a href="#coverage">Coverage by Domain</a></li>\n' +
    '    <li><a href="#actions">Actions Taken</a></li>\n' +
    '    <li><a href="#recs">Recommendations</a></li>\n' +
    '  </ol>\n</div>\n';
}

function registrySection(allData) {
  var html = '<div class="section" id="registry">\n' +
    '  <h2>1. Registry Status</h2>\n' +
    '  <div class="section-sub">Full inventory of documentation sources in the registry</div>\n';

  var registry = findData(allData, ['docs-registry', 'docs-audit', 'scan-docs', '001']);

  if (!registry) {
    html += renderNotAvailable('docs-registry');
    html += '</div>\n';
    return html;
  }

  // Overall freshness
  var freshness = safeVal(registry, 'freshness_pct', safeVal(registry, 'freshness', null));
  if (freshness !== null && freshness !== '\u2014') {
    html += '  <h3>Overall Freshness</h3>\n';
    html += renderProgressBar('Freshness', Number(freshness) || 0);
  }

  // Source inventory table
  var sources = registry.sources || registry.inventory || registry.documents;
  if (sources && Array.isArray(sources)) {
    html += '  <h3>Source Inventory</h3>\n';
    var sRows = sources.map(function (s) {
      if (typeof s === 'string') return ['<code>' + esc(s) + '</code>', '\u2014', '\u2014', '\u2014', statusTag('unknown')];
      return [
        '<code>' + esc(s.name || s.source || '') + '</code>',
        esc(String(s.type || '\u2014')),
        esc(String(s.version || '\u2014')),
        esc(String(s.last_refreshed || s.lastRefreshed || '\u2014')),
        statusTag(s.status || 'unknown')
      ];
    });
    html += renderTable(['Name', 'Type', 'Version', 'Last Refreshed', 'Status'], sRows);
  }

  // Sources by type
  var byType = registry.sources_by_type || registry.type_summary;
  if (byType && Array.isArray(byType)) {
    html += '  <h3>Sources by Type</h3>\n';
    var tRows = byType.map(function (t) {
      return [
        esc(t.type || ''),
        esc(String(t.count || t.total || '')),
        esc(String(t.current || '')),
        esc(String(t.stale || '')),
        esc(String(t.draft || ''))
      ];
    });
    html += renderTable(['Type', 'Count', 'Current', 'Stale', 'Draft'], tRows);
  }

  html += '</div>\n';
  return html;
}

function stalenessSection(allData) {
  var html = '<div class="section" id="stale">\n' +
    '  <h2>2. Staleness Report</h2>\n' +
    '  <div class="section-sub">Sources past max_stale_days with source change analysis</div>\n';

  var staleData = findData(allData, ['docs-stale', 'docs-audit', '002']);

  if (!staleData) {
    html += renderNotAvailable('staleness analysis');
    html += '</div>\n';
    return html;
  }

  var staleSources = staleData.stale_sources || staleData.stale || staleData.sources;
  if (staleSources && Array.isArray(staleSources)) {
    html += '  <h3>Stale Sources</h3>\n';
    var sRows = staleSources.map(function (s) {
      if (typeof s === 'string') return ['<code>' + esc(s) + '</code>', '\u2014', '\u2014', '\u2014'];
      return [
        '<code>' + esc(s.source || s.name || '') + '</code>',
        esc(String(s.last_refreshed || s.lastRefreshed || '\u2014')),
        esc(String(s.days_stale || s.daysStale || '\u2014')),
        esc(String(s.changes || s.source_changes || '\u2014'))
      ];
    });
    html += renderTable(['Source', 'Last Refreshed', 'Days Stale', 'Source Changes Since Refresh'], sRows);
  }

  if (staleData.summary) {
    html += '  <p>' + esc(typeof staleData.summary === 'string' ? staleData.summary : JSON.stringify(staleData.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function driftSection(allData) {
  var html = '<div class="section" id="drift">\n' +
    '  <h2>3. Drift Detection</h2>\n' +
    '  <div class="section-sub">Mismatches between documentation claims and actual codebase behavior</div>\n';

  var driftData = findData(allData, ['docs-drift', '003']);

  if (!driftData) {
    html += renderNotAvailable('drift detection');
    html += '</div>\n';
    return html;
  }

  var driftItems = driftData.drift_items || driftData.items || driftData.drifts;
  if (driftItems && Array.isArray(driftItems)) {
    html += '  <h3>Drift Items</h3>\n';
    var dRows = driftItems.map(function (d) {
      if (typeof d === 'string') return [esc(d), '\u2014', statusTag('doc stale'), '\u2014'];
      return [
        esc(String(d.doc_says || d.documentation || '')),
        esc(String(d.code_does || d.actual || '')),
        statusTag(d.classification || d.type || 'doc stale'),
        esc(String(d.changed_by || d.author || '\u2014'))
      ];
    });
    html += renderTable(['Doc Says', 'Code Does', 'Classification', 'Changed By'], dRows);
  }

  // Drift classification diagram
  html += '  <div class="diagram">\n' +
    '    <div class="diagram-title">Drift Detection &amp; Classification Pipeline</div>\n' +
    '    <pre class="mermaid">\nflowchart TD\n' +
    '    S[Source Change Detected] --> D{Doc mentions\\nchanged symbol?}\n' +
    '    D -->|no| OK[No drift]\n' +
    '    D -->|yes| C{Compare doc claim\\nvs code behavior}\n' +
    '    C --> DS[Doc Stale]\n' +
    '    C --> CW[Code Wrong]\n' +
    '    C --> AM[Ambiguous]\n' +
    '    DS --> AR[Auto-refresh]\n' +
    '    CW --> HR[Human review]\n' +
    '    AM --> HR\n' +
    '    style S fill:#e8e6f0,stroke:#6a6480\n' +
    '    style OK fill:#e6f5f2,stroke:#1a7a6d\n' +
    '    style DS fill:#fef3e2,stroke:#b8860b\n' +
    '    style CW fill:#fde8e8,stroke:#b52a2a\n' +
    '    style AM fill:#e8e6f0,stroke:#6a6480\n' +
    '    </pre>\n' +
    '    <div class="diagram-caption">Source changes trigger drift detection. Classification determines auto-refresh or human review.</div>\n' +
    '  </div>\n';

  html += '</div>\n';
  return html;
}

function conversionSection(allData) {
  var html = '<div class="section" id="conversion">\n' +
    '  <h2>4. Conversion Quality</h2>\n' +
    '  <div class="section-sub">Token budgets and line counts per documentation source</div>\n';

  var convData = findData(allData, ['docs-convert', 'docs-audit', '004']);

  if (!convData) {
    html += renderNotAvailable('conversion quality analysis');
    html += '</div>\n';
    return html;
  }

  // Line budget compliance
  var docs = convData.documents || convData.sources || convData.conversions;
  if (docs && Array.isArray(docs)) {
    html += '  <h3>Line Budget Compliance</h3>\n';
    var dRows = docs.map(function (d) {
      if (typeof d === 'string') return ['<code>' + esc(d) + '</code>', '\u2014', '\u2014', statusTag('unknown')];
      return [
        '<code>' + esc(d.source || d.name || '') + '</code>',
        esc(String(d.lines || '\u2014')),
        esc(String(d.tokens || d.token_estimate || '\u2014')),
        statusTag(d.status || 'pass')
      ];
    });
    html += renderTable(['Source', 'Lines', 'Tokens (est.)', 'Status'], dRows);
  }

  // Token count by category
  var categories = convData.categories || convData.by_category;
  if (categories && Array.isArray(categories)) {
    html += '  <h3>Token Count by Category</h3>\n';
    var cRows = categories.map(function (c) {
      return [
        esc(c.category || c.name || ''),
        esc(String(c.sources || c.count || '')),
        esc(String(c.total_lines || c.lines || '')),
        esc(String(c.total_tokens || c.tokens || '')),
        esc(String(c.avg_per_source || c.avg || ''))
      ];
    });
    html += renderTable(['Category', 'Sources', 'Total Lines', 'Total Tokens', 'Avg per Source'], cRows);
  }

  html += '</div>\n';
  return html;
}

function coverageSection(allData) {
  var html = '<div class="section" id="coverage">\n' +
    '  <h2>5. Coverage by Domain</h2>\n' +
    '  <div class="section-sub">Documentation completeness across application domains</div>\n';

  var covData = findData(allData, ['docs-coverage', 'scan-tsdoc', '005']);

  if (!covData) {
    html += renderNotAvailable('coverage analysis');
    html += '</div>\n';
    return html;
  }

  // Coverage domains with progress bars
  var domains = covData.domains || covData.coverage || covData.areas;
  if (domains && Array.isArray(domains)) {
    domains.forEach(function (domain) {
      if (typeof domain === 'object' && domain.name) {
        html += '  <h3>' + esc(domain.name) + '</h3>\n';
        var items = domain.items || domain.areas;
        if (items && Array.isArray(items)) {
          items.forEach(function (item) {
            var label = item.name || item.label || '';
            var pct = Number(item.coverage || item.pct || 0);
            html += renderProgressBar(label, pct);
          });
        } else if (domain.coverage !== undefined) {
          html += renderProgressBar(domain.name, Number(domain.coverage) || 0);
        }
      }
    });
  } else if (typeof domains === 'object' && domains !== null) {
    // Handle key-value format
    Object.keys(covData).forEach(function (key) {
      if (key !== 'summary' && typeof covData[key] === 'number') {
        html += renderProgressBar(key, covData[key]);
      }
    });
  }

  // TSDoc coverage
  var tsdocCov = safeVal(covData, 'tsdoc_coverage', safeVal(covData, 'tsdoc_pct', null));
  if (tsdocCov !== null && tsdocCov !== '\u2014') {
    html += '  <h3>TSDoc Coverage</h3>\n';
    html += renderProgressBar('TSDoc', Number(tsdocCov) || 0);
  }

  // README quality
  var readmeQ = safeVal(covData, 'readme_quality', safeVal(covData, 'readme_pct', null));
  if (readmeQ !== null && readmeQ !== '\u2014') {
    html += renderProgressBar('README quality', Number(readmeQ) || 0);
  }

  if (covData.summary) {
    html += '  <p>' + esc(typeof covData.summary === 'string' ? covData.summary : JSON.stringify(covData.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function actionsSection(allData) {
  var html = '<div class="section" id="actions">\n' +
    '  <h2>6. Actions Taken</h2>\n' +
    '  <div class="section-sub">Changes made during this audit run</div>\n';

  var actionData = findData(allData, ['docs-refresh', 'docs-generate', '006']);

  if (!actionData) {
    html += renderNotAvailable('actions / refresh');
    html += '</div>\n';
    return html;
  }

  // Auto-refreshed sources
  var refreshed = actionData.refreshed || actionData.auto_refreshed || actionData.updated;
  if (refreshed && Array.isArray(refreshed)) {
    html += '  <h3>Auto-Refreshed Sources</h3>\n';
    var rRows = refreshed.map(function (r) {
      if (typeof r === 'string') return ['<code>' + esc(r) + '</code>', '\u2014', '\u2014', statusTag('refreshed')];
      return [
        '<code>' + esc(r.source || r.name || '') + '</code>',
        esc(String(r.action || '\u2014')),
        esc(String(r.lines_changed || '\u2014')),
        statusTag(r.result || 'refreshed')
      ];
    });
    html += renderTable(['Source', 'Action', 'Lines Changed', 'Result'], rRows);
  }

  // Drift items resolved
  var resolved = actionData.drift_resolved || actionData.resolved;
  if (resolved && Array.isArray(resolved)) {
    html += '  <h3>Drift Items Resolved</h3>\n';
    var dRows = resolved.map(function (d) {
      if (typeof d === 'string') return [esc(d), '\u2014'];
      return [
        esc(d.item || d.drift || d.name || ''),
        esc(String(d.resolution || d.action || '\u2014'))
      ];
    });
    html += renderTable(['Drift Item', 'Resolution'], dRows);
  }

  // Flagged for human review
  var flagged = actionData.flagged || actionData.human_review || actionData.needs_review;
  if (flagged && Array.isArray(flagged)) {
    html += '  <h3>Flagged for Human Review</h3>\n';
    var fRows = flagged.map(function (f) {
      if (typeof f === 'string') return [esc(f), '\u2014', '\u2014'];
      return [
        esc(f.item || f.name || ''),
        esc(String(f.reason || '\u2014')),
        esc(String(f.reviewer || f.suggested_reviewer || '\u2014'))
      ];
    });
    html += renderTable(['Item', 'Reason', 'Suggested Reviewer'], fRows);
  }

  html += '</div>\n';
  return html;
}

function recommendationsSection(allData) {
  var html = '<div class="section" id="recs">\n' +
    '  <h2>7. Recommendations</h2>\n';

  // Collect recommendations from all phases
  var recs = [];
  Object.keys(allData).forEach(function (key) {
    var d = allData[key];
    if (!d || key === '_collected') return;
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
      '    <div class="rec-item"><div class="num">1</div><div class="body"><strong>Refresh stale sources.</strong> Review and update documentation sources that are past the max_stale_days threshold.</div></div>\n' +
      '    <div class="rec-item"><div class="num">2</div><div class="body"><strong>Resolve drift items.</strong> Address mismatches between documentation and codebase.</div></div>\n' +
      '    <div class="rec-item"><div class="num">3</div><div class="body"><strong>Improve internal library docs.</strong> Generate documentation for libraries with low coverage.</div></div>\n' +
      '  </div>\n';
  }

  html += '</div>\n';
  return html;
}

function footer(manifest) {
  var wfName = manifest.workflow_name || 'docs-audit';
  var date = manifest.completed_at
    ? manifest.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return '<div class="report-footer">\n' +
    '  Generated by ORCH &bull; @docs /docs-audit &bull; ' + date + '\n' +
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
  var allData = loadDocsData(runDir);

  var html = [
    htmlHead(manifest),
    headerSection(manifest),
    executiveSummary(allData),
    kpiCards(allData),
    tableOfContents(),
    registrySection(allData),
    stalenessSection(allData),
    driftSection(allData),
    conversionSection(allData),
    coverageSection(allData),
    actionsSection(allData),
    recommendationsSection(allData),
    footer(manifest)
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  process.stderr.write('Docs report generated: ' + outputPath + '\n');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('Usage: node docs-report-builder.js <run-dir> [--output path]\n');
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
    var name = (m && m.workflow_name) ? m.workflow_name : 'docs';
    outputPath = path.join(runDir, name + '-report.html');
  }

  buildReport(runDir, outputPath);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { buildReport: buildReport };
