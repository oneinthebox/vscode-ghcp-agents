#!/usr/bin/env node
'use strict';

/**
 * setup-env.js
 *
 * Detects the current OS and shell, checks for required development tools,
 * reads project version files (.node-version, .nvmrc, .python-version),
 * and outputs install commands for any missing tools.
 *
 * Usage:
 *   node setup-env.js [--project-dir /path/to/project]
 *
 * Output: JSON report to stdout.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------

function getProjectDir() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf("--project-dir");
  if (dirIdx !== -1 && args[dirIdx + 1]) {
    return path.resolve(args[dirIdx + 1]);
  }
  return process.cwd();
}

const projectDir = getProjectDir();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd) {
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 30000,
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

function fileExists(name) {
  return fs.existsSync(path.join(projectDir, name));
}

function readProjectFile(name) {
  const filePath = path.join(projectDir, name);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf-8").trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detect OS and shell
// ---------------------------------------------------------------------------

function detectOS() {
  const platform = os.platform();
  switch (platform) {
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    case "win32":
      return "Windows";
    default:
      return platform;
  }
}

function detectShell() {
  // Check SHELL env var first
  const shellEnv = process.env.SHELL || "";
  if (shellEnv.includes("zsh")) return "zsh";
  if (shellEnv.includes("bash")) return "bash";
  if (shellEnv.includes("fish")) return "fish";

  // Windows PowerShell
  if (os.platform() === "win32") return "powershell";

  // Fallback
  const result = run("echo $0 2>/dev/null");
  if (result.success) {
    const shell = result.output.replace("-", "");
    if (["zsh", "bash", "fish"].includes(shell)) return shell;
  }

  return "unknown";
}

function getProfileFile(shell) {
  const home = os.homedir();
  switch (shell) {
    case "zsh":
      return path.join(home, ".zshrc");
    case "bash":
      return path.join(home, ".bashrc");
    case "fish":
      return path.join(home, ".config", "fish", "config.fish");
    case "powershell":
      return "$PROFILE";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tool checks
// ---------------------------------------------------------------------------

function getInstallCmd(toolName, osName) {
  const commands = {
    node: {
      macOS: "brew install fnm && fnm install --lts",
      Linux: "curl -fsSL https://fnm.vercel.app/install | bash && fnm install --lts",
      Windows: "winget install Schniz.fnm",
    },
    git: {
      macOS: "brew install git",
      Linux: "sudo apt-get install -y git",
      Windows: "winget install Git.Git",
    },
    jq: {
      macOS: "brew install jq",
      Linux: "sudo apt-get install -y jq",
      Windows: "winget install jqlang.jq",
    },
    python3: {
      macOS: "brew install python3",
      Linux: "sudo apt-get install -y python3",
      Windows: "winget install Python.Python.3.12",
    },
    docker: {
      macOS: "brew install colima docker docker-compose && colima start",
      Linux: "sudo apt-get install -y docker.io docker-compose-plugin",
      Windows: "winget install Docker.DockerCLI",
    },
    fnm: {
      macOS: "brew install fnm",
      Linux: "curl -fsSL https://fnm.vercel.app/install | bash",
      Windows: "winget install Schniz.fnm",
    },
  };

  const toolCmds = commands[toolName];
  if (!toolCmds) return null;
  return toolCmds[osName] || null;
}

function checkTool(toolName, versionCmd) {
  const result = run(versionCmd);
  if (result.success && result.output) {
    // Extract version number from output
    const versionMatch = result.output.match(
      /(\d+\.\d+[\.\d]*)/
    );
    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : result.output.split("\n")[0],
    };
  }
  return { installed: false, version: null };
}

function checkAllTools(osName) {
  const tools = [
    { name: "node", versionCmd: "node --version 2>/dev/null" },
    { name: "git", versionCmd: "git --version 2>/dev/null" },
    { name: "jq", versionCmd: "jq --version 2>/dev/null" },
    { name: "python3", versionCmd: "python3 --version 2>/dev/null" },
    { name: "docker", versionCmd: "docker --version 2>/dev/null" },
    { name: "fnm", versionCmd: "fnm --version 2>/dev/null" },
  ];

  return tools.map((tool) => {
    const status = checkTool(tool.name, tool.versionCmd);
    return {
      name: tool.name,
      installed: status.installed,
      version: status.version,
      installCmd: status.installed ? null : getInstallCmd(tool.name, osName),
    };
  });
}

// ---------------------------------------------------------------------------
// Node.js version check
// ---------------------------------------------------------------------------

function getRequiredNodeVersion() {
  // Check .node-version first, then .nvmrc
  const nodeVersion = readProjectFile(".node-version");
  if (nodeVersion) return { source: ".node-version", version: nodeVersion };

  const nvmrc = readProjectFile(".nvmrc");
  if (nvmrc) return { source: ".nvmrc", version: nvmrc };

  // Check engines.node in package.json
  if (fileExists("package.json")) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectDir, "package.json"), "utf-8")
      );
      if (pkg.engines && pkg.engines.node) {
        return { source: "package.json engines.node", version: pkg.engines.node };
      }
    } catch {
      // ignore parse errors
    }
  }

  return null;
}

function checkNodeVersion(required) {
  if (!required) return { required: null, current: null, match: null };

  const currentResult = run("node --version 2>/dev/null");
  const current = currentResult.success
    ? currentResult.output.replace("v", "")
    : null;

  let match = null;
  if (current && required.version) {
    // Simple check: does the current version start with the required version?
    match = current.startsWith(required.version.replace("v", ""));
  }

  return {
    required: required.version,
    source: required.source,
    current,
    match,
  };
}

// ---------------------------------------------------------------------------
// Python version check
// ---------------------------------------------------------------------------

function getRequiredPythonVersion() {
  const pythonVersion = readProjectFile(".python-version");
  if (pythonVersion) return { source: ".python-version", version: pythonVersion };

  return null;
}

function checkPythonVersion(required) {
  if (!required) return { required: null, current: null, match: null };

  const currentResult = run("python3 --version 2>/dev/null");
  const current = currentResult.success
    ? currentResult.output.replace("Python ", "")
    : null;

  let match = null;
  if (current && required.version) {
    match = current.startsWith(required.version);
  }

  return {
    required: required.version,
    source: required.source,
    current,
    match,
  };
}

// ---------------------------------------------------------------------------
// Shell profile check
// ---------------------------------------------------------------------------

function checkShellProfile(shell, profileFile) {
  if (!profileFile || profileFile === "$PROFILE") {
    return { fnmAutoSwitch: null, profileExists: null };
  }

  const exists = fs.existsSync(profileFile);
  if (!exists) {
    return { fnmAutoSwitch: false, profileExists: false };
  }

  try {
    const content = fs.readFileSync(profileFile, "utf-8");
    const hasFnmAutoSwitch =
      content.includes("fnm env") && content.includes("use-on-cd");
    return { fnmAutoSwitch: hasFnmAutoSwitch, profileExists: true };
  } catch {
    return { fnmAutoSwitch: null, profileExists: exists };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const osName = detectOS();
  const shell = detectShell();
  const profileFile = getProfileFile(shell);

  console.error(`Platform: ${osName}`);
  console.error(`Shell: ${shell}`);
  console.error(`Profile: ${profileFile}`);
  console.error(`Project: ${projectDir}\n`);

  // Check tools
  const tools = checkAllTools(osName);
  const missingTools = tools.filter((t) => !t.installed);
  if (missingTools.length > 0) {
    console.error("Missing tools:");
    missingTools.forEach((t) => {
      console.error(`  ${t.name}: ${t.installCmd || "no install command available"}`);
    });
    console.error("");
  } else {
    console.error("All required tools are installed.\n");
  }

  // Check Node version
  const requiredNode = getRequiredNodeVersion();
  const nodeCheck = checkNodeVersion(requiredNode);
  if (nodeCheck.required) {
    console.error(
      `Node.js: required=${nodeCheck.required} (from ${nodeCheck.source}), current=${nodeCheck.current || "not installed"}, match=${nodeCheck.match}`
    );
  }

  // Check Python version
  const requiredPython = getRequiredPythonVersion();
  const pythonCheck = checkPythonVersion(requiredPython);
  if (pythonCheck.required) {
    console.error(
      `Python: required=${pythonCheck.required} (from ${pythonCheck.source}), current=${pythonCheck.current || "not installed"}, match=${pythonCheck.match}`
    );
  }

  // Check shell profile
  const profileCheck = checkShellProfile(shell, profileFile);

  // Build report
  const report = {
    os: osName,
    shell,
    profileFile,
    tools,
    nodeVersion: nodeCheck,
    pythonVersion: pythonCheck,
    shellProfile: profileCheck,
  };

  console.log(JSON.stringify(report, null, 2));

  // Exit with error if any tools are missing
  const allInstalled = tools.every((t) => t.installed);
  process.exit(allInstalled ? 0 : 1);
}

main();
