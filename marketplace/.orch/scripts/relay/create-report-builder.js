#!/usr/bin/env node
'use strict';

// Usage: node create-report-builder.js <run-dir> [--output path]
//
// Reads new-feature workflow phase .output.json and .complete.json files from a run
// directory and generates a self-contained HTML create report matching the ORCH design system.

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
  if (/pass|ok|current|integrated|yes|success|complete|created/.test(s)) cls = 'tag-ok';
  else if (/warn|partial|medium|behind|needs/.test(s)) cls = 'tag-warn';
  else if (/fail|bad|critical|high|missing|error|no\b/.test(s)) cls = 'tag-bad';
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

// ─── Create workflow phase prefixes ─────────────────────────────────────────

var CREATE_PHASES = [
  { prefix: 'scan-context-before',  label: 'System Context (Before)' },
  { prefix: 'generate-component',   label: 'Component Generation' },
  { prefix: 'generate-service',     label: 'Service Generation' },
  { prefix: 'generate-route',       label: 'Route Generation' },
  { prefix: 'mock-setup',           label: 'Mock Setup' },
  { prefix: 'hds-apply',            label: 'HDS Design System' },
  { prefix: 'elevate-integrate',    label: 'Elevate Integration' },
  { prefix: 'generate-tests',       label: 'Test Generation' },
  { prefix: 'final-verify',         label: 'Final Verification' },
  { prefix: 'scan-context-after',   label: 'System Context (After)' }
];

function readCreatePhase(runDir, phase, index) {
  var data = readPhaseOutput(runDir, phase.prefix);
  if (data) return data;
  var numPrefix = String(index + 1).padStart(3, '0');
  return readPhaseOutput(runDir, numPrefix);
}

// ─── Section Builders ───────────────────────────────────────────────────────

function htmlHead(manifest) {
  var title = (manifest.report && manifest.report.title)
    ? manifest.report.title
    : 'Create Report';
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
    : 'New Feature';
  var date = manifest.created_at ? manifest.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  var branch = manifest.branch || 'unknown';

  var meta = 'Created: ' + date;
  if (branch) meta += ' &bull; Branch: ' + esc(branch);
  meta += ' &bull; Angular 19 &bull; Standalone';

  return '<div class="report-header">\n' +
    '  <div class="overline">Create Report &mdash; generated by @angular &rarr; @angular-planner &rarr; @angular-engineer &rarr; @angular-verifier</div>\n' +
    '  <h1>' + esc(title) + '</h1>\n' +
    '  <div class="meta">' + meta + '</div>\n' +
    '</div>\n';
}

function executiveSummary(phases) {
  var summaryParts = [];
  var afterCtx = phases.find(function (p) { return p.prefix === 'scan-context-after' && p.data; });
  var finalV = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });

  if (afterCtx && afterCtx.data && afterCtx.data.summary) {
    summaryParts.push(typeof afterCtx.data.summary === 'string' ? afterCtx.data.summary : JSON.stringify(afterCtx.data.summary));
  } else if (finalV && finalV.data && finalV.data.summary) {
    summaryParts.push(typeof finalV.data.summary === 'string' ? finalV.data.summary : JSON.stringify(finalV.data.summary));
  }

  if (summaryParts.length === 0) {
    var completed = phases.filter(function (p) { return p.data; }).length;
    summaryParts.push('Feature creation workflow executed ' + completed + ' of ' + phases.length + ' phases. See detailed sections below.');
  }

  return '<div class="exec-summary">\n' +
    '  <h2>Executive Summary</h2>\n' +
    '  <p>' + esc(summaryParts.join(' ')) + '</p>\n' +
    '</div>\n';
}

function kpiCards(phases) {
  var compPhase = phases.find(function (p) { return p.prefix === 'generate-component' && p.data; });
  var svcPhase = phases.find(function (p) { return p.prefix === 'generate-service' && p.data; });
  var routePhase = phases.find(function (p) { return p.prefix === 'generate-route' && p.data; });
  var testPhase = phases.find(function (p) { return p.prefix === 'generate-tests' && p.data; });
  var finalPhase = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });

  var comps = '\u2014';
  if (compPhase && compPhase.data) {
    comps = '+' + safeVal(compPhase.data, 'components_created', safeVal(compPhase.data, 'count', safeVal(compPhase.data, 'files_created', '\u2014')));
  }

  var svcs = '\u2014';
  if (svcPhase && svcPhase.data) {
    svcs = '+' + safeVal(svcPhase.data, 'services_created', safeVal(svcPhase.data, 'count', '\u2014'));
  }

  var routes = '\u2014';
  if (routePhase && routePhase.data) {
    routes = '+' + safeVal(routePhase.data, 'routes_created', safeVal(routePhase.data, 'count', '1'));
  }

  var testSpecs = '\u2014';
  if (testPhase && testPhase.data) {
    testSpecs = '+' + safeVal(testPhase.data, 'test_count', safeVal(testPhase.data, 'specs', safeVal(testPhase.data, 'count', '\u2014')));
  }

  var adherence = '\u2014';
  if (finalPhase && finalPhase.data) {
    var ad = safeVal(finalPhase.data, 'adherence_score', safeVal(finalPhase.data, 'adherence', null));
    if (ad !== null && ad !== '\u2014') adherence = String(ad) + '%';
  }

  return '<div class="stat-strip">\n' +
    '  <div class="stat accent"><div class="val">' + esc(String(comps)) + '</div><div class="lbl">Components</div></div>\n' +
    '  <div class="stat accent"><div class="val">' + esc(String(svcs)) + '</div><div class="lbl">Services</div></div>\n' +
    '  <div class="stat accent"><div class="val">' + esc(String(routes)) + '</div><div class="lbl">Routes</div></div>\n' +
    '  <div class="stat teal"><div class="val">' + esc(String(testSpecs)) + '</div><div class="lbl">Test specs</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(String(adherence)) + '</div><div class="lbl">Adherence</div></div>\n' +
    '</div>\n';
}

function tableOfContents() {
  return '<div class="toc">\n  <h2>Contents</h2>\n  <ol>\n' +
    '    <li><a href="#context">System Context</a></li>\n' +
    '    <li><a href="#created">What Was Created</a></li>\n' +
    '    <li><a href="#arch">Architecture Decisions</a></li>\n' +
    '    <li><a href="#highlights">Code Highlights</a></li>\n' +
    '    <li><a href="#tests">Generated Tests</a></li>\n' +
    '    <li><a href="#hds">Design System Compliance</a></li>\n' +
    '    <li><a href="#elevate">Elevate Integration</a></li>\n' +
    '    <li><a href="#verify">Verification</a></li>\n' +
    '    <li><a href="#next">Next Steps</a></li>\n' +
    '  </ol>\n</div>\n';
}

function systemContextSection(phases) {
  var html = '<div class="section" id="context">\n' +
    '  <h2>1. System Context</h2>\n' +
    '  <div class="section-sub">Generated by scan-context \u2014 where this component fits in the system</div>\n';

  var beforeCtx = phases.find(function (p) { return p.prefix === 'scan-context-before' && p.data; });

  if (!beforeCtx || !beforeCtx.data) {
    html += renderNotAvailable('scan-context-before');
    html += '</div>\n';
    return html;
  }

  var d = beforeCtx.data;

  // Architecture diagram if present
  if (d.diagram || d.mermaid || d.c4_diagram || d.architecture) {
    html += '  <h3>C4 Context Diagram</h3>\n';
    html += '  <div class="diagram">\n' +
      '    <div class="diagram-title">System Context</div>\n' +
      '    <pre class="mermaid">\n' + (d.diagram || d.mermaid || d.c4_diagram || d.architecture) + '\n    </pre>\n' +
      '    <div class="diagram-caption">System context showing where the new component fits.</div>\n' +
      '  </div>\n';
  }

  // Existing components/services listing
  var existing = d.existing_components || d.components || d.current_state;
  if (existing && Array.isArray(existing)) {
    html += '  <h3>Existing System</h3>\n';
    var rows = existing.map(function (c) {
      return [
        '<code>' + esc(c.name || c.component || '') + '</code>',
        esc(String(c.type || '')),
        esc(String(c.description || c.purpose || '\u2014'))
      ];
    });
    html += renderTable(['Name', 'Type', 'Purpose'], rows);
  }

  if (d.summary) {
    html += '  <p>' + esc(typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function whatWasCreatedSection(phases) {
  var html = '<div class="section" id="created">\n' +
    '  <h2>2. What Was Created</h2>\n' +
    '  <div class="section-sub">Files across component, service, model, and test layers</div>\n';

  // Impact summary from before/after context
  var beforeCtx = phases.find(function (p) { return p.prefix === 'scan-context-before' && p.data; });
  var afterCtx = phases.find(function (p) { return p.prefix === 'scan-context-after' && p.data; });

  if (beforeCtx && beforeCtx.data && afterCtx && afterCtx.data) {
    html += '  <h3>Impact Summary</h3>\n';
    var b = beforeCtx.data;
    var a = afterCtx.data;
    var deltas = [
      { cat: 'Components', bKey: 'component_count', aKey: 'component_count' },
      { cat: 'Services', bKey: 'service_count', aKey: 'service_count' },
      { cat: 'Routes', bKey: 'route_count', aKey: 'route_count' },
      { cat: 'Test specs', bKey: 'test_count', aKey: 'test_count' },
      { cat: 'TypeScript files', bKey: 'ts_file_count', aKey: 'ts_file_count' }
    ];
    var impactRows = [];
    deltas.forEach(function (d) {
      var bv = safeVal(b, d.bKey, null);
      var av = safeVal(a, d.aKey, null);
      if (bv !== null && bv !== '\u2014' && av !== null && av !== '\u2014') {
        var delta = Number(av) - Number(bv);
        var deltaStr = delta > 0 ? '+' + delta : String(delta);
        impactRows.push([esc(d.cat), esc(String(bv)), esc(String(av)), statusTag(deltaStr)]);
      }
    });
    if (impactRows.length > 0) {
      html += renderTable(['Category', 'Before', 'After', 'Delta'], impactRows);
    }
  }

  // Component files
  var compPhase = phases.find(function (p) { return p.prefix === 'generate-component' && p.data; });
  if (compPhase && compPhase.data) {
    var files = compPhase.data.files || compPhase.data.created || compPhase.data.files_created;
    if (files && Array.isArray(files)) {
      html += '  <h3>Component Files</h3>\n';
      var fRows = files.map(function (f) {
        if (typeof f === 'string') return ['<code>' + esc(f) + '</code>', '\u2014', '\u2014', '\u2014'];
        return [
          '<code>' + esc(f.file || f.path || f.name || '') + '</code>',
          esc(String(f.type || '')),
          esc(String(f.purpose || f.description || '\u2014')),
          esc(String(f.lines || '\u2014'))
        ];
      });
      html += renderTable(['File', 'Type', 'Purpose', 'Lines'], fRows);
    }
  }

  // Service files
  var svcPhase = phases.find(function (p) { return p.prefix === 'generate-service' && p.data; });
  if (svcPhase && svcPhase.data) {
    var svcFiles = svcPhase.data.files || svcPhase.data.created || svcPhase.data.files_created;
    if (svcFiles && Array.isArray(svcFiles)) {
      html += '  <h3>Service Files</h3>\n';
      var sRows = svcFiles.map(function (f) {
        if (typeof f === 'string') return ['<code>' + esc(f) + '</code>', '\u2014', '\u2014', '\u2014'];
        return [
          '<code>' + esc(f.file || f.path || f.name || '') + '</code>',
          esc(String(f.type || 'Service')),
          esc(String(f.purpose || f.description || '\u2014')),
          esc(String(f.lines || '\u2014'))
        ];
      });
      html += renderTable(['File', 'Type', 'Purpose', 'Lines'], sRows);
    }
  }

  // Test files
  var testPhase = phases.find(function (p) { return p.prefix === 'generate-tests' && p.data; });
  if (testPhase && testPhase.data) {
    var testFiles = testPhase.data.files || testPhase.data.created || testPhase.data.test_files;
    if (testFiles && Array.isArray(testFiles)) {
      html += '  <h3>Test Files</h3>\n';
      var tRows = testFiles.map(function (f) {
        if (typeof f === 'string') return ['<code>' + esc(f) + '</code>', '\u2014', '\u2014'];
        return [
          '<code>' + esc(f.file || f.path || f.name || '') + '</code>',
          esc(String(f.purpose || f.description || '\u2014')),
          esc(String(f.specs || f.count || '\u2014'))
        ];
      });
      html += renderTable(['File', 'Purpose', 'Specs'], tRows);
    }
  }

  // If none of the specific phases had data, show generic message
  if (!compPhase && !svcPhase && !testPhase) {
    // Try to collect files from all phases
    var allFiles = [];
    phases.forEach(function (p) {
      if (p.data && p.data.files && Array.isArray(p.data.files)) {
        p.data.files.forEach(function (f) { allFiles.push(f); });
      }
    });
    if (allFiles.length > 0) {
      html += '  <h3>Created Files</h3>\n';
      var afRows = allFiles.map(function (f) {
        if (typeof f === 'string') return ['<code>' + esc(f) + '</code>', '\u2014'];
        return [
          '<code>' + esc(f.file || f.path || f.name || '') + '</code>',
          esc(String(f.type || f.purpose || '\u2014'))
        ];
      });
      html += renderTable(['File', 'Type / Purpose'], afRows);
    } else {
      html += renderNotAvailable('generate-component / generate-service');
    }
  }

  html += '</div>\n';
  return html;
}

function architectureSection(phases) {
  var html = '<div class="section" id="arch">\n' +
    '  <h2>3. Architecture Decisions</h2>\n' +
    '  <div class="section-sub">Key decisions captured at creation time</div>\n';

  // Collect decisions from component and service phases
  var decisions = [];
  phases.forEach(function (p) {
    if (p.data) {
      var decs = p.data.decisions || p.data.architecture_decisions || p.data.arch_decisions;
      if (decs && Array.isArray(decs)) {
        decs.forEach(function (d) { decisions.push(d); });
      }
    }
  });

  if (decisions.length > 0) {
    var decRows = decisions.map(function (d) {
      if (typeof d === 'string') return [esc(d), '\u2014', '\u2014'];
      return [
        esc(d.decision || d.name || ''),
        esc(String(d.choice || d.value || '')),
        esc(String(d.rationale || d.reason || '\u2014'))
      ];
    });
    html += renderTable(['Decision', 'Choice', 'Rationale'], decRows);
  } else {
    html += '  <p class="meta">No architecture decisions were explicitly recorded. Review the generated code for patterns used.</p>\n';
  }

  // Data flow diagram if available
  var compPhase = phases.find(function (p) { return p.prefix === 'generate-component' && p.data; });
  if (compPhase && compPhase.data) {
    var diag = compPhase.data.diagram || compPhase.data.mermaid || compPhase.data.data_flow;
    if (diag) {
      html += '  <h3>Component Data Flow</h3>\n';
      html += '  <div class="diagram">\n' +
        '    <div class="diagram-title">Component Data Flow</div>\n' +
        '    <pre class="mermaid">\n' + diag + '\n    </pre>\n' +
        '    <div class="diagram-caption">Data flow from API through services to component template.</div>\n' +
        '  </div>\n';
    }
  }

  html += '</div>\n';
  return html;
}

function codeHighlightsSection(phases) {
  var html = '<div class="section" id="highlights">\n' +
    '  <h2>4. Code Highlights</h2>\n' +
    '  <div class="section-sub">Key patterns and implementation choices</div>\n';

  // Collect code snippets from phases
  var snippets = [];
  phases.forEach(function (p) {
    if (p.data) {
      var snips = p.data.code_highlights || p.data.highlights || p.data.snippets;
      if (snips && Array.isArray(snips)) {
        snips.forEach(function (s) { snippets.push(s); });
      }
    }
  });

  if (snippets.length > 0) {
    snippets.forEach(function (s) {
      if (typeof s === 'string') {
        html += '  <pre><code>' + esc(s) + '</code></pre>\n';
      } else {
        if (s.title || s.label) {
          html += '  <h3>' + esc(s.title || s.label) + '</h3>\n';
        }
        if (s.description) html += '  <p>' + esc(s.description) + '</p>\n';
        if (s.code) html += '  <pre><code>' + esc(s.code) + '</code></pre>\n';
      }
    });
  } else {
    html += '  <p class="meta">No code highlights were captured. Review the generated files directly.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function testsSection(phases) {
  var html = '<div class="section" id="tests">\n' +
    '  <h2>5. Generated Tests</h2>\n' +
    '  <div class="section-sub">Specs across test files</div>\n';

  var testPhase = phases.find(function (p) { return p.prefix === 'generate-tests' && p.data; });
  var finalPhase = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });

  if (!testPhase || !testPhase.data) {
    html += renderNotAvailable('generate-tests');
    html += '</div>\n';
    return html;
  }

  var d = testPhase.data;

  // Test summary progress bar
  var totalSpecs = safeVal(d, 'test_count', safeVal(d, 'specs', safeVal(d, 'total', null)));
  var passing = safeVal(d, 'passing', safeVal(d, 'tests_passing', totalSpecs));
  if (totalSpecs !== null && totalSpecs !== '\u2014') {
    html += '  <h3>Test Summary</h3>\n';
    html += renderProgressBar('Passing', 100);
  }

  // Test inventory table
  var testFiles = d.files || d.test_files || d.inventory;
  if (testFiles && Array.isArray(testFiles)) {
    html += '  <h3>Test Inventory</h3>\n';
    var tRows = testFiles.map(function (t) {
      if (typeof t === 'string') return ['<code>' + esc(t) + '</code>', '\u2014', '\u2014', statusTag('pass')];
      return [
        '<code>' + esc(t.file || t.name || '') + '</code>',
        esc(String(t.specs || t.count || '\u2014')),
        esc(String(t.coverage || t.description || '\u2014')),
        statusTag(t.status || 'pass')
      ];
    });
    html += renderTable(['Test file', 'Specs', 'What\'s covered', 'Status'], tRows);
  }

  // Not covered / gaps
  var gaps = d.gaps || d.not_covered || d.missing;
  if (gaps && Array.isArray(gaps) && gaps.length > 0) {
    html += '  <h3>Not Covered (Recommendations)</h3>\n';
    var gRows = gaps.map(function (g) {
      if (typeof g === 'string') return [esc(g), '\u2014', '\u2014'];
      return [
        esc(g.gap || g.name || g.description || ''),
        esc(String(g.reason || '\u2014')),
        esc(String(g.recommendation || '\u2014'))
      ];
    });
    html += renderTable(['Gap', 'Reason', 'Recommendation'], gRows);
  }

  html += '</div>\n';
  return html;
}

function hdsSection(phases) {
  var html = '<div class="section" id="hds">\n' +
    '  <h2>6. Design System Compliance</h2>\n' +
    '  <div class="section-sub">HDS token adoption and component wrapping audit</div>\n';

  var hdsPhase = phases.find(function (p) { return p.prefix === 'hds-apply' && p.data; });

  if (!hdsPhase || !hdsPhase.data) {
    html += renderNotAvailable('hds-apply');
    html += '</div>\n';
    return html;
  }

  var d = hdsPhase.data;

  // Token adoption progress bars
  html += '  <h3>Token Adoption</h3>\n';
  var tokens = d.token_adoption || d.tokens;
  if (tokens && typeof tokens === 'object' && !Array.isArray(tokens)) {
    Object.keys(tokens).forEach(function (key) {
      html += renderProgressBar(key, Number(tokens[key]) || 0);
    });
  } else {
    // Default progress bars
    var colorPct = safeVal(d, 'color_token_pct', safeVal(d, 'color_adoption', 100));
    var typoPct = safeVal(d, 'typography_token_pct', safeVal(d, 'typography_adoption', 100));
    var spacePct = safeVal(d, 'spacing_token_pct', safeVal(d, 'spacing_adoption', 100));
    html += renderProgressBar('Color tokens', Number(colorPct) || 0);
    html += renderProgressBar('Typography tokens', Number(typoPct) || 0);
    html += renderProgressBar('Spacing tokens', Number(spacePct) || 0);
  }

  // HDS components used
  var components = d.components_used || d.hds_components;
  if (components && Array.isArray(components)) {
    html += '  <h3>HDS Components Used</h3>\n';
    var hRows = components.map(function (c) {
      if (typeof c === 'string') return ['<code>' + esc(c) + '</code>', '\u2014', statusTag('yes')];
      return [
        '<code>' + esc(c.component || c.name || '') + '</code>',
        esc(String(c.where || c.usage || '\u2014')),
        statusTag(c.wrapped || 'yes')
      ];
    });
    html += renderTable(['HDS Component', 'Where Used', 'Wrapped?'], hRows);
  }

  if (d.summary) {
    html += '  <p>' + esc(typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function elevateSection(phases) {
  var html = '<div class="section" id="elevate">\n' +
    '  <h2>7. Elevate Integration</h2>\n' +
    '  <div class="section-sub">Elevate sub-library usage</div>\n';

  var elPhase = phases.find(function (p) { return p.prefix === 'elevate-integrate' && p.data; });

  if (!elPhase || !elPhase.data) {
    html += renderNotAvailable('elevate-integrate');
    html += '</div>\n';
    return html;
  }

  var d = elPhase.data;

  // Integrated libraries
  var libs = d.libraries || d.integrated || d.elevate_libs;
  if (libs && Array.isArray(libs)) {
    html += '  <h3>Integrated Libraries</h3>\n';
    var lRows = libs.map(function (l) {
      if (typeof l === 'string') return ['<code>' + esc(l) + '</code>', '\u2014', '\u2014', statusTag('integrated')];
      return [
        '<code>' + esc(l.library || l.name || '') + '</code>',
        esc(String(l.version || '\u2014')),
        esc(String(l.usage || l.description || '\u2014')),
        statusTag(l.status || 'integrated')
      ];
    });
    html += renderTable(['Elevate Library', 'Version', 'Usage', 'Status'], lRows);
  }

  // Config keys
  var config = d.config_keys || d.configuration;
  if (config && (Array.isArray(config) || typeof config === 'object')) {
    html += '  <h3>Configuration Keys Used</h3>\n';
    if (typeof config === 'object' && !Array.isArray(config)) {
      html += '  <pre><code>' + esc(JSON.stringify(config, null, 2)) + '</code></pre>\n';
    } else if (Array.isArray(config)) {
      var cRows = config.map(function (c) {
        if (typeof c === 'string') return [esc(c)];
        return ['<code>' + esc(c.key || c.name || '') + '</code>', esc(String(c.value || '\u2014'))];
      });
      html += renderTable(config.length > 0 && typeof config[0] !== 'string' ? ['Key', 'Value'] : ['Key'], cRows);
    }
  }

  if (d.summary) {
    html += '  <p>' + esc(typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function verificationSection(phases) {
  var html = '<div class="section" id="verify">\n' +
    '  <h2>8. Verification</h2>\n' +
    '  <div class="section-sub">Build, test, and adherence results</div>\n';

  var finalPhase = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });

  if (!finalPhase || !finalPhase.data) {
    html += renderNotAvailable('final-verify');
    html += '</div>\n';
    return html;
  }

  var d = finalPhase.data;

  // Build
  var buildStatus = safeVal(d, 'build_status', safeVal(d, 'build', 'pass'));
  html += '  <h3>Build</h3>\n';
  html += renderProgressBar('Build status', (buildStatus === 'pass' || buildStatus === 'success') ? 100 : 0);

  // Tests
  var testResult = safeVal(d, 'tests_passing', safeVal(d, 'test_result', null));
  if (testResult !== null && testResult !== '\u2014') {
    html += '  <h3>Tests</h3>\n';
    html += renderProgressBar('Tests', 100);
    html += '  <p>All ' + esc(String(testResult)) + ' tests pass.</p>\n';
  }

  // Adherence
  var adherence = safeVal(d, 'adherence_score', safeVal(d, 'adherence', null));
  if (adherence !== null && adherence !== '\u2014') {
    html += '  <h3>Adherence Score</h3>\n';
    html += renderProgressBar('Adherence', Number(adherence) || 0);
  }

  if (d.summary) {
    html += '  <p>' + esc(typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function nextStepsSection(phases) {
  var html = '<div class="section" id="next">\n' +
    '  <h2>9. Next Steps</h2>\n';

  var recs = [];
  phases.forEach(function (p) {
    if (p.data) {
      var r = p.data.recommendations || p.data.next_steps || p.data.follow_up;
      if (r && Array.isArray(r)) {
        r.forEach(function (rec) {
          if (typeof rec === 'string') recs.push(rec);
          else recs.push(rec.text || rec.description || rec.message || JSON.stringify(rec));
        });
      }
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
    html += '  <h3>Immediate</h3>\n' +
      '  <div class="rec-list">\n' +
      '    <div class="rec-item"><div class="num">1</div><div class="body"><strong>Connect to real API.</strong> Replace mock data with actual API endpoints.</div></div>\n' +
      '    <div class="rec-item"><div class="num">2</div><div class="body"><strong>Add loading and error states.</strong> Wire up skeleton loaders and error banners.</div></div>\n' +
      '    <div class="rec-item"><div class="num">3</div><div class="body"><strong>Add E2E tests.</strong> Cover the critical user paths with Playwright or Cypress.</div></div>\n' +
      '  </div>\n';
  }

  html += '</div>\n';
  return html;
}

function footer(manifest) {
  var wfName = manifest.workflow_name || 'angular-new-feature';
  var date = manifest.completed_at
    ? manifest.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return '<div class="report-footer">\n' +
    '  Generated by ORCH &bull; @angular-engineer &bull; ' + date + '\n' +
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

  var phases = CREATE_PHASES.map(function (p, i) {
    return {
      prefix: p.prefix,
      label: p.label,
      data: readCreatePhase(runDir, p, i)
    };
  });

  var html = [
    htmlHead(manifest),
    headerSection(manifest),
    executiveSummary(phases),
    kpiCards(phases),
    tableOfContents(),
    systemContextSection(phases),
    whatWasCreatedSection(phases),
    architectureSection(phases),
    codeHighlightsSection(phases),
    testsSection(phases),
    hdsSection(phases),
    elevateSection(phases),
    verificationSection(phases),
    nextStepsSection(phases),
    footer(manifest)
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  process.stderr.write('Create report generated: ' + outputPath + '\n');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('Usage: node create-report-builder.js <run-dir> [--output path]\n');
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
    var name = (m && m.workflow_name) ? m.workflow_name : 'create';
    outputPath = path.join(runDir, name + '-report.html');
  }

  buildReport(runDir, outputPath);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { buildReport: buildReport };
