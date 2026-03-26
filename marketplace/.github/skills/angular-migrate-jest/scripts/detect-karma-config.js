#!/usr/bin/env node
// Detection script for /angular-migrate-jest — see SKILL.md for usage
// Detects Karma/Jasmine setup and scopes the migration effort.
// Usage: node detect-karma-config.js <project-root>
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
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
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

// ---------- karma config detection ----------

const karmaConfPath = path.resolve(projectRoot, 'karma.conf.js');
const karmaConfigFound = fs.existsSync(karmaConfPath);

let karmaConfig = {};
if (karmaConfigFound) {
  try {
    const karmaContent = fs.readFileSync(karmaConfPath, 'utf8');
    karmaConfig = {
      file: 'karma.conf.js',
      hasCoverageReporter: /coverageReporter|karma-coverage/.test(karmaContent),
      hasChromeLauncher: /ChromeHeadless|karma-chrome-launcher/.test(karmaContent),
      hasJasmineHtmlReporter: /karma-jasmine-html-reporter/.test(karmaContent),
    };
  } catch {
    karmaConfig = { file: 'karma.conf.js', parseError: true };
  }
}

// Check for src/test.ts (Karma bootstrap)
const testTsPath = path.resolve(projectRoot, 'src', 'test.ts');
const testTsFound = fs.existsSync(testTsPath);

// ---------- spec file scanning ----------

const srcDir = path.resolve(projectRoot, 'src');
const specFiles = walkFiles(srcDir, /\.spec\.ts$/);

// ---------- Jasmine-specific API detection ----------

const jasmineApis = {
  createSpy: 0,
  SpyObj: 0,
  clock: 0,
  focused: 0,       // fdescribe, fit
  customMatchers: 0, // jasmine.addMatchers
};

const filesWithJasmineApis = [];

for (const specPath of specFiles) {
  let content;
  try {
    content = fs.readFileSync(specPath, 'utf8');
  } catch {
    continue;
  }

  const createSpyCount = countPattern(content, /jasmine\.createSpy\s*\(/g);
  const spyObjCount = countPattern(content, /jasmine\.createSpyObj\s*\(/g);
  const clockCount = countPattern(content, /jasmine\.clock\s*\(\s*\)/g);
  const focusedCount = countPattern(content, /\b(fdescribe|fit)\s*\(/g);
  const customMatcherCount = countPattern(content, /jasmine\.addMatchers\s*\(/g);

  jasmineApis.createSpy += createSpyCount;
  jasmineApis.SpyObj += spyObjCount;
  jasmineApis.clock += clockCount;
  jasmineApis.focused += focusedCount;
  jasmineApis.customMatchers += customMatcherCount;

  const total = createSpyCount + spyObjCount + clockCount + focusedCount + customMatcherCount;
  if (total > 0) {
    filesWithJasmineApis.push({
      file: relativePath(specPath),
      createSpy: createSpyCount,
      SpyObj: spyObjCount,
      clock: clockCount,
      focused: focusedCount,
      customMatchers: customMatcherCount,
    });
  }
}

// ---------- package.json Karma deps ----------

let karmaDeps = [];
try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  karmaDeps = Object.keys(allDeps).filter(name => /^karma/.test(name));
} catch {
  // package.json not found or not parseable
}

const result = {
  karmaConfigFound,
  karmaConfig,
  testTsFound,
  specFileCount: specFiles.length,
  jasmineApis,
  filesWithJasmineApis,
  karmaDependencies: karmaDeps,
  migrationScope: {
    configFiles: (karmaConfigFound ? 1 : 0) + (testTsFound ? 1 : 0),
    specFilesToConvert: filesWithJasmineApis.length,
    specFilesClean: specFiles.length - filesWithJasmineApis.length,
    totalJasmineApiUsages:
      jasmineApis.createSpy + jasmineApis.SpyObj + jasmineApis.clock +
      jasmineApis.focused + jasmineApis.customMatchers,
  },
};

console.log(JSON.stringify(result, null, 2));
