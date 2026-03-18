#!/usr/bin/env node
"use strict";
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
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("../src/commands/init");
const install_1 = require("../src/commands/install");
const update_1 = require("../src/commands/update");
const status_1 = require("../src/commands/status");
const doctor_1 = require("../src/commands/doctor");
const override_1 = require("../src/commands/override");
const program = new commander_1.Command();
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
    .action(init_1.initCommand);
program
    .command('install <agent>')
    .description('Install a specific agent and its skills (e.g., orch install @angular)')
    .option('--with-audit', 'Also install audit hooks (default: true)', true)
    .action(install_1.installCommand);
program
    .command('update')
    .description('Pull latest agents, skills, and references from marketplace')
    .option('--dry-run', 'Show what would change without applying')
    .action(update_1.updateCommand);
program
    .command('status')
    .description('Show installed agents, skills, doc freshness, and override status')
    .option('--json', 'Output as JSON')
    .action(status_1.statusCommand);
program
    .command('doctor')
    .description('Check compatibility, audit health, doc freshness, and configuration')
    .action(doctor_1.doctorCommand);
program
    .command('override <action>')
    .description('Manage team overrides (create, list, remove, check-expiry)')
    .argument('[skill]', 'Skill name to override')
    .option('--team <name>', 'Team name')
    .action(override_1.overrideCommand);
program.parse();
