#!/usr/bin/env node
'use strict';

/**
 * setup-colima.js
 *
 * Detects the current OS and installs/starts the Docker runtime.
 * - macOS: installs Colima + Docker CLI + docker-compose via Homebrew
 * - Linux: installs docker.io + docker-compose-plugin via apt
 * - Windows/WSL: detects WSL and installs Docker within it
 *
 * Usage:
 *   node setup-colima.js [--cpu 4] [--memory 8] [--disk 60]
 *
 * Output: JSON report to stdout.
 */

const { execSync } = require("child_process");
const os = require("os");

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------

function getArg(name, defaultValue) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

const cpuCount = getArg("cpu", "4");
const memoryGb = getArg("memory", "8");
const diskGb = getArg("disk", "60");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd) {
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout || "").trim(),
      error: (err.stderr || err.message || "").trim(),
    };
  }
}

function commandExists(cmd) {
  const check =
    os.platform() === "win32" ? `where ${cmd} 2>nul` : `command -v ${cmd}`;
  return run(check).success;
}

function getVersion(cmd) {
  const result = run(`${cmd} --version 2>/dev/null || ${cmd} version 2>/dev/null`);
  if (result.success) {
    return result.output.split("\n")[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// macOS setup
// ---------------------------------------------------------------------------

function setupMacOS(report) {
  report.os = "darwin";

  // Check Homebrew
  if (!commandExists("brew")) {
    console.error("Homebrew is not installed. Please install it first:");
    console.error('  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    report.status = "failed";
    report.error = "Homebrew not installed";
    return;
  }

  // Install colima if missing
  if (!commandExists("colima")) {
    console.error("Installing Colima...");
    const result = run("brew install colima");
    if (!result.success) {
      report.status = "failed";
      report.error = `Failed to install Colima: ${result.error}`;
      return;
    }
  }

  // Install docker CLI if missing
  if (!commandExists("docker")) {
    console.error("Installing Docker CLI...");
    run("brew install docker");
  }

  // Install docker-compose if missing
  if (!commandExists("docker-compose") && run("docker compose version").success === false) {
    console.error("Installing docker-compose...");
    run("brew install docker-compose");
  }

  // Check if Colima is already running
  const colimaStatus = run("colima status 2>&1");
  if (colimaStatus.success && colimaStatus.output.includes("Running")) {
    console.error("Colima is already running.");
  } else {
    console.error(`Starting Colima with --cpu ${cpuCount} --memory ${memoryGb} --disk ${diskGb}...`);
    const startResult = run(
      `colima start --cpu ${cpuCount} --memory ${memoryGb} --disk ${diskGb}`
    );
    if (!startResult.success) {
      report.status = "failed";
      report.error = `Failed to start Colima: ${startResult.error}`;
      return;
    }
  }

  report.status = "running";
}

// ---------------------------------------------------------------------------
// Linux setup
// ---------------------------------------------------------------------------

function setupLinux(report) {
  report.os = "linux";

  // Check if Docker is already installed
  if (!commandExists("docker")) {
    console.error("Installing docker.io and docker-compose-plugin...");
    const install = run(
      "sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin"
    );
    if (!install.success) {
      report.status = "failed";
      report.error = `Failed to install Docker: ${install.error}`;
      return;
    }
  }

  // Start Docker daemon if not running
  const infoResult = run("docker info");
  if (!infoResult.success) {
    console.error("Starting Docker daemon...");
    run("sudo systemctl start docker");
    run("sudo systemctl enable docker");

    // Verify it started
    const retryInfo = run("docker info");
    if (!retryInfo.success) {
      report.status = "failed";
      report.error = "Docker daemon failed to start";
      return;
    }
  }

  // Add user to docker group if needed
  const groups = run("groups").output || "";
  if (!groups.includes("docker")) {
    console.error("Adding current user to the docker group...");
    run("sudo usermod -aG docker $USER");
    console.error("Note: You may need to log out and back in for group changes to take effect.");
  }

  report.status = "running";
}

// ---------------------------------------------------------------------------
// Windows / WSL setup
// ---------------------------------------------------------------------------

function setupWindows(report) {
  report.os = "win32";

  // Check if we are inside WSL
  const unameResult = run("uname -r 2>/dev/null");
  const isWSL =
    unameResult.success &&
    (unameResult.output.includes("microsoft") ||
      unameResult.output.includes("WSL"));

  if (isWSL) {
    console.error("Detected WSL environment. Installing Docker inside WSL...");
    setupLinux(report);
    report.os = "win32-wsl";
    return;
  }

  // Native Windows — suggest using winget or Docker Desktop
  console.error("Native Windows detected.");
  console.error("Recommended: Install Docker CLI via winget:");
  console.error("  winget install Docker.DockerCLI");
  console.error("Or install Docker Desktop for full GUI support.");

  if (commandExists("docker")) {
    const infoResult = run("docker info");
    report.status = infoResult.success ? "running" : "installed-not-running";
  } else {
    report.status = "not-installed";
    report.error = "Docker not found. Install via winget or Docker Desktop.";
  }
}

// ---------------------------------------------------------------------------
// Gather version info
// ---------------------------------------------------------------------------

function gatherVersions(report) {
  const dockerVersion = getVersion("docker");
  const composeResult = run("docker compose version 2>/dev/null");
  const colimaVersion = getVersion("colima");

  report.dockerVersion = dockerVersion;
  report.composeVersion = composeResult.success
    ? composeResult.output.split("\n")[0]
    : null;
  report.colimaVersion = colimaVersion;
}

// ---------------------------------------------------------------------------
// Verify Docker works
// ---------------------------------------------------------------------------

function verifyDocker(report) {
  const infoResult = run("docker info");
  if (infoResult.success) {
    report.dockerDaemon = "reachable";
  } else {
    report.dockerDaemon = "unreachable";
    if (report.status === "running") {
      report.status = "degraded";
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const report = {
    os: null,
    dockerVersion: null,
    colimaVersion: null,
    composeVersion: null,
    dockerDaemon: null,
    status: null,
    error: null,
    config: {
      cpu: parseInt(cpuCount, 10),
      memory: parseInt(memoryGb, 10),
      disk: parseInt(diskGb, 10),
    },
  };

  const platform = os.platform();

  console.error(`Detected platform: ${platform}\n`);

  switch (platform) {
    case "darwin":
      setupMacOS(report);
      break;
    case "linux":
      setupLinux(report);
      break;
    case "win32":
      setupWindows(report);
      break;
    default:
      report.os = platform;
      report.status = "unsupported";
      report.error = `Unsupported platform: ${platform}`;
  }

  gatherVersions(report);
  verifyDocker(report);

  // Clean up null error field
  if (report.error === null) {
    delete report.error;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.status === "running" ? 0 : 1);
}

main();
