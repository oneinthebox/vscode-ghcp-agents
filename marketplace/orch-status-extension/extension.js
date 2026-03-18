const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let statusBarItem;
let pollInterval;
let lastNotifiedKey = '';

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 100
  );
  statusBarItem.command = 'orch.showSessionStatus';
  statusBarItem.show();
  setIdle();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(
    vscode.commands.registerCommand('orch.showSessionStatus', showDetails)
  );

  // Poll session-status.json every 3 seconds
  pollInterval = setInterval(() => update(), 3000);
  context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
  update();
}

function getStatusPath() {
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || ws.length === 0) return null;
  return path.join(ws[0].uri.fsPath, '.orch', 'audit', 'session-status.json');
}

function update() {
  const statusPath = getStatusPath();
  if (!statusPath || !fs.existsSync(statusPath)) {
    setIdle();
    return;
  }

  try {
    const raw = fs.readFileSync(statusPath, 'utf8');
    const status = JSON.parse(raw);
    render(status);
    checkNotifications(status);
  } catch (e) {
    setIdle();
  }
}

function render(status) {
  const work = status.work || {};
  const quality = status.quality || {};

  // Build text: work progress
  let text = 'ORCH';

  if (work.status === 'complete') {
    text += ': done';
  } else if (work.bounded && work.progress && work.progress.total > 0) {
    text += `: ${work.progress.completed}/${work.progress.total} ${work.progress.unit || ''}`;
  } else if (work.status === 'in_progress') {
    text += ': working';
  }

  // Quality icon
  switch (quality.status) {
    case 'poor':
      text += ' \u2716'; // ✖
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      break;
    case 'declining':
      text += ' \u26A0'; // ⚠
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      break;
    case 'fair':
      text += ' \u2713'; // ✓
      statusBarItem.backgroundColor = undefined;
      break;
    case 'good':
    default:
      text += ' \u2713'; // ✓
      statusBarItem.backgroundColor = undefined;
      break;
  }

  statusBarItem.text = text;

  // Tooltip with more detail (visible on hover, not intrusive)
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

  // Only 3 things earn a notification:
  // 1. Agent needs user decision/input
  // 2. Something broke (security, build failure, boundary violation)
  // 3. Quality too low to continue

  let notifyLevel = null;
  let notifyMsg = '';

  if (quality.status === 'poor') {
    notifyLevel = 'error';
    notifyMsg = quality.message || 'Quality too low. Start a fresh session.';
  }

  // Check for security/error alerts
  const criticalAlerts = alerts.filter(
    a => a.level === 'critical' && !a.notified
  );
  if (criticalAlerts.length > 0) {
    notifyLevel = 'error';
    notifyMsg = criticalAlerts[0].message;
  }

  if (!notifyLevel) return;

  // Deduplicate: don't send same notification twice
  const key = `${status.session_id}-${notifyLevel}-${notifyMsg}`;
  if (key === lastNotifiedKey) return;
  lastNotifiedKey = key;

  // Fire VS Code toast
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

function deactivate() {
  if (pollInterval) clearInterval(pollInterval);
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = { activate, deactivate };
