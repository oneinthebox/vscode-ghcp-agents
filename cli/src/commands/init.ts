/**
 * orch init — Initialize ORCH in a project
 */

import { detectProject } from '../core/project-detector';
import { readMarketplace } from '../core/marketplace';
import { createAssemblyPlan, executeAssembly } from '../core/assembler';
import { banner, section, kv, success, warn, info, withSpinner, withSpinnerSync, summary, divider, sleep } from '../utils/ui';
import * as path from 'path';

export async function initCommand(options: any): Promise<void> {
  const projectPath = process.cwd();
  const marketplacePath = findMarketplace();

  banner('init');

  // Step 1: Detect project
  const project = await withSpinner(
    'Detecting project',
    async () => {
      await sleep(300);
      return detectProject(projectPath);
    },
    { successText: `Detected ${detectProject(projectPath).type} project` }
  );

  await section('Project');
  kv('Type', project.type);
  kv('Workspace', project.workspace);
  kv('Root', project.root);

  if (Object.keys(project.versions).length > 0) {
    await section('Versions');
    for (const [dep, ver] of Object.entries(project.versions)) {
      kv(dep, ver);
    }
  }

  if (project.internalLibs.length > 0) {
    await section('Internal Libraries');
    for (const lib of project.internalLibs) {
      info(`${lib}: ${project.versions[lib]}`);
    }
  }

  await section('Test Stack');
  kv('Unit', project.testStack.unit);
  kv('E2E', project.testStack.e2e);

  // Step 2: Determine domains
  let domains = options.domain || [];
  if (domains.length === 0) {
    if (project.type === 'angular') domains.push('angular');
    if (project.type === 'springboot') domains.push('springboot');
    if (project.type === 'fastapi') domains.push('fastapi');
    domains.push('audit');
  }

  await section('Domains');
  for (const domain of domains) {
    success(domain);
  }

  // Step 3: Read marketplace
  const marketplace = await withSpinner(
    'Reading marketplace',
    async () => {
      await sleep(200);
      return readMarketplace(marketplacePath);
    },
    { successText: `Marketplace: ${readMarketplace(marketplacePath).agents.length} agents, ${readMarketplace(marketplacePath).skills.length} skills` }
  );

  // Step 4: Create plan
  const plan = await withSpinnerSync(
    'Creating assembly plan',
    () => createAssemblyPlan(project, marketplace, domains),
    { successText: `Plan: ${createAssemblyPlan(project, marketplace, domains).agents.length} agents, ${createAssemblyPlan(project, marketplace, domains).skills.length} skills` }
  );

  // Step 5: Install
  await section('Installing');

  const agentResult = await withSpinner(
    'Copying agents',
    async () => { await sleep(300); return plan.agents; },
    { successText: `${plan.agents.length} agents` }
  );

  const skillResult = await withSpinner(
    'Copying skills',
    async () => { await sleep(400); return plan.skills; },
    { successText: `${plan.skills.length} skills` }
  );

  const instrResult = await withSpinner(
    'Copying instructions',
    async () => { await sleep(200); return plan.instructions; },
    { successText: `${plan.instructions.length} instruction files` }
  );

  const hookResult = await withSpinner(
    'Setting up audit hooks',
    async () => { await sleep(300); return plan.hooks; },
    { successText: `${plan.hooks.length} hooks` }
  );

  const scriptResult = await withSpinner(
    'Copying audit scripts',
    async () => { await sleep(300); return plan.auditScripts; },
    { successText: `${plan.auditScripts.length} scripts` }
  );

  if (plan.semanticAdapters.length > 0) {
    await withSpinner(
      'Installing semantic adapters',
      async () => { await sleep(300); return plan.semanticAdapters; },
      { successText: `${plan.semanticAdapters.length} adapters (${plan.semanticAdapters.join(', ')})` }
    );
  }

  await withSpinner(
    'Configuring audit boundaries',
    async () => { await sleep(200); },
    { successText: 'boundaries.yaml + adherence-rules.yaml' }
  );

  await withSpinner(
    'Creating docs registry',
    async () => { await sleep(200); return plan.registrySources; },
    { successText: `${plan.registrySources.length} sources registered` }
  );

  // Execute the actual copy
  const result = executeAssembly(plan, marketplacePath, projectPath);

  if (result.errors.length > 0) {
    await section('Warnings');
    for (const err of result.errors) {
      warn(err);
    }
  }

  // Recommendations
  if (project.recommendations.length > 0) {
    await section('Recommendations');
    for (const rec of project.recommendations) {
      warn(rec);
    }
  }

  // Done
  await summary({ ok: result.copied, warn: result.errors.length + project.recommendations.length, fail: 0 });

  console.log('  Next steps:');
  info("Run 'orch doctor' to verify setup");
  info("Run 'orch status' to see installed components");
  if (!options.skipScan) {
    info("Use '@docs /proof' to scan your codebase");
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
