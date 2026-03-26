#!/usr/bin/env node
// Detection script for /angular-migrate-signals — see SKILL.md for usage
// Scans an Angular project for patterns that should be migrated to signals.
// Usage: node detect-signal-candidates.js <project-root>
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
    } else if (entry.isFile() && /\.ts$/.test(entry.name) && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

function relativePath(absPath) {
  return path.relative(projectRoot, absPath).replace(/\\/g, '/');
}

function findMatches(content, regex) {
  const hits = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      hits.push(i + 1); // 1-based line number
    }
  }
  return hits;
}

// ---------- detection ----------

const inputs = [];
const outputs = [];
const behaviorSubjects = [];
const subscriptions = [];
const destroyPatterns = [];

const inputRe = /@Input\s*\(/;
const outputRe = /@Output\s*\(/;
const behaviorSubjectRe = /new\s+BehaviorSubject\s*[<(]/;
const subscribeRe = /\.subscribe\s*\(/;
const takeUntilRe = /takeUntil\s*\(\s*this\.(destroy|unsubscribe|destroyed)\$?\s*\)/;
const destroySubjectRe = /(private\s+(?:readonly\s+)?(?:destroy|unsubscribe|destroyed)\$?\s*=\s*new\s+Subject|readonly\s+destroy\$\s*=\s*new\s+Subject)/;

const isComponentOrDirective = (content) =>
  /@Component\s*\(/.test(content) || /@Directive\s*\(/.test(content);

for (const filePath of walkTs(srcDir)) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  const rel = relativePath(filePath);

  // @Input() decorators
  const inputLines = findMatches(content, inputRe);
  for (const line of inputLines) {
    inputs.push({ file: rel, line });
  }

  // @Output() + EventEmitter
  const outputLines = findMatches(content, outputRe);
  for (const line of outputLines) {
    outputs.push({ file: rel, line });
  }

  // BehaviorSubject assignments
  const bsLines = findMatches(content, behaviorSubjectRe);
  for (const line of bsLines) {
    behaviorSubjects.push({ file: rel, line });
  }

  // subscribe() calls in components/directives
  if (isComponentOrDirective(content)) {
    const subLines = findMatches(content, subscribeRe);
    for (const line of subLines) {
      subscriptions.push({ file: rel, line });
    }
  }

  // takeUntil/destroy$ patterns
  const takeUntilLines = findMatches(content, takeUntilRe);
  const destroyDeclLines = findMatches(content, destroySubjectRe);
  const allDestroyLines = [...new Set([...takeUntilLines, ...destroyDeclLines])].sort((a, b) => a - b);
  for (const line of allDestroyLines) {
    destroyPatterns.push({ file: rel, line });
  }
}

// ---------- summary ----------

const phase1 = inputs.length + outputs.length; // mechanical: inputs/outputs
const phase2 = behaviorSubjects.length;         // mechanical: state
const phase3 = subscriptions.length;            // semantic: subscriptions
const phase4 = destroyPatterns.length;          // cleanup: destroy patterns

const summary = {
  total: phase1 + phase2 + phase3 + phase4,
  byPhase: {
    'phase1-inputs-outputs': phase1,
    'phase2-state': phase2,
    'phase3-subscriptions': phase3,
    'phase4-cleanup': phase4,
  },
};

const result = {
  inputs,
  outputs,
  behaviorSubjects,
  subscriptions,
  destroyPatterns,
  summary,
};

console.log(JSON.stringify(result, null, 2));
