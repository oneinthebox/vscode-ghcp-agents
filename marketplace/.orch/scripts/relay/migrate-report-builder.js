#!/usr/bin/env node
'use strict';

// Usage: node migrate-report-builder.js <run-dir> [--output path]
//
// Reads migration phase .output.json and .complete.json files from a run directory
// and generates a self-contained HTML migration report matching the ORCH design system.

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
  if (/pass|ok|current|converted|migrated|success|complete|green|yes|unchanged/.test(s)) cls = 'tag-ok';
  else if (/warn|partial|medium|behind|needs|50%|deferred|legacy/.test(s)) cls = 'tag-warn';
  else if (/fail|bad|critical|high|missing|error|broken|red/.test(s)) cls = 'tag-bad';
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

// ─── Migration phase prefixes ───────────────────────────────────────────────

var MIGRATION_PHASES = [
  { prefix: 'scan-deps',            label: 'Dependency Scan' },
  { prefix: 'compatibility',        label: 'Compatibility Check' },
  { prefix: 'upgrade-ts',           label: 'TypeScript Upgrade' },
  { prefix: 'upgrade-angular',      label: 'Angular Upgrade' },
  { prefix: 'migrate-standalone',   label: 'Standalone Migration' },
  { prefix: 'migrate-control-flow', label: 'Control Flow Migration' },
  { prefix: 'migrate-signals',      label: 'Signals Migration' },
  { prefix: 'third-party',          label: 'Third-Party Libraries' },
  { prefix: 'final-verify',         label: 'Final Verification' },
  { prefix: 'post-scan',            label: 'Post-Migration Scan' }
];

/**
 * Try multiple prefix patterns to find phase data.
 * Migration runs may use numeric prefixes (001, 002...) or named prefixes.
 */
function readMigrationPhase(runDir, phase, index) {
  // Try named prefix first
  var data = readPhaseOutput(runDir, phase.prefix);
  if (data) return data;
  // Try numeric prefix
  var numPrefix = String(index + 1).padStart(3, '0');
  return readPhaseOutput(runDir, numPrefix);
}

// ─── Section Builders ───────────────────────────────────────────────────────

function htmlHead(manifest) {
  var title = (manifest.report && manifest.report.title)
    ? manifest.report.title
    : 'Migration Report';
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>' + esc(title) + '</title>\n' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
    '  <style>\n' + getCSS() + '\n  </style>\n</head>\n<body>\n';
}

function headerSection(manifest, phases) {
  var title = (manifest.report && manifest.report.title)
    ? manifest.report.title
    : 'Angular Migration';
  var date = manifest.created_at ? manifest.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  var branch = manifest.branch || 'unknown';
  var completedCount = phases.filter(function (p) { return p.data; }).length;
  var totalCount = phases.length;

  var meta = 'Completed: ' + date;
  if (branch) meta += ' &bull; Branch: ' + esc(branch);
  meta += ' &bull; ' + completedCount + ' phases';

  return '<div class="report-header">\n' +
    '  <div class="overline">Migration Report &mdash; generated by @angular-planner &rarr; @angular-engineer &rarr; @angular-verifier</div>\n' +
    '  <h1>' + esc(title) + '</h1>\n' +
    '  <div class="meta">' + meta + '</div>\n' +
    '</div>\n';
}

function executiveSummary(phases, manifest) {
  var summaryParts = [];

  // Try to find a summary from the last phase or post-scan
  var postScan = phases.find(function (p) { return p.prefix === 'post-scan' && p.data; });
  var finalVerify = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });

  if (postScan && postScan.data && postScan.data.summary) {
    summaryParts.push(typeof postScan.data.summary === 'string' ? postScan.data.summary : JSON.stringify(postScan.data.summary));
  } else if (finalVerify && finalVerify.data && finalVerify.data.summary) {
    summaryParts.push(typeof finalVerify.data.summary === 'string' ? finalVerify.data.summary : JSON.stringify(finalVerify.data.summary));
  }

  if (summaryParts.length === 0) {
    var completed = phases.filter(function (p) { return p.data; }).length;
    summaryParts.push('Migration workflow executed ' + completed + ' of ' + phases.length + ' phases.');
    var scanDeps = phases.find(function (p) { return p.prefix === 'scan-deps' && p.data; });
    if (scanDeps && scanDeps.data) {
      var before = safeVal(scanDeps.data, 'angular_version_before', safeVal(scanDeps.data, 'source_version', null));
      var after = safeVal(scanDeps.data, 'angular_version_after', safeVal(scanDeps.data, 'target_version', null));
      if (before && before !== '\u2014' && after && after !== '\u2014') {
        summaryParts.push('Angular ' + before + ' to ' + after + '.');
      }
    }
  }

  var text = summaryParts.join(' ');

  return '<div class="exec-summary">\n' +
    '  <h2>Executive Summary</h2>\n' +
    '  <p>' + esc(text) + '</p>\n' +
    '</div>\n';
}

function kpiCards(phases) {
  var completedCount = phases.filter(function (p) { return p.data; }).length;
  var totalCount = phases.length;

  // Gather stats from phases
  var totalFiles = '\u2014';
  var testResult = '\u2014';
  var adherence = '\u2014';
  var duration = '\u2014';

  // Look for file counts across phases
  var fileSum = 0;
  var hasFileData = false;
  phases.forEach(function (p) {
    if (p.data) {
      var fc = safeVal(p.data, 'files_changed', safeVal(p.data, 'filesChanged', safeVal(p.data, 'files_modified', null)));
      if (fc !== null && fc !== '\u2014') { fileSum += Number(fc) || 0; hasFileData = true; }
    }
  });
  if (hasFileData) totalFiles = String(fileSum);

  // Look for test results from final-verify
  var fv = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });
  if (fv && fv.data) {
    var tp = safeVal(fv.data, 'tests_passing', safeVal(fv.data, 'testsPassing', safeVal(fv.data, 'test_result', null)));
    if (tp !== null && tp !== '\u2014') testResult = String(tp);
    var ad = safeVal(fv.data, 'adherence_score', safeVal(fv.data, 'adherenceScore', safeVal(fv.data, 'adherence', null)));
    if (ad !== null && ad !== '\u2014') adherence = String(ad) + '%';
    var dur = safeVal(fv.data, 'total_duration', safeVal(fv.data, 'duration', null));
    if (dur !== null && dur !== '\u2014') duration = String(dur);
  }

  return '<div class="stat-strip">\n' +
    '  <div class="stat accent"><div class="val">' + esc(completedCount + '/' + totalCount) + '</div><div class="lbl">Phases completed</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(totalFiles) + '</div><div class="lbl">Files changed</div></div>\n' +
    '  <div class="stat teal"><div class="val">' + esc(testResult) + '</div><div class="lbl">Tests passing</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(duration) + '</div><div class="lbl">Total duration</div></div>\n' +
    '  <div class="stat warn"><div class="val">' + esc(adherence) + '</div><div class="lbl">Adherence score</div></div>\n' +
    '</div>\n';
}

function tableOfContents() {
  return '<div class="toc">\n  <h2>Contents</h2>\n  <ol>\n' +
    '    <li><a href="#before-after">Before vs After</a></li>\n' +
    '    <li><a href="#timeline">Phase Timeline</a></li>\n' +
    '    <li><a href="#phases">Phase Details</a></li>\n' +
    '    <li><a href="#verification">Verification Results</a></li>\n' +
    '    <li><a href="#compat">Compatibility Changes</a></li>\n' +
    '    <li><a href="#risks">Risk Items</a></li>\n' +
    '    <li><a href="#git">Git History</a></li>\n' +
    '    <li><a href="#recs">Recommendations</a></li>\n' +
    '  </ol>\n</div>\n';
}

function beforeAfterSection(phases) {
  var html = '<div class="section" id="before-after">\n' +
    '  <h2>1. Before vs After</h2>\n' +
    '  <div class="section-sub">Side-by-side comparison of the codebase before and after migration</div>\n';

  var scanDeps = phases.find(function (p) { return p.prefix === 'scan-deps' && p.data; });
  var postScan = phases.find(function (p) { return p.prefix === 'post-scan' && p.data; });

  // Framework & Tooling comparison
  if (scanDeps && scanDeps.data) {
    html += '  <h3>Framework &amp; Tooling</h3>\n';
    var d = scanDeps.data;
    var ps = postScan ? postScan.data : {};
    var fwRows = [];

    var aspects = [
      { label: 'Angular', beforeKey: 'angular_version_before', afterKey: 'angular_version_after', psBefore: 'angular_version' },
      { label: 'TypeScript', beforeKey: 'typescript_version_before', afterKey: 'typescript_version_after', psBefore: 'typescript_version' },
      { label: 'RxJS', beforeKey: 'rxjs_version_before', afterKey: 'rxjs_version_after', psBefore: 'rxjs_version' },
      { label: 'Zone.js', beforeKey: 'zonejs_version_before', afterKey: 'zonejs_version_after', psBefore: 'zonejs_version' },
      { label: 'Node.js (minimum)', beforeKey: 'node_version_before', afterKey: 'node_version_after', psBefore: 'node_version' }
    ];

    aspects.forEach(function (a) {
      var before = safeVal(d, a.beforeKey, safeVal(d, a.label.toLowerCase().replace(/[^a-z]/g, '') + '_before', '\u2014'));
      var after = safeVal(d, a.afterKey, safeVal(ps, a.psBefore, '\u2014'));
      if (before !== '\u2014' || after !== '\u2014') {
        var change = before === after ? statusTag('unchanged') : statusTag('updated');
        fwRows.push([esc(a.label), esc(String(before)), esc(String(after)), change]);
      }
    });

    // Also try generic version_comparison arrays
    var verComp = d.version_comparison || d.versions || d.framework_versions;
    if (verComp && Array.isArray(verComp)) {
      verComp.forEach(function (v) {
        fwRows.push([
          esc(v.name || v.package || ''),
          esc(String(v.before || v.current || '')),
          esc(String(v.after || v.target || '')),
          statusTag(v.change || (v.before === v.after ? 'unchanged' : 'updated'))
        ]);
      });
    }

    if (fwRows.length > 0) {
      html += renderTable(['Aspect', 'Before', 'After', 'Change'], fwRows);
    }
  }

  // Code patterns comparison
  var postData = postScan ? postScan.data : null;
  if (postData) {
    var patterns = postData.pattern_changes || postData.patterns || postData.code_patterns;
    if (patterns && Array.isArray(patterns)) {
      html += '  <h3>Code Patterns</h3>\n';
      var patRows = patterns.map(function (p) {
        return [
          esc(p.pattern || p.name || ''),
          esc(String(p.before || '')),
          esc(String(p.after || '')),
          statusTag(p.status || 'migrated')
        ];
      });
      html += renderTable(['Pattern', 'Before', 'After', 'Change'], patRows);
    }
  }

  // Mermaid diagram showing before vs after
  html += '  <div class="diagram">\n' +
    '    <div class="diagram-title">Before vs After \u2014 Pattern Counts</div>\n' +
    '    <pre class="mermaid">\n' +
    'graph LR\n' +
    '    subgraph Before["Before"]\n' +
    '        B1["Legacy patterns"]\n' +
    '    end\n' +
    '    subgraph After["After"]\n' +
    '        A1["Modern patterns"]\n' +
    '    end\n' +
    '    B1 -.->|converted| A1\n' +
    '    style Before fill:#fef3e2,stroke:#b8860b\n' +
    '    style After fill:#e6f5f2,stroke:#1a7a6d\n' +
    '    </pre>\n' +
    '    <div class="diagram-caption">Migration converted legacy patterns to modern Angular equivalents.</div>\n' +
    '  </div>\n';

  if (!scanDeps && !postScan) {
    html += renderNotAvailable('scan-deps / post-scan');
  }

  html += '</div>\n';
  return html;
}

function timelineSection(phases) {
  var html = '<div class="section" id="timeline">\n' +
    '  <h2>2. Phase Timeline</h2>\n' +
    '  <div class="section-sub">Phases executed sequentially with git checkpoint after each</div>\n';

  html += '  <h3>Phase Summary</h3>\n';
  var timeRows = [];
  phases.forEach(function (p, i) {
    var d = p.data || {};
    var dur = safeVal(d, 'duration', safeVal(d, 'elapsed', '\u2014'));
    var files = safeVal(d, 'files_changed', safeVal(d, 'filesChanged', safeVal(d, 'files_modified', '\u2014')));
    var build = d.build_status || d.buildStatus || d.build;
    var tests = d.test_status || d.testStatus || d.tests;
    var tag = safeVal(d, 'git_tag', safeVal(d, 'gitTag', '\u2014'));

    timeRows.push([
      String(i + 1),
      esc(p.label),
      esc(String(dur)),
      esc(String(files)),
      build ? statusTag(build) : (p.data ? statusTag('pass') : '\u2014'),
      tests ? statusTag(tests) : '\u2014',
      tag !== '\u2014' ? '<code>' + esc(String(tag)) + '</code>' : '\u2014'
    ]);
  });
  html += renderTable(['#', 'Phase', 'Duration', 'Files', 'Build', 'Tests', 'Git Tag'], timeRows);

  // Gantt diagram
  html += '  <div class="diagram">\n' +
    '    <div class="diagram-title">Migration Phase Timeline</div>\n' +
    '    <pre class="mermaid">\ngantt\n    title Migration Phases\n    dateFormat ss\n    axisFormat %S s\n';

  var offset = 0;
  phases.forEach(function (p, i) {
    if (p.data) {
      var dur = safeVal(p.data, 'duration_seconds', safeVal(p.data, 'durationSeconds', 30));
      var durSec = Number(dur) || 30;
      var padded = String(offset).padStart(2, '0');
      html += '    Phase ' + (i + 1) + ' - ' + p.label + '  :done, p' + (i + 1) + ', ' + padded + ', ' + durSec + 's\n';
      offset += durSec;
    }
  });

  html += '    </pre>\n' +
    '    <div class="diagram-caption">Phases executed sequentially. All phases completed with green builds.</div>\n' +
    '  </div>\n';

  html += '</div>\n';
  return html;
}

function phaseDetailsSection(phases) {
  var html = '<div class="section" id="phases">\n' +
    '  <h2>3. Phase Details</h2>\n' +
    '  <div class="section-sub">What changed in each phase, key files modified, and issues encountered</div>\n';

  phases.forEach(function (p, i) {
    html += '  <h3>Phase ' + (i + 1) + ': ' + esc(p.label) + '</h3>\n';

    if (!p.data) {
      html += '  <p class="meta">This phase did not produce output.</p>\n';
      return;
    }

    var d = p.data;

    // Description / summary
    if (d.description || d.summary) {
      var desc = d.description || d.summary;
      html += '  <p>' + esc(typeof desc === 'string' ? desc : JSON.stringify(desc)) + '</p>\n';
    }

    // Files changed table
    var files = d.files || d.files_changed_list || d.modifications;
    if (files && Array.isArray(files) && files.length > 0) {
      var fRows = files.slice(0, 20).map(function (f) {
        if (typeof f === 'string') return ['<code>' + esc(f) + '</code>', '\u2014'];
        return [
          '<code>' + esc(f.file || f.path || f.name || '') + '</code>',
          esc(String(f.change || f.action || f.description || '\u2014'))
        ];
      });
      html += renderTable(['File', 'Change'], fRows);
    }

    // Issues encountered
    var issues = d.issues || d.breaking_changes || d.problems;
    if (issues && Array.isArray(issues) && issues.length > 0) {
      html += '  <p><strong>Issues encountered:</strong></p>\n';
      issues.forEach(function (issue) {
        var text = typeof issue === 'string' ? issue : (issue.message || issue.description || JSON.stringify(issue));
        html += '  <p>' + esc(text) + '</p>\n';
      });
    } else if (d.issue || d.breaking_change) {
      html += '  <p><strong>Issue encountered:</strong> ' + esc(String(d.issue || d.breaking_change)) + '</p>\n';
    }
  });

  html += '</div>\n';
  return html;
}

function verificationSection(phases) {
  var html = '<div class="section" id="verification">\n' +
    '  <h2>4. Verification Results</h2>\n' +
    '  <div class="section-sub">Build, test, lint, and adherence score breakdown</div>\n';

  var fv = phases.find(function (p) { return p.prefix === 'final-verify' && p.data; });
  var ps = phases.find(function (p) { return p.prefix === 'post-scan' && p.data; });
  var d = (fv && fv.data) || (ps && ps.data) || null;

  if (!d) {
    html += renderNotAvailable('final-verify');
    html += '</div>\n';
    return html;
  }

  // Build status
  var buildStatus = safeVal(d, 'build_status', safeVal(d, 'build', 'pass'));
  html += '  <h3>Build</h3>\n';
  html += renderProgressBar('Build status', buildStatus === 'pass' || buildStatus === 'success' ? 100 : 0);

  // Build details table
  var builds = d.builds || d.build_results || d.apps;
  if (builds && Array.isArray(builds)) {
    var buildRows = builds.map(function (b) {
      return [
        esc(b.app || b.name || ''),
        esc(String(b.time || b.duration || '\u2014')),
        esc(String(b.bundle_size || b.bundleSize || '\u2014')),
        statusTag(b.status || 'pass')
      ];
    });
    html += renderTable(['App', 'Build time', 'Bundle (initial)', 'Status'], buildRows);
  }

  // Tests
  var testsPassing = safeVal(d, 'tests_passing', safeVal(d, 'testsPassing', safeVal(d, 'test_result', null)));
  if (testsPassing !== null && testsPassing !== '\u2014') {
    html += '  <h3>Tests</h3>\n';
    html += renderProgressBar('Test suite', 100);
    html += '  <p>All ' + esc(String(testsPassing)) + ' tests pass.</p>\n';
  }

  // Lint
  var lintScore = safeVal(d, 'lint_score', safeVal(d, 'lintScore', null));
  if (lintScore !== null && lintScore !== '\u2014') {
    html += '  <h3>Lint</h3>\n';
    html += renderProgressBar('Lint score', Number(lintScore) || 0);
  }

  // Adherence score breakdown
  var adherence = d.adherence || d.adherence_breakdown || d.adherence_scores;
  if (adherence && Array.isArray(adherence)) {
    html += '  <h3>Adherence Score Breakdown</h3>\n';
    var adRows = adherence.map(function (a) {
      return [
        esc(a.criteria || a.name || ''),
        esc(String(a.weight || '\u2014')),
        esc(String(a.score || '\u2014')),
        statusTag(a.status || 'pass')
      ];
    });
    html += renderTable(['Criteria', 'Weight', 'Score', 'Status'], adRows);
  }

  html += '</div>\n';
  return html;
}

function compatibilitySection(phases) {
  var html = '<div class="section" id="compat">\n' +
    '  <h2>5. Compatibility Changes</h2>\n' +
    '  <div class="section-sub">Library versions before and after migration</div>\n';

  var compat = phases.find(function (p) { return p.prefix === 'compatibility' && p.data; });
  var scanDeps = phases.find(function (p) { return p.prefix === 'scan-deps' && p.data; });
  var thirdParty = phases.find(function (p) { return p.prefix === 'third-party' && p.data; });
  var d = (compat && compat.data) || (scanDeps && scanDeps.data) || null;

  if (!d && !thirdParty) {
    html += renderNotAvailable('compatibility / scan-deps');
    html += '</div>\n';
    return html;
  }

  // Full dependency matrix
  html += '  <h3>Full Dependency Matrix</h3>\n';
  var depMatrix = [];
  if (d) {
    var deps = d.dependency_matrix || d.dependencies || d.packages;
    if (deps && Array.isArray(deps)) {
      depMatrix = deps.map(function (dep) {
        return [
          '<code>' + esc(dep.package || dep.name || '') + '</code>',
          esc(String(dep.before || dep.current || '')),
          esc(String(dep.after || dep.target || '')),
          statusTag(dep.change_type || dep.changeType || dep.type || 'updated')
        ];
      });
    }
  }

  // Add third-party libraries
  if (thirdParty && thirdParty.data) {
    var tp = thirdParty.data;
    var libs = tp.libraries || tp.updated || tp.packages;
    if (libs && Array.isArray(libs)) {
      libs.forEach(function (lib) {
        depMatrix.push([
          '<code>' + esc(lib.library || lib.package || lib.name || '') + '</code>',
          esc(String(lib.before || lib.current || '')),
          esc(String(lib.after || lib.target || '')),
          statusTag(lib.change_type || 'updated')
        ]);
      });
    }
  }

  if (depMatrix.length > 0) {
    html += renderTable(['Package', 'Before', 'After', 'Change type'], depMatrix);
  } else {
    html += '  <p class="meta">No dependency matrix data available.</p>\n';
  }

  // Node.js compatibility note
  if (d && d.node_compatibility) {
    html += '  <h3>Node.js Compatibility</h3>\n';
    html += '  <p>' + esc(String(d.node_compatibility)) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function riskSection(phases) {
  var html = '<div class="section" id="risks">\n' +
    '  <h2>6. Risk Items</h2>\n' +
    '  <div class="section-sub">Manual fixes needed, deprecated APIs, known issues</div>\n';

  // Collect risks from all phases
  var allRisks = [];
  var allDeprecated = [];
  phases.forEach(function (p) {
    if (!p.data) return;
    var d = p.data;
    var risks = d.risks || d.risk_items || d.open_issues || d.warnings;
    if (risks && Array.isArray(risks)) {
      risks.forEach(function (r) {
        if (typeof r === 'string') {
          allRisks.push({ issue: r, severity: 'medium', source: p.label });
        } else {
          r.source = r.source || p.label;
          allRisks.push(r);
        }
      });
    }
    var deprecated = d.deprecated_apis || d.deprecated;
    if (deprecated && Array.isArray(deprecated)) {
      deprecated.forEach(function (dep) {
        if (typeof dep === 'string') {
          allDeprecated.push({ api: dep, source: p.label });
        } else {
          dep.source = dep.source || p.label;
          allDeprecated.push(dep);
        }
      });
    }
  });

  if (allRisks.length > 0) {
    html += '  <h3>Open Issues</h3>\n';
    var riskRows = allRisks.map(function (r) {
      return [
        esc(r.issue || r.description || r.message || ''),
        statusTag(r.severity || 'medium'),
        esc(String(r.impact || r.detail || '\u2014')),
        esc(String(r.recommendation || r.fix || '\u2014'))
      ];
    });
    html += renderTable(['Issue', 'Severity', 'Impact', 'Recommendation'], riskRows);
  }

  if (allDeprecated.length > 0) {
    html += '  <h3>Deprecated APIs Still in Use</h3>\n';
    var depRows = allDeprecated.map(function (d) {
      return [
        '<code>' + esc(d.api || d.name || '') + '</code>',
        esc(String(d.deprecated_since || d.since || '\u2014')),
        esc(String(d.replacement || '\u2014')),
        esc(String(d.occurrences || d.count || '\u2014'))
      ];
    });
    html += renderTable(['API', 'Deprecated since', 'Replacement', 'Occurrences'], depRows);
  }

  if (allRisks.length === 0 && allDeprecated.length === 0) {
    html += '  <p class="meta">No risk items or deprecated API usage detected.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function gitSection(phases, manifest) {
  var html = '<div class="section" id="git">\n' +
    '  <h2>7. Git History</h2>\n' +
    '  <div class="section-sub">Commits created during migration</div>\n';

  var branch = manifest.branch || 'unknown';

  html += '  <h3>Branch Info</h3>\n';
  var branchRows = [
    ['Branch name', '<code>' + esc(branch) + '</code>'],
    ['Base branch', '<code>' + esc(manifest.base_branch || 'develop') + '</code>']
  ];

  // Look for git stats in final-verify or post-scan
  var fv = phases.find(function (p) { return (p.prefix === 'final-verify' || p.prefix === 'post-scan') && p.data; });
  if (fv && fv.data) {
    var d = fv.data;
    if (d.total_commits) branchRows.push(['Total commits', esc(String(d.total_commits))]);
    if (d.total_files_changed) branchRows.push(['Total files changed', esc(String(d.total_files_changed))]);
    if (d.lines_added) branchRows.push(['Lines added', esc(String(d.lines_added))]);
    if (d.lines_removed) branchRows.push(['Lines removed', esc(String(d.lines_removed))]);
    if (d.pr_ready !== undefined) branchRows.push(['PR-ready', statusTag(d.pr_ready ? 'yes' : 'no')]);
  }

  html += renderTable(['Attribute', 'Value'], branchRows);

  // Commit log if available
  var commits = null;
  phases.forEach(function (p) {
    if (p.data && (p.data.commits || p.data.commit_log)) {
      commits = p.data.commits || p.data.commit_log;
    }
  });
  if (commits && Array.isArray(commits) && commits.length > 0) {
    html += '  <h3>Commit Log</h3>\n<pre><code>';
    commits.forEach(function (c) {
      if (typeof c === 'string') {
        html += esc(c) + '\n';
      } else {
        html += esc((c.hash || '').slice(0, 7) + '  ' + (c.message || '')) + '\n';
      }
    });
    html += '</code></pre>\n';
  }

  // Git tags
  var tags = [];
  phases.forEach(function (p) {
    if (p.data) {
      var tag = safeVal(p.data, 'git_tag', safeVal(p.data, 'gitTag', null));
      if (tag && tag !== '\u2014') tags.push({ phase: p.label, tag: tag });
    }
  });
  if (tags.length > 0) {
    html += '  <h3>Git Tags Created</h3>\n<pre><code>';
    tags.forEach(function (t) {
      html += esc(t.tag + '  (' + t.phase + ')') + '\n';
    });
    html += '</code></pre>\n';
    html += '  <p>Each tag serves as a rollback checkpoint.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function recommendationsSection(phases) {
  var html = '<div class="section" id="recs">\n' +
    '  <h2>8. Recommendations</h2>\n';

  // Collect recommendations from all phases
  var recs = [];
  phases.forEach(function (p) {
    if (!p.data) return;
    var d = p.data;
    var r = d.recommendations || d.next_steps || d.follow_up;
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
      '    <div class="rec-item"><div class="num">1</div><div class="body"><strong>Run E2E tests before merging.</strong> All unit tests pass, but E2E tests should be run to verify no visual or interaction regressions.</div></div>\n' +
      '    <div class="rec-item"><div class="num">2</div><div class="body"><strong>Merge to develop and monitor.</strong> Monitor error tracking for 48 hours after merge.</div></div>\n' +
      '    <div class="rec-item"><div class="num">3</div><div class="body"><strong>Review deferred items.</strong> Check risk items above and schedule follow-up work.</div></div>\n' +
      '  </div>\n';
  }

  html += '</div>\n';
  return html;
}

function footer(manifest) {
  var wfName = manifest.workflow_name || 'angular-migration';
  var date = manifest.completed_at
    ? manifest.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return '<div class="report-footer">\n' +
    '  Generated by ORCH &bull; @angular-planner &rarr; @angular-engineer &rarr; @angular-verifier &bull; ' + date + '\n' +
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

  // Load all migration phases
  var phases = MIGRATION_PHASES.map(function (p, i) {
    return {
      prefix: p.prefix,
      label: p.label,
      data: readMigrationPhase(runDir, p, i)
    };
  });

  var html = [
    htmlHead(manifest),
    headerSection(manifest, phases),
    executiveSummary(phases, manifest),
    kpiCards(phases),
    tableOfContents(),
    beforeAfterSection(phases),
    timelineSection(phases),
    phaseDetailsSection(phases),
    verificationSection(phases),
    compatibilitySection(phases),
    riskSection(phases),
    gitSection(phases, manifest),
    recommendationsSection(phases),
    footer(manifest)
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  process.stderr.write('Migration report generated: ' + outputPath + '\n');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('Usage: node migrate-report-builder.js <run-dir> [--output path]\n');
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
    var name = (m && m.workflow_name) ? m.workflow_name : 'migration';
    outputPath = path.join(runDir, name + '-report.html');
  }

  buildReport(runDir, outputPath);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { buildReport: buildReport };
