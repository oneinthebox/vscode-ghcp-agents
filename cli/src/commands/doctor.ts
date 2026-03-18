/**
 * orch doctor — Health check
 */

import { detectProject } from '../core/project-detector';
import { banner, section, statusRow, kv, info, summary, withSpinner, sleep } from '../utils/ui';
import { getNodeVersionInfo, getNodeStatusMessage, detectPlatform, detectNodeManager } from '../utils/node-version';
import * as fs from 'fs';
import * as path from 'path';

export async function doctorCommand(): Promise<void> {
  const projectPath = process.cwd();

  banner('doctor');

  let ok = 0;
  let warnings = 0;
  let issues = 0;

  // 1. Project detection
  const project = await withSpinner(
    'Detecting project',
    async () => { await sleep(300); return detectProject(projectPath); },
    { successText: 'Project detected' }
  );

  await section('Project');
  if (project.type === 'unknown') {
    statusRow('Project type', 'fail', 'Could not detect');
    issues++;
  } else {
    statusRow('Project type', 'ok', `${project.type} (${project.workspace})`);
    ok++;
  }

  // 2. Node version
  await section('Node.js');
  const angularVersion = project.versions['@angular/core'];
  const nodeReq = getNodeRequirement(angularVersion);
  const nodeInfo = getNodeVersionInfo(angularVersion, nodeReq);
  const nodeStatus = getNodeStatusMessage(nodeInfo);

  statusRow('Node.js', nodeStatus.status, nodeStatus.message);
  if (nodeStatus.status === 'ok') ok++;
  else issues++;

  statusRow('Platform', 'ok', `${nodeInfo.platform}`);
  statusRow('Version manager', nodeInfo.manager !== 'none' ? 'ok' : 'warn',
    nodeInfo.manager !== 'none' ? nodeInfo.manager : `Not found — install one`);
  if (nodeInfo.manager === 'none') warnings++;
  else ok++;

  if (nodeStatus.action) {
    info(nodeStatus.action);
  }

  // 3. Compatibility
  await section('Compatibility');
  for (const [dep, ver] of Object.entries(project.versions)) {
    statusRow(dep, 'ok', ver);
    ok++;
  }
  for (const rec of project.recommendations) {
    statusRow('Recommendation', 'warn', rec);
    warnings++;
  }

  // 3. Audit hooks
  await section('Audit Hooks');
  const hooksDir = path.join(projectPath, '.github', 'hooks');
  for (const hook of ['audit-lifecycle.json', 'audit-prompts.json', 'audit-tools.json', 'audit-scope.json']) {
    if (fs.existsSync(path.join(hooksDir, hook))) {
      statusRow(hook, 'ok');
      ok++;
    } else {
      statusRow(hook, 'fail', 'MISSING');
      issues++;
    }
  }

  // 4. Audit config
  await section('Audit Config');
  for (const file of ['boundaries.yaml', 'adherence-rules.yaml']) {
    const filePath = path.join(projectPath, '.orch', 'audit', 'config', file);
    if (fs.existsSync(filePath)) {
      statusRow(file, 'ok');
      ok++;
    } else {
      statusRow(file, 'fail', 'MISSING');
      issues++;
    }
  }

  // 5. Audit scripts
  await section('Audit Scripts');
  const scriptsDir = path.join(projectPath, 'scripts', 'audit');
  const requiredScripts = [
    'log-session-start.sh', 'log-session-end.sh', 'log-prompt.sh',
    'check-tool-boundary.sh', 'check-file-scope.sh', 'log-tool-result.sh',
    'estimate-tokens.py', 'check-adherence.sh',
  ];
  for (const script of requiredScripts) {
    if (fs.existsSync(path.join(scriptsDir, script))) {
      statusRow(script, 'ok');
      ok++;
    } else {
      statusRow(script, 'fail', 'MISSING');
      issues++;
    }
  }

  // 6. Semantic adapter
  await section('Semantic Analysis');
  if (project.type === 'angular') {
    const adapterPath = path.join(projectPath, 'scripts', 'semantic', 'adapters', 'typescript');
    if (fs.existsSync(adapterPath)) {
      statusRow('TypeScript adapter (ts-morph)', 'ok');
      ok++;
    } else {
      statusRow('TypeScript adapter', 'warn', 'Not installed — /proof --semantic unavailable');
      warnings++;
    }
  }

  // 7. Agents + skills
  await section('Agents');
  const agentsDir = path.join(projectPath, '.github', 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.md'))) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const isWorker = content.includes('user-invocable: false');
      const name = file.replace('.agent.md', '');
      statusRow(name, 'ok', isWorker ? 'worker (internal)' : 'coordinator');
      ok++;
    }
  } else {
    statusRow('Agents directory', 'fail', 'MISSING — run orch init');
    issues++;
  }

  await section('Skills');
  const skillsDir = path.join(projectPath, '.github', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
    statusRow(`${skills.length} skills installed`, 'ok', skills.join(', '));
    ok++;
  } else {
    statusRow('Skills directory', 'fail', 'MISSING — run orch init');
    issues++;
  }

  // 8. Doc freshness
  await section('Reference Docs');
  const registryPath = path.join(projectPath, 'docs-registry.yaml');
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const currentCount = (content.match(/status: current/g) || []).length;
    const staleCount = (content.match(/status: stale/g) || []).length;
    const draftCount = (content.match(/status: draft/g) || []).length;

    if (currentCount > 0) { statusRow(`${currentCount} current`, 'ok'); ok++; }
    if (staleCount > 0) { statusRow(`${staleCount} stale`, 'warn', "run '@docs /packs refresh --stale'"); warnings++; }
    if (draftCount > 0) { statusRow(`${draftCount} draft`, 'warn', "run '@docs /packs convert'"); warnings++; }
    if (currentCount === 0 && staleCount === 0 && draftCount === 0) {
      statusRow('Registry empty', 'info', 'No sources registered yet');
    }
  } else {
    statusRow('docs-registry.yaml', 'warn', 'Not found');
    warnings++;
  }

  // Summary
  await summary({ ok, warn: warnings, fail: issues });
}

function getNodeRequirement(angularVersion: string | undefined): string {
  if (!angularVersion) return '^18.19 || ^20.11 || ^22';
  const major = parseInt(angularVersion.match(/(\d+)/)?.[1] || '19');
  const requirements: Record<number, string> = {
    16: '^16.14 || ^18.10',
    17: '^18.13 || ^20.9',
    18: '^18.19 || ^20.11 || ^22',
    19: '^18.19 || ^20.11 || ^22',
    20: '^20.11 || ^22',
    21: '^20.11 || ^22',
  };
  return requirements[major] || '^18.19 || ^20.11 || ^22';
}
