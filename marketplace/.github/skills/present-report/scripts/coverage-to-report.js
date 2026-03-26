#!/usr/bin/env node
'use strict';

/**
 * coverage-to-report.js
 *
 * Converts Istanbul/lcov coverage JSON (coverage-summary.json) into
 * a report-data JSON compatible with render-report.js.
 *
 * Usage:
 *   node coverage-to-report.js coverage-summary.json --output report-data.json
 *   node coverage-to-report.js coverage-summary.json --threshold 80
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) {
  console.log(`Usage: node coverage-to-report.js <coverage-summary.json> [options]
  --output <path>       Output report-data JSON path (default: report-data.json)
  --threshold <number>  Coverage threshold percentage (default: 80)
  --help                Show this help`);
  process.exit(0);
}

const inputPath = args[0];
let outputPath = "report-data.json";
let threshold = 80;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    outputPath = args[++i];
  } else if (args[i] === "--threshold" && args[i + 1]) {
    threshold = parseFloat(args[++i]);
  }
}

// ---------------------------------------------------------------------------
// Load coverage data
// ---------------------------------------------------------------------------
let coverage;
try {
  const raw = fs.readFileSync(inputPath, "utf-8");
  coverage = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to read coverage data: ${err.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse coverage
// ---------------------------------------------------------------------------
const total = coverage.total;
if (!total) {
  console.error('Coverage JSON must have a "total" key. Is this Istanbul/lcov format?');
  process.exit(1);
}

const linePct = total.lines?.pct ?? 0;
const branchPct = total.branches?.pct ?? 0;
const fnPct = total.functions?.pct ?? 0;
const stmtPct = total.statements?.pct ?? 0;

// Overall status based on threshold
function statusFromPct(pct) {
  if (pct >= threshold) return "PASS";
  if (pct >= threshold - 15) return "WARN";
  return "FAIL";
}

const overallPct = linePct; // lines as primary indicator
const overallStatus = statusFromPct(overallPct);

// Find files below threshold
const fileEntries = Object.entries(coverage).filter(([key]) => key !== "total");
const belowThreshold = [];
const fileBreakdown = [];

fileEntries.forEach(([filePath, data]) => {
  const fp = data.lines?.pct ?? 0;
  const bp = data.branches?.pct ?? 0;
  const fnp = data.functions?.pct ?? 0;
  fileBreakdown.push({
    file: filePath,
    lines: fp,
    branches: bp,
    functions: fnp,
    status: statusFromPct(fp),
  });
  if (fp < threshold) {
    belowThreshold.push({ file: filePath, pct: fp });
  }
});

// Sort below-threshold by coverage ascending
belowThreshold.sort((a, b) => a.pct - b.pct);

// ---------------------------------------------------------------------------
// Build report data
// ---------------------------------------------------------------------------
const report = {
  title: "Code Coverage Report",
  date: new Date().toISOString().split("T")[0],
  agent: "@audit",
  format: "json",
  version: "1.0",
  summary: {
    status: overallStatus,
    score: Math.round(overallPct),
    bullets: [
      `Overall line coverage: ${linePct}% (threshold: ${threshold}%)`,
      `Branch coverage: ${branchPct}%`,
      `Function coverage: ${fnPct}%`,
      `${belowThreshold.length} file(s) below ${threshold}% threshold`,
      overallStatus === "PASS"
        ? "All coverage thresholds met"
        : `Coverage is ${(threshold - overallPct).toFixed(1)}% below target`,
    ],
  },
  metrics: [
    { label: "Lines", value: linePct, unit: "%", trend: "up", previous: null },
    { label: "Branches", value: branchPct, unit: "%", trend: "up", previous: null },
    { label: "Functions", value: fnPct, unit: "%", trend: "up", previous: null },
    { label: "Files Covered", value: fileEntries.length - belowThreshold.length, unit: "", trend: "up", previous: null },
    { label: "Below Threshold", value: belowThreshold.length, unit: "", trend: "down", previous: null },
  ],
  sections: [],
  recommendations: [],
  coverage: {
    total: total,
    files: Object.fromEntries(fileEntries),
  },
};

// File breakdown section
if (fileBreakdown.length > 0) {
  const table = fileBreakdown
    .map((f) => `| ${f.file} | ${f.lines}% | ${f.branches}% | ${f.functions}% | [${f.status}] |`)
    .join("\n");
  report.sections.push({
    title: "File Breakdown",
    type: "table",
    content:
      "| File | Lines | Branches | Functions | Status |\n|------|-------|----------|-----------|--------|\n" +
      table,
  });
}

// Files below threshold section
if (belowThreshold.length > 0) {
  const list = belowThreshold.map((f) => `- ${f.file}: ${f.pct}%`).join("\n");
  report.sections.push({
    title: "Files Below Threshold",
    type: "text",
    content: list,
  });

  // Recommendations for low-coverage files
  belowThreshold.slice(0, 5).forEach((f) => {
    report.recommendations.push({
      priority: f.pct < threshold - 30 ? "high" : f.pct < threshold - 15 ? "medium" : "low",
      action: `Add tests for ${f.file} (currently ${f.pct}% line coverage)`,
      skill: "/audit-coverage",
    });
  });
}

if (overallPct < threshold) {
  report.recommendations.unshift({
    priority: "high",
    action: `Increase overall line coverage from ${linePct}% to ${threshold}%+`,
    skill: "/audit-coverage",
  });
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");
console.log(`Report data written to ${outputPath}`);
console.log(`Status: ${overallStatus} | Lines: ${linePct}% | Branches: ${branchPct}% | Functions: ${fnPct}%`);
