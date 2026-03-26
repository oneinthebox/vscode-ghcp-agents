#!/usr/bin/env node
// Detection script for /angular-migrate-playwright — see SKILL.md for usage
// Scans cypress/ directory and inventories specs, commands, and custom commands.
// Usage: node detect-cypress-specs.js <project-root>
// Output: JSON to stdout

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';

// ---------- helpers ----------

function walkFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...walkFiles(full, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relativePath(absPath) {
  return path.relative(projectRoot, absPath).replace(/\\/g, '/');
}

function countPattern(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

// ---------- Cypress config detection ----------

const cypressDir = path.resolve(projectRoot, 'cypress');
const cypressDirExists = fs.existsSync(cypressDir);

let cypressConfigFile = null;
for (const name of ['cypress.config.ts', 'cypress.config.js', 'cypress.json']) {
  if (fs.existsSync(path.resolve(projectRoot, name))) {
    cypressConfigFile = name;
    break;
  }
}

// ---------- spec file scanning ----------

const specPatterns = /\.(cy|spec|e2e)\.(ts|js)$/;
const specFiles = cypressDirExists ? walkFiles(cypressDir, specPatterns) : [];

// Also check for e2e dir at project root
const e2eDir = path.resolve(projectRoot, 'e2e');
if (fs.existsSync(e2eDir)) {
  specFiles.push(...walkFiles(e2eDir, specPatterns));
}

// ---------- cy.* command usage ----------

const commandCounters = {
  visit: 0,
  get: 0,
  contains: 0,
  click: 0,
  type: 0,
  intercept: 0,
  wait: 0,
  fixture: 0,
  request: 0,
  should: 0,
  find: 0,
  within: 0,
  url: 0,
  reload: 0,
  viewport: 0,
  clearCookies: 0,
  clearLocalStorage: 0,
  scrollTo: 0,
};

const fileDetails = [];

for (const specPath of specFiles) {
  let content;
  try {
    content = fs.readFileSync(specPath, 'utf8');
  } catch {
    continue;
  }

  const fileCounts = {};
  for (const cmd of Object.keys(commandCounters)) {
    const re = new RegExp(`cy\\.${cmd}\\s*\\(`, 'g');
    const count = countPattern(content, re);
    if (count > 0) {
      fileCounts[cmd] = count;
      commandCounters[cmd] += count;
    }
  }

  fileDetails.push({
    file: relativePath(specPath),
    commands: fileCounts,
    totalCommands: Object.values(fileCounts).reduce((a, b) => a + b, 0),
  });
}

// ---------- custom commands ----------

const customCommands = [];
const supportDir = path.resolve(cypressDir, 'support');
if (fs.existsSync(supportDir)) {
  for (const filePath of walkFiles(supportDir, /\.(ts|js)$/)) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    // Match Cypress.Commands.add('commandName', ...)
    const re = /Cypress\.Commands\.add\s*\(\s*['"](\w+)['"]/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      customCommands.push({
        name: match[1],
        file: relativePath(filePath),
      });
    }
  }
}

// ---------- result ----------

const result = {
  cypressConfigFile,
  cypressDirExists,
  specCount: specFiles.length,
  commands: commandCounters,
  totalCommandUsages: Object.values(commandCounters).reduce((a, b) => a + b, 0),
  customCommands,
  files: fileDetails,
  migrationScope: {
    specFilesToConvert: specFiles.length,
    customCommandsToConvert: customCommands.length,
    hasNetworkMocking: commandCounters.intercept > 0,
    hasFixtures: commandCounters.fixture > 0,
    hasWaits: commandCounters.wait > 0,
  },
};

console.log(JSON.stringify(result, null, 2));
