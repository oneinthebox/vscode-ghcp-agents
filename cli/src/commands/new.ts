/**
 * orch new <type> <name> — Scaffold a new project + initialize ORCH in one step
 *
 * Solves the chicken-and-egg problem: orch init requires a project,
 * but /local-create-workspace is an ORCH skill that runs after init.
 * This command does both: creates the project, then runs init.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { banner, section, success, fail, warn, info, withSpinner, summary, sleep } from '../utils/ui';
import { initCommand } from './init';

const TEMPLATES: Record<string, {
  description: string;
  command: (name: string, options: any) => string;
  postCreate: string[];
}> = {
  'nx-angular': {
    description: 'Nx Angular monorepo — shared libs, module boundaries, Jest, ESLint',
    command: (name, opts) => {
      const style = opts.style || 'scss';
      const pm = opts.packageManager || 'npm';
      return `npx create-nx-workspace@latest ${name} --preset=angular-monorepo --appName=${name} --style=${style} --nxCloud=skip --packageManager=${pm} --interactive=false`;
    },
    postCreate: [
      'npx nx generate @nx/angular:library shared-models --directory=libs/shared-models --standalone --prefix=shared --skipTests=true',
      'npx nx generate @nx/angular:library shared-ui --directory=libs/shared-ui --standalone --prefix=shared --skipTests=true',
      'npx nx generate @nx/angular:library data-access --directory=libs/data-access --standalone --prefix=data --skipTests=true',
    ],
  },
  'angular': {
    description: 'Standalone Angular CLI app — simple, no monorepo',
    command: (name, opts) => {
      const style = opts.style || 'scss';
      const pm = opts.packageManager || 'npm';
      return `npx @angular/cli@latest new ${name} --style=${style} --routing=true --standalone=true --strict=true --skip-git=false --package-manager=${pm}`;
    },
    postCreate: [],
  },
};

export async function newCommand(type: string, name: string, options: any): Promise<void> {
  banner('new');

  const template = TEMPLATES[type];
  if (!template) {
    fail(`Unknown project type: ${type}`);
    info(`Available types:`);
    for (const [key, tmpl] of Object.entries(TEMPLATES)) {
      info(`  ${key.padEnd(14)} ${tmpl.description}`);
    }
    return;
  }

  const targetDir = path.resolve(process.cwd(), name);

  // Pre-checks
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    fail(`Directory ${name} already exists and is not empty.`);
    info('Use an empty directory or choose a different name.');
    return;
  }

  // Step 1: Create the project
  await section('Creating project');
  const cmd = template.command(name, options);
  info(`Running: ${cmd}`);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes
    });
    success(`Project ${name} created.`);
  } catch (e) {
    fail(`Failed to create project. Check the output above for errors.`);
    return;
  }

  // Step 2: Post-creation setup (shared libs for Nx)
  if (template.postCreate.length > 0) {
    await section('Setting up shared libraries');
    for (const postCmd of template.postCreate) {
      info(`Running: ${postCmd}`);
      try {
        execSync(postCmd, {
          stdio: 'inherit',
          cwd: targetDir,
          timeout: 120000,
        });
      } catch (e) {
        warn(`Post-create step failed: ${postCmd}`);
        info('You can run this manually later.');
      }
    }
    success('Shared libraries created.');
  }

  // Step 3: Run orch init inside the new project
  await section('Initializing ORCH');
  const originalCwd = process.cwd();
  process.chdir(targetDir);

  try {
    await initCommand({
      domain: ['angular'],
      skipScan: true,
      skipRegistry: false,
    });
    success('ORCH initialized.');
  } catch (e) {
    warn('ORCH init encountered issues. Run `orch doctor` to diagnose.');
  }

  process.chdir(originalCwd);

  // Step 4: Summary
  await section('Done');

  console.log('');
  success(`Project "${name}" is ready.`);
  console.log('');
  info(`Next steps:`);
  info(`  cd ${name}`);
  info(`  orch doctor                              # verify setup`);

  if (type === 'nx-angular') {
    info(`  npx nx serve ${name}                      # start dev server`);
    info(`  @angular recap this project               # understand the codebase`);
    info(`  @angular /angular-generate-component      # create your first component`);
    info(`  @local /local-mock-generate "your data"   # set up mock API`);
  } else if (type === 'angular') {
    info(`  ng serve                                  # start dev server`);
    info(`  @angular recap this project               # understand the codebase`);
  }

  console.log('');
  summary({ ok: 1, warn: 0, fail: 0 });
}
