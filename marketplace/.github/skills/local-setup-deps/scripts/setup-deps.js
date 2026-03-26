#!/usr/bin/env node
'use strict';

/**
 * setup-deps.js
 *
 * Auto-detects project ecosystems (Node.js, Java, Python) and runs
 * dependency installation and verification for each one.
 *
 * Usage:
 *   node setup-deps.js [--project-dir /path/to/project]
 *
 * Output: JSON report to stdout with results for each detected ecosystem.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectDir = getProjectDir();

function getProjectDir() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf("--project-dir");
  if (dirIdx !== -1 && args[dirIdx + 1]) {
    return path.resolve(args[dirIdx + 1]);
  }
  return process.cwd();
}

function fileExists(name) {
  return fs.existsSync(path.join(projectDir, name));
}

function run(cmd, opts = {}) {
  try {
    const output = execSync(cmd, {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: 300000,
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
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

// ---------------------------------------------------------------------------
// Ecosystem detection
// ---------------------------------------------------------------------------

function detectEcosystems() {
  const ecosystems = [];

  // Node.js
  if (fileExists("package.json")) {
    let packageManager = "npm";
    let lockFile = null;

    if (fileExists("pnpm-lock.yaml")) {
      packageManager = "pnpm";
      lockFile = "pnpm-lock.yaml";
    } else if (fileExists("yarn.lock")) {
      packageManager = "yarn";
      lockFile = "yarn.lock";
    } else if (fileExists("package-lock.json")) {
      packageManager = "npm";
      lockFile = "package-lock.json";
    }

    ecosystems.push({
      type: "node",
      packageManager,
      configFile: ".npmrc",
      lockFile,
      manifestFile: "package.json",
    });
  }

  // Java — Maven
  if (fileExists("pom.xml")) {
    ecosystems.push({
      type: "java",
      packageManager: "maven",
      configFile: "~/.m2/settings.xml",
      lockFile: null,
      manifestFile: "pom.xml",
    });
  }

  // Java — Gradle
  if (fileExists("build.gradle") || fileExists("build.gradle.kts")) {
    const manifestFile = fileExists("build.gradle.kts")
      ? "build.gradle.kts"
      : "build.gradle";
    ecosystems.push({
      type: "java",
      packageManager: "gradle",
      configFile: "gradle.properties",
      lockFile: fileExists("gradle.lockfile") ? "gradle.lockfile" : null,
      manifestFile,
    });
  }

  // Python
  if (
    fileExists("pyproject.toml") ||
    fileExists("requirements.txt") ||
    fileExists("Pipfile") ||
    fileExists("setup.py")
  ) {
    let packageManager = "pip";
    let lockFile = null;
    let manifestFile = "requirements.txt";

    if (fileExists("pyproject.toml")) {
      // Determine if it is poetry or uv/generic
      try {
        const content = fs.readFileSync(
          path.join(projectDir, "pyproject.toml"),
          "utf-8"
        );
        if (content.includes("[tool.poetry]")) {
          packageManager = "poetry";
          lockFile = fileExists("poetry.lock") ? "poetry.lock" : null;
        } else {
          packageManager = "uv";
          lockFile = fileExists("uv.lock") ? "uv.lock" : null;
        }
        manifestFile = "pyproject.toml";
      } catch {
        manifestFile = "pyproject.toml";
      }
    } else if (fileExists("Pipfile")) {
      packageManager = "pipenv";
      lockFile = fileExists("Pipfile.lock") ? "Pipfile.lock" : null;
      manifestFile = "Pipfile";
    } else if (fileExists("requirements.txt")) {
      packageManager = "pip";
      lockFile = null;
      manifestFile = "requirements.txt";
    }

    ecosystems.push({
      type: "python",
      packageManager,
      configFile: "pyproject.toml",
      lockFile,
      manifestFile,
    });
  }

  return ecosystems;
}

// ---------------------------------------------------------------------------
// Config file checks
// ---------------------------------------------------------------------------

function checkConfig(ecosystem) {
  if (ecosystem.type === "node") {
    return fileExists(".npmrc");
  }
  if (ecosystem.type === "java" && ecosystem.packageManager === "maven") {
    const homeSettings = path.join(
      process.env.HOME || process.env.USERPROFILE || "~",
      ".m2",
      "settings.xml"
    );
    return fs.existsSync(homeSettings);
  }
  if (ecosystem.type === "java" && ecosystem.packageManager === "gradle") {
    return fileExists("gradle.properties");
  }
  if (ecosystem.type === "python") {
    return fileExists("pyproject.toml");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Install commands
// ---------------------------------------------------------------------------

function getInstallCommand(ecosystem) {
  const pm = ecosystem.packageManager;

  switch (pm) {
    case "npm":
      return ecosystem.lockFile ? "npm ci" : "npm install";
    case "yarn":
      return "yarn install";
    case "pnpm":
      return "pnpm install";
    case "maven":
      return "mvn dependency:resolve -B";
    case "gradle": {
      const wrapper = fileExists("gradlew") ? "./gradlew" : "gradle";
      return `${wrapper} dependencies`;
    }
    case "uv":
      return "uv sync";
    case "poetry":
      return "poetry install";
    case "pipenv":
      return "pipenv install";
    case "pip":
      return "pip install -r requirements.txt";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verify commands
// ---------------------------------------------------------------------------

function getVerifyCommand(ecosystem) {
  const pm = ecosystem.packageManager;

  switch (pm) {
    case "npm":
      return "npm ls --all 2>&1 | tail -20";
    case "yarn":
      return "yarn info 2>&1 | tail -20";
    case "pnpm":
      return "pnpm ls --depth 0 2>&1 | tail -20";
    case "maven":
      return "mvn dependency:tree -B 2>&1 | tail -30";
    case "gradle": {
      const wrapper = fileExists("gradlew") ? "./gradlew" : "gradle";
      return `${wrapper} dependencies 2>&1 | tail -30`;
    }
    case "uv":
      return "uv pip check 2>&1";
    case "poetry":
      return "poetry check 2>&1";
    case "pipenv":
      return "pipenv check 2>&1";
    case "pip":
      return "pip check 2>&1";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Process a single ecosystem
// ---------------------------------------------------------------------------

function processEcosystem(ecosystem) {
  const result = {
    type: ecosystem.type,
    packageManager: ecosystem.packageManager,
    manifestFile: ecosystem.manifestFile,
    configFound: checkConfig(ecosystem),
    lockFileFound: ecosystem.lockFile !== null,
    lockFile: ecosystem.lockFile,
    installResult: null,
    installError: null,
    verifyResult: null,
    verifyError: null,
  };

  // Run install
  const installCmd = getInstallCommand(ecosystem);
  if (installCmd) {
    console.error(`[${ecosystem.type}/${ecosystem.packageManager}] Running: ${installCmd}`);
    const installOut = run(installCmd);
    result.installResult = installOut.success ? "success" : "failed";
    if (!installOut.success) {
      result.installError = installOut.error || installOut.output;
    }
  } else {
    result.installResult = "skipped";
  }

  // Run verification
  const verifyCmd = getVerifyCommand(ecosystem);
  if (verifyCmd) {
    console.error(`[${ecosystem.type}/${ecosystem.packageManager}] Verifying: ${verifyCmd}`);
    const verifyOut = run(verifyCmd);
    result.verifyResult = verifyOut.success ? "no issues" : "issues found";
    if (!verifyOut.success) {
      result.verifyError = verifyOut.error || verifyOut.output;
    }
  } else {
    result.verifyResult = "skipped";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.error(`Scanning project directory: ${projectDir}\n`);

  const ecosystems = detectEcosystems();

  if (ecosystems.length === 0) {
    console.error("No ecosystems detected. Nothing to install.");
    const report = { ecosystems: [] };
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.error(
    `Detected ecosystems: ${ecosystems.map((e) => `${e.type}/${e.packageManager}`).join(", ")}\n`
  );

  const results = ecosystems.map((eco) => processEcosystem(eco));

  const report = { ecosystems: results };
  console.log(JSON.stringify(report, null, 2));

  // Exit with error if any install failed
  const anyFailed = results.some((r) => r.installResult === "failed");
  process.exit(anyFailed ? 1 : 0);
}

main();
