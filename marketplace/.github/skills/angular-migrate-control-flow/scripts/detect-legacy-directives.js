#!/usr/bin/env node
// Detection script for /angular-migrate-control-flow — see SKILL.md for usage
// Scans HTML templates for legacy structural directives vs modern control flow.
// Usage: node detect-legacy-directives.js <project-root>
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

function walkHtml(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      results.push(...walkHtml(full));
    } else if (entry.isFile() && /\.html$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relativePath(absPath) {
  return path.relative(projectRoot, absPath).replace(/\\/g, '/');
}

function findLineMatches(content, regex) {
  const hits = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      hits.push(i + 1);
    }
  }
  return hits;
}

// ---------- detection ----------

const legacy = { ngIf: 0, ngFor: 0, ngSwitch: 0 };
const modern = { if: 0, for: 0, switch: 0 };
const files = [];

const ngIfRe = /\*ngIf\s*=/;
const ngForRe = /\*ngFor\s*=/;
const ngSwitchRe = /\[ngSwitch\]\s*=|\*ngSwitchCase\s*=|\*ngSwitchDefault/;
const modernIfRe = /@if\s*\(/;
const modernForRe = /@for\s*\(/;
const modernSwitchRe = /@switch\s*\(/;

for (const filePath of walkHtml(srcDir)) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  const rel = relativePath(filePath);

  const ifLines = findLineMatches(content, ngIfRe);
  const forLines = findLineMatches(content, ngForRe);
  const switchLines = findLineMatches(content, ngSwitchRe);
  const modernIfLines = findLineMatches(content, modernIfRe);
  const modernForLines = findLineMatches(content, modernForRe);
  const modernSwitchLines = findLineMatches(content, modernSwitchRe);

  const hasLegacy = ifLines.length + forLines.length + switchLines.length > 0;
  const hasModern = modernIfLines.length + modernForLines.length + modernSwitchLines.length > 0;

  if (hasLegacy || hasModern) {
    const fileEntry = {
      file: rel,
      legacy: {},
      modern: {},
    };

    if (ifLines.length > 0) fileEntry.legacy.ngIf = ifLines;
    if (forLines.length > 0) fileEntry.legacy.ngFor = forLines;
    if (switchLines.length > 0) fileEntry.legacy.ngSwitch = switchLines;
    if (modernIfLines.length > 0) fileEntry.modern.if = modernIfLines;
    if (modernForLines.length > 0) fileEntry.modern.for = modernForLines;
    if (modernSwitchLines.length > 0) fileEntry.modern.switch = modernSwitchLines;

    files.push(fileEntry);
  }

  legacy.ngIf += ifLines.length;
  legacy.ngFor += forLines.length;
  legacy.ngSwitch += switchLines.length;
  modern.if += modernIfLines.length;
  modern.for += modernForLines.length;
  modern.switch += modernSwitchLines.length;
}

const totalLegacy = legacy.ngIf + legacy.ngFor + legacy.ngSwitch;
const totalModern = modern.if + modern.for + modern.switch;

const result = {
  legacy,
  modern,
  totalLegacy,
  totalModern,
  migrationProgress: totalLegacy + totalModern > 0
    ? `${Math.round((totalModern / (totalLegacy + totalModern)) * 100)}%`
    : 'N/A',
  filesWithLegacy: files.filter(f => Object.keys(f.legacy).length > 0).length,
  filesAlreadyMigrated: files.filter(f => Object.keys(f.legacy).length === 0 && Object.keys(f.modern).length > 0).length,
  files,
};

console.log(JSON.stringify(result, null, 2));
