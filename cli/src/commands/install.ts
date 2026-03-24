/**
 * orch install <agent> — Install a specific agent + its skills into an existing ORCH setup
 */

import { detectProject } from '../core/project-detector';
import { readMarketplace } from '../core/marketplace';
import { executeAssembly, AssemblyPlan, loadDocPack } from '../core/assembler';
import { banner, section, success, fail, warn, info, withSpinner, summary, sleep } from '../utils/ui';
import * as fs from 'fs';
import * as path from 'path';

// Agent → what it needs
const AGENT_PACKAGES: Record<string, {
  agents: string[];
  skills: string[];
  instructions: string[];
  semanticAdapters: string[];
}> = {
  angular: {
    agents: [
      'angular.agent.md', 'angular-planner.agent.md',
      'angular-engineer.agent.md', 'angular-verifier.agent.md',
      'migrate-worker.agent.md',
    ],
    skills: [
      'angular-scan-deps', 'angular-scan-arch', 'angular-scan-quality',
      'angular-scan-tests', 'angular-scan-deploy', 'angular-scan-git',
      'angular-scan-docs', 'angular-scan-features', 'angular-explain',
      'angular-compatibility',
      'angular-generate-component', 'angular-generate-service', 'angular-generate-route',
      'angular-migrate-standalone', 'angular-migrate-signals', 'angular-migrate-control-flow',
      'angular-migrate-jest', 'angular-migrate-playwright', 'angular-migrate-version',
      'angular-refactor', 'angular-docs-generate', 'angular-docs-repair',
      'angular-test-unit', 'angular-test-e2e', 'angular-test-lint',
      'angular-review', 'angular-docs-audit',
      'angular-hds-audit', 'angular-hds-apply', 'angular-hds-generate',
      'angular-elevate-audit', 'angular-elevate-apply', 'angular-elevate-generate',
      'angular-docs-comment', 'angular-docs-readme', 'angular-docs-changelog', 'angular-docs-api',
      'angular-mock-wire',
    ],
    instructions: [],
    semanticAdapters: ['typescript'],
  },
  docs: {
    agents: ['docs.agent.md', 'doc-convert-worker.agent.md'],
    skills: [
      'docs-fetch', 'docs-status', 'docs-refresh', 'docs-drift',
    ],
    instructions: [],
    semanticAdapters: [],
  },
  audit: {
    agents: ['audit.agent.md'],
    skills: [
      'audit-usage', 'audit-tokens', 'audit-compliance', 'audit-drift',
      'audit-benchmark', 'audit-context',
    ],
    instructions: [],
    semanticAdapters: [],
  },
  orch: {
    agents: ['orch.agent.md', 'orch-preflight.agent.md'],
    skills: ['present-report', 'present-deck', 'present-dashboard'],
    instructions: [],
    semanticAdapters: [],
  },
  local: {
    agents: ['local.agent.md'],
    skills: [
      'local-setup-env', 'local-setup-docker',
      'local-setup-deps', 'local-diagnose',
      'local-mock-capture', 'local-mock-generate', 'local-mock-server',
    ],
    instructions: [],
    semanticAdapters: [],
  },
};

export async function installCommand(agent: string, options: any): Promise<void> {
  const agentName = agent.replace('@', '').toLowerCase();
  const projectPath = process.cwd();
  const marketplacePath = findMarketplace();

  banner(`install @${agentName}`);

  // Check this is an ORCH project
  const manifestPath = path.join(projectPath, '.orch', 'manifest.json');
  const hasOrch = fs.existsSync(manifestPath) ||
    fs.existsSync(path.join(projectPath, '.github', 'agents'));

  if (!hasOrch) {
    fail('ORCH is not initialized in this project.');
    info("Run 'orch init' first to set up the base ORCH configuration.");
    console.log('');
    process.exit(1);
  }

  // Check agent is known
  const pkg = AGENT_PACKAGES[agentName];
  if (!pkg) {
    fail(`Unknown agent: @${agentName}`);
    info(`Available: ${Object.keys(AGENT_PACKAGES).map(a => '@' + a).join(', ')}`);
    console.log('');
    process.exit(1);
  }

  // Check if already installed
  const alreadyInstalled = pkg.agents.every(a =>
    fs.existsSync(path.join(projectPath, '.github', 'agents', a))
  );
  if (alreadyInstalled) {
    warn(`@${agentName} is already installed.`);
    info("Run 'orch update' to pull the latest version.");
    console.log('');
    return;
  }

  // Read marketplace
  const marketplace = await withSpinner(
    'Reading marketplace',
    async () => { await sleep(200); return readMarketplace(marketplacePath); }
  );

  // Load doc pack sources if this agent has an associated pack
  let registrySources: any[] = [];
  if (agentName === 'angular') {
    const project = detectProject(projectPath);
    const angularVersion = project.versions['@angular/core']?.match(/(\d+)/)?.[1] || '19';
    registrySources = loadDocPack(marketplacePath, 'angular', angularVersion);
  }

  // Build a targeted assembly plan
  const plan: AssemblyPlan = {
    agents: pkg.agents,
    skills: pkg.skills,
    instructions: pkg.instructions,
    hooks: [],              // hooks already installed via init
    auditScripts: [],       // already installed
    semanticAdapters: pkg.semanticAdapters,
    registrySources,
    boundaryConfig: {},
  };

  await section('Installing');

  const agentResult = await withSpinner(
    `Copying @${agentName} agent(s)`,
    async () => { await sleep(300); return pkg.agents; },
    { successText: `${pkg.agents.length} agent(s): ${pkg.agents.map(a => a.replace('.agent.md', '')).join(', ')}` }
  );

  if (pkg.skills.length > 0) {
    await withSpinner(
      'Copying skills',
      async () => { await sleep(300); return pkg.skills; },
      { successText: `${pkg.skills.length} skills: ${pkg.skills.join(', ')}` }
    );
  }

  if (pkg.instructions.length > 0) {
    await withSpinner(
      'Copying instructions',
      async () => { await sleep(200); return pkg.instructions; },
      { successText: `${pkg.instructions.length} instruction(s)` }
    );
  }

  if (pkg.semanticAdapters.length > 0) {
    await withSpinner(
      'Installing semantic adapters',
      async () => { await sleep(200); return pkg.semanticAdapters; },
      { successText: `${pkg.semanticAdapters.length} adapter(s)` }
    );
  }

  // Execute
  const result = executeAssembly(plan, marketplacePath, projectPath);

  if (result.errors.length > 0) {
    await section('Warnings');
    for (const err of result.errors) {
      warn(err);
    }
  }

  await summary({ ok: result.copied, warn: result.errors.length, fail: 0 });

  info(`@${agentName} installed. Use in VS Code: @${agentName} <your request>`);
  if (pkg.skills.length > 0) {
    info(`Available skills: ${pkg.skills.map(s => '/' + s).join(', ')}`);
  }
  console.log('');
}

function findMarketplace(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'marketplace'),
    path.resolve(__dirname, '..', '..', '..', 'marketplace'),
    path.resolve(__dirname, '..', '..', 'marketplace'),
    process.env.ORCH_MARKETPLACE ? path.resolve(process.env.ORCH_MARKETPLACE) : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (require('fs').existsSync(candidate)) return candidate;
  }
  throw new Error('Marketplace not found. Set ORCH_MARKETPLACE env var or run from the ORCH repo.');
}
