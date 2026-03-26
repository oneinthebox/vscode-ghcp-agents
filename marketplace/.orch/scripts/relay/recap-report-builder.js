#!/usr/bin/env node
'use strict';

// Usage: node recap-report-builder.js <run-dir> [--output path]
//
// Reads scan-phase .output.json and .complete.json files from a run directory
// and generates a self-contained HTML recap report matching the ORCH design system.

const fs = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return null; }
}

/**
 * Read both .output.json and .complete.json for a given phase prefix,
 * merging them into a single data object (output takes precedence).
 */
function readPhaseOutput(runDir, prefix) {
  var output = readJSON(path.join(runDir, prefix + '.output.json'));
  var complete = readJSON(path.join(runDir, prefix + '.complete.json'));
  if (!output && !complete) return null;
  var merged = {};
  if (complete) {
    if (complete.collected) Object.assign(merged, complete.collected);
    if (complete.summary) merged.summary = complete.summary;
    // Spread remaining top-level keys (except meta fields)
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
  if (!obj) return fallback !== undefined ? fallback : '—';
  var val = obj[key];
  return (val !== null && val !== undefined) ? val : (fallback !== undefined ? fallback : '—');
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
  // Check warn/bad patterns first to avoid partial matches (e.g., "unprotected" matching "protected")
  if (/fail|bad|critical|high|missing|none|not\s|not$|low|no\b|untested|deprecated|poor/.test(s)) cls = 'tag-bad';
  else if (/warn|partial|behind|medium|needs|legacy|migrating|review|unprotected/.test(s)) cls = 'tag-warn';
  else if (/pass|ok|current|integrated|secure|configured|active|present|live|modern|good|yes|protected|found|clean|covered/.test(s)) cls = 'tag-ok';
  return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
}

/**
 * Render an HTML table from headers array and rows (array of arrays).
 */
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
      var cell = (rows[i] && rows[i][j] !== undefined && rows[i][j] !== null) ? rows[i][j] : '—';
      html += '<td>' + String(cell) + '</td>';
    }
    html += '</tr>\n';
  }
  if (rows.length > 50) {
    html += '<tr><td colspan="' + headers.length + '" class="meta">… and ' + (rows.length - 50) + ' more</td></tr>\n';
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
  return '<p class="meta">Data not available — the ' + esc(sectionName) + ' phase did not produce output.</p>\n';
}

function sanitizeMermaidId(str) {
  if (!str) return 'unknown';
  return str.replace(/[^a-zA-Z0-9]/g, '');
}

// ─── CSS (inlined, derived from deck-tokens.css + recap-report example) ─────

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
    '/* Header */',
    '.report-header { border-bottom:2px solid var(--fg-primary); padding-bottom:20px; margin-bottom:40px; }',
    '.report-header .overline { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.12em; color:var(--fg-accent); margin-bottom:8px; }',
    '.report-header h1 { font-family:var(--f-display); font-size:2rem; font-weight:400; font-style:italic; line-height:1.2; margin-bottom:8px; }',
    '.report-header .meta { font-size:0.75rem; color:var(--fg-muted); font-family:var(--f-mono); }',
    '',
    '/* Executive Summary */',
    '.exec-summary { background:var(--bg-surface); padding:24px; margin-bottom:40px; border-left:3px solid var(--fg-accent); }',
    '.exec-summary h2 { font-family:var(--f-display); font-size:1.15rem; margin-bottom:12px; }',
    '.exec-summary p { font-size:0.85rem; color:var(--fg-secondary); margin-bottom:8px; }',
    '',
    '/* Stat strip */',
    '.stat-strip { display:flex; gap:32px; padding:16px 0; border-top:1.5px solid var(--fg-primary); border-bottom:1.5px solid var(--fg-primary); margin:24px 0; }',
    '.stat-strip .stat .val { font-family:var(--f-display); font-size:1.6rem; color:var(--fg-primary); line-height:1; }',
    '.stat-strip .stat .lbl { font-size:0.65rem; color:var(--fg-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:2px; }',
    '.stat-strip .stat.accent .val { color:var(--fg-accent); }',
    '.stat-strip .stat.teal .val { color:var(--fg-teal); }',
    '.stat-strip .stat.warn .val { color:oklch(0.55 0.15 85); }',
    '',
    '/* TOC */',
    '.toc { margin-bottom:40px; }',
    '.toc h2 { font-family:var(--f-display); font-size:1.15rem; margin-bottom:12px; }',
    '.toc ol { padding-left:1.5em; font-size:0.85rem; color:var(--fg-secondary); }',
    '.toc li { margin-bottom:4px; }',
    '.toc a { color:var(--fg-accent); text-decoration:none; }',
    '.toc a:hover { text-decoration:underline; }',
    '',
    '/* Sections */',
    '.section { margin-bottom:48px; }',
    '.section h2 { font-family:var(--f-display); font-size:1.35rem; font-weight:400; margin-bottom:4px; }',
    '.section .section-sub { font-size:0.75rem; color:var(--fg-muted); margin-bottom:16px; }',
    '.section h3 { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin:24px 0 8px; }',
    '.section p { font-size:0.85rem; color:var(--fg-secondary); margin-bottom:8px; }',
    '',
    '/* Tables */',
    'table { width:100%; border-collapse:collapse; font-size:0.8rem; margin:12px 0 20px; }',
    'th { font-weight:600; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg-muted); padding:6px 12px; text-align:left; border-bottom:1.5px solid var(--fg-primary); }',
    'td { padding:6px 12px; border-bottom:0.5px solid var(--border-default); color:var(--fg-primary); }',
    'tr:last-child td { border-bottom:1.5px solid var(--fg-primary); }',
    'td code { font-family:var(--f-mono); font-size:0.85em; color:var(--fg-accent); background:var(--bg-surface); padding:1px 4px; border-radius:2px; }',
    '',
    '/* Tags */',
    '.tag { display:inline-block; font-size:0.65rem; font-weight:600; padding:1px 6px; border-radius:2px; }',
    '.tag-ok { background:var(--teal-100); color:var(--teal-500); }',
    '.tag-warn { background:oklch(0.94 0.04 85); color:oklch(0.45 0.12 85); }',
    '.tag-bad { background:oklch(0.94 0.04 25); color:oklch(0.48 0.14 25); }',
    '.tag-info { background:var(--brand-100); color:var(--brand-500); }',
    '',
    '/* Diagrams */',
    '.diagram { margin:20px 0; padding:20px; background:var(--bg-surface); border-radius:4px; text-align:center; }',
    '.diagram-title { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--fg-accent); margin-bottom:12px; text-align:left; }',
    '.diagram-caption { font-size:0.7rem; color:var(--fg-muted); margin-top:8px; font-style:italic; text-align:left; }',
    '.diagram pre.mermaid { background:transparent; padding:0; margin:0; text-align:center; }',
    '',
    '/* Code */',
    'pre { background:var(--neutral-950); border-radius:4px; padding:16px 20px; margin:12px 0; overflow-x:auto; }',
    'pre code { font-family:var(--f-mono); font-size:0.75rem; color:var(--neutral-200); line-height:1.7; }',
    '',
    '/* Progress bars */',
    '.progress { display:flex; align-items:center; gap:8px; margin:4px 0; }',
    '.progress .bar { flex:1; height:6px; background:var(--bg-warm); border-radius:3px; overflow:hidden; }',
    '.progress .bar .fill { height:100%; border-radius:3px; }',
    '.progress .bar .fill.green { background:var(--teal-500); }',
    '.progress .bar .fill.amber { background:oklch(0.6 0.15 85); }',
    '.progress .bar .fill.red { background:oklch(0.55 0.18 25); }',
    '.progress .pct { font-family:var(--f-mono); font-size:0.75rem; color:var(--fg-muted); min-width:36px; text-align:right; }',
    '',
    '/* Recommendation cards */',
    '.rec-list { margin:12px 0; }',
    '.rec-item { display:grid; grid-template-columns:32px 1fr; gap:8px; padding:10px 0; border-bottom:0.5px solid var(--border-default); font-size:0.82rem; }',
    '.rec-item:last-child { border-bottom:none; }',
    '.rec-item .num { font-family:var(--f-display); font-size:1.1rem; color:var(--fg-accent); }',
    '.rec-item .body { color:var(--fg-secondary); }',
    '.rec-item strong { color:var(--fg-primary); }',
    '',
    '/* Recommendation priority */',
    '.rec-priority { font-size:0.6rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-left:4px; }',
    '',
    '/* Footer */',
    '.report-footer { border-top:1.5px solid var(--fg-primary); padding-top:16px; margin-top:48px; font-size:0.7rem; color:var(--fg-muted); font-family:var(--f-mono); display:flex; justify-content:space-between; align-items:center; }',
    '.report-footer button { background:var(--bg-surface); border:1px solid var(--border-default); padding:4px 12px; font-size:0.7rem; font-family:var(--f-mono); color:var(--fg-secondary); cursor:pointer; border-radius:2px; }',
    '.report-footer button:hover { background:var(--bg-warm); }',
    '',
    '/* Print */',
    '@media print { body { max-width:100%; padding:24px; } .diagram { break-inside:avoid; } .section { break-inside:avoid; } }'
  ].join('\n');
}

// ─── Section Builders ───────────────────────────────────────────────────────

/**
 * Resolve {{template-variables}} in a string using available data.
 */
function resolveTitle(rawTitle, deps, explain, manifest) {
  if (!rawTitle) return 'Project Recap';
  var title = rawTitle;
  // Resolve {{project-name}} from multiple sources
  var projectName = (deps && deps.projectName)
    || (explain && explain.project_name)
    || (manifest && manifest.context && manifest.context.project_name)
    || (manifest && manifest.context && manifest.context.feature_name)
    || null;
  if (projectName) {
    title = title.replace(/\{\{project[_-]?name\}\}/gi, projectName);
  }
  // Resolve {{date}}
  title = title.replace(/\{\{date\}\}/gi, new Date().toISOString().slice(0, 10));
  // Strip any remaining unresolved {{...}}
  title = title.replace(/\{\{[^}]+\}\}/g, '').trim();
  // Clean up double spaces or trailing dashes
  title = title.replace(/\s*[—–-]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return title || 'Project Recap';
}

/**
 * Get the current git branch name.
 */
function getGitBranch(projectRoot) {
  try {
    var { execSync } = require('child_process');
    return execSync('git branch --show-current', { cwd: projectRoot || '.', encoding: 'utf8', timeout: 5000 }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function htmlHead(manifest, deps, explain) {
  var rawTitle = (manifest && manifest.report && manifest.report.title) || '';
  var title = resolveTitle(rawTitle, deps, explain, manifest);
  if (!title || title === 'Project Recap') {
    title = 'Project Recap — ' + ((deps && deps.projectName) || (manifest && manifest.workflow_name) || 'Project');
  }
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>' + esc(title) + '</title>\n' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Outfit:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
    '  <style>\n' + getCSS() + '\n  </style>\n</head>\n<body>\n';
}

function headerSection(manifest, explain, deps, projectRoot, arch) {
  var workflowName = manifest.workflow_name || 'angular-project-recap';
  var rawTitle = (manifest && manifest.report && manifest.report.title) || '';
  var title = resolveTitle(rawTitle, deps, explain, manifest);
  if (!title || title === 'Project Recap') {
    title = (deps && deps.projectName) || (explain && explain.project_name) || 'Project Recap';
  }
  var date = manifest.created_at ? manifest.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  var branch = getGitBranch(projectRoot);
  var angVer = (deps && deps.angular && deps.angular.version) || '';
  var nxVer = '';
  if (arch && arch.isNx && deps) {
    nxVer = safeVal(deps, 'nx_version', safeVal(deps, 'nxVersion', ''));
    // Also check classified deps for nx
    if (!nxVer && deps.classified) {
      var cats = Object.keys(deps.classified);
      for (var ci = 0; ci < cats.length; ci++) {
        var items = deps.classified[cats[ci]];
        if (Array.isArray(items)) {
          for (var di = 0; di < items.length; di++) {
            if (items[di].name === 'nx' || items[di].name === '@nx/workspace' || items[di].name === '@nrwl/workspace') {
              nxVer = items[di].version || '';
              break;
            }
          }
        }
        if (nxVer) break;
      }
    }
  }

  var meta = 'Scanned: ' + date;
  meta += ' &bull; Branch: <strong>' + esc(branch) + '</strong>';
  if (angVer) meta += ' &bull; Angular ' + esc(angVer);
  if (nxVer) meta += ' &bull; Nx ' + esc(nxVer);

  return '<div class="report-header">\n' +
    '  <div class="overline">Project Recap &mdash; generated by ORCH / ' + esc(workflowName) + '</div>\n' +
    '  <h1>' + esc(title) + '</h1>\n' +
    '  <div class="meta">' + meta + '</div>\n' +
    '</div>\n';
}

function executiveSummary(explain, deps, tests, quality, arch) {
  var text = '';

  // Prefer explain-phase executive_summary if it is a real sentence (not a marker)
  if (explain && explain.executive_summary && typeof explain.executive_summary === 'string' && explain.executive_summary.length > 30) {
    text = explain.executive_summary;
  } else if (explain && explain.summary && typeof explain.summary === 'string' && explain.summary.length > 30) {
    text = explain.summary;
  }

  // If explain text is too short or absent, compose a rich summary from available data
  if (!text || text.length < 30) {
    var sentences = [];

    // Architecture shape
    if (arch) {
      var projects = arch.projects || [];
      var pathKeys = Object.keys(arch.tsconfigPaths || arch.tsconfig_paths || {});
      var appCount = projects.length;
      var libCount = pathKeys.length;
      if (arch.isNx) {
        sentences.push('Nx monorepo with ' + appCount + ' application' + (appCount !== 1 ? 's' : '') +
          (libCount > 0 ? ' and ' + libCount + ' shared ' + (libCount !== 1 ? 'libraries' : 'library') : '') + '.');
      } else if (appCount > 0) {
        sentences.push('Angular project with ' + appCount + ' application' + (appCount !== 1 ? 's' : '') +
          (libCount > 0 ? ' and ' + libCount + ' path alias' + (libCount !== 1 ? 'es' : '') : '') + '.');
      }

      // Standalone adoption
      var comps = arch.components || [];
      if (comps.length > 0) {
        var standaloneCount = comps.filter(function (c) { return c.standalone || c.isStandalone; }).length;
        var standalonePct = Math.round((standaloneCount / comps.length) * 100);
        if (standalonePct === 0) {
          sentences.push(comps.length + ' components, all NgModule-based (no standalone adoption).');
        } else if (standalonePct < 100) {
          sentences.push(comps.length + ' components with ' + standalonePct + '% standalone adoption.');
        } else {
          sentences.push(comps.length + ' fully standalone components.');
        }
      }
    }

    // Framework versions
    if (deps) {
      var angVer = (deps.angular && deps.angular.version) ? deps.angular.version
        : safeVal(deps, 'angular_version', safeVal(deps, 'angularVersion', null));
      var tsVer = (deps.angular && deps.angular.typescript) ? deps.angular.typescript
        : safeVal(deps, 'typescript_version', safeVal(deps, 'typescriptVersion', null));
      if (angVer) sentences.push('Angular ' + angVer + (tsVer ? ' with TypeScript ' + tsVer : '') + '.');
    }

    // Test coverage
    if (tests) {
      var cov = safeVal(tests, 'coveragePercent', safeVal(tests, 'coverage_percent', safeVal(tests, 'coverage', null)));
      if (cov !== null && cov !== '---') {
        var covNum = Number(cov);
        if (!isNaN(covNum)) {
          if (covNum < 30) sentences.push('Test coverage is low at ' + Math.round(covNum) + '%.');
          else if (covNum < 60) sentences.push('Test coverage is moderate at ' + Math.round(covNum) + '%.');
          else sentences.push('Test coverage at ' + Math.round(covNum) + '%.');
        }
      }
    }

    // Quality highlights
    if (quality) {
      var consoleLogs = quality.consoleLogs;
      var totalCl = 0;
      if (consoleLogs && typeof consoleLogs === 'object' && consoleLogs.total !== undefined) {
        totalCl = Number(consoleLogs.total) || 0;
      } else if (consoleLogs && typeof consoleLogs === 'object' && consoleLogs.items) {
        totalCl = Array.isArray(consoleLogs.items) ? consoleLogs.items.length : 0;
      }
      if (totalCl > 10) sentences.push(totalCl + ' console statements detected in production code.');
    }

    // Dependencies health
    if (deps && deps.summary) {
      var depSummary = deps.summary;
      if (typeof depSummary === 'object') {
        var totalAll = depSummary.totalAll || depSummary.total || 0;
        var outdatedCount = depSummary.outdatedCount || depSummary.outdated_count || 0;
        if (totalAll > 0) sentences.push(totalAll + ' total dependencies' + (outdatedCount > 0 ? ', ' + outdatedCount + ' with known issues.' : '.'));
      }
    }

    text = sentences.length > 0
      ? sentences.join(' ')
      : 'Automated project scan completed. See detailed sections below.';
  }

  return '<div class="exec-summary">\n' +
    '  <h2>Executive Summary</h2>\n' +
    '  <p>' + esc(text) + '</p>\n' +
    '</div>\n';
}

function kpiCards(arch, tests, quality, deps) {
  // Extract values with fallback chains — support nested object formats
  var componentCount = '—';
  if (arch) {
    componentCount = (arch.components && Array.isArray(arch.components)) ? arch.components.length
      : safeVal(arch, 'component_count', safeVal(arch, 'componentCount', safeVal(arch, 'total_components', '—')));
  }

  var tsFiles = '—';
  if (tests) {
    tsFiles = safeVal(tests, 'totalFiles', safeVal(tests, 'total_files', '—'));
  } else if (arch) {
    tsFiles = safeVal(arch, 'totalFiles', safeVal(arch, 'total_files', '—'));
  }

  var coverage = '—';
  if (tests) {
    var cov = safeVal(tests, 'coveragePercent', safeVal(tests, 'coverage_percent', safeVal(tests, 'coverage', null)));
    if (cov !== null && cov !== '—') coverage = Math.round(Number(cov)) + '%';
  }

  var outdated = '—';
  if (deps) {
    if (deps.outdated && Array.isArray(deps.outdated)) {
      outdated = deps.outdated.length;
    } else if (deps.summary && deps.summary.outdatedCount !== undefined) {
      outdated = deps.summary.outdatedCount;
    } else if (deps.summary && deps.summary.mismatchCount !== undefined && deps.summary.mismatchCount > 0) {
      outdated = deps.summary.mismatchCount;
    } else if (deps.mismatches && Array.isArray(deps.mismatches)) {
      outdated = deps.mismatches.length;
    } else {
      outdated = safeVal(deps, 'outdated_count', safeVal(deps, 'outdatedCount', '—'));
    }
  }

  // Apps count — from arch.projects
  var appCount = '—';
  if (arch && arch.projects && Array.isArray(arch.projects)) {
    appCount = arch.projects.length;
  }

  // Shared libs — from tsconfigPaths keys
  var libCount = '—';
  if (arch) {
    var tsconfigPaths = arch.tsconfigPaths || arch.tsconfig_paths || {};
    var pathKeys = Object.keys(tsconfigPaths);
    if (pathKeys.length > 0) {
      libCount = pathKeys.length;
    }
  }

  return '<div class="stat-strip">\n' +
    '  <div class="stat accent"><div class="val">' + esc(String(componentCount)) + '</div><div class="lbl">Components</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(String(tsFiles)) + '</div><div class="lbl">TypeScript files</div></div>\n' +
    '  <div class="stat teal"><div class="val">' + esc(String(coverage)) + '</div><div class="lbl">Test coverage</div></div>\n' +
    '  <div class="stat warn"><div class="val">' + esc(String(outdated)) + '</div><div class="lbl">Outdated deps</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(String(appCount)) + '</div><div class="lbl">Apps</div></div>\n' +
    '  <div class="stat"><div class="val">' + esc(String(libCount)) + '</div><div class="lbl">Shared libs</div></div>\n' +
    '</div>\n';
}

function tableOfContents() {
  return '<div class="toc">\n  <h2>Contents</h2>\n  <ol>\n' +
    '    <li><a href="#deps">Dependencies &amp; Compatibility</a></li>\n' +
    '    <li><a href="#context">System Context (C4 Level 1)</a></li>\n' +
    '    <li><a href="#containers">System Containers (C4 Level 2)</a></li>\n' +
    '    <li><a href="#arch">Architecture &amp; Components (C4 Level 3)</a></li>\n' +
    '    <li><a href="#security">Security &amp; Authentication</a></li>\n' +
    '    <li><a href="#features">Functional &amp; Non-Functional Features</a></li>\n' +
    '    <li><a href="#ux">UX, Design System &amp; Component Library</a></li>\n' +
    '    <li><a href="#quality">Code Quality &amp; Performance</a></li>\n' +
    '    <li><a href="#tests">Test Coverage &amp; Gaps</a></li>\n' +
    '    <li><a href="#deploy">Deployment &amp; CI/CD</a></li>\n' +
    '    <li><a href="#git">Git History &amp; Changelog</a></li>\n' +
    '    <li><a href="#docs">Documentation Status</a></li>\n' +
    '    <li><a href="#recs">Recommendations</a></li>\n' +
    '  </ol>\n</div>\n';
}

function dependenciesSection(deps, compat) {
  var html = '<div class="section" id="deps">\n' +
    '  <h2>1. Dependencies &amp; Compatibility</h2>\n' +
    '  <div class="section-sub">Generated by scan-deps + scan-compat</div>\n';

  if (!deps && !compat) return html + renderNotAvailable('scan-deps') + '</div>\n';
  if (!deps) deps = {};

  // Framework & Build table — matches example style with Latest, Status, Upgrade benefit columns
  var ang = deps.angular || {};
  var angVer = ang.version || safeVal(deps, 'angular_version', safeVal(deps, 'angularVersion', null));
  var tsVer = ang.typescript || safeVal(deps, 'typescript_version', safeVal(deps, 'typescriptVersion', null));
  var rxVer = ang.rxjs || safeVal(deps, 'rxjs_version', safeVal(deps, 'rxjsVersion', null));
  var zoneVer = ang.zoneJs || safeVal(deps, 'zone_version', null);
  var cliVer = ang.cliVersion || null;

  if (angVer || tsVer) {
    html += '  <h3>Framework &amp; Build</h3>\n';
    var fwRows = [];
    if (angVer) fwRows.push(['<code>@angular/core</code>', esc(String(angVer)), '&mdash;', statusTag('current'), '&mdash;']);
    if (cliVer) fwRows.push(['<code>@angular/cli</code>', esc(String(cliVer)), '&mdash;', statusTag('current'), '&mdash;']);
    if (tsVer) fwRows.push(['<code>typescript</code>', esc(String(tsVer)), '&mdash;', statusTag('current'), '&mdash;']);
    if (rxVer) fwRows.push(['<code>rxjs</code>', esc(String(rxVer)), '&mdash;', statusTag('current'), '&mdash;']);
    if (zoneVer) fwRows.push(['<code>zone.js</code>', esc(String(zoneVer)), '&mdash;', statusTag('current'), '&mdash;']);
    var nxVer = safeVal(deps, 'nx_version', safeVal(deps, 'nxVersion', null));
    if (nxVer) fwRows.push(['<code>nx</code>', esc(String(nxVer)), '&mdash;', statusTag('current'), '&mdash;']);
    html += renderTable(['Package', 'Current', 'Latest', 'Status', 'Upgrade benefit'], fwRows);
    html += '  <p class="meta">Latest version and upgrade benefit data requires AI enrichment or a compatibility matrix reference.</p>\n';
  }

  // Angular packages table — from deps.angular.packages (object: name -> version)
  var angPackages = ang.packages;
  if (angPackages && typeof angPackages === 'object' && !Array.isArray(angPackages)) {
    var pkgKeys = Object.keys(angPackages);
    if (pkgKeys.length > 0) {
      html += '  <h3>Angular Packages (' + pkgKeys.length + ')</h3>\n';
      var pkgRows = pkgKeys.map(function (name) {
        return ['<code>' + esc(name) + '</code>', esc(String(angPackages[name]))];
      });
      html += renderTable(['Package', 'Version'], pkgRows);
    }
  }

  // Classified dependencies — support OBJECT of arrays format: { "angular-core": [{name, version}, ...], ... }
  var classified = deps.classified || deps.dependencies || deps.classified_dependencies || deps.packages;
  if (classified && typeof classified === 'object' && !Array.isArray(classified)) {
    // Object-of-arrays format
    var categories = Object.keys(classified);
    if (categories.length > 0) {
      html += '  <h3>Dependencies by Category</h3>\n';
      categories.forEach(function (cat) {
        var items = classified[cat];
        if (!Array.isArray(items) || items.length === 0) return;
        var catLabel = cat.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        html += '  <h3>' + esc(catLabel) + ' (' + items.length + ')</h3>\n';
        var depRows = items.map(function (d) {
          var devTag = d.isDev ? ' <span class="tag tag-info">dev</span>' : '';
          return [
            '<code>' + esc(d.name || d.package || d.pkg || '') + '</code>',
            esc(String(d.version || d.current || '')),
            '&mdash;',
            devTag || '&mdash;'
          ];
        });
        html += renderTable(['Package', 'Current', 'Latest', 'Status'], depRows);
      });
    }
  } else if (classified && Array.isArray(classified) && classified.length > 0) {
    // Legacy flat array format
    html += '  <h3>Dependencies</h3>\n';
    var depRows = classified.map(function (d) {
      return [
        '<code>' + esc(d.name || d.package || d.pkg || '') + '</code>',
        esc(String(d.version || d.current || '')),
        esc(String(d.category || d.type || d.group || '')),
        d.status ? statusTag(d.status) : '—'
      ];
    });
    html += renderTable(['Package', 'Version', 'Category', 'Status'], depRows);
  }

  // Mismatches / warnings
  var mismatches = deps.mismatches || deps.warnings || deps.version_mismatches;
  if (mismatches && Array.isArray(mismatches) && mismatches.length > 0) {
    html += '  <h3>Version Mismatches / Warnings</h3>\n';
    var mmRows = mismatches.map(function (m) {
      if (typeof m === 'string') return [esc(m), '—', statusTag('warning')];
      return [
        '<code>' + esc(m.package || m.name || m.pkg || '') + '</code>',
        esc(String(m.message || m.detail || m.issue || '')),
        statusTag(m.severity || 'warning')
      ];
    });
    html += renderTable(['Package', 'Issue', 'Severity'], mmRows);
  }

  // Outdated / deprecated
  var outdated = deps.outdated || deps.deprecated || deps.outdated_packages;
  if (outdated && Array.isArray(outdated) && outdated.length > 0) {
    html += '  <h3>Outdated / Deprecated Packages</h3>\n';
    var odRows = outdated.map(function (o) {
      if (typeof o === 'string') return [esc(o), '—', '—', statusTag('outdated')];
      return [
        '<code>' + esc(o.package || o.name || o.pkg || '') + '</code>',
        esc(String(o.issue || o.message || o.detail || '')),
        esc(String(o.latest || o.available || '&mdash;')),
        statusTag(o.severity || o.status || 'outdated')
      ];
    });
    html += renderTable(['Package', 'Issue', 'Latest', 'Severity'], odRows);
  }

  // Compatibility data from phase 004
  if (compat) {
    // Support collected.detected_dependencies from AI compat phase
    var detectedDeps = compat.detected_dependencies;
    var compatNotes = compat.notes;

    var compatMatrix = compat.compatibility_matrix || compat.compatibilityMatrix || compat.matrix;
    if (compatMatrix && Array.isArray(compatMatrix) && compatMatrix.length > 0) {
      html += '  <h3>Compatibility Matrix</h3>\n';
      var cmRows = compatMatrix.map(function (row) {
        return [
          esc(String(row.path || row.upgrade_path || row.name || '')),
          esc(String(row.angular || '')),
          esc(String(row.typescript || '')),
          esc(String(row.node || '')),
          row.nx ? esc(String(row.nx)) : '&mdash;',
          row.risk ? statusTag(row.risk) : '&mdash;'
        ];
      });
      html += renderTable(['Upgrade Path', 'Angular', 'TypeScript', 'Node', 'Nx', 'Risk'], cmRows);
    }

    // Upgrade path diagram
    var upgradePath = compat.upgrade_path || compat.upgradePath;
    if (upgradePath && Array.isArray(upgradePath) && upgradePath.length > 0) {
      var upLines = ['graph LR'];
      for (var ui = 0; ui < upgradePath.length; ui++) {
        var step = upgradePath[ui];
        var stepId = 'UP' + ui;
        var stepLabel = esc(step.name || step.package || 'Step ' + (ui + 1)) + '\\n' + esc(String(step.from || '') + ' to ' + String(step.to || ''));
        upLines.push('    ' + stepId + '["' + stepLabel + '"]');
        if (ui > 0) upLines.push('    UP' + (ui - 1) + ' --> ' + stepId);
      }
      upLines.push('    V["Verify\\nbuild + test"]');
      if (upgradePath.length > 0) upLines.push('    UP' + (upgradePath.length - 1) + ' --> V');
      html += renderMermaidDiagram('Recommended Upgrade Sequence', upLines.join('\n'), 'Sequential upgrade path. Verify after each step.');
    }

    if (compatNotes && typeof compatNotes === 'string') {
      html += '  <p>' + esc(compatNotes) + '</p>\n';
    }
    if (compat.summary && typeof compat.summary === 'string') {
      html += '  <p>' + esc(compat.summary) + '</p>\n';
    }
  }

  // Summary counts line — matches example: "14 of 23 dependencies are outdated..."
  if (deps.summary && typeof deps.summary === 'object') {
    var s = deps.summary;
    var totalAll = s.totalAll || s.total || 0;
    var outdatedCount = s.outdatedCount || s.outdated_count || 0;
    var mismatchCount = s.mismatchCount || s.mismatch_count || 0;
    var parts = [];
    if (totalAll > 0) {
      if (outdatedCount > 0) parts.push(outdatedCount + ' of ' + totalAll + ' dependencies have known issues.');
      else parts.push(totalAll + ' dependencies scanned, no outdated packages detected.');
    }
    if (mismatchCount > 0) parts.push(mismatchCount + ' version mismatch' + (mismatchCount !== 1 ? 'es' : '') + ' found.');
    if (parts.length > 0) html += '  <p>' + esc(parts.join(' ')) + '</p>\n';
  } else if (deps.summary && typeof deps.summary === 'string') {
    html += '  <p>' + esc(deps.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

/**
 * Generate a C4 Context Mermaid diagram from arch + deps data.
 * Infers external API connections from services that depend on HttpClient.
 */
function generateC4Diagram(arch, deps) {
  var projects = arch.projects || [];
  var services = arch.services || [];
  var appName = (projects.length > 0 && projects[0].name) ? projects[0].name : 'Application';
  var angVer = (deps && deps.angular && deps.angular.version) ? deps.angular.version : '';
  var appLabel = appName + (angVer ? '\\nAngular ' + angVer : '');

  var lines = ['graph TD'];
  lines.push('    User["fa:fa-user User"] -->|uses| App["' + appLabel + '"]');

  // Find services that use HttpClient — they connect to external APIs
  var httpServices = services.filter(function (s) {
    return s.dependencies && Array.isArray(s.dependencies) && s.dependencies.indexOf('HttpClient') !== -1;
  });

  if (httpServices.length > 0) {
    lines.push('    App -->|HttpClient| API["fa:fa-server Backend API"]');
    httpServices.forEach(function (svc) {
      lines.push('    App --> ' + svc.name.replace(/[^a-zA-Z0-9]/g, '') + '["' + svc.name + '"]');
      lines.push('    ' + svc.name.replace(/[^a-zA-Z0-9]/g, '') + ' -->|HTTP| API');
    });
  }

  return lines.join('\n');
}

/**
 * Generate a component tree Mermaid diagram from routes + components.
 */
function generateComponentTree(arch) {
  var components = arch.components || [];
  var routes = arch.routes || [];

  if (components.length === 0 && routes.length === 0) return null;

  var lines = ['graph TD'];

  // Find root component (selector: app-root)
  var rootComp = components.filter(function (c) { return c.selector === 'app-root'; })[0];
  var rootId = rootComp ? rootComp.name.replace(/[^a-zA-Z0-9]/g, '') : 'App';
  var rootLabel = rootComp ? rootComp.name + '\\n' + (rootComp.selector || '') : 'AppComponent\\napp-root';
  lines.push('    ' + rootId + '["' + rootLabel + '"] --> Router["router-outlet"]');

  // Add route-based components
  routes.forEach(function (r) {
    var routePath = (r.path !== undefined && r.path !== null) ? r.path : '';
    var routeId = 'Route_' + (routePath === '' ? 'root' : routePath).replace(/[^a-zA-Z0-9]/g, '_');
    var label = routePath === '' ? '/ (root)' : '/' + routePath;
    if (r.lazy) label += '\\n(lazy)';
    lines.push('    Router --> ' + routeId + '["' + label + '"]');
  });

  // Add non-route components (limit to 15 to keep diagram readable)
  var routeFiles = {};
  routes.forEach(function (r) { if (r.file) routeFiles[r.file] = true; });
  var otherComps = components.filter(function (c) {
    return c.selector !== 'app-root' && !routeFiles[c.file];
  }).slice(0, 15);

  if (otherComps.length > 0) {
    otherComps.forEach(function (c) {
      var id = c.name.replace(/[^a-zA-Z0-9]/g, '');
      var label = c.name;
      if (c.standalone) label += '\\n(standalone)';
      lines.push('    ' + rootId + ' --> ' + id + '["' + label + '"]');
    });
  }

  return lines.join('\n');
}

/**
 * Generate a service dependency graph Mermaid diagram.
 */
function generateServiceGraph(arch) {
  var services = arch.services || [];
  if (services.length === 0) return null;

  var lines = ['graph LR'];
  var hasApi = false;

  services.forEach(function (svc) {
    var svcId = svc.name.replace(/[^a-zA-Z0-9]/g, '');
    if (svc.dependencies && Array.isArray(svc.dependencies)) {
      svc.dependencies.forEach(function (dep) {
        if (dep === 'HttpClient') {
          hasApi = true;
          lines.push('    ' + svcId + '["' + svc.name + '"] -->|HttpClient| API["fa:fa-server API"]');
        } else {
          var depId = dep.replace(/[^a-zA-Z0-9]/g, '');
          lines.push('    ' + svcId + '["' + svc.name + '"] --> ' + depId + '["' + dep + '"]');
        }
      });
    } else {
      // Service with no dependencies — just show it
      lines.push('    ' + svcId + '["' + svc.name + '"]');
    }
  });

  return lines.join('\n');
}

function renderMermaidDiagram(title, mermaidCode, caption) {
  if (!mermaidCode) return '';
  return '  <div class="diagram">\n' +
    '    <div class="diagram-title">' + esc(title) + '</div>\n' +
    '    <pre class="mermaid">\n' + mermaidCode + '\n    </pre>\n' +
    (caption ? '    <div class="diagram-caption">' + esc(caption) + '</div>\n' : '') +
    '  </div>\n';
}

function systemContextSection(arch, deps) {
  var html = '<div class="section" id="context">\n' +
    '  <h2>2. System Context (C4 Level 1)</h2>\n' +
    '  <div class="section-sub">Generated by scan-arch + explain</div>\n';

  if (!arch) return html + renderNotAvailable('scan-arch') + '</div>\n';

  var projects = arch.projects || [];
  var services = arch.services || [];
  var appName = (deps && deps.projectName) || (projects.length > 0 && projects[0].name) || 'Angular App';
  var angVer = (deps && deps.angular && deps.angular.version) || '';

  var mermaid = 'graph TD\n';
  mermaid += '    U["fa:fa-user User"] -->|uses| App["' + appName + (angVer ? '\\nAngular ' + angVer : '') + '"]\n';

  // Infer external systems from services with HttpClient dependency
  var apiServices = services.filter(function (s) {
    return s.dependencies && Array.isArray(s.dependencies) &&
      s.dependencies.some(function (d) { return d === 'HttpClient' || (typeof d === 'string' && d.indexOf('Http') !== -1); });
  });

  if (apiServices.length > 0) {
    mermaid += '    App -->|REST API| Backend["fa:fa-server Backend Services"]\n';
    for (var si = 0; si < apiServices.length; si++) {
      var svcId = sanitizeMermaidId(apiServices[si].name);
      mermaid += '    App --> ' + svcId + '["' + apiServices[si].name + '"]\n';
      mermaid += '    ' + svcId + ' -->|HTTP| Backend\n';
    }
  }

  // Style directives matching example
  mermaid += '\n    style App fill:#e8e6f0,stroke:#6a6480\n';
  if (apiServices.length > 0) {
    mermaid += '    style Backend fill:#f8f7fa,stroke:#b5b0ab\n';
    for (var sti = 0; sti < apiServices.length; sti++) {
      mermaid += '    style ' + sanitizeMermaidId(apiServices[sti].name) + ' fill:#f8f7fa,stroke:#b5b0ab\n';
    }
  }

  html += renderMermaidDiagram('System Context Diagram', mermaid,
    'High-level view: users interacting with the application and its external dependencies.');

  // Description
  var appCount = projects.length || 1;
  var apiCount = apiServices.length;
  html += '  <p>' + appCount + ' frontend application' + (appCount !== 1 ? 's' : '') +
    (apiCount > 0 ? ' communicating with ' + apiCount + ' backend service' + (apiCount !== 1 ? 's' : '') + ' via HTTP.' : '.') +
    '</p>\n';

  html += '</div>\n';
  return html;
}

function containersSection(arch, deps) {
  var html = '<div class="section" id="containers">\n' +
    '  <h2>3. System Containers (C4 Level 2)</h2>\n' +
    '  <div class="section-sub">Generated by scan-arch &mdash; inferred from projects, libraries, and API patterns</div>\n';

  if (!arch) return html + renderNotAvailable('scan-arch') + '</div>\n';

  var projects = arch.projects || [];
  var services = arch.services || [];
  var tsconfigPaths = arch.tsconfigPaths || arch.tsconfig_paths || {};

  var mermaid = 'graph TD\n';

  // Frontend subgraph
  mermaid += '    subgraph Frontend["Frontend"]\n';
  if (projects.length > 0) {
    for (var pi = 0; pi < projects.length; pi++) {
      var p = projects[pi];
      var pId = sanitizeMermaidId(p.name || 'proj' + pi);
      mermaid += '        ' + pId + '["' + (p.name || 'App ' + pi) + '\\n' + (p.projectType || p.type || 'app') + '"]\n';
    }
  } else {
    mermaid += '        MainApp["Application"]\n';
  }
  mermaid += '    end\n';

  // Shared libraries from tsconfigPaths
  var pathKeys = Object.keys(tsconfigPaths);
  if (pathKeys.length > 0) {
    mermaid += '    subgraph Libraries["Shared Libraries"]\n';
    for (var li = 0; li < pathKeys.length; li++) {
      var alias = pathKeys[li];
      var libId = sanitizeMermaidId(alias);
      mermaid += '        ' + libId + '["' + alias + '"]\n';
    }
    mermaid += '    end\n';
  }

  // Backend services inferred from HttpClient usage
  var httpServices = services.filter(function (s) {
    return s.dependencies && Array.isArray(s.dependencies) && s.dependencies.indexOf('HttpClient') !== -1;
  });
  if (httpServices.length > 0) {
    mermaid += '    subgraph Backend["Backend Services"]\n';
    for (var bi = 0; bi < httpServices.length; bi++) {
      var bId = sanitizeMermaidId(httpServices[bi].name);
      mermaid += '        ' + bId + '["' + httpServices[bi].name + '"]\n';
    }
    mermaid += '    end\n';
  }

  // Connections: projects -> libraries
  if (projects.length > 0 && pathKeys.length > 0) {
    for (var ci = 0; ci < projects.length; ci++) {
      for (var cj = 0; cj < pathKeys.length; cj++) {
        mermaid += '    ' + sanitizeMermaidId(projects[ci].name || 'proj' + ci) + ' --> ' + sanitizeMermaidId(pathKeys[cj]) + '\n';
      }
    }
  }

  // Connections: services -> backend
  if (httpServices.length > 0) {
    for (var hci = 0; hci < projects.length && hci < 1; hci++) {
      for (var hsi = 0; hsi < httpServices.length; hsi++) {
        mermaid += '    ' + sanitizeMermaidId(projects[hci].name || 'proj' + hci) + ' -->|HTTP| ' + sanitizeMermaidId(httpServices[hsi].name) + '\n';
      }
    }
  }

  // Style directives
  mermaid += '\n    style Frontend fill:#e8e6f0,stroke:#6a6480\n';
  if (pathKeys.length > 0) mermaid += '    style Libraries fill:#f0eef4,stroke:#8a84a0\n';
  if (httpServices.length > 0) mermaid += '    style Backend fill:#f8f7fa,stroke:#b5b0ab\n';

  html += renderMermaidDiagram('Container Diagram', mermaid,
    'System containers: frontend apps, shared libraries, and backend services.');

  // Container summary table
  var containerRows = [];
  for (var ti = 0; ti < projects.length; ti++) {
    containerRows.push([
      esc(projects[ti].name || ''),
      esc(projects[ti].projectType || projects[ti].type || 'app'),
      esc(String(projects[ti].root || '—'))
    ]);
  }
  for (var tl = 0; tl < pathKeys.length; tl++) {
    var pathVal = tsconfigPaths[pathKeys[tl]];
    var pathStr = Array.isArray(pathVal) ? pathVal.join(', ') : String(pathVal || '—');
    containerRows.push([esc(pathKeys[tl]), 'Library', esc(pathStr)]);
  }
  if (containerRows.length > 0) {
    html += '  <h3>Container Summary</h3>\n';
    html += renderTable(['Container', 'Type', 'Path'], containerRows);
  }

  html += '</div>\n';
  return html;
}

function architectureSection(arch, deps) {
  var html = '<div class="section" id="arch">\n' +
    '  <h2>4. Architecture &amp; Components (C4 Level 3)</h2>\n' +
    '  <div class="section-sub">Generated by scan-arch</div>\n';

  if (!arch) return html + renderNotAvailable('scan-arch') + '</div>\n';

  // Projects / applications
  var projects = arch.projects || arch.applications || arch.apps;
  if (projects && Array.isArray(projects) && projects.length > 0) {
    html += '  <h3>Projects</h3>\n';
    // Compute counts from data arrays for the project table
    var compCount = (arch.components && Array.isArray(arch.components)) ? arch.components.length : '—';
    var routeCount = (arch.routes && Array.isArray(arch.routes)) ? arch.routes.length : '—';
    var svcCount = (arch.services && Array.isArray(arch.services)) ? arch.services.length : '—';
    var projRows = projects.map(function (p) {
      return [
        '<code>' + esc(p.name || p.project || '') + '</code>',
        esc(String(p.projectType || p.type || '')),
        esc(String(compCount)),
        esc(String(routeCount)),
        esc(String(svcCount))
      ];
    });
    html += renderTable(['App', 'Type', 'Components', 'Routes', 'Services'], projRows);
  }

  // Nx indicator
  if (arch.isNx !== undefined) {
    html += '  <p>Nx Monorepo: ' + statusTag(arch.isNx ? 'yes' : 'no') + '</p>\n';
  }

  // C4 Context Diagram — GENERATED from data
  var c4 = generateC4Diagram(arch, deps);
  html += renderMermaidDiagram('C4 Context Diagram', c4, 'Auto-generated from scan-arch service dependencies');

  // Services table
  var services = arch.services || arch.service_list;
  if (services && Array.isArray(services) && services.length > 0) {
    html += '  <h3>Services</h3>\n';
    var svcRows = services.map(function (s) {
      var depsStr = '—';
      if (s.dependencies && Array.isArray(s.dependencies)) depsStr = s.dependencies.join(', ');
      else if (s.dependencies) depsStr = String(s.dependencies);
      return [
        '<code>' + esc(s.name || s.service || '') + '</code>',
        esc(String(s.file || '—')),
        esc(String(s.providedIn || s.provided_in || s.scope || '—')),
        esc(depsStr)
      ];
    });
    html += renderTable(['Service', 'File', 'Provided in', 'Dependencies'], svcRows);
  }

  // Service Dependency Graph — GENERATED from data
  var svcGraph = generateServiceGraph(arch);
  html += renderMermaidDiagram('Service Dependency Graph', svcGraph, 'Auto-generated from service dependency declarations');

  // Components summary
  var components = arch.components || arch.component_list;
  if (components && Array.isArray(components) && components.length > 0) {
    var standalone = components.filter(function (c) { return c.standalone || c.isStandalone; }).length;
    var moduleBased = components.length - standalone;
    html += '  <h3>Component Summary</h3>\n';
    html += '  <p>Total components: <strong>' + components.length + '</strong>';
    if (standalone > 0 || moduleBased > 0) {
      html += ' &mdash; Standalone: <strong>' + standalone + '</strong>, Module-based: <strong>' + moduleBased + '</strong>';
    }
    html += '</p>\n';

    // Component details table
    var compRows = components.map(function (c) {
      return [
        '<code>' + esc(c.name || '') + '</code>',
        esc(String(c.selector || '—')),
        esc(String(c.file || '—')),
        c.standalone ? statusTag('standalone') : statusTag('module'),
        esc(String(c.changeDetection || '—'))
      ];
    });
    html += renderTable(['Component', 'Selector', 'File', 'Type', 'Change Detection'], compRows);
  } else {
    var cc = safeVal(arch, 'component_count', safeVal(arch, 'componentCount', safeVal(arch, 'total_components', null)));
    if (cc !== null && cc !== '—') {
      html += '  <h3>Component Summary</h3>\n';
      html += '  <p>Total components: <strong>' + esc(String(cc)) + '</strong></p>\n';
    }
  }

  // Component Tree Diagram — GENERATED from data
  var compTree = generateComponentTree(arch);
  html += renderMermaidDiagram('Component Tree', compTree, 'Auto-generated from routes and component declarations');

  // Layered Architecture Diagram — generated from components + services + routes
  var layeredLines = ['graph TD'];
  var hasRoutes = (arch.routes && Array.isArray(arch.routes) && arch.routes.length > 0);
  var hasComps = (components && Array.isArray(components) && components.length > 0);
  var hasSvcs = (services && Array.isArray(services) && services.length > 0);

  if (hasRoutes || hasComps || hasSvcs) {
    if (hasComps) {
      layeredLines.push('    subgraph UI["UI Layer"]');
      var compLimit = Math.min(components.length, 4);
      for (var lai = 0; lai < compLimit; lai++) {
        var cName = components[lai].name || 'Component' + lai;
        var cId = sanitizeMermaidId(cName);
        layeredLines.push('        ' + cId + '["' + cName + '"]');
      }
      layeredLines.push('    end');
    }
    if (hasSvcs) {
      layeredLines.push('    subgraph ServiceLayer["Service Layer"]');
      var svcLimit = Math.min(services.length, 4);
      for (var lsi = 0; lsi < svcLimit; lsi++) {
        var sName = services[lsi].name || 'Service' + lsi;
        var sId = sanitizeMermaidId(sName);
        layeredLines.push('        ' + sId + '["' + sName + '"]');
      }
      layeredLines.push('    end');

      // Connect UI -> Services
      if (hasComps) {
        for (var lci = 0; lci < Math.min(components.length, 4); lci++) {
          // Connect each component to at least one service
          var targetSvc = services[lci % services.length];
          layeredLines.push('    ' + sanitizeMermaidId(components[lci].name) + ' --> ' + sanitizeMermaidId(targetSvc.name));
        }
      }

      // Data access layer for HttpClient services
      var httpSvcs = services.filter(function (s) {
        return s.dependencies && Array.isArray(s.dependencies) && s.dependencies.indexOf('HttpClient') !== -1;
      });
      if (httpSvcs.length > 0) {
        layeredLines.push('    subgraph DataLayer["Data Access Layer"]');
        layeredLines.push('        HC["HttpClient"]');
        layeredLines.push('    end');
        layeredLines.push('    subgraph ExternalAPIs["External APIs"]');
        layeredLines.push('        API["Backend API"]');
        layeredLines.push('    end');
        for (var lhi = 0; lhi < httpSvcs.length; lhi++) {
          layeredLines.push('    ' + sanitizeMermaidId(httpSvcs[lhi].name) + ' --> HC');
        }
        layeredLines.push('    HC --> API');
      }
    }

    // Styles matching the example
    if (hasComps) layeredLines.push('\n    style UI fill:#e8e6f0,stroke:#6a6480');
    if (hasSvcs) layeredLines.push('    style ServiceLayer fill:#f0eef4,stroke:#8a84a0');
    if (services.some(function (s) { return s.dependencies && s.dependencies.indexOf('HttpClient') !== -1; })) {
      layeredLines.push('    style DataLayer fill:#f8f7fa,stroke:#b5b0ab');
      layeredLines.push('    style ExternalAPIs fill:#fff,stroke:#ccc');
    }

    html += renderMermaidDiagram('Application Layer Structure', layeredLines.join('\n'),
      'Layered architecture: UI \u2192 Services \u2192 Data Access \u2192 External APIs');
  }

  // Route Map (integrated from former standalone section)
  var routes = arch.routes || arch.route_list || arch.routing;
  if (routes && Array.isArray(routes) && routes.length > 0) {
    html += '  <h3>Route Map</h3>\n';
    var routeRows = routes.map(function (r) {
      var lazyStr = '—';
      if (r.lazy !== undefined && r.lazy !== null) lazyStr = r.lazy ? statusTag('yes') : 'no';
      else if (r.isLazy !== undefined && r.isLazy !== null) lazyStr = r.isLazy ? statusTag('yes') : 'no';

      var guards = '—';
      if (r.guards && Array.isArray(r.guards)) guards = r.guards.length > 0 ? r.guards.join(', ') : 'none';
      else if (r.guards) guards = String(r.guards);
      else if (r.guard) guards = String(r.guard);

      var routePath = (r.path !== undefined && r.path !== null) ? r.path : (r.route || '');
      var displayPath = routePath === '' ? '/ (root)' : '/' + routePath;

      var source = r.component || r.componentName || r.file || '—';

      return [
        '<code>' + esc(displayPath) + '</code>',
        '<code>' + esc(String(source)) + '</code>',
        lazyStr,
        esc(guards)
      ];
    });
    html += renderTable(['Path', 'Source File', 'Lazy?', 'Guards'], routeRows);

    // Route map Mermaid diagram
    var routeLines = ['graph LR'];
    routeLines.push('    Root["/"] --> Router["Router"]');
    routes.forEach(function (r) {
      var routePath = (r.path !== undefined && r.path !== null) ? r.path : '';
      var id = 'R_' + (routePath || 'root').replace(/[^a-zA-Z0-9]/g, '_');
      var label = '/' + routePath;
      if (r.lazy) label += ' (lazy)';
      routeLines.push('    Router --> ' + id + '["' + label + '"]');
    });
    html += renderMermaidDiagram('Route Map', routeLines.join('\n'), 'Auto-generated from route configuration');
  }

  if (arch.summary && typeof arch.summary === 'string') {
    html += '  <p>' + esc(arch.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function securitySection(arch) {
  var html = '<div class="section" id="security">\n' +
    '  <h2>5. Security &amp; Authentication</h2>\n' +
    '  <div class="section-sub">Generated by scan-arch + scan-features</div>\n';

  if (!arch) return html + renderNotAvailable('scan-arch') + '</div>\n';

  var routes = arch.routes || [];
  var services = arch.services || [];

  // Route guards
  var guardedRoutes = routes.filter(function (r) { return r.guards && Array.isArray(r.guards) && r.guards.length > 0; });

  // Auth-related services
  var authServices = services.filter(function (s) {
    return s.name && /auth|token|session|login|guard|permission|role/i.test(s.name);
  });

  // Collect unique guard names from routes
  var allGuardNames = {};
  routes.forEach(function (r) {
    if (r.guards && Array.isArray(r.guards)) {
      r.guards.forEach(function (g) { if (g) allGuardNames[g] = true; });
    }
  });
  var guardList = Object.keys(allGuardNames);

  // Authentication flow diagram — adapted to actual guards found
  var mermaid = 'flowchart TD\n';
  mermaid += '    R["Route Request"] --> AG{"AuthGuard"}\n';
  mermaid += '    AG -->|not authenticated| L["Redirect to Login"]\n';
  if (guardList.length > 0) {
    mermaid += '    AG -->|authenticated| RG{"' + guardList.join(' / ') + '"}\n';
    mermaid += '    RG -->|allowed| P["Render Page"]\n';
    mermaid += '    RG -->|denied| F["403 Forbidden"]\n';
  } else {
    mermaid += '    AG -->|authenticated| P["Render Page"]\n';
  }
  mermaid += '    L --> SSO["Login / SSO Page"]\n';
  mermaid += '    SSO --> T["Token Issued"]\n';
  mermaid += '    T --> R\n';

  html += renderMermaidDiagram('Route Guard & Permission Check', mermaid,
    guardedRoutes.length > 0
      ? 'Every protected route passes through auth guard. ' + guardedRoutes.length + ' routes have explicit guards.'
      : 'Generic auth flow. No explicit route guards detected in scan data.');

  // Guarded routes table
  if (guardedRoutes.length > 0) {
    html += '  <h3>Guarded Routes (' + guardedRoutes.length + ')</h3>\n';
    var grRows = guardedRoutes.map(function (r) {
      var routePath = (r.path !== undefined && r.path !== null) ? r.path : '';
      var displayPath = routePath === '' ? '/ (root)' : '/' + routePath;
      return [
        '<code>' + esc(displayPath) + '</code>',
        esc(r.guards.join(', ')),
        r.lazy ? statusTag('lazy') : 'eager'
      ];
    });
    html += renderTable(['Route', 'Guards', 'Loading'], grRows);
  } else {
    html += '  <h3>Route Guards</h3>\n';
    html += '  <p class="meta">No route guards detected in the scan data.</p>\n';
  }

  // Authorization Matrix — show all routes with their guard status
  if (routes.length > 0) {
    html += '  <h3>Route Authorization Matrix</h3>\n';
    var authRows = routes.map(function (r) {
      var routePath = (r.path !== undefined && r.path !== null) ? r.path : '';
      var displayPath = routePath === '' ? '/ (root)' : '/' + routePath;
      var guardsStr = (r.guards && Array.isArray(r.guards) && r.guards.length > 0)
        ? r.guards.join(', ')
        : 'none';
      var protection = (r.guards && r.guards.length > 0) ? statusTag('protected') : statusTag('unprotected');
      return [
        '<code>' + esc(displayPath) + '</code>',
        esc(guardsStr),
        r.lazy ? statusTag('lazy') : 'eager',
        protection
      ];
    });
    html += renderTable(['Route', 'Guards', 'Loading', 'Protection'], authRows);
  }

  // Auth services table
  if (authServices.length > 0) {
    html += '  <h3>Auth-Related Services (' + authServices.length + ')</h3>\n';
    var asRows = authServices.map(function (s) {
      var depsStr = '—';
      if (s.dependencies && Array.isArray(s.dependencies)) depsStr = s.dependencies.join(', ');
      return [
        '<code>' + esc(s.name) + '</code>',
        esc(String(s.file || '—')),
        esc(depsStr)
      ];
    });
    html += renderTable(['Service', 'File', 'Dependencies'], asRows);
  } else {
    html += '  <h3>Auth-Related Services</h3>\n';
    html += '  <p class="meta">No auth/token/session services detected by name pattern.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function featuresSection(features) {
  var html = '<div class="section" id="features">\n' +
    '  <h2>6. Functional &amp; Non-Functional Features</h2>\n' +
    '  <div class="section-sub">Generated by scan-features</div>\n';

  if (!features) return html + renderNotAvailable('scan-features') + '</div>\n';

  var featureList = features.features || features.feature_list || features.functional_features;

  // Render summary stats even when feature list is empty
  var fSummary = features.summary;
  if (fSummary && typeof fSummary === 'object') {
    html += '  <h3>Feature Summary</h3>\n';
    var fSumRows = [];
    if (fSummary.totalRoutes !== undefined) fSumRows.push(['Total routes', String(fSummary.totalRoutes)]);
    if (fSummary.lazyRoutes !== undefined) fSumRows.push(['Lazy-loaded routes', String(fSummary.lazyRoutes)]);
    if (fSummary.eagerRoutes !== undefined) fSumRows.push(['Eager routes', String(fSummary.eagerRoutes)]);
    if (fSummary.totalComponents !== undefined) fSumRows.push(['Components', String(fSummary.totalComponents)]);
    if (fSummary.totalApiCalls !== undefined) fSumRows.push(['API calls detected', String(fSummary.totalApiCalls)]);
    if (fSummary.totalFeatures !== undefined) fSumRows.push(['Feature modules', String(fSummary.totalFeatures)]);
    if (fSumRows.length > 0) html += renderTable(['Metric', 'Value'], fSumRows);
  } else if (fSummary && typeof fSummary === 'string') {
    html += '  <p>' + esc(fSummary) + '</p>\n';
  }

  if (!featureList || !Array.isArray(featureList) || featureList.length === 0) {
    if (!fSummary) {
      html += '  <p class="meta">No feature data collected.</p>\n';
    }

    // Non-functional characteristics placeholder
    html += '  <h3>Non-Functional Characteristics</h3>\n';
    html += '  <p class="meta">Non-functional metrics (FCP, TTI, bundle size, accessibility) require running ' +
      '<code>ng build --stats-json</code> and Lighthouse. Not available from static scan.</p>\n';

    html += '</div>\n';
    return html;
  }

  var fRows = featureList.map(function (f) {
    var routesStr = '—';
    if (f.routes && Array.isArray(f.routes)) routesStr = f.routes.join(', ');
    else if (f.routes) routesStr = String(f.routes);
    else if (f.route_count !== undefined) routesStr = String(f.route_count);

    var compsStr = '—';
    if (f.components && Array.isArray(f.components)) compsStr = f.components.join(', ');
    else if (f.components) compsStr = String(f.components);
    else if (f.component_count !== undefined) compsStr = String(f.component_count);

    var apisStr = '—';
    if (f.apis && Array.isArray(f.apis)) apisStr = f.apis.join(', ');
    else if (f.apis) apisStr = String(f.apis);
    else if (f.api_count !== undefined) apisStr = String(f.api_count);

    return [
      esc(f.name || f.feature || ''),
      routesStr,
      compsStr,
      apisStr,
      f.status ? statusTag(f.status) : '—'
    ];
  });

  html += '  <h3>Functional Features</h3>\n';
  html += renderTable(['Feature', 'Routes', 'Components', 'APIs', 'Status'], fRows);

  // Non-functional characteristics table (from features data if available)
  var nfFeatures = features.non_functional || features.nonFunctional || features.nfr;
  if (nfFeatures && Array.isArray(nfFeatures) && nfFeatures.length > 0) {
    html += '  <h3>Non-Functional Characteristics</h3>\n';
    var nfRows = nfFeatures.map(function (nf) {
      return [
        esc(nf.attribute || nf.name || ''),
        esc(String(nf.target || '—')),
        esc(String(nf.actual || '—')),
        nf.status ? statusTag(nf.status) : '—'
      ];
    });
    html += renderTable(['Attribute', 'Target', 'Actual', 'Status'], nfRows);
  } else {
    html += '  <h3>Non-Functional Characteristics</h3>\n';
    html += '  <p class="meta">Non-functional metrics (FCP, TTI, bundle size, accessibility) require running ' +
      '<code>ng build --stats-json</code> and Lighthouse. Not available from static scan.</p>\n';
  }

  // User journey sequence diagram from features
  if (featureList && featureList.length > 0) {
    var seqLines = ['sequenceDiagram'];
    seqLines.push('    actor User');
    var participantSet = {};
    featureList.forEach(function (f) {
      var fname = f.name || f.feature || '';
      if (fname && !participantSet[fname]) {
        participantSet[fname] = true;
        var fId = sanitizeMermaidId(fname);
        seqLines.push('    participant ' + fId + ' as ' + fname);
      }
    });
    var prevId = null;
    featureList.forEach(function (f) {
      var fname = f.name || f.feature || '';
      if (!fname) return;
      var fId = sanitizeMermaidId(fname);
      if (!prevId) {
        seqLines.push('    User->>' + fId + ': Navigate');
      } else {
        seqLines.push('    User->>' + fId + ': Navigate');
      }
      seqLines.push('    ' + fId + '-->>User: Render');
      prevId = fId;
    });
    if (seqLines.length > 2) {
      html += renderMermaidDiagram('User Journey', seqLines.join('\n'),
        'Typical user flow across features.');
    }
  }

  if (features.summary && typeof features.summary === 'string') {
    html += '  <p>' + esc(features.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function uxDesignSection(arch, deps, features) {
  var html = '<div class="section" id="ux">\n' +
    '  <h2>7. UX, Design System &amp; Component Library</h2>\n' +
    '  <div class="section-sub">Generated by scan-arch + scan-deps</div>\n';

  if (!arch && !deps) return html + renderNotAvailable('scan-arch') + '</div>\n';

  var components = (arch && arch.components) || [];
  var services = (arch && arch.services) || [];

  // Component breakdown by type
  if (components.length > 0) {
    var standalone = components.filter(function (c) { return c.standalone || c.isStandalone; }).length;
    var moduleBased = components.length - standalone;
    var standalonePct = components.length > 0 ? Math.round((standalone / components.length) * 100) : 0;

    html += '  <h3>Component Breakdown</h3>\n';
    html += renderTable(['Type', 'Count', 'Percentage'], [
      ['Standalone', String(standalone), String(standalonePct) + '%'],
      ['Module-based', String(moduleBased), String(100 - standalonePct) + '%'],
      ['Total', String(components.length), '100%']
    ]);
    html += renderProgressBar('Standalone adoption', standalonePct);
  }

  // UI libraries detected from deps
  if (deps) {
    var classified = deps.classified || deps.dependencies || deps.packages;
    var uiLibs = [];

    // Check for common UI libraries in deps
    var checkLibs = ['@angular/material', 'primeng', 'ng-zorro', 'bootstrap', '@ng-bootstrap', 'ag-grid', 'plotly', '@yourorg/hds', '@yourorg/elevate'];
    if (classified && typeof classified === 'object') {
      var allDeps = [];
      if (Array.isArray(classified)) {
        allDeps = classified;
      } else {
        Object.keys(classified).forEach(function (cat) {
          if (Array.isArray(classified[cat])) {
            allDeps = allDeps.concat(classified[cat]);
          }
        });
      }
      allDeps.forEach(function (d) {
        var name = d.name || d.package || d.pkg || '';
        for (var cli = 0; cli < checkLibs.length; cli++) {
          if (name.indexOf(checkLibs[cli]) !== -1) {
            uiLibs.push([
              '<code>' + esc(name) + '</code>',
              esc(String(d.version || d.current || '—'))
            ]);
          }
        }
      });
    }

    if (uiLibs.length > 0) {
      html += '  <h3>UI Libraries Detected</h3>\n';
      html += renderTable(['Library', 'Version'], uiLibs);
    }
  }

  // State management patterns (inferred)
  if (services.length > 0) {
    var statePatterns = [];
    var hasSignals = false;
    var hasBehaviorSubject = false;
    var hasNgrx = false;

    services.forEach(function (s) {
      if (s.dependencies && Array.isArray(s.dependencies)) {
        s.dependencies.forEach(function (d) {
          if (/signal/i.test(d)) hasSignals = true;
          if (/BehaviorSubject|Subject|Observable/i.test(d)) hasBehaviorSubject = true;
          if (/Store|ngrx/i.test(d)) hasNgrx = true;
        });
      }
    });

    if (hasSignals || hasBehaviorSubject || hasNgrx) {
      html += '  <h3>State Management</h3>\n';
      if (hasSignals) statePatterns.push(['Angular Signals', statusTag('modern')]);
      if (hasBehaviorSubject) statePatterns.push(['RxJS BehaviorSubject', statusTag('legacy — migrate to signals')]);
      if (hasNgrx) statePatterns.push(['NgRx Store', statusTag('active')]);
      html += renderTable(['Pattern', 'Status'], statePatterns);

      // State flow diagram
      var stateLines = ['graph LR'];
      if (hasSignals) {
        stateLines.push('    subgraph Signals["Angular Signals (modern)"]');
        stateLines.push('        SIG["signal() / computed()"]');
        stateLines.push('    end');
      }
      if (hasBehaviorSubject) {
        stateLines.push('    subgraph RxJS["BehaviorSubject (legacy)"]');
        stateLines.push('        BS["BehaviorSubject / Observable"]');
        stateLines.push('    end');
      }
      if (hasNgrx) {
        stateLines.push('    subgraph Store["NgRx Store"]');
        stateLines.push('        ST["Store / Actions / Reducers"]');
        stateLines.push('    end');
      }
      if (hasSignals) stateLines.push('    style Signals fill:#e6f5f2,stroke:#1a7a6d');
      if (hasBehaviorSubject) stateLines.push('    style RxJS fill:#fef3e2,stroke:#b8860b');
      if (hasNgrx) stateLines.push('    style Store fill:#e8e6f0,stroke:#6a6480');
      html += renderMermaidDiagram('State Management Architecture', stateLines.join('\n'),
        'Detected state management patterns in the codebase.');
    }
  }

  // Design system status
  var hasHDS = false;
  var hasElevate = false;
  if (deps) {
    var depsStr = JSON.stringify(deps);
    hasHDS = depsStr.indexOf('hds') !== -1 || depsStr.indexOf('HDS') !== -1;
    hasElevate = depsStr.indexOf('elevate') !== -1 || depsStr.indexOf('Elevate') !== -1;
  }

  html += '  <h3>Design System Status</h3>\n';
  if (hasHDS || hasElevate) {
    html += '  <p>Organization design system detected: ' +
      (hasHDS ? statusTag('HDS present') + ' ' : '') +
      (hasElevate ? statusTag('Elevate present') : '') +
      '</p>\n';
  } else {
    html += '  <p class="meta">No organization design system (HDS / Elevate) detected in dependencies.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function qualitySection(quality) {
  var html = '<div class="section" id="quality">\n' +
    '  <h2>8. Code Quality &amp; Performance</h2>\n' +
    '  <div class="section-sub">Generated by scan-quality</div>\n';

  if (!quality) return html + renderNotAvailable('scan-quality') + '</div>\n';

  // Quality score
  var score = safeVal(quality, 'quality_score', safeVal(quality, 'qualityScore', safeVal(quality, 'score', null)));
  if (score !== null && score !== '—') {
    var scorePct = Number(score);
    if (!isNaN(scorePct)) {
      html += '  <h3>Quality Score</h3>\n';
      html += renderProgressBar('Quality', scorePct);
    }
  }

  // Lint errors/warnings
  var lintErrors = safeVal(quality, 'lint_errors', safeVal(quality, 'lintErrors', safeVal(quality, 'errors', null)));
  var lintWarnings = safeVal(quality, 'lint_warnings', safeVal(quality, 'lintWarnings', safeVal(quality, 'warnings', null)));

  if (lintErrors !== null || lintWarnings !== null) {
    html += '  <h3>Lint Results</h3>\n';
    var lintRows = [];
    if (lintErrors !== null && lintErrors !== '—') lintRows.push(['Errors', String(lintErrors), statusTag(Number(lintErrors) > 0 ? 'fix required' : 'clean')]);
    if (lintWarnings !== null && lintWarnings !== '—') lintRows.push(['Warnings', String(lintWarnings), statusTag(Number(lintWarnings) > 5 ? 'review' : 'acceptable')]);
    html += renderTable(['Type', 'Count', 'Status'], lintRows);
  }

  // Lint issues list
  var lintIssues = quality.lint_issues || quality.lintIssues || quality.issues;
  if (lintIssues && Array.isArray(lintIssues) && lintIssues.length > 0) {
    html += '  <h3>Lint Issues</h3>\n';
    var issueRows = lintIssues.slice(0, 25).map(function (issue) {
      if (typeof issue === 'string') return [esc(issue), '—', '—'];
      return [
        '<code>' + esc(issue.file || issue.path || '') + '</code>',
        esc(String(issue.rule || issue.message || '')),
        statusTag(issue.severity || issue.level || 'warning')
      ];
    });
    html += renderTable(['File', 'Rule / Message', 'Severity'], issueRows);
    if (lintIssues.length > 25) {
      html += '  <p class="meta">… and ' + (lintIssues.length - 25) + ' more issues</p>\n';
    }
  }

  // TODOs — support nested {total, byType: {TODO: 2, FIXME: 0}, items: [...]}
  var todos = quality.todos;
  if (todos !== null && todos !== undefined) {
    html += '  <h3>TODOs / FIXMEs</h3>\n';
    if (typeof todos === 'object' && !Array.isArray(todos)) {
      // Nested format with total/byType/items
      var todoTotal = todos.total;
      var byType = todos.byType || todos.by_type;
      if (todoTotal !== undefined) {
        html += '  <p>Total annotations: <strong>' + esc(String(todoTotal)) + '</strong></p>\n';
      }
      if (byType && typeof byType === 'object') {
        var todoKeys = Object.keys(byType);
        var todoRows = todoKeys.map(function (k) {
          var count = Number(byType[k]) || 0;
          return [esc(k), String(count), count > 0 ? statusTag('needs review') : statusTag('clean')];
        });
        html += renderTable(['Type', 'Count', 'Status'], todoRows);
      } else {
        // Flat object format {TODO: 2, FIXME: 0}
        var flatKeys = Object.keys(todos).filter(function (k) { return k !== 'total' && k !== 'items'; });
        if (flatKeys.length > 0) {
          var totalTodos = 0;
          var flatRows = flatKeys.map(function (k) {
            var count = Number(todos[k]) || 0;
            totalTodos += count;
            return [esc(k), String(count), count > 0 ? statusTag('needs review') : statusTag('clean')];
          });
          if (todoTotal === undefined) html += '  <p>Total annotations: <strong>' + totalTodos + '</strong></p>\n';
          html += renderTable(['Type', 'Count', 'Status'], flatRows);
        }
      }
      // Show todo items if available
      if (todos.items && Array.isArray(todos.items) && todos.items.length > 0) {
        var todoItemRows = todos.items.slice(0, 15).map(function (item) {
          return [
            '<code>' + esc(item.file || '') + '</code>',
            esc(String(item.line || '—')),
            esc(String(item.type || item.method || 'TODO')),
            esc(String(item.text || '').slice(0, 100))
          ];
        });
        html += renderTable(['File', 'Line', 'Type', 'Comment'], todoItemRows);
        if (todos.items.length > 15) {
          html += '  <p class="meta">&hellip; and ' + (todos.items.length - 15) + ' more</p>\n';
        }
      }
    } else {
      // Fallback: scalar value
      html += '  <p>Found <strong>' + esc(String(todos)) + '</strong> TODO/FIXME comments in the codebase.</p>\n';
    }
  } else {
    var todoCount = safeVal(quality, 'todo_count', safeVal(quality, 'todoCount', null));
    if (todoCount !== null && todoCount !== '—') {
      html += '  <h3>TODOs / FIXMEs</h3>\n';
      html += '  <p>Found <strong>' + esc(String(todoCount)) + '</strong> TODO/FIXME comments in the codebase.</p>\n';
    }
  }

  // Console logs — support nested {total, items: [{file, line, method, text}]}
  var consoleLogs = quality.consoleLogs;
  if (consoleLogs !== null && consoleLogs !== undefined) {
    html += '  <h3>Console Statements</h3>\n';
    if (typeof consoleLogs === 'object' && !Array.isArray(consoleLogs)) {
      var clTotal = consoleLogs.total;
      var clItems = consoleLogs.items;
      if (clTotal !== undefined) {
        html += '  <p>Total console statements: <strong>' + esc(String(clTotal)) + '</strong>' +
          (Number(clTotal) > 10 ? ' ' + statusTag('review') : ' ' + statusTag('acceptable')) + '</p>\n';
      }
      if (clItems && Array.isArray(clItems) && clItems.length > 0) {
        var clItemRows = clItems.slice(0, 15).map(function (item) {
          return [
            '<code>' + esc(item.file || '') + '</code>',
            esc(String(item.line || '—')),
            esc(String(item.method || 'log')),
            esc(String(item.text || '').slice(0, 80))
          ];
        });
        html += renderTable(['File', 'Line', 'Method', 'Statement'], clItemRows);
        if (clItems.length > 15) {
          html += '  <p class="meta">&hellip; and ' + (clItems.length - 15) + ' more</p>\n';
        }
      } else {
        // Flat object format {log: 5, error: 1}
        var clKeys = Object.keys(consoleLogs).filter(function (k) { return k !== 'total' && k !== 'items'; });
        if (clKeys.length > 0) {
          var totalCl = 0;
          var clRows = clKeys.map(function (k) {
            var count = Number(consoleLogs[k]) || 0;
            totalCl += count;
            return ['console.' + esc(k), String(count), count > 0 ? statusTag('review') : statusTag('clean')];
          });
          if (clTotal === undefined) html += '  <p>Total console statements: <strong>' + totalCl + '</strong></p>\n';
          html += renderTable(['Method', 'Count', 'Status'], clRows);
        }
      }
    } else {
      // Fallback: scalar value
      html += '  <p>Found <strong>' + esc(String(consoleLogs)) + '</strong> console statements.</p>\n';
    }
  } else {
    var consoleCount = safeVal(quality, 'console_log_count', safeVal(quality, 'consoleLogCount', safeVal(quality, 'console_logs', null)));
    if (consoleCount !== null && consoleCount !== '—') {
      html += '  <h3>Console Statements</h3>\n';
      html += '  <p>Found <strong>' + esc(String(consoleCount)) + '</strong> console.log/warn/error statements.</p>\n';
    }
  }

  // Files scanned
  var filesScanned = safeVal(quality, 'filesScanned', safeVal(quality, 'files_scanned', null));
  if (filesScanned !== null && filesScanned !== '—') {
    html += '  <p>Files scanned: <strong>' + esc(String(filesScanned)) + '</strong></p>\n';
  }

  // Lint available indicator
  if (quality.lintAvailable !== undefined) {
    html += '  <p>Linter configured: ' + statusTag(quality.lintAvailable ? 'yes' : 'no') + '</p>\n';
  }

  // Bundle Size section — from quality data or placeholder
  var bundleSize = quality.bundleSize || quality.bundle_size || quality.bundles;
  if (bundleSize && typeof bundleSize === 'object') {
    html += '  <h3>Bundle Size (production build)</h3>\n';
    if (Array.isArray(bundleSize)) {
      var bsRows = bundleSize.map(function (b) {
        return [
          esc(b.app || b.name || ''),
          esc(String(b.initial || '—')),
          esc(String(b.lazy || '—')),
          esc(String(b.total || '—')),
          b.status ? statusTag(b.status) : '—'
        ];
      });
      html += renderTable(['App', 'Initial', 'Lazy', 'Total', 'Budget'], bsRows);
    }
  } else {
    html += '  <h3>Bundle Size</h3>\n';
    html += '  <p class="meta">Bundle analysis not available &mdash; run <code>ng build --stats-json</code> to generate bundle size data.</p>\n';
  }

  // Lighthouse scores section — from quality data or placeholder
  var lighthouse = quality.lighthouse || quality.lighthouseScores || quality.lighthouse_scores;
  if (lighthouse && typeof lighthouse === 'object') {
    html += '  <h3>Lighthouse Scores</h3>\n';
    if (Array.isArray(lighthouse)) {
      var lhRows = lighthouse.map(function (l) {
        return [
          esc(l.metric || l.name || ''),
          esc(String(l.score || '—')),
          l.status ? statusTag(l.status) : '—'
        ];
      });
      html += renderTable(['Metric', 'Score', 'Status'], lhRows);
    } else {
      var lhKeys = Object.keys(lighthouse);
      var lhRows2 = lhKeys.map(function (k) {
        var score = Number(lighthouse[k]) || 0;
        var st = score >= 90 ? 'good' : (score >= 50 ? 'needs work' : 'poor');
        return [esc(k), String(score), statusTag(st)];
      });
      html += renderTable(['Metric', 'Score', 'Status'], lhRows2);
    }
  } else {
    html += '  <h3>Lighthouse Scores</h3>\n';
    html += '  <p class="meta">Lighthouse audit not available &mdash; run <code>npx lighthouse</code> or configure CI to collect performance metrics.</p>\n';
  }

  if (quality.summary && typeof quality.summary === 'string') {
    html += '  <p>' + esc(quality.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function testSection(tests) {
  var html = '<div class="section" id="tests">\n' +
    '  <h2>9. Test Coverage &amp; Gaps</h2>\n' +
    '  <div class="section-sub">Generated by scan-tests</div>\n';

  if (!tests) return html + renderNotAvailable('scan-tests') + '</div>\n';

  // Coverage progress bar — coveragePercent is a number (e.g. 33.33)
  var coverage = safeVal(tests, 'coveragePercent', safeVal(tests, 'coverage_percent', safeVal(tests, 'coverage', null)));
  var branchCov = safeVal(tests, 'branchCoverage', safeVal(tests, 'branch_coverage', null));
  var funcCov = safeVal(tests, 'functionCoverage', safeVal(tests, 'function_coverage', null));

  if (coverage !== null && coverage !== '—') {
    html += '  <h3>Coverage Summary</h3>\n';
    var covPct = Number(coverage) || 0;
    html += renderProgressBar('File Coverage', covPct);
    if (branchCov !== null && branchCov !== '—') html += renderProgressBar('Branches', Number(branchCov) || 0);
    if (funcCov !== null && funcCov !== '—') html += renderProgressBar('Functions', Number(funcCov) || 0);
  }

  // KPI summary
  var totalFiles = safeVal(tests, 'totalFiles', safeVal(tests, 'total_files', null));
  var testedFiles = safeVal(tests, 'testedFiles', safeVal(tests, 'tested_files', null));
  var untestedCount = safeVal(tests, 'untestedCount', safeVal(tests, 'untested_count', null));

  if (totalFiles !== null || testedFiles !== null) {
    html += '  <h3>Test Inventory</h3>\n';
    var invRows = [];
    if (totalFiles !== null && totalFiles !== '—') invRows.push(['Total source files', String(totalFiles)]);
    if (testedFiles !== null && testedFiles !== '—') invRows.push(['Files with tests', String(testedFiles)]);
    if (untestedCount !== null && untestedCount !== '—') invRows.push(['Untested files', String(untestedCount)]);
    html += renderTable(['Metric', 'Value'], invRows);
  }

  // Test counts — support both:
  //   Simple: {describe: 10, it: 25, skip: 0, focused: 0}
  //   Per-file: {filename: {describes: 4, testCases: 5, skipped: 0, focused: 0}}
  var testCounts = tests.testCounts || tests.test_counts;
  if (testCounts && typeof testCounts === 'object' && !Array.isArray(testCounts)) {
    var tcKeys = Object.keys(testCounts);
    // Detect if values are objects (per-file) or numbers (aggregate)
    var isPerFile = tcKeys.length > 0 && typeof testCounts[tcKeys[0]] === 'object';

    if (isPerFile) {
      html += '  <h3>Test Breakdown by File</h3>\n';
      var totalDescribes = 0;
      var totalCases = 0;
      var totalSkipped = 0;
      var totalFocused = 0;
      var tcRows = tcKeys.map(function (file) {
        var tc = testCounts[file];
        var describes = Number(tc.describes || tc.describe || 0);
        var cases = Number(tc.testCases || tc.it || tc.tests || 0);
        var skipped = Number(tc.skipped || tc.skip || 0);
        var focused = Number(tc.focused || tc.focus || 0);
        totalDescribes += describes;
        totalCases += cases;
        totalSkipped += skipped;
        totalFocused += focused;
        var issues = [];
        if (skipped > 0) issues.push(statusTag('skipped: ' + skipped));
        if (focused > 0) issues.push(statusTag('focused: ' + focused));
        return [
          '<code>' + esc(file.split('/').pop()) + '</code>',
          String(describes),
          String(cases),
          issues.length > 0 ? issues.join(' ') : statusTag('clean')
        ];
      });
      html += renderTable(['Test File', 'Describes', 'Test Cases', 'Status'], tcRows);
      html += '  <p>Total: <strong>' + totalCases + '</strong> test cases in <strong>' + totalDescribes + '</strong> describe blocks' +
        (totalSkipped > 0 ? ' (' + totalSkipped + ' skipped)' : '') +
        (totalFocused > 0 ? ' (' + totalFocused + ' focused)' : '') + '.</p>\n';
    } else {
      html += '  <h3>Test Breakdown</h3>\n';
      var tcRows2 = tcKeys.map(function (k) {
        var count = Number(testCounts[k]) || 0;
        var status = '—';
        if (k === 'skip' || k === 'focused' || k === 'skipped') {
          status = count > 0 ? statusTag('needs review') : statusTag('clean');
        }
        return [esc(k), String(count), status];
      });
      html += renderTable(['Type', 'Count', 'Status'], tcRows2);
    }
  }

  // Untested by type — support both:
  //   object {component: 5, service: 3} (counts)
  //   object {components: ["file1", "file2"], services: ["file3"]} (arrays of file paths)
  var untestedByType = tests.untestedByType || tests.untested_by_type;
  if (untestedByType && typeof untestedByType === 'object' && !Array.isArray(untestedByType)) {
    html += '  <h3>Untested Files by Type</h3>\n';
    var ubtRows = Object.keys(untestedByType).map(function (type) {
      var val = untestedByType[type];
      var count = Array.isArray(val) ? val.length : (Number(val) || 0);
      return [esc(type), String(count), count > 0 ? statusTag('untested') : statusTag('covered')];
    });
    html += renderTable(['Type', 'Count', 'Status'], ubtRows);
  }

  // Untested files list
  var untested = tests.untestedFiles || tests.untested_files || tests.untested || tests.gaps;
  if (untested && Array.isArray(untested) && untested.length > 0) {
    html += '  <h3>Coverage Gaps (untested files)</h3>\n';
    var utRows = untested.slice(0, 20).map(function (u) {
      if (typeof u === 'string') return ['<code>' + esc(u) + '</code>', statusTag('untested')];
      return [
        '<code>' + esc(u.file || u.path || u.name || '') + '</code>',
        statusTag(u.risk || u.severity || 'untested')
      ];
    });
    html += renderTable(['File', 'Status'], utRows);
    if (untested.length > 20) {
      html += '  <p class="meta">… and ' + (untested.length - 20) + ' more untested files</p>\n';
    }
  }

  if (tests.summary && typeof tests.summary === 'string') {
    html += '  <p>' + esc(tests.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function docsSection(docs) {
  var html = '<div class="section" id="docs">\n' +
    '  <h2>12. Documentation Status</h2>\n' +
    '  <div class="section-sub">Generated by scan-docs</div>\n';

  if (!docs) return html + renderNotAvailable('scan-docs') + '</div>\n';

  // TSDoc coverage — support nested object {total, documented, percent}
  var tsdocCovObj = docs.tsdocCoverage || docs.tsdoc_coverage;
  if (tsdocCovObj && typeof tsdocCovObj === 'object' && !Array.isArray(tsdocCovObj)) {
    html += '  <h3>Documentation Coverage</h3>\n';
    var tsdocPct = Number(tsdocCovObj.percent) || 0;
    html += renderProgressBar('TSDoc coverage', tsdocPct);
    var tsdocRows = [];
    if (tsdocCovObj.total !== undefined) tsdocRows.push(['Total exportable symbols', String(tsdocCovObj.total)]);
    if (tsdocCovObj.documented !== undefined) tsdocRows.push(['Documented', String(tsdocCovObj.documented)]);
    if (tsdocCovObj.percent !== undefined) tsdocRows.push(['Coverage', String(tsdocCovObj.percent) + '%']);
    if (tsdocRows.length > 0) html += renderTable(['Metric', 'Value'], tsdocRows);
  } else {
    // Fallback: scalar value
    var tsdocCov = safeVal(docs, 'tsdoc_coverage', safeVal(docs, 'tsdocCoverage', safeVal(docs, 'doc_coverage', null)));
    if (tsdocCov !== null && tsdocCov !== '—') {
      html += '  <h3>Documentation Coverage</h3>\n';
      html += renderProgressBar('TSDoc coverage', Number(tsdocCov) || 0);
    }
  }

  // README sections — support multiple formats:
  // 1. Array of {key, status} objects
  // 2. Object map {description: true, install: false}
  var readme = docs.readme;
  if (readme) {
    // README exists indicator
    if (readme.exists !== undefined) {
      html += '  <h3>README</h3>\n';
      html += '  <p>README.md: ' + statusTag(readme.exists ? 'present' : 'missing') + '</p>\n';
    }
  }

  if (readme && readme.sections && Array.isArray(readme.sections)) {
    // Array of objects format: [{key: "description", status: "missing"}, ...]
    html += '  <h3>README Sections</h3>\n';
    var readmeRows = readme.sections.map(function (section) {
      var sectionKey = section.key || section.name || section.section || '';
      var sectionStatus = section.status || 'unknown';
      return [
        esc(sectionKey),
        statusTag(sectionStatus)
      ];
    });
    html += renderTable(['Section', 'Status'], readmeRows);

    // Use presentCount/totalSections if available, otherwise calculate
    var presentCount = (readme.presentCount !== undefined) ? readme.presentCount
      : readme.sections.filter(function (s) { return s.status === 'present' || s.status === 'ok'; }).length;
    var totalSections = (readme.totalSections !== undefined) ? readme.totalSections : readme.sections.length;
    var readmePct = totalSections > 0 ? Math.round((presentCount / totalSections) * 100) : 0;
    html += renderProgressBar('README completeness', readmePct);
  } else if (readme && readme.sections && typeof readme.sections === 'object' && !Array.isArray(readme.sections)) {
    // Boolean map format: {description: true, install: false}
    html += '  <h3>README Sections</h3>\n';
    var sectionKeys = Object.keys(readme.sections);
    var readmeRows2 = sectionKeys.map(function (section) {
      var present = readme.sections[section];
      return [
        esc(section),
        present ? statusTag('present') : statusTag('missing')
      ];
    });
    html += renderTable(['Section', 'Status'], readmeRows2);

    // Calculate README quality score from sections
    var presentCount2 = sectionKeys.filter(function (k) { return readme.sections[k]; }).length;
    var readmePct2 = sectionKeys.length > 0 ? Math.round((presentCount2 / sectionKeys.length) * 100) : 0;
    html += renderProgressBar('README completeness', readmePct2);
  } else {
    // Fallback: legacy array format
    var sections = docs.readme_sections || docs.readmeSections || docs.assessment || docs.documents;
    if (sections && Array.isArray(sections) && sections.length > 0) {
      html += '  <h3>Documentation Assessment</h3>\n';
      var docRows = sections.map(function (s) {
        if (typeof s === 'string') return [esc(s), '—', '—'];
        return [
          esc(s.document || s.name || s.section || ''),
          s.status ? statusTag(s.status) : '—',
          esc(String(s.note || s.notes || s.detail || '—'))
        ];
      });
      html += renderTable(['Document', 'Status', 'Note'], docRows);
    }

    // README quality fallback
    var readmeQuality = safeVal(docs, 'readme_quality', safeVal(docs, 'readmeQuality', null));
    if (readmeQuality !== null && readmeQuality !== '—') {
      html += renderProgressBar('README quality', Number(readmeQuality) || 0);
    }
  }

  // Tooling — support object format {compodoc: false, storybook: false, typedoc: false}
  var tooling = docs.tooling || docs.tools || docs.tooling_status;
  if (tooling && typeof tooling === 'object' && !Array.isArray(tooling)) {
    html += '  <h3>Documentation Tooling</h3>\n';
    var toolKeys = Object.keys(tooling);
    var toolRows = toolKeys.map(function (tool) {
      var enabled = tooling[tool];
      return [
        esc(tool),
        enabled ? statusTag('configured') : statusTag('not configured')
      ];
    });
    html += renderTable(['Tool', 'Status'], toolRows);
  } else if (tooling && Array.isArray(tooling) && tooling.length > 0) {
    // Legacy array format
    html += '  <h3>Tooling</h3>\n';
    var toolRows2 = tooling.map(function (t) {
      if (typeof t === 'string') return [esc(t), '—'];
      return [
        esc(t.tool || t.name || ''),
        t.status ? statusTag(t.status) : '—'
      ];
    });
    html += renderTable(['Tool', 'Status'], toolRows2);
  }

  if (docs.summary && typeof docs.summary === 'string') {
    html += '  <p>' + esc(docs.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function deploySection(deploy) {
  var html = '<div class="section" id="deploy">\n' +
    '  <h2>10. Deployment &amp; CI/CD</h2>\n' +
    '  <div class="section-sub">Generated by scan-deploy</div>\n';

  if (!deploy) return html + renderNotAvailable('scan-deploy') + '</div>\n';

  // CI/CD Platforms detected
  var platforms = deploy.platformsDetected || deploy.platforms_detected;
  if (platforms && Array.isArray(platforms) && platforms.length > 0) {
    html += '  <h3>CI/CD Platforms</h3>\n';
    var platRows = platforms.map(function (p) { return [esc(String(p)), statusTag('detected')]; });
    html += renderTable(['Platform', 'Status'], platRows);
  }

  // CI files
  var ciFiles = deploy.ciFiles || deploy.ci_files;
  if (ciFiles && Array.isArray(ciFiles) && ciFiles.length > 0) {
    html += '  <h3>CI Configuration Files</h3>\n';
    var cfRows = ciFiles.map(function (f) { return ['<code>' + esc(String(f)) + '</code>']; });
    html += renderTable(['File'], cfRows);
  } else if ((!ciFiles || ciFiles.length === 0) && (!platforms || platforms.length === 0)) {
    html += '  <h3>CI Pipeline</h3>\n';
    html += '  <p class="meta">No CI/CD pipeline configuration files detected (GitHub Actions, Jenkins, CircleCI, etc.).</p>\n';
  }

  // CI Pipeline
  var pipeline = deploy.pipeline || deploy.ci_pipeline || deploy.ci || deploy.steps;
  if (pipeline && Array.isArray(pipeline) && pipeline.length > 0) {
    html += '  <h3>CI Pipeline Steps</h3>\n';
    var pipRows = pipeline.map(function (s) {
      return [
        esc(s.step || s.name || s.stage || ''),
        esc(String(s.tool || s.command || '—')),
        esc(String(s.duration || s.time || '—')),
        s.status ? statusTag(s.status) : '—'
      ];
    });
    html += renderTable(['Step', 'Tool', 'Duration', 'Status'], pipRows);
  }

  // Package.json scripts
  var pkgJson = deploy.packageJson || deploy.package_json;
  if (pkgJson && pkgJson.scripts && Array.isArray(pkgJson.scripts)) {
    html += '  <h3>Available Scripts</h3>\n';
    var scriptRows = pkgJson.scripts.map(function (s) { return ['<code>' + esc(s) + '</code>']; });
    html += renderTable(['Script'], scriptRows);
  }

  // Angular.json budgets
  var angularJson = deploy.angularJson || deploy.angular_json;
  if (angularJson) {
    if (angularJson.budgets && Array.isArray(angularJson.budgets)) {
      html += '  <h3>Build Budgets</h3>\n';
      var budgetRows = angularJson.budgets.map(function (b) { return [esc(String(b))]; });
      html += renderTable(['Budget'], budgetRows);
    }
  }

  // Environments
  var envs = deploy.environments || deploy.envs;
  if (envs && Array.isArray(envs) && envs.length > 0) {
    html += '  <h3>Environments</h3>\n';
    var envRows = envs.map(function (e) {
      return [
        esc(e.name || e.environment || ''),
        esc(String(e.url || '—')),
        esc(String(e.deployment || e.deploy_method || '—')),
        esc(String(e.last_deploy || e.lastDeploy || '—'))
      ];
    });
    html += renderTable(['Environment', 'URL', 'Deployment', 'Last Deploy'], envRows);
  }

  // Docker
  var docker = deploy.docker;
  if (docker && typeof docker === 'object') {
    html += '  <h3>Container / Docker</h3>\n';
    var dockerRows = [];
    dockerRows.push(['Dockerfile', docker.dockerfileFound ? statusTag('found') : statusTag('not found')]);
    dockerRows.push(['docker-compose', docker.dockerComposeFound ? statusTag('found') : statusTag('not found')]);
    if (docker.examplesFound && Array.isArray(docker.examplesFound) && docker.examplesFound.length > 0) {
      dockerRows.push(['Example configs', docker.examplesFound.join(', ')]);
    }
    html += renderTable(['Aspect', 'Status'], dockerRows);
  }

  // Branching
  var branching = deploy.branching;
  if (branching && typeof branching === 'object') {
    html += '  <h3>Branching Strategy</h3>\n';
    var branchRows = [];
    if (branching.inferredModel) branchRows.push(['Model', esc(String(branching.inferredModel))]);
    if (branching.branches && Array.isArray(branching.branches)) branchRows.push(['Branches', esc(branching.branches.join(', '))]);
    if (branchRows.length > 0) html += renderTable(['Aspect', 'Detail'], branchRows);
  }

  // Release strategy
  var release = deploy.releaseStrategy || deploy.release_strategy;
  if (release && typeof release === 'object') {
    html += '  <h3>Release Strategy</h3>\n';
    var relRows = [];
    relRows.push(['semantic-release', release.semanticRelease ? statusTag('configured') : statusTag('not configured')]);
    relRows.push(['changesets', release.changesets ? statusTag('configured') : statusTag('not configured')]);
    if (release.notes) relRows.push(['Notes', esc(String(release.notes))]);
    html += renderTable(['Tool', 'Status'], relRows);
  }

  // CI/CD pipeline diagram
  if (deploy.diagram || deploy.mermaid) {
    html += '  <div class="diagram">\n' +
      '    <div class="diagram-title">CI/CD Pipeline Flow</div>\n' +
      '    <pre class="mermaid">\n' + (deploy.diagram || deploy.mermaid) + '\n    </pre>\n' +
      '  </div>\n';
  } else if (pkgJson && pkgJson.scripts && Array.isArray(pkgJson.scripts)) {
    // Auto-generate a simple pipeline diagram from scripts
    var hasLint = pkgJson.scripts.indexOf('lint') !== -1;
    var hasTest = pkgJson.scripts.indexOf('test') !== -1;
    var hasBuild = pkgJson.scripts.indexOf('build') !== -1;
    if (hasLint || hasTest || hasBuild) {
      var pipeLines = ['graph LR'];
      pipeLines.push('    subgraph CI["CI Pipeline"]');
      var prevStep = null;
      if (hasLint) { pipeLines.push('        LINT["lint"]'); if (prevStep) pipeLines.push('        ' + prevStep + ' --> LINT'); prevStep = 'LINT'; }
      if (hasTest) { pipeLines.push('        TEST["test"]'); if (prevStep) pipeLines.push('        ' + prevStep + ' --> TEST'); prevStep = 'TEST'; }
      if (hasBuild) { pipeLines.push('        BUILD["build"]'); if (prevStep) pipeLines.push('        ' + prevStep + ' --> BUILD'); prevStep = 'BUILD'; }
      pipeLines.push('    end');
      html += renderMermaidDiagram('CI/CD Pipeline Flow', pipeLines.join('\n'), 'Auto-generated from package.json scripts.');
    }
  }

  // Generic summary
  if (deploy.summary && typeof deploy.summary === 'string') {
    html += '  <p>' + esc(deploy.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function gitHistorySection(git, runDir) {
  var html = '<div class="section" id="git">\n' +
    '  <h2>11. Git History &amp; Changelog</h2>\n' +
    '  <div class="section-sub">Generated by scan-git</div>\n';

  if (!git) {
    // Check if the phase was skipped by reading event file for context
    var gitEvent = null;
    if (runDir) {
      gitEvent = readJSON(path.join(runDir, '008.event.json'));
    }
    if (gitEvent && gitEvent.lifecycle && gitEvent.lifecycle.status === 'skipped') {
      html += '  <p class="meta">Git scan was skipped after ' + (gitEvent.retry && gitEvent.retry.attempt ? gitEvent.retry.attempt : '?') + ' attempts.</p>\n';
      if (gitEvent.retry && gitEvent.retry.last_error) {
        var errMsg = String(gitEvent.retry.last_error).trim();
        // Extract the meaningful part
        if (errMsg.indexOf('Not a git repository') !== -1) {
          html += '  <p class="meta">Reason: Not a git repository. Ensure <code>git init</code> has been run and the project has at least one commit.</p>\n';
        } else {
          html += '  <p class="meta">Reason: ' + esc(errMsg.slice(0, 200)) + '</p>\n';
        }
      }
    } else {
      html += '  <p class="meta">Git history not available &mdash; scan-git may have been skipped or not configured.</p>\n';
    }
    html += '</div>\n';
    return html;
  }

  // Recent activity metrics
  var totalCommits = safeVal(git, 'totalCommits', safeVal(git, 'total_commits', safeVal(git, 'commits', null)));
  var contributors = safeVal(git, 'contributors', safeVal(git, 'active_contributors', safeVal(git, 'authors', null)));
  var busFactor = safeVal(git, 'busFactor', safeVal(git, 'bus_factor', null));
  var prsMerged = safeVal(git, 'prsMerged', safeVal(git, 'prs_merged', null));
  var avgPrSize = safeVal(git, 'avgPrSize', safeVal(git, 'avg_pr_size', null));

  var metricsRows = [];
  if (totalCommits !== null && totalCommits !== '—') metricsRows.push(['Commits', String(totalCommits)]);
  if (contributors !== null && contributors !== '—') {
    var contribVal = Array.isArray(contributors) ? contributors.length : contributors;
    metricsRows.push(['Active contributors', String(contribVal)]);
  }
  if (busFactor !== null && busFactor !== '—') metricsRows.push(['Bus factor', String(busFactor)]);
  if (prsMerged !== null && prsMerged !== '—') metricsRows.push(['PRs merged', String(prsMerged)]);
  if (avgPrSize !== null && avgPrSize !== '—') metricsRows.push(['Avg PR size', String(avgPrSize)]);

  if (metricsRows.length > 0) {
    html += '  <h3>Recent Activity</h3>\n';
    html += renderTable(['Metric', 'Value'], metricsRows);
  }

  // Hotspot files
  var hotspots = git.hotspots || git.hotspot_files || git.hot_files;
  if (hotspots && Array.isArray(hotspots) && hotspots.length > 0) {
    html += '  <h3>Hotspot Files</h3>\n';
    var hsRows = hotspots.slice(0, 10).map(function (h) {
      if (typeof h === 'string') return ['<code>' + esc(h) + '</code>', '—'];
      return [
        '<code>' + esc(h.file || h.path || h.name || '') + '</code>',
        esc(String(h.commits || h.changes || h.count || '—'))
      ];
    });
    html += renderTable(['File', 'Commits'], hsRows);
  }

  // Recent commits
  var recentCommits = git.recentCommits || git.recent_commits || git.last_commits;
  if (recentCommits && Array.isArray(recentCommits) && recentCommits.length > 0) {
    html += '  <h3>Last ' + Math.min(recentCommits.length, 10) + ' Commits</h3>\n';
    var commitCode = recentCommits.slice(0, 10).map(function (c) {
      if (typeof c === 'string') return c;
      var hash = (c.hash || c.sha || c.id || '').slice(0, 7);
      var msg = c.message || c.subject || '';
      var author = c.author || c.name || '';
      var date = c.date || c.timestamp || '';
      return hash + '  ' + msg + (author ? '  (' + author + (date ? ', ' + date : '') + ')' : '');
    }).join('\n');
    html += '  <pre><code>' + esc(commitCode) + '</code></pre>\n';
  }

  // Releases
  var releases = git.releases || git.tags;
  if (releases && Array.isArray(releases) && releases.length > 0) {
    html += '  <h3>Recent Releases</h3>\n';
    var relRows = releases.slice(0, 5).map(function (r) {
      if (typeof r === 'string') return [esc(r), '—'];
      return [
        esc(r.tag || r.version || r.name || ''),
        esc(String(r.date || r.created || '—'))
      ];
    });
    html += renderTable(['Tag', 'Date'], relRows);
  }

  if (git.summary && typeof git.summary === 'string') {
    html += '  <p>' + esc(git.summary) + '</p>\n';
  }

  html += '</div>\n';
  return html;
}

function recommendationsSection(deps, tests, quality, docs, arch) {
  var html = '<div class="section" id="recs">\n' +
    '  <h2>13. Recommendations</h2>\n';

  var immediate = [];
  var shortTerm = [];
  var mediumTerm = [];

  // Infer recommendations from scan data

  // Test coverage
  if (tests) {
    var cov = Number(safeVal(tests, 'coveragePercent', safeVal(tests, 'coverage_percent', safeVal(tests, 'coverage', 100))));
    if (!isNaN(cov) && cov < 60) {
      immediate.push('<strong>Increase test coverage.</strong> Currently at ' + Math.round(cov) + '%, which is below the recommended 60% threshold.');
    }

    // E2E tests
    var testCounts = tests.testCounts || tests.test_counts || {};
    var e2eCount = testCounts.e2e || testCounts.E2E || 0;
    var untested = tests.untestedFiles || tests.untested_files || tests.untested || [];
    if (e2eCount === 0 && (!untested || untested.length === 0)) {
      // Check more broadly
    }
    // Check for e2e presence from any field
    var hasE2e = false;
    if (typeof tests === 'object') {
      var testsStr = JSON.stringify(tests).toLowerCase();
      if (testsStr.indexOf('e2e') !== -1 && testsStr.indexOf('"e2e":0') === -1) hasE2e = true;
    }
    if (!hasE2e) {
      immediate.push('<strong>Add end-to-end tests.</strong> No e2e test coverage detected. Start with critical user flows using Playwright or Cypress.');
    }
  }

  // Quality score
  if (quality) {
    var qs = Number(safeVal(quality, 'qualityScore', safeVal(quality, 'quality_score', safeVal(quality, 'score', 100))));
    if (!isNaN(qs) && qs < 80) {
      immediate.push('<strong>Address quality issues.</strong> Quality score is ' + Math.round(qs) + '/100. Review lint errors and code smells.');
    }
  }

  // Outdated dependencies
  if (deps) {
    var outdated = deps.outdated || deps.deprecated || deps.outdated_packages;
    if (outdated && Array.isArray(outdated) && outdated.length > 0) {
      shortTerm.push('<strong>Update outdated dependencies.</strong> ' + outdated.length + ' package' + (outdated.length !== 1 ? 's' : '') + (outdated.length !== 1 ? ' have' : ' has') + ' updates available. Review for security patches and new features.');
    }
  }

  // Standalone adoption
  if (arch) {
    var components = arch.components || [];
    if (components.length > 0) {
      var standaloneCount = components.filter(function (c) { return c.standalone || c.isStandalone; }).length;
      var standalonePct = Math.round((standaloneCount / components.length) * 100);
      if (standalonePct < 50) {
        shortTerm.push('<strong>Migrate to standalone components.</strong> Only ' + standalonePct + '% of components are standalone. Angular recommends standalone as the default.');
      }
    }
  }

  // TSDoc coverage
  if (docs) {
    var tsdocCovObj = docs.tsdocCoverage || docs.tsdoc_coverage;
    var tsdocPct = 100;
    if (tsdocCovObj && typeof tsdocCovObj === 'object') {
      tsdocPct = Number(tsdocCovObj.percent) || 100;
    } else {
      var tsdocVal = safeVal(docs, 'tsdoc_coverage', safeVal(docs, 'tsdocCoverage', safeVal(docs, 'doc_coverage', null)));
      if (tsdocVal !== null && tsdocVal !== '—') tsdocPct = Number(tsdocVal) || 100;
    }
    if (tsdocPct < 50) {
      mediumTerm.push('<strong>Improve documentation coverage.</strong> TSDoc coverage is ' + Math.round(tsdocPct) + '%. Target 80%+ for public APIs.');
    }
  }

  // Console logs cleanup
  if (quality) {
    var consoleLogs = quality.consoleLogs;
    var totalConsoleLogs = 0;
    if (consoleLogs && typeof consoleLogs === 'object' && consoleLogs.total !== undefined) {
      totalConsoleLogs = Number(consoleLogs.total) || 0;
    } else if (consoleLogs && typeof consoleLogs === 'object' && consoleLogs.items) {
      totalConsoleLogs = Array.isArray(consoleLogs.items) ? consoleLogs.items.length : 0;
    }
    if (totalConsoleLogs > 5) {
      shortTerm.push('<strong>Remove console statements.</strong> Found ' + totalConsoleLogs + ' console.log/warn/error statements in production code. Replace with a proper logging service or remove.');
    }
  }

  // README missing
  if (docs) {
    var readme = docs.readme;
    if (readme && readme.exists === false) {
      immediate.push('<strong>Create a README.md.</strong> No README file found. Add setup instructions, architecture overview, and contribution guide. Use <code>/angular-docs-generate</code>.');
    } else if (readme && readme.presentCount !== undefined && readme.totalSections !== undefined) {
      var readmePct = readme.totalSections > 0 ? Math.round((readme.presentCount / readme.totalSections) * 100) : 0;
      if (readmePct < 50) {
        shortTerm.push('<strong>Improve README completeness.</strong> Only ' + readme.presentCount + ' of ' + readme.totalSections + ' standard sections present (' + readmePct + '%). Add missing sections.');
      }
    }
  }

  // Route guards
  if (arch) {
    var routes = arch.routes || [];
    var guardedRoutes = routes.filter(function (r) { return r.guards && Array.isArray(r.guards) && r.guards.length > 0; });
    if (routes.length > 0 && guardedRoutes.length === 0) {
      shortTerm.push('<strong>Add route guards.</strong> No route guards detected on ' + routes.length + ' routes. Consider adding AuthGuard for sensitive views.');
    }
  }

  // Angular version upgrade
  if (deps) {
    var angVer = (deps.angular && deps.angular.version) ? deps.angular.version : null;
    if (angVer) {
      var majorVer = parseInt(String(angVer).split('.')[0], 10);
      if (!isNaN(majorVer) && majorVer < 18) {
        shortTerm.push('<strong>Upgrade Angular ' + majorVer + ' to a supported version.</strong> Angular ' + angVer + ' may be nearing or past end-of-life. Use <code>/angular-migrate-version</code>.');
      }
    }
  }

  // HDS / Elevate detection
  if (deps) {
    var depsStr2 = JSON.stringify(deps);
    var hasHDS = depsStr2.indexOf('hds') !== -1 || depsStr2.indexOf('HDS') !== -1;
    var hasElevate = depsStr2.indexOf('elevate') !== -1 || depsStr2.indexOf('Elevate') !== -1;
    if (!hasHDS && !hasElevate) {
      mediumTerm.push('<strong>Consider adopting organization platform libraries.</strong> No HDS or Elevate libraries detected. These provide consistent design tokens and shared components.');
    }
  }

  // CI/CD
  if (!deps || !JSON.stringify(deps).match(/ci|github.actions|jenkins|circleci|gitlab/i)) {
    mediumTerm.push('<strong>Set up CI/CD pipeline.</strong> Consider GitHub Actions or similar for automated lint, test, and build on every PR.');
  }

  // Render recommendation items
  function renderRecList(items, startNum) {
    if (items.length === 0) return '';
    var out = '  <div class="rec-list">\n';
    for (var ri = 0; ri < items.length; ri++) {
      out += '    <div class="rec-item">\n';
      out += '      <div class="num">' + (startNum + ri) + '</div>\n';
      out += '      <div class="body">' + items[ri] + '</div>\n';
      out += '    </div>\n';
    }
    out += '  </div>\n';
    return out;
  }

  var num = 1;
  if (immediate.length > 0) {
    html += '  <h3>Immediate</h3>\n';
    html += renderRecList(immediate, num);
    num += immediate.length;
  }

  if (shortTerm.length > 0) {
    html += '  <h3>Short-term</h3>\n';
    html += renderRecList(shortTerm, num);
    num += shortTerm.length;
  }

  if (mediumTerm.length > 0) {
    html += '  <h3>Medium-term</h3>\n';
    html += renderRecList(mediumTerm, num);
    num += mediumTerm.length;
  }

  if (immediate.length === 0 && shortTerm.length === 0 && mediumTerm.length === 0) {
    html += '  <p class="meta">No automated recommendations generated. All scanned metrics are within acceptable thresholds.</p>\n';
  }

  html += '</div>\n';
  return html;
}

function footer(manifest) {
  var wfName = manifest.workflow_name || 'recap';
  var date = manifest.completed_at
    ? manifest.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  var sectionCount = manifest.total_phases || 13;

  return '<div class="report-footer">\n' +
    '  <span>Generated by ORCH &bull; ' + esc(wfName) + ' &bull; ' + date + ' &bull; ' + sectionCount + ' sections</span>\n' +
    '  <button onclick="window.print()">Print / PDF</button>\n' +
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

function buildReport(runDir, outputPath, projectRoot) {
  projectRoot = projectRoot || path.dirname(path.dirname(path.dirname(runDir)));  // .orch/workflow-state/events/run-xxx → project root
  var arch = readPhaseOutput(runDir, '001');
  var features = readPhaseOutput(runDir, '002');
  var deps = readPhaseOutput(runDir, '003');
  var compat = readPhaseOutput(runDir, '004');  // AI compatibility check
  var tests = readPhaseOutput(runDir, '005');
  var quality = readPhaseOutput(runDir, '006');
  var docs = readPhaseOutput(runDir, '007');
  var git = readPhaseOutput(runDir, '008');      // scan-git
  var deploy = readPhaseOutput(runDir, '009');
  var explain = readPhaseOutput(runDir, '010');
  var manifest = readManifest(runDir);

  var html = [
    htmlHead(manifest, deps, explain),
    headerSection(manifest, explain, deps, projectRoot, arch),
    executiveSummary(explain, deps, tests, quality, arch),
    kpiCards(arch, tests, quality, deps),
    tableOfContents(),
    dependenciesSection(deps, compat),             // 1
    systemContextSection(arch, deps),              // 2
    containersSection(arch, deps),                 // 3
    architectureSection(arch, deps),               // 4 (now includes routes)
    securitySection(arch),                         // 5
    featuresSection(features),                     // 6
    uxDesignSection(arch, deps, features),          // 7
    qualitySection(quality),                       // 8
    testSection(tests),                            // 9
    deploySection(deploy),                         // 10
    gitHistorySection(git, runDir),                // 11
    docsSection(docs),                             // 12
    recommendationsSection(deps, tests, quality, docs, arch),  // 13
    footer(manifest)
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  process.stderr.write('Recap report generated: ' + outputPath + '\n');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write('Usage: node recap-report-builder.js <run-dir> [--output path]\n');
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
    var name = (m && m.workflow_name) ? m.workflow_name : 'recap';
    outputPath = path.join(runDir, name + '-report.html');
  }

  buildReport(runDir, outputPath);
}

// ─── Exports (for require() from monitor.js) ───────────────────────────────

module.exports = { buildReport: buildReport };
