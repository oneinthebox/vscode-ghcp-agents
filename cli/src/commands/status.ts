/**
 * orch status — Show installed components
 */

import { verifyIntegrity, OrchManifest } from '../core/assembler';
import { banner, section, kv, statusRow, info, warn, divider } from '../utils/ui';
import * as fs from 'fs';
import * as path from 'path';

export async function statusCommand(options: any): Promise<void> {
  const projectPath = process.cwd();

  banner('status');

  // Agents
  await section('Agents');
  const agentsDir = path.join(projectPath, '.github', 'agents');
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.md'));
    for (const agent of agents) {
      const content = fs.readFileSync(path.join(agentsDir, agent), 'utf8');
      const isWorker = content.includes('user-invocable: false');
      const name = agent.replace('.agent.md', '');
      statusRow(isWorker ? `  └─ ${name}` : `@${name}`, 'ok', isWorker ? 'worker' : '');
    }
  } else {
    statusRow('None installed', 'warn', "run 'orch init'");
  }

  // Skills
  await section('Skills');
  const skillsDir = path.join(projectPath, '.github', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
    for (const skill of skills) {
      const skillDir = path.join(skillsDir, skill);
      const assets: string[] = [];
      if (fs.existsSync(path.join(skillDir, 'references'))) assets.push('refs');
      if (fs.existsSync(path.join(skillDir, 'templates'))) assets.push('tmpl');
      if (fs.existsSync(path.join(skillDir, 'examples'))) assets.push('examples');
      if (fs.existsSync(path.join(skillDir, 'scripts'))) assets.push('scripts');
      statusRow(`/${skill}`, 'ok', assets.length > 0 ? assets.join(', ') : '');
    }
  } else {
    statusRow('None installed', 'warn');
  }

  // Instructions
  await section('Instructions');
  const instrDir = path.join(projectPath, '.github', 'instructions');
  if (fs.existsSync(instrDir)) {
    for (const file of fs.readdirSync(instrDir).filter(f => f.endsWith('.instructions.md'))) {
      statusRow(file.replace('.instructions.md', ''), 'ok');
    }
  }

  // Hooks
  await section('Hooks');
  const hooksDir = path.join(projectPath, '.github', 'hooks');
  if (fs.existsSync(hooksDir)) {
    for (const hook of fs.readdirSync(hooksDir).filter(f => f.endsWith('.json'))) {
      statusRow(hook.replace('.json', ''), 'ok');
    }
  }

  // Integrity
  await section('Integrity');
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest: OrchManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.checksums && Object.keys(manifest.checksums).length > 0) {
      const integrity = verifyIntegrity(projectPath, manifest);
      kv('Tracked files', `${Object.keys(manifest.checksums).length}`);
      kv('Matching', `${integrity.matched.length}`);
      if (integrity.modified.length > 0) {
        kv('Modified locally', `${integrity.modified.length}`);
        for (const f of integrity.modified) {
          warn(`  ${f}`);
        }
      }
      if (integrity.missing.length > 0) {
        kv('Missing', `${integrity.missing.length}`);
      }
    } else {
      info('No checksums — run orch update to generate');
    }
  } else {
    info('No manifest found');
  }

  // Registry (core-packs)
  await section('Registry (Core-Packs)');
  const registryPath = path.join(projectPath, '.orch/registry.yaml');
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const current = (content.match(/["']?status["']?\s*:\s*["']?current/g) || []).length;
    const stale = (content.match(/["']?status["']?\s*:\s*["']?stale/g) || []).length;
    const draft = (content.match(/["']?status["']?\s*:\s*["']?draft/g) || []).length;
    kv('Current', `${current}`);
    kv('Stale', `${stale}`);
    kv('Draft', `${draft}`);
    if (draft > 0) {
      info('Draft sources not yet converted by maintainer');
    }
  } else {
    info('No registry found');
  }

  // Workflows
  await section('Workflows');
  const workflowsDir = path.join(projectPath, '.orch', 'workflows');
  if (fs.existsSync(workflowsDir)) {
    const wfFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const wf of wfFiles) {
      kv(wf.replace('.yaml', '').replace('.yml', ''), 'installed');
    }
    if (wfFiles.length === 0) { info('No workflows installed'); }
  } else {
    info('No workflows directory');
  }

  // Run history
  await section('Run History');
  const runsDir = path.join(projectPath, '.orch', 'runs');
  if (fs.existsSync(runsDir)) {
    const dateDirs = fs.readdirSync(runsDir).filter(d =>
      fs.statSync(path.join(runsDir, d)).isDirectory()
    );
    let total = 0;
    for (const d of dateDirs) {
      total += fs.readdirSync(path.join(runsDir, d)).filter(f =>
        fs.statSync(path.join(runsDir, d, f)).isDirectory()
      ).length;
    }
    kv('Runs', `${total} across ${dateDirs.length} days`);
  } else {
    info('No runs recorded yet');
  }

  console.log('');
}
