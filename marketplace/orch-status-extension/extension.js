const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let statusBarItem;
let pollInterval;
let lastNotifiedKey = '';
let workflowPanel = null;
let workflowWatcher = null;

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 100
  );
  statusBarItem.command = 'orch.showWorkflow';
  statusBarItem.show();
  setIdle();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(
    vscode.commands.registerCommand('orch.showSessionStatus', showDetails)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('orch.showWorkflow', showWorkflowPanel)
  );

  // Poll session-status.json and workflow state every 3 seconds
  pollInterval = setInterval(() => update(), 3000);
  context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
  update();
}

function getStatusPath() {
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || ws.length === 0) return null;
  return path.join(ws[0].uri.fsPath, '.orch', 'audit', 'session-status.json');
}

function getWorkflowDir() {
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || ws.length === 0) return null;
  return path.join(ws[0].uri.fsPath, '.orch', 'workflow');
}

function readWorkflowState() {
  const dir = getWorkflowDir();
  if (!dir || !fs.existsSync(dir)) return null;

  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    if (files.length === 0) return null;

    // Read the first (most recent) workflow file
    const raw = fs.readFileSync(path.join(dir, files[0]), 'utf8');
    return parseSimpleYaml(raw, files[0]);
  } catch (e) {
    return null;
  }
}

// Lightweight YAML parser for workflow state (avoids dependency on js-yaml)
function parseSimpleYaml(raw, filename) {
  const result = { _filename: filename, stages: [] };
  const lines = raw.split('\n');
  let currentStage = null;
  let inStages = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Top-level fields
    if (!inStages) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        const val = match[2].replace(/^["']|["']$/g, '');
        if (key === 'workflow') result.workflow = val;
        if (key === 'project') result.project = val;
        if (key === 'current_stage') result.current_stage = parseInt(val, 10);
        if (key === 'status') result.status = val;
        if (key === 'started') result.started = val;
      }
    }

    if (trimmed === 'stages:') {
      inStages = true;
      continue;
    }

    if (inStages) {
      // New stage entry
      if (trimmed.startsWith('- name:')) {
        currentStage = { name: trimmed.replace('- name:', '').trim() };
        result.stages.push(currentStage);
      } else if (currentStage && trimmed.startsWith('status:')) {
        currentStage.status = trimmed.replace('status:', '').trim();
      } else if (currentStage && trimmed.startsWith('notes:')) {
        currentStage.notes = trimmed.replace('notes:', '').trim().replace(/^["']|["']$/g, '');
      } else if (currentStage && trimmed.startsWith('completed:')) {
        currentStage.completed = trimmed.replace('completed:', '').trim();
      } else if (currentStage && trimmed.startsWith('started:')) {
        currentStage.started_at = trimmed.replace('started:', '').trim();
      }
      // Exit stages section on next top-level key
      if (/^\w+:/.test(trimmed) && !trimmed.startsWith('-') && trimmed !== 'stages:' && !trimmed.startsWith('status:') && !trimmed.startsWith('notes:') && !trimmed.startsWith('completed:') && !trimmed.startsWith('started:') && !trimmed.startsWith('name:')) {
        if (!['status', 'notes', 'completed', 'started', 'name', 'skills', 'outputs'].some(k => trimmed.startsWith(k + ':'))) {
          inStages = false;
          currentStage = null;
        }
      }
    }
  }

  return result;
}

function update() {
  const statusPath = getStatusPath();
  const workflow = readWorkflowState();

  // Read session status
  let sessionStatus = null;
  if (statusPath && fs.existsSync(statusPath)) {
    try {
      const raw = fs.readFileSync(statusPath, 'utf8');
      sessionStatus = JSON.parse(raw);
    } catch (e) {
      // ignore parse errors
    }
  }

  // Render combines both
  if (workflow && workflow.stages.length > 0) {
    renderWithWorkflow(sessionStatus, workflow);
  } else if (sessionStatus) {
    render(sessionStatus);
  } else {
    setIdle();
  }

  if (sessionStatus) {
    checkNotifications(sessionStatus);
  }

  // Update webview panel if open
  if (workflowPanel && workflow) {
    workflowPanel.webview.postMessage({ type: 'update', workflow });
  }
}

function renderWithWorkflow(sessionStatus, workflow) {
  const stages = workflow.stages;
  const currentIdx = workflow.current_stage || 0;
  const completed = stages.filter(s => s.status === 'completed').length;
  const total = stages.length;
  const currentStage = stages[currentIdx];
  const currentName = currentStage ? currentStage.name : 'unknown';

  // Status bar text: workflow progress
  let text = `ORCH: ${capitalize(workflow.workflow || 'workflow')} ${completed}/${total}`;

  // Add quality icon from session status if available
  if (sessionStatus) {
    const quality = sessionStatus.quality || {};
    switch (quality.status) {
      case 'poor':
        text += ' \u2716';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case 'declining':
        text += ' \u26A0';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      default:
        text += ' \u2713';
        statusBarItem.backgroundColor = undefined;
        break;
    }
  } else {
    text += ' \u2713';
    statusBarItem.backgroundColor = undefined;
  }

  statusBarItem.text = text;

  // Tooltip: all stages with status
  const header = `${capitalize(workflow.workflow || 'Workflow')}: ${workflow.project || 'project'}`;
  const separator = '\u2500'.repeat(Math.min(header.length, 30));
  const stageLines = stages.map((s, i) => {
    const icon = stageIcon(s.status);
    const suffix = i === currentIdx && s.status !== 'completed' ? ' \u2014 in progress' : '';
    const duration = s.completed && s.started_at ? formatDuration(s.started_at, s.completed) : '';
    const durationStr = duration ? ` (${duration})` : '';
    return `${icon} ${s.name}${durationStr}${suffix}`;
  });

  statusBarItem.tooltip = [header, separator, ...stageLines].join('\n');
}

function render(status) {
  const work = status.work || {};
  const quality = status.quality || {};

  let text = 'ORCH';

  if (work.status === 'complete') {
    text += ': done';
  } else if (work.bounded && work.progress && work.progress.total > 0) {
    text += `: ${work.progress.completed}/${work.progress.total} ${work.progress.unit || ''}`;
  } else if (work.status === 'in_progress') {
    text += ': working';
  }

  switch (quality.status) {
    case 'poor':
      text += ' \u2716';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    case 'declining':
      text += ' \u26A0';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'fair':
    case 'good':
    default:
      text += ' \u2713';
      statusBarItem.backgroundColor = undefined;
      break;
  }

  statusBarItem.text = text;

  const parts = [`Agent: ${status.agent || 'unknown'}`];
  if (status.elapsed_sec) {
    const mins = Math.floor(status.elapsed_sec / 60);
    parts.push(`Duration: ${mins}m`);
  }
  if (quality.adherence_score != null) {
    parts.push(`Adherence: ${quality.adherence_score}%`);
  }
  if (work.files_modified) {
    parts.push(`Files modified: ${work.files_modified}`);
  }
  if (quality.message) {
    parts.push(`\n${quality.message}`);
  }
  statusBarItem.tooltip = parts.join(' | ');
}

function checkNotifications(status) {
  const quality = status.quality || {};
  const alerts = status.alerts || [];

  let notifyLevel = null;
  let notifyMsg = '';

  if (quality.status === 'poor') {
    notifyLevel = 'error';
    notifyMsg = quality.message || 'Quality too low. Start a fresh session.';
  }

  const criticalAlerts = alerts.filter(a => a.level === 'critical' && !a.notified);
  if (criticalAlerts.length > 0) {
    notifyLevel = 'error';
    notifyMsg = criticalAlerts[0].message;
  }

  if (!notifyLevel) return;

  const key = `${status.session_id}-${notifyLevel}-${notifyMsg}`;
  if (key === lastNotifiedKey) return;
  lastNotifiedKey = key;

  const actions = ['Start New Session', 'Dismiss'];
  if (notifyLevel === 'error') {
    vscode.window.showErrorMessage(`ORCH: ${notifyMsg}`, ...actions);
  } else {
    vscode.window.showWarningMessage(`ORCH: ${notifyMsg}`, ...actions);
  }
}

function setIdle() {
  statusBarItem.text = 'ORCH';
  statusBarItem.tooltip = 'No active ORCH session';
  statusBarItem.backgroundColor = undefined;
}

function showDetails() {
  const statusPath = getStatusPath();
  if (statusPath && fs.existsSync(statusPath)) {
    vscode.workspace.openTextDocument(statusPath).then(
      doc => vscode.window.showTextDocument(doc)
    );
  } else {
    vscode.window.showInformationMessage('ORCH: No active session status found.');
  }
}

// ─── Layer 3: Webview panel ────────────────────────────────

function showWorkflowPanel() {
  const workflow = readWorkflowState();

  if (!workflow || workflow.stages.length === 0) {
    // No workflow — fall back to showing session status
    showDetails();
    return;
  }

  if (workflowPanel) {
    workflowPanel.reveal(vscode.ViewColumn.Beside);
    workflowPanel.webview.postMessage({ type: 'update', workflow });
    return;
  }

  workflowPanel = vscode.window.createWebviewPanel(
    'orchWorkflow',
    'ORCH Workflow',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  workflowPanel.webview.html = getWorkflowHtml(workflow);
  workflowPanel.webview.postMessage({ type: 'update', workflow });

  // Handle messages from the webview (e.g., open file)
  workflowPanel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'openFile' && msg.path) {
      const ws = vscode.workspace.workspaceFolders;
      if (ws && ws.length > 0) {
        const filePath = path.join(ws[0].uri.fsPath, msg.path);
        if (fs.existsSync(filePath)) {
          vscode.workspace.openTextDocument(filePath).then(
            doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
          );
        }
      }
    } else if (msg.type === 'copyCommand' && msg.command) {
      vscode.env.clipboard.writeText(msg.command).then(() => {
        vscode.window.showInformationMessage(`Copied: ${msg.command}`);
      });
    }
  });

  // Watch workflow file for changes
  const dir = getWorkflowDir();
  if (dir) {
    try {
      workflowWatcher = fs.watch(dir, () => {
        const updated = readWorkflowState();
        if (updated && workflowPanel) {
          workflowPanel.webview.postMessage({ type: 'update', workflow: updated });
        }
      });
    } catch (e) {
      // dir may not exist yet
    }
  }

  workflowPanel.onDidDispose(() => {
    workflowPanel = null;
    if (workflowWatcher) {
      workflowWatcher.close();
      workflowWatcher = null;
    }
  });
}

function getWorkflowHtml(workflow) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ORCH Workflow</title>
<style>
  :root {
    --surface-primary: #0a0e17;
    --surface-secondary: #141b2d;
    --surface-tertiary: #1e2a3a;
    --text-primary: #e0e6ed;
    --text-secondary: #8892a4;
    --text-muted: #5a6577;
    --accent-primary: #3b82f6;
    --accent-success: #22c55e;
    --accent-warning: #f59e0b;
    --accent-error: #ef4444;
    --border: #2a3548;
    --radius: 8px;
    --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--surface-primary);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 13px;
    padding: 16px;
  }
  .header {
    padding: 12px 16px;
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .header .subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  /* Stage pills grid */
  .stages {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    align-items: center;
  }
  .pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 14px;
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 90px;
    position: relative;
  }
  .pill:hover {
    background: var(--surface-tertiary);
    border-color: var(--accent-primary);
  }
  .pill.selected {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }
  .pill.completed { border-left: 3px solid var(--accent-success); }
  .pill.active { border-left: 3px solid var(--accent-primary); background: var(--surface-tertiary); }
  .pill.failed { border-left: 3px solid var(--accent-error); }
  .pill.skipped { border-left: 3px solid var(--accent-warning); opacity: 0.7; }
  .pill.pending { opacity: 0.5; }

  .pill-icon { font-size: 16px; margin-bottom: 4px; }
  .pill-name { font-size: 11px; font-weight: 500; text-align: center; color: var(--text-primary); }
  .pill-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

  .connector {
    color: var(--text-muted);
    font-size: 14px;
    margin: 0 -2px;
    user-select: none;
  }

  /* Details panel */
  .details {
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 16px;
  }
  .details h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-primary);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .detail-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }
  .detail-label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 80px;
    flex-shrink: 0;
  }
  .detail-value {
    font-size: 12px;
    color: var(--text-primary);
  }
  .detail-value a, .detail-value .link {
    color: var(--accent-primary);
    cursor: pointer;
    text-decoration: none;
  }
  .detail-value a:hover, .detail-value .link:hover {
    text-decoration: underline;
  }
  .action-btn {
    display: inline-block;
    margin-top: 8px;
    padding: 6px 12px;
    background: var(--accent-primary);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .action-btn:hover { opacity: 0.85; }

  /* Footer stats */
  .footer {
    display: flex;
    gap: 16px;
    padding: 10px 16px;
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 11px;
    color: var(--text-secondary);
  }
  .footer .stat { display: flex; gap: 4px; }
  .footer .stat-value { color: var(--text-primary); font-weight: 500; }
</style>
</head>
<body>
  <div class="header">
    <h1 id="title">ORCH Workflow</h1>
    <div class="subtitle" id="subtitle"></div>
  </div>
  <div class="stages" id="stages"></div>
  <div class="details" id="details" style="display:none;">
    <h2 id="detail-title">Stage Details</h2>
    <div id="detail-content"></div>
  </div>
  <div class="footer" id="footer"></div>

<script>
  const vscode = acquireVsCodeApi();
  let currentWorkflow = null;
  let selectedStage = null;

  const STATUS_ICONS = {
    completed: '\u2705',
    'in-progress': '\uD83D\uDD35',
    'not-started': '\u26AA',
    skipped: '\uD83D\uDFE1',
    failed: '\uD83D\uDD34',
    pending: '\u26AA'
  };

  const STATUS_CLASS = {
    completed: 'completed',
    'in-progress': 'active',
    'not-started': 'pending',
    skipped: 'skipped',
    failed: 'failed',
    pending: 'pending'
  };

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'update') {
      currentWorkflow = msg.workflow;
      renderWorkflow(msg.workflow);
    }
  });

  function renderWorkflow(wf) {
    // Header
    const workflowType = capitalize(wf.workflow || 'workflow');
    document.getElementById('title').textContent = 'ORCH Workflow: ' + workflowType;
    document.getElementById('subtitle').textContent =
      (wf.project ? wf.project + ' — ' : '') + 'Stage ' + ((wf.current_stage || 0) + 1) + ' of ' + (wf.stages || []).length;

    // Stages as pills
    const container = document.getElementById('stages');
    container.innerHTML = '';
    const stages = wf.stages || [];

    stages.forEach((s, i) => {
      if (i > 0) {
        const conn = document.createElement('span');
        conn.className = 'connector';
        conn.textContent = '\u25B8';
        container.appendChild(conn);
      }

      const pill = document.createElement('div');
      const status = s.status || 'not-started';
      pill.className = 'pill ' + (STATUS_CLASS[status] || 'pending');
      if (selectedStage === i) pill.classList.add('selected');

      const icon = document.createElement('div');
      icon.className = 'pill-icon';
      icon.textContent = STATUS_ICONS[status] || STATUS_ICONS.pending;

      const name = document.createElement('div');
      name.className = 'pill-name';
      name.textContent = truncate(s.name || 'Stage ' + i, 14);

      const meta = document.createElement('div');
      meta.className = 'pill-meta';
      if (status === 'completed' && s.completed && s.started_at) {
        meta.textContent = formatDuration(s.started_at, s.completed);
      } else if (status === 'in-progress') {
        meta.textContent = 'active';
      } else if (status === 'skipped') {
        meta.textContent = 'skipped';
      } else {
        meta.textContent = '';
      }

      pill.appendChild(icon);
      pill.appendChild(name);
      pill.appendChild(meta);
      pill.addEventListener('click', () => selectStage(i));
      container.appendChild(pill);
    });

    // Auto-select current stage if nothing selected
    if (selectedStage === null && stages.length > 0) {
      selectStage(wf.current_stage || 0);
    } else if (selectedStage !== null) {
      showStageDetails(stages[selectedStage], selectedStage);
    }

    // Footer
    const completed = stages.filter(s => s.status === 'completed').length;
    const footer = document.getElementById('footer');
    const startDate = wf.started ? new Date(wf.started).toLocaleDateString() : '—';
    footer.innerHTML =
      '<div class="stat">Started: <span class="stat-value">' + startDate + '</span></div>' +
      '<div class="stat">Progress: <span class="stat-value">' + completed + '/' + stages.length + ' stages</span></div>' +
      '<div class="stat">Status: <span class="stat-value">' + (wf.status || 'unknown') + '</span></div>';
  }

  function selectStage(idx) {
    selectedStage = idx;
    // Update pill selection
    document.querySelectorAll('.pill').forEach((p, i) => {
      p.classList.toggle('selected', i === idx);
    });
    const stages = currentWorkflow ? currentWorkflow.stages : [];
    if (stages[idx]) {
      showStageDetails(stages[idx], idx);
    }
  }

  function showStageDetails(stage, idx) {
    const panel = document.getElementById('details');
    panel.style.display = 'block';

    const status = stage.status || 'not-started';
    document.getElementById('detail-title').textContent =
      (STATUS_ICONS[status] || '') + ' Stage ' + idx + ': ' + (stage.name || 'Unknown');

    let html = '';
    html += detailRow('Status', status);
    if (stage.notes) html += detailRow('Notes', stage.notes);
    if (stage.started_at) html += detailRow('Started', new Date(stage.started_at).toLocaleString());
    if (stage.completed) html += detailRow('Completed', new Date(stage.completed).toLocaleString());

    document.getElementById('detail-content').innerHTML = html;
  }

  function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + escapeHtml(value) + '</span></div>';
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; }
  function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function formatDuration(start, end) {
    try {
      const ms = new Date(end) - new Date(start);
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return '<1m';
      if (mins < 60) return mins + 'm';
      return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
    } catch (e) { return ''; }
  }
</script>
</body>
</html>`;
}

// ─── Utilities ─────────────────────────────────────────────

function stageIcon(status) {
  switch (status) {
    case 'completed': return '\u2705';  // ✅
    case 'in-progress': return '\uD83D\uDD35'; // 🔵
    case 'skipped': return '\uD83D\uDFE1';     // 🟡
    case 'failed': return '\uD83D\uDD34';      // 🔴
    default: return '\u26AA';                   // ⚪
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : '';
}

function formatDuration(start, end) {
  try {
    const ms = new Date(end) - new Date(start);
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return '<1m';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  } catch (e) {
    return '';
  }
}

function deactivate() {
  if (pollInterval) clearInterval(pollInterval);
  if (statusBarItem) statusBarItem.dispose();
  if (workflowPanel) workflowPanel.dispose();
  if (workflowWatcher) workflowWatcher.close();
}

module.exports = { activate, deactivate };
