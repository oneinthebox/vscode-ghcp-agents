/**
 * ORCH CLI — UI Utilities
 *
 * Consistent spinners, status indicators, and pauses across all commands.
 * Uses ora for spinners, chalk for colors.
 */

import ora = require('ora');
import chalk = require('chalk');

// Standard pause durations (ms) — gives the user time to read
const PAUSE = {
  brief: 200,    // between rapid-fire items
  standard: 400, // between steps
  section: 600,  // between sections
  dramatic: 800, // before final result
};

/**
 * Sleep for a duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run an async task with a spinner. Shows ✓ on success, ✗ on failure.
 */
export async function withSpinner<T>(
  text: string,
  task: () => Promise<T>,
  options?: { successText?: string; failText?: string }
): Promise<T> {
  const spinner = ora({ text, color: 'cyan' }).start();
  try {
    const result = await task();
    spinner.succeed(chalk.white(options?.successText || text));
    await sleep(PAUSE.brief);
    return result;
  } catch (err: any) {
    spinner.fail(chalk.red(options?.failText || `${text} — ${err.message}`));
    throw err;
  }
}

/**
 * Run a synchronous task with a spinner (simulates async with brief pause).
 */
export async function withSpinnerSync<T>(
  text: string,
  task: () => T,
  options?: { successText?: string; failText?: string; pauseMs?: number }
): Promise<T> {
  const spinner = ora({ text, color: 'cyan' }).start();
  await sleep(options?.pauseMs ?? PAUSE.standard);
  try {
    const result = task();
    spinner.succeed(chalk.white(options?.successText || text));
    await sleep(PAUSE.brief);
    return result;
  } catch (err: any) {
    spinner.fail(chalk.red(options?.failText || `${text} — ${err.message}`));
    throw err;
  }
}

/**
 * Show a success line (✓)
 */
export function success(text: string): void {
  console.log(`  ${chalk.green('✓')} ${chalk.white(text)}`);
}

/**
 * Show a failure line (✗)
 */
export function fail(text: string): void {
  console.log(`  ${chalk.red('✗')} ${chalk.red(text)}`);
}

/**
 * Show a warning line (⚠)
 */
export function warn(text: string): void {
  console.log(`  ${chalk.yellow('⚠')} ${chalk.yellow(text)}`);
}

/**
 * Show an info line (ℹ)
 */
export function info(text: string): void {
  console.log(`  ${chalk.blue('ℹ')} ${chalk.blueBright(text)}`);
}

/**
 * Print a section header
 */
export async function section(title: string): Promise<void> {
  await sleep(PAUSE.section);
  console.log('');
  console.log(chalk.bold.white(title));
}

/**
 * Print a divider
 */
export function divider(): void {
  console.log(chalk.dim('─'.repeat(50)));
}

/**
 * Print the ORCH banner
 */
export function banner(command: string): void {
  console.log('');
  console.log(chalk.bold.cyan('ORCH') + ' ' + chalk.bold.white(command));
  console.log('');
}

/**
 * Print a key-value pair
 */
export function kv(key: string, value: string): void {
  console.log(`  ${chalk.dim(key + ':')} ${chalk.cyan(value)}`);
}

/**
 * Print a table row with status
 */
export function statusRow(name: string, status: 'ok' | 'warn' | 'fail' | 'info', detail?: string): void {
  const icon = {
    ok: chalk.green('✓'),
    warn: chalk.yellow('⚠'),
    fail: chalk.red('✗'),
    info: chalk.blue('ℹ'),
  }[status];

  const nameColor = {
    ok: chalk.white(name),
    warn: chalk.yellow(name),
    fail: chalk.red(name),
    info: chalk.white(name),
  }[status];

  console.log(`  ${icon} ${nameColor}${detail ? chalk.dim(` — ${detail}`) : ''}`);
}

/**
 * Print a count badge
 */
export function badge(label: string, count: number, color: 'green' | 'yellow' | 'red' | 'cyan' = 'cyan'): void {
  const colorFn = { green: chalk.green, yellow: chalk.yellow, red: chalk.red, cyan: chalk.cyan }[color];
  console.log(`  ${colorFn.bold(`${count}`)} ${chalk.dim(label)}`);
}

/**
 * Print a summary with counts
 */
export async function summary(stats: { ok: number; warn: number; fail: number }): Promise<void> {
  await sleep(PAUSE.dramatic);
  console.log('');
  divider();

  if (stats.fail === 0 && stats.warn === 0) {
    console.log(chalk.green.bold('✓ All checks passed'));
  } else {
    if (stats.ok > 0) console.log(chalk.green(`✓ ${stats.ok} passed`));
    if (stats.fail > 0) console.log(chalk.red.bold(`✗ ${stats.fail} issue(s) — fix required`));
    if (stats.warn > 0) console.log(chalk.yellow(`⚠ ${stats.warn} warning(s) — review recommended`));
  }
  console.log('');
}
