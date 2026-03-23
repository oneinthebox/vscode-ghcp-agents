/**
 * orch doctor — Health check
 */

import { detectProject } from '../core/project-detector';
import { verifyIntegrity, OrchManifest } from '../core/assembler';
import { banner, section, statusRow, kv, info, warn, summary, withSpinner, sleep } from '../utils/ui';
import { getNodeVersionInfo, getNodeStatusMessage, detectPlatform, detectNodeManager } from '../utils/node-version';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

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

  // 2b. Required tools (bash, jq, python3)
  await section('Required Tools');
  const platform = detectPlatform();
  const toolChecks: { name: string; cmd: string; macInstall: string; linuxInstall: string; winInstall: string }[] = [
    { name: 'bash', cmd: 'bash --version', macInstall: 'pre-installed on macOS', linuxInstall: 'pre-installed on Linux', winInstall: 'Install Git Bash or WSL' },
    { name: 'jq', cmd: 'jq --version', macInstall: 'brew install jq', linuxInstall: 'apt install jq', winInstall: 'choco install jq or scoop install jq' },
    { name: 'python3', cmd: 'python3 --version', macInstall: 'brew install python3', linuxInstall: 'apt install python3', winInstall: 'choco install python3 or scoop install python' },
  ];

  for (const tool of toolChecks) {
    try {
      childProcess.execSync(tool.cmd, { stdio: 'pipe', encoding: 'utf8' });
      statusRow(tool.name, 'ok');
      ok++;
    } catch {
      statusRow(tool.name, 'fail', 'NOT FOUND');
      issues++;
      if (platform === 'macos') {
        info(`  Install: ${tool.macInstall}`);
      } else if (platform === 'linux') {
        info(`  Install: ${tool.linuxInstall}`);
      } else {
        info(`  Install: ${tool.winInstall}`);
      }
    }
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

  // 4. Audit hooks
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

  // 5. Audit config
  await section('Audit Config');
  for (const file of ['boundaries.yaml', 'adherence-rules.yaml']) {
    const filePath = path.join(projectPath, '.orch', 'config', file);
    if (fs.existsSync(filePath)) {
      statusRow(file, 'ok');
      ok++;
    } else {
      statusRow(file, 'fail', 'MISSING');
      issues++;
    }
  }

  // 6. Audit scripts
  await section('Audit Scripts');
  const scriptsDir = path.join(projectPath, '.orch', 'scripts', 'audit');
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

  // 7. Semantic adapter
  await section('Semantic Analysis');
  if (project.type === 'angular') {
    const adapterPath = path.join(projectPath, '.orch', 'scripts', 'semantic', 'adapters', 'typescript');
    if (fs.existsSync(adapterPath)) {
      statusRow('TypeScript adapter (ts-morph)', 'ok');
      ok++;
    } else {
      statusRow('TypeScript adapter', 'warn', 'Not installed — /proof --semantic unavailable');
      warnings++;
    }
  }

  // 8. Agents + skills
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

  // 9. Integrity (checksum verification)
  await section('Integrity');
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest: OrchManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.checksums && Object.keys(manifest.checksums).length > 0) {
      const integrity = verifyIntegrity(projectPath, manifest);

      if (integrity.matched.length > 0) {
        statusRow(`${integrity.matched.length} files match checksums`, 'ok');
        ok++;
      }
      if (integrity.modified.length > 0) {
        statusRow(`${integrity.modified.length} file(s) modified locally`, 'warn');
        for (const f of integrity.modified) {
          warn(`  ${f}`);
        }
        info("Run 'orch update' to restore originals");
        warnings++;
      }
      if (integrity.missing.length > 0) {
        statusRow(`${integrity.missing.length} file(s) missing`, 'fail');
        for (const f of integrity.missing) {
          warn(`  ${f}`);
        }
        issues++;
      }
    } else {
      info('No checksums in manifest — run orch update to generate');
    }
  } else {
    statusRow('Manifest', 'fail', 'MISSING — run orch init');
    issues++;
  }

  // 10. ORCH Config + Global Instructions
  await section('ORCH Config');
  const orchConfigPath = path.join(projectPath, '.orch', 'config.yaml');
  if (fs.existsSync(orchConfigPath)) {
    statusRow('.orch/config.yaml', 'ok');
    ok++;
  } else {
    statusRow('.orch/config.yaml', 'fail', 'MISSING');
    issues++;
  }

  const copilotInstrPath = path.join(projectPath, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotInstrPath)) {
    statusRow('.github/copilot-instructions.md', 'ok');
    ok++;
  } else {
    statusRow('.github/copilot-instructions.md', 'fail', 'MISSING');
    issues++;
  }

  // 11. Reference Docs (core-packs)
  await section('Reference Docs');
  const registryPath = path.join(projectPath, '.orch', 'registry.yaml');
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const currentCount = (content.match(/["']?status["']?\s*:\s*["']?current/g) || []).length;
    const staleCount = (content.match(/["']?status["']?\s*:\s*["']?stale/g) || []).length;
    const draftCount = (content.match(/["']?status["']?\s*:\s*["']?draft/g) || []).length;

    if (currentCount > 0) { statusRow(`${currentCount} current (core-pack)`, 'ok'); ok++; }
    if (staleCount > 0) { statusRow(`${staleCount} stale`, 'warn', "run 'orch update' to get latest from maintainer"); warnings++; }
    if (draftCount > 0) { statusRow(`${draftCount} draft`, 'info', 'not yet converted by maintainer'); }
    if (currentCount === 0 && staleCount === 0 && draftCount === 0) {
      statusRow('Registry empty', 'info', 'No sources registered yet');
    }
  } else {
    statusRow('.orch/registry.yaml', 'warn', 'Not found');
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
