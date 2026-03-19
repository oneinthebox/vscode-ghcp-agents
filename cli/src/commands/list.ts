/**
 * orch list — Show all available agents, skills, and doc packs from the marketplace
 */

import { listDocPacks } from '../core/assembler';
import { banner, section, kv, statusRow, info, divider } from '../utils/ui';
import * as path from 'path';
import * as fs from 'fs';

// Same map as install.ts — defines what each agent provides
const AGENT_PACKAGES: Record<string, { skills: string[]; description: string }> = {
  angular: {
    skills: ['generate', 'migrate', 'test', 'review', 'refactor', 'hds', 'elevate'],
    description: 'Angular, TypeScript, RxJS expert (v17-v19)',
  },
  docs: {
    skills: ['packs', 'proof', 'drift', 'code-comment', 'version-matrix', 'explain'],
    description: 'Documentation pipeline — scan, convert, drift, explain',
  },
  audit: {
    skills: ['report', 'benchmark', 'context'],
    description: 'Observability — usage, tokens, compliance, session health',
  },
  showcase: {
    skills: ['present', 'dashboard'],
    description: 'Presentations — slide decks and dashboards from ORCH data',
  },
  orch: {
    skills: [],
    description: 'Master orchestrator — workflow coordination, cross-agent hand-offs',
  },
};

export async function listCommand(options: any): Promise<void> {
  const projectPath = process.cwd();

  banner('list');

  if (options.packs) {
    await listPacks(projectPath);
    return;
  }

  // Check what's installed
  const agentsDir = path.join(projectPath, '.github', 'agents');
  const installedAgents = new Set<string>();
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.endsWith('.agent.md')) {
        installedAgents.add(f.replace('.agent.md', ''));
      }
    }
  }

  await section('Available Agents');
  console.log('');

  for (const [name, pkg] of Object.entries(AGENT_PACKAGES)) {
    const installed = installedAgents.has(name);
    const installHint = installed ? '' : ` → orch install @${name}`;

    statusRow(
      `@${name}`,
      installed ? 'ok' : 'info',
      installed ? 'installed' : `not installed${installHint}`
    );
    info(`  ${pkg.description}`);
    if (pkg.skills.length > 0) {
      info(`  Skills: ${pkg.skills.map(s => '/' + s).join(', ')}`);
    }
    console.log('');
  }

  divider();
  const installedCount = Object.keys(AGENT_PACKAGES).filter(a => installedAgents.has(a)).length;
  info(`${installedCount}/${Object.keys(AGENT_PACKAGES).length} agents installed`);
  if (installedCount < Object.keys(AGENT_PACKAGES).length) {
    info("Install more with: orch install @<agent-name>");
  }
  info("View doc packs with: orch list --packs");
  console.log('');
}

async function listPacks(projectPath: string): Promise<void> {
  // Find marketplace path from manifest
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');
  let marketplacePath: string | null = null;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    marketplacePath = manifest.marketplace;
  }

  // Fall back to relative path convention
  if (!marketplacePath || !fs.existsSync(marketplacePath)) {
    // Try common locations
    const candidates = [
      path.join(projectPath, '..', 'marketplace'),
      path.join(projectPath, 'marketplace'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'doc-packs'))) {
        marketplacePath = candidate;
        break;
      }
    }
  }

  if (!marketplacePath || !fs.existsSync(marketplacePath)) {
    info('No marketplace found. Run orch init first.');
    return;
  }

  const packs = listDocPacks(marketplacePath);

  await section('Doc Packs');
  console.log('');

  if (packs.length === 0) {
    info('No doc packs found in marketplace/doc-packs/');
    console.log('');
    return;
  }

  // Check which packs are active in this project
  const registryPath = path.join(projectPath, 'docs-registry.yaml');
  const activePacks = new Set<string>();
  if (fs.existsSync(registryPath)) {
    const raw = fs.readFileSync(registryPath, 'utf8');
    // Extract managed_by fields
    const matches = raw.match(/managed_by["']?\s*:\s*["']?pack:(\w+)/g);
    if (matches) {
      for (const m of matches) {
        const domain = m.match(/pack:(\w+)/)?.[1];
        if (domain) activePacks.add(domain);
      }
    }
  }

  for (const pack of packs) {
    const active = activePacks.has(pack.pack);
    const sourceCount = pack.sources.length;
    statusRow(
      pack.pack,
      active ? 'ok' : 'info',
      `${sourceCount} sources${active ? ' (active)' : ''}`
    );
    info(`  ${pack.description}`);
    console.log('');
  }

  // Show planned packs that don't exist yet
  const knownFuture = ['springboot', 'fastapi'];
  for (const future of knownFuture) {
    if (!packs.find(p => p.pack === future)) {
      statusRow(future, 'info', '0 sources (planned)');
      console.log('');
    }
  }

  divider();
  info(`${packs.length} pack(s) available, ${activePacks.size} active in this project`);
  console.log('');
}
