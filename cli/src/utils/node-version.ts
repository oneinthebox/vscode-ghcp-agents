/**
 * ORCH CLI — Node Version Management
 *
 * OS-aware Node version detection and switching.
 * - macOS/Linux: nvm, fnm, or volta
 * - Windows: fnm (via winget) or volta
 *
 * Does NOT install Node versions automatically — provides instructions.
 */

import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export type Platform = 'macos' | 'linux' | 'windows';
export type NodeManager = 'nvm' | 'fnm' | 'volta' | 'none';

export interface NodeVersionInfo {
  current: string;            // e.g., "22.0.0"
  required: string;           // e.g., "^18.19 || ^20.11 || ^22"
  compatible: boolean;
  platform: Platform;
  manager: NodeManager;
  switchCommand: string | null;  // command to switch to correct version
  installCommand: string | null; // command to install the manager if missing
}

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  switch (os.platform()) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

/**
 * Detect which Node version manager is available
 */
export function detectNodeManager(): NodeManager {
  // Check fnm first (cross-platform, recommended for Windows)
  if (commandExists('fnm')) return 'fnm';

  // Check volta (cross-platform, auto-switches)
  if (commandExists('volta')) return 'volta';

  // Check nvm (macOS/Linux only)
  if (process.env.NVM_DIR || commandExists('nvm')) return 'nvm';

  return 'none';
}

/**
 * Get the current Node version
 */
export function getCurrentNodeVersion(): string {
  return process.version.replace('v', '');
}

/**
 * Check if current Node version satisfies the requirement
 */
export function isNodeCompatible(required: string): boolean {
  const current = getCurrentNodeVersion();
  const major = parseInt(current.split('.')[0]);

  // Parse requirement like "^18.19 || ^20.11 || ^22"
  const ranges = required.split('||').map(r => r.trim());

  for (const range of ranges) {
    const match = range.match(/\^?(\d+)/);
    if (match) {
      const requiredMajor = parseInt(match[1]);
      if (major === requiredMajor) return true;
    }
  }

  return false;
}

/**
 * Get the recommended Node version for an Angular version
 */
export function getRecommendedNodeVersion(angularMajor: number): string {
  const recommendations: Record<number, string> = {
    16: '18',
    17: '20',
    18: '20',
    19: '22',
    20: '22',
    21: '22',
  };
  return recommendations[angularMajor] || '20';
}

/**
 * Get the full Node version info with switch/install instructions
 */
export function getNodeVersionInfo(angularVersion: string | undefined, nodeRequirement: string): NodeVersionInfo {
  const platform = detectPlatform();
  const manager = detectNodeManager();
  const current = getCurrentNodeVersion();
  const compatible = isNodeCompatible(nodeRequirement);

  const angularMajor = angularVersion ? parseInt(angularVersion.match(/(\d+)/)?.[1] || '19') : 19;
  const recommended = getRecommendedNodeVersion(angularMajor);

  let switchCommand: string | null = null;
  let installCommand: string | null = null;

  if (!compatible) {
    switch (manager) {
      case 'fnm':
        switchCommand = `fnm install ${recommended} && fnm use ${recommended}`;
        break;
      case 'nvm':
        switchCommand = `nvm install ${recommended} && nvm use ${recommended}`;
        break;
      case 'volta':
        switchCommand = `volta install node@${recommended}`;
        break;
      case 'none':
        installCommand = getManagerInstallCommand(platform);
        switchCommand = null;
        break;
    }
  }

  return {
    current,
    required: nodeRequirement,
    compatible,
    platform,
    manager,
    switchCommand,
    installCommand,
  };
}

/**
 * Get install instructions for a Node version manager based on OS
 */
function getManagerInstallCommand(platform: Platform): string {
  switch (platform) {
    case 'windows':
      return 'winget install Schniz.fnm  (then restart terminal)';
    case 'macos':
      return 'brew install fnm  (or: curl -fsSL https://fnm.vercel.app/install | bash)';
    case 'linux':
      return 'curl -fsSL https://fnm.vercel.app/install | bash';
  }
}

/**
 * Write .nvmrc / .node-version file for the project
 */
export function writeNodeVersionFile(projectPath: string, version: string): void {
  // Write .nvmrc (works with nvm + fnm)
  fs.writeFileSync(path.join(projectPath, '.nvmrc'), version + '\n');

  // Write .node-version (works with fnm + volta + asdf)
  fs.writeFileSync(path.join(projectPath, '.node-version'), version + '\n');
}

/**
 * Get human-readable status for display
 */
export function getNodeStatusMessage(info: NodeVersionInfo): {
  status: 'ok' | 'warn' | 'fail';
  message: string;
  action: string | null;
} {
  if (info.compatible) {
    return {
      status: 'ok',
      message: `Node ${info.current} (${info.manager !== 'none' ? info.manager : 'system'})`,
      action: null,
    };
  }

  if (info.manager === 'none') {
    return {
      status: 'fail',
      message: `Node ${info.current} — incompatible (requires ${info.required})`,
      action: `Install a Node version manager:\n    ${info.installCommand}\n    Then: fnm install ${getRecommendedNodeVersion(19)} && fnm use ${getRecommendedNodeVersion(19)}`,
    };
  }

  return {
    status: 'fail',
    message: `Node ${info.current} — incompatible (requires ${info.required})`,
    action: `Run: ${info.switchCommand}`,
  };
}

// ── Helpers ──

function commandExists(cmd: string): boolean {
  try {
    const check = os.platform() === 'win32'
      ? `where ${cmd}`
      : `which ${cmd}`;
    execSync(check, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
