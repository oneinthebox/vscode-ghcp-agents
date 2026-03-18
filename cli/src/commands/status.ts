/**
 * orch status — Show installed components
 */

import { banner, section, kv, statusRow, info, divider } from '../utils/ui';
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

  // Overrides
  await section('Overrides');
  const overridesDir = path.join(projectPath, '.github', 'skill-overrides');
  if (fs.existsSync(overridesDir)) {
    const overrides = fs.readdirSync(overridesDir)
      .filter(f => f !== 'README.md' && fs.statSync(path.join(overridesDir, f)).isDirectory());
    if (overrides.length > 0) {
      for (const o of overrides) statusRow(o, 'info');
    } else {
      info('None active');
    }
  }

  // Registry
  await section('Registry');
  const registryPath = path.join(projectPath, 'docs-registry.yaml');
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const current = (content.match(/status: current/g) || []).length;
    const stale = (content.match(/status: stale/g) || []).length;
    const draft = (content.match(/status: draft/g) || []).length;
    kv('Current', `${current}`);
    kv('Stale', `${stale}`);
    kv('Draft', `${draft}`);
  } else {
    info('No registry found');
  }

  // Audit sessions
  await section('Audit');
  const sessionsDir = path.join(projectPath, '.orch', 'audit', 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const dateDirs = fs.readdirSync(sessionsDir);
    let total = 0;
    for (const d of dateDirs) {
      total += fs.readdirSync(path.join(sessionsDir, d)).filter(f => f.endsWith('.json')).length;
    }
    kv('Sessions', `${total} across ${dateDirs.length} days`);
  } else {
    info('No sessions recorded yet');
  }

  console.log('');
}
