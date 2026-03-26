'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Write a progress message to stderr so it does not pollute JSON stdout.
 */
function progress(message) {
  process.stderr.write(`[progress] ${message}\n`);
}

/**
 * Write structured JSON output to stdout with 2-space indentation.
 */
function result(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/**
 * Write an error message to stderr and exit with the given code.
 */
function error(message, exitCode) {
  process.stderr.write(`[error] ${message}\n`);
  process.exit(exitCode || 1);
}

/**
 * Read and parse a JSON file. Returns null if the file cannot be read or parsed.
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Resolve the project root directory from a provided path argument or fall back to cwd.
 */
function resolveRoot(providedPath) {
  if (providedPath) {
    const resolved = path.resolve(providedPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
    error(`Provided path is not a valid directory: ${providedPath}`);
  }
  return process.cwd();
}

module.exports = {
  progress,
  result,
  error,
  readJsonFile,
  resolveRoot
};
