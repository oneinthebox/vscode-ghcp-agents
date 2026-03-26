#!/usr/bin/env node
// Detection script for /angular-migrate-standalone — see SKILL.md for usage
// Finds all NgModules and classifies migration complexity.
// Usage: node detect-ngmodules.js <project-root>
// Output: JSON to stdout

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';

const srcDir = path.resolve(projectRoot, 'src');
if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

// ---------- helpers ----------

function walkTs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      results.push(...walkTs(full));
    } else if (entry.isFile() && /\.module\.ts$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relativePath(absPath) {
  return path.relative(projectRoot, absPath).replace(/\\/g, '/');
}

/**
 * Extract the array contents for a given property from an @NgModule decorator.
 * Returns the number of items found (comma-separated entries).
 */
function countArrayProp(content, propName) {
  // Match property: [ ... ] allowing multiline
  const re = new RegExp(propName + '\\s*:\\s*\\[([^\\]]*?)\\]', 's');
  const match = content.match(re);
  if (!match) return 0;
  const inner = match[1].trim();
  if (!inner) return 0;
  // Split by commas, filter blanks
  return inner.split(',').map(s => s.trim()).filter(Boolean).length;
}

/**
 * Extract the class name from the NgModule-decorated class.
 */
function extractClassName(content) {
  const match = content.match(/@NgModule\s*\([^)]*\)\s*export\s+class\s+(\w+)/s);
  return match ? match[1] : 'Unknown';
}

function classifyComplexity(declarationCount) {
  if (declarationCount <= 3) return 'simple';
  if (declarationCount <= 10) return 'medium';
  return 'complex';
}

// ---------- detection ----------

const modules = [];
let totalDeclarations = 0;

for (const filePath of walkTs(srcDir)) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  // Must have @NgModule decorator
  if (!/@NgModule\s*\(/.test(content)) continue;

  const rel = relativePath(filePath);
  const name = extractClassName(content);
  const declarations = countArrayProp(content, 'declarations');
  const imports = countArrayProp(content, 'imports');
  const exports = countArrayProp(content, 'exports');
  const providers = countArrayProp(content, 'providers');
  const complexity = classifyComplexity(declarations);

  totalDeclarations += declarations;

  modules.push({
    file: rel,
    name,
    declarations,
    imports,
    exports,
    providers,
    complexity,
  });
}

// Sort by complexity descending for migration planning
const complexityOrder = { complex: 0, medium: 1, simple: 2 };
modules.sort((a, b) => complexityOrder[a.complexity] - complexityOrder[b.complexity]);

const result = {
  modules,
  totalModules: modules.length,
  componentsInModules: totalDeclarations,
  byComplexity: {
    simple: modules.filter(m => m.complexity === 'simple').length,
    medium: modules.filter(m => m.complexity === 'medium').length,
    complex: modules.filter(m => m.complexity === 'complex').length,
  },
};

console.log(JSON.stringify(result, null, 2));
