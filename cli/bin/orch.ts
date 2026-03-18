#!/usr/bin/env node

/**
 * ORCH CLI — Entry point
 *
 * Usage:
 *   orch init [--domain <name>]     Initialize ORCH in a project
 *   orch install <agent>            Install a specific agent + its skills
 *   orch update                     Pull latest from marketplace
 *   orch status                     Show installed components + doc freshness
 *   orch doctor                     Check compatibility + health
 *   orch override <action>          Manage team overrides
 *   orch reset                      Remove all ORCH files from project
 */

import { Command } from 'commander';
import { initCommand } from '../src/commands/init';
import { installCommand } from '../src/commands/install';
import { updateCommand } from '../src/commands/update';
import { statusCommand } from '../src/commands/status';
import { doctorCommand } from '../src/commands/doctor';
import { overrideCommand } from '../src/commands/override';
import { resetCommand } from '../src/commands/reset';

const program = new Command();

program
  .name('orch')
  .description('ORCH CLI — install, manage, and update ORCH agents for your projects')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize ORCH in the current project — detects stack, installs agents + skills + audit')
  .option('-d, --domain <domains...>', 'Domains to install (angular, springboot, fastapi, docs, audit)')
  .option('--skip-scan', 'Skip initial codebase scan')
  .option('--skip-registry', 'Skip reference doc registration')
  .action(initCommand);

program
  .command('install <agent>')
  .description('Install a specific agent and its skills (e.g., orch install @angular)')
  .option('--with-audit', 'Also install audit hooks (default: true)', true)
  .action(installCommand);

program
  .command('update')
  .description('Pull latest agents, skills, and references from marketplace')
  .option('--dry-run', 'Show what would change without applying')
  .action(updateCommand);

program
  .command('status')
  .description('Show installed agents, skills, doc freshness, and override status')
  .option('--json', 'Output as JSON')
  .action(statusCommand);

program
  .command('doctor')
  .description('Check compatibility, audit health, doc freshness, and configuration')
  .action(doctorCommand);

program
  .command('override <action>')
  .description('Manage team overrides (create, list, remove, check-expiry)')
  .argument('[skill]', 'Skill name to override')
  .option('--team <name>', 'Team name')
  .action(overrideCommand);

program
  .command('reset')
  .description('Remove all ORCH files from the project (uses manifest to track what was installed)')
  .option('--dry-run', 'Show what would be removed without actually removing')
  .option('--force', 'Force remove known ORCH directories even without manifest')
  .action(resetCommand);

program.parse();
