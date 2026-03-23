#!/usr/bin/env node

import { Command } from 'commander';
import chalk = require('chalk');
import { initCommand } from '../src/commands/init';
import { installCommand } from '../src/commands/install';
import { updateCommand } from '../src/commands/update';
import { statusCommand } from '../src/commands/status';
import { doctorCommand } from '../src/commands/doctor';

import { resetCommand } from '../src/commands/reset';
import { listCommand } from '../src/commands/list';
import { maintainConvertCommand, maintainRefreshCommand, maintainPublishCommand } from '../src/commands/maintain';

const program = new Command();

program
  .name('orch')
  .description('ORCH CLI — install, manage, and update ORCH agents for your projects')
  .version('0.1.0')

  .configureHelp({
    formatHelp: (cmd, helper) => {
      const isRoot = cmd.name() === 'orch';

      if (isRoot) {
        const title = chalk.bold.cyan('\n  ORCH') + chalk.dim(' — Orchestra for GitHub Copilot\n');
        const commands = cmd.commands.map(c => {
          const name = chalk.cyan(c.name().padEnd(12));
          const desc = chalk.white(c.description());
          return `    ${name} ${desc}`;
        }).join('\n');
        const options = cmd.options.map(o => {
          const flags = chalk.cyan(o.flags.padEnd(24));
          const desc = chalk.dim(o.description);
          return `    ${flags} ${desc}`;
        }).join('\n');
        return [
          title,
          chalk.bold.white('  Commands:\n'),
          commands,
          '',
          chalk.bold.white('  Options:\n'),
          options,
          '',
          chalk.dim('  Run ') + chalk.cyan('orch <command> --help') + chalk.dim(' for details on a specific command.'),
          '',
        ].join('\n');
      }

      // Subcommand help — build full path (e.g. "orch maintain")
      const parentNames: string[] = [];
      let parent = cmd.parent;
      while (parent) {
        parentNames.unshift(parent.name());
        parent = parent.parent;
      }
      const fullName = [...parentNames, cmd.name()].join(' ');

      const lines: string[] = [];
      lines.push(chalk.bold.cyan(`\n  ${fullName}`) + chalk.dim(` — ${cmd.description()}\n`));

      const usage = helper.commandUsage(cmd);
      lines.push(chalk.bold.white('  Usage:'));
      lines.push(`    ${chalk.cyan(usage)}`);
      lines.push('');

      // Show child commands (e.g. convert, refresh, publish under maintain)
      if (cmd.commands.length > 0) {
        lines.push(chalk.bold.white('  Commands:'));
        for (const sub of cmd.commands) {
          const name = chalk.cyan(sub.name().padEnd(14));
          const desc = chalk.white(sub.description());
          lines.push(`    ${name} ${desc}`);
        }
        lines.push('');
        lines.push(chalk.dim(`  Run `) + chalk.cyan(`${fullName} <command> --help`) + chalk.dim(` for details.`));
        lines.push('');
      }

      if (cmd.options.length > 0) {
        lines.push(chalk.bold.white('  Options:'));
        for (const opt of cmd.options) {
          const flags = chalk.cyan(opt.flags.padEnd(30));
          const desc = chalk.white(opt.description);
          const def = opt.defaultValue !== undefined ? chalk.dim(` (default: ${opt.defaultValue})`) : '';
          lines.push(`    ${flags} ${desc}${def}`);
        }
        lines.push('');
      }

      const args = cmd.registeredArguments;
      if (args.length > 0) {
        lines.push(chalk.bold.white('  Arguments:'));
        for (const arg of args) {
          const name = chalk.cyan(arg.name().padEnd(20));
          const desc = chalk.white(arg.description || '');
          lines.push(`    ${name} ${desc}`);
        }
        lines.push('');
      }

      return lines.join('\n');
    }
  });

program
  .command('init')
  .description('Initialize ORCH in the current project')
  .option('-d, --domain <domains...>', 'Domains to install (angular, springboot, fastapi, docs, audit)')
  .option('--skip-scan', 'Skip initial codebase scan')
  .option('--skip-registry', 'Skip reference doc registration')
  .action(initCommand);

program
  .command('install <agent>')
  .description('Install a specific agent and its skills')
  .option('--with-audit', 'Also install audit hooks (default: true)', true)
  .action(installCommand);

program
  .command('update')
  .description('Pull latest from marketplace')
  .option('--dry-run', 'Show what would change without applying')
  .action(updateCommand);

program
  .command('status')
  .description('Show installed agents, skills, and doc freshness')
  .option('--json', 'Output as JSON')
  .action(statusCommand);

program
  .command('doctor')
  .description('Check compatibility, audit, and configuration health')
  .action(doctorCommand);

program
  .command('list')
  .description('Show all available agents, skills, and doc packs')
  .option('--packs', 'Show available doc packs and their source counts')
  .action(listCommand);

program
  .command('reset')
  .description('Remove all ORCH files from the project')
  .option('--dry-run', 'Show what would be removed')
  .option('--force', 'Force remove even without manifest')
  .action(resetCommand);

// ── Maintainer commands ──

const maintain = program
  .command('maintain')
  .description('Maintainer commands (run from marketplace repo)');

maintain
  .command('convert')
  .description('Convert doc-pack sources to markdown')
  .argument('[pack]', 'Pack file or name (e.g. angular, angular.yaml, doc-packs/angular.yaml)')
  .option('--id <id>', 'Convert a single source by ID')
  .option('--all', 'Convert all sources from all packs')
  .option('--dry-run', 'Show what would be converted')
  .action(maintainConvertCommand);

maintain
  .command('refresh')
  .description('Re-convert stale sources (>30 days)')
  .option('--stale', 'Only refresh stale sources')
  .option('--all', 'Refresh all sources regardless of age')
  .option('--dry-run', 'Show what would be refreshed')
  .action(maintainRefreshCommand);

maintain
  .command('publish')
  .description('Show what reference docs changed since last commit')
  .option('--dry-run', 'Same as default — informational only')
  .action(maintainPublishCommand);

program.parse();
