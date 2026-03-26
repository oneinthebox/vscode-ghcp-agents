#!/usr/bin/env node
'use strict';

/**
 * render-report.js
 *
 * Main report renderer. Takes report-data JSON + format flag and produces output.
 *
 * Usage:
 *   node render-report.js report-data.json --format html --output report.html
 *   node render-report.js report-data.json --format md
 *   node render-report.js report-data.json --format json --output report.json
 *   node render-report.js report-data.json --format pdf --output report.pdf
 *   node render-report.js report-data.json --format all
 *
 * Supported formats: md, html, json, pdf, deck, all
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) {
  console.log(`Usage: node render-report.js <report-data.json> [options]
  --format <md|html|json|pdf|deck|all>  Output format (default: md)
  --output <path>                        Output file path
  --help                                 Show this help`);
  process.exit(0);
}

const inputPath = args[0];
let format = "md";
let outputPath = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--format" && args[i + 1]) {
    format = args[++i];
  } else if (args[i] === "--output" && args[i + 1]) {
    outputPath = args[++i];
  }
}

const VALID_FORMATS = ["md", "html", "json", "pdf", "deck", "all"];
if (!VALID_FORMATS.includes(format)) {
  console.error(`Invalid format "${format}". Valid: ${VALID_FORMATS.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load report data
// ---------------------------------------------------------------------------
let data;
try {
  const raw = fs.readFileSync(inputPath, "utf-8");
  data = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to read report data: ${err.message}`);
  process.exit(1);
}

const basename = path.basename(inputPath, path.extname(inputPath));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function trendArrow(trend) {
  if (trend === "up") return "\u2191";
  if (trend === "down") return "\u2193";
  return "\u2192";
}

function statusBadge(status) {
  const s = (status || "").toUpperCase();
  if (s === "PASS") return "\u2705 PASS";
  if (s === "WARN") return "\u26a0\ufe0f WARN";
  if (s === "FAIL") return "\u274c FAIL";
  return s;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "PASS") return "badge-pass";
  if (s === "WARN") return "badge-warn";
  if (s === "FAIL") return "badge-fail";
  return "";
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------
function renderMarkdown(data) {
  const lines = [];
  lines.push(`# ${data.title || "Report"} \u2014 ${data.date || "N/A"}\n`);
  lines.push(`**Status:** [${(data.summary?.status || "N/A")}] | **Agent:** ${data.agent || "N/A"} | **Score:** ${data.summary?.score ?? "N/A"}\n`);

  // Executive summary
  if (data.summary?.bullets?.length) {
    lines.push("## Executive Summary\n");
    data.summary.bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push("");
  }

  // Metrics table
  if (data.metrics?.length) {
    lines.push("## Metrics\n");
    lines.push("| Metric | Value | Unit | Trend | Previous |");
    lines.push("|--------|-------|------|-------|----------|");
    data.metrics.forEach((m) => {
      lines.push(`| ${m.label} | ${m.value} | ${m.unit || ""} | ${trendArrow(m.trend)} | ${m.previous ?? "—"} |`);
    });
    lines.push("");
  }

  // Sections
  if (data.sections?.length) {
    data.sections.forEach((sec) => {
      lines.push(`## ${sec.title}\n`);
      if (sec.type === "code") {
        lines.push("```" + (sec.language || ""));
        lines.push(sec.content);
        lines.push("```\n");
      } else if (sec.type === "diagram") {
        lines.push("```mermaid");
        lines.push(sec.content);
        lines.push("```\n");
      } else {
        lines.push(sec.content + "\n");
      }
    });
  }

  // Recommendations
  if (data.recommendations?.length) {
    lines.push("## Recommendations\n");
    data.recommendations.forEach((r, i) => {
      const prio = `[${(r.priority || "medium").toUpperCase()}]`;
      const skill = r.skill ? ` (${r.skill})` : "";
      lines.push(`${i + 1}. ${prio} ${r.action}${skill}`);
    });
    lines.push("");
  }

  // Coverage
  if (data.coverage?.total) {
    lines.push("## Coverage Summary\n");
    const t = data.coverage.total;
    lines.push("| Category  | Covered | Total | Percentage |");
    lines.push("|-----------|---------|-------|------------|");
    for (const [cat, vals] of Object.entries(t)) {
      lines.push(`| ${cat} | ${vals.covered} | ${vals.total} | ${vals.pct}% |`);
    }
    lines.push("");
  }

  lines.push(`---\n*Generated by ORCH \u2022 ${data.agent || "agent"} \u2022 ${data.date || "N/A"}*\n`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------------
function renderHtml(data) {
  const title = escapeHtml(data.title || "Report");
  const date = escapeHtml(data.date || "N/A");
  const agent = escapeHtml(data.agent || "N/A");
  const status = data.summary?.status || "N/A";
  const score = data.summary?.score ?? "N/A";

  let sectionsHtml = "";

  // Executive summary
  if (data.summary?.bullets?.length) {
    const items = data.summary.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n          ");
    sectionsHtml += `
    <section class="exec-summary" id="executive-summary">
      <h2>Executive Summary</h2>
      <ul>${items}</ul>
    </section>`;
  }

  // Metrics — KPI cards
  if (data.metrics?.length) {
    const cards = data.metrics.map((m) => {
      const arrow = m.trend === "up" ? "&#x2191;" : m.trend === "down" ? "&#x2193;" : "&#x2192;";
      const trendClass = m.trend === "up" ? "trend-up" : m.trend === "down" ? "trend-down" : "trend-flat";
      return `
        <div class="kpi-card">
          <div class="kpi-value">${escapeHtml(String(m.value))}${escapeHtml(m.unit || "")}</div>
          <div class="kpi-label">${escapeHtml(m.label)}</div>
          <div class="kpi-trend ${trendClass}">${arrow} ${m.previous != null ? "from " + m.previous + (m.unit || "") : ""}</div>
        </div>`;
    }).join("\n");
    sectionsHtml += `
    <section class="stat-strip" id="metrics">
      <h2>Metrics</h2>
      <div class="kpi-grid">${cards}
      </div>
    </section>`;
  }

  // Sections
  if (data.sections?.length) {
    data.sections.forEach((sec) => {
      const sid = sec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (sec.type === "diagram") {
        sectionsHtml += `
    <section class="section" id="${sid}">
      <h2>${escapeHtml(sec.title)}</h2>
      <div class="diagram"><pre class="mermaid">${escapeHtml(sec.content)}</pre></div>
    </section>`;
      } else if (sec.type === "code") {
        sectionsHtml += `
    <section class="section" id="${sid}">
      <h2>${escapeHtml(sec.title)}</h2>
      <pre class="code-block"><code>${escapeHtml(sec.content)}</code></pre>
    </section>`;
      } else {
        sectionsHtml += `
    <section class="section" id="${sid}">
      <h2>${escapeHtml(sec.title)}</h2>
      <div class="section-content">${escapeHtml(sec.content)}</div>
    </section>`;
      }
    });
  }

  // Recommendations
  if (data.recommendations?.length) {
    const items = data.recommendations.map((r) => {
      const prio = (r.priority || "medium").toUpperCase();
      const prioClass = prio === "HIGH" ? "badge-fail" : prio === "LOW" ? "badge-pass" : "badge-warn";
      const skill = r.skill ? ` <code>${escapeHtml(r.skill)}</code>` : "";
      return `<li><span class="badge ${prioClass}">${prio}</span> ${escapeHtml(r.action)}${skill}</li>`;
    }).join("\n          ");
    sectionsHtml += `
    <section class="section" id="recommendations">
      <h2>Recommendations</h2>
      <ol>${items}</ol>
    </section>`;
  }

  // Coverage
  if (data.coverage?.total) {
    let coverageRows = "";
    for (const [cat, vals] of Object.entries(data.coverage.total)) {
      const pct = vals.pct || 0;
      const barColor = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
      coverageRows += `
            <tr>
              <td>${escapeHtml(cat)}</td>
              <td>${vals.covered}/${vals.total}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
              </td>
              <td>${pct}%</td>
            </tr>`;
    }
    sectionsHtml += `
    <section class="section" id="coverage">
      <h2>Coverage Summary</h2>
      <table>
        <thead><tr><th>Category</th><th>Covered / Total</th><th>Bar</th><th>Pct</th></tr></thead>
        <tbody>${coverageRows}
        </tbody>
      </table>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --hds-surface:        oklch(0.16 0.02 240);
      --hds-surface-raised: oklch(0.20 0.02 240);
      --hds-surface-card:   oklch(0.24 0.025 240);
      --hds-text:           oklch(0.95 0.01 240);
      --hds-text-muted:     oklch(0.70 0.02 240);
      --hds-accent:         oklch(0.65 0.15 240);
      --hds-accent-light:   oklch(0.75 0.10 240);
      --hds-border:         oklch(0.30 0.02 240);
      --hds-pass:           #22c55e;
      --hds-warn:           #f59e0b;
      --hds-fail:           #ef4444;
      --font-heading:       'Newsreader', Georgia, serif;
      --font-body:          'Outfit', system-ui, sans-serif;
      --font-mono:          'IBM Plex Mono', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body);
      background: var(--hds-surface);
      color: var(--hds-text);
      line-height: 1.6;
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3 { font-family: var(--font-heading); font-weight: 600; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.4rem; margin: 2rem 0 1rem; border-bottom: 1px solid var(--hds-border); padding-bottom: 0.5rem; }
    .report-header {
      border-bottom: 2px solid var(--hds-accent);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .report-header .dateline { color: var(--hds-text-muted); font-size: 0.9rem; }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-pass { background: var(--hds-pass); color: #000; }
    .badge-warn { background: var(--hds-warn); color: #000; }
    .badge-fail { background: var(--hds-fail); color: #fff; }
    .exec-summary {
      background: var(--hds-surface-raised);
      border-left: 4px solid var(--hds-accent);
      padding: 1.25rem 1.5rem;
      border-radius: 6px;
      margin: 1.5rem 0;
    }
    .exec-summary ul { padding-left: 1.2rem; }
    .exec-summary li { margin-bottom: 0.4rem; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
    }
    .kpi-card {
      background: var(--hds-surface-card);
      border: 1px solid var(--hds-border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .kpi-value { font-size: 1.8rem; font-weight: 600; font-family: var(--font-heading); }
    .kpi-label { color: var(--hds-text-muted); font-size: 0.85rem; margin-top: 0.25rem; }
    .kpi-trend { font-size: 0.8rem; margin-top: 0.35rem; }
    .trend-up { color: var(--hds-pass); }
    .trend-down { color: var(--hds-fail); }
    .trend-flat { color: var(--hds-text-muted); }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--hds-border); }
    th { color: var(--hds-text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--hds-surface);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .code-block {
      background: oklch(0.12 0.02 240);
      border: 1px solid var(--hds-border);
      border-radius: 6px;
      padding: 1rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }
    .diagram { margin: 1rem 0; }
    .section ol { padding-left: 1.4rem; }
    .section li { margin-bottom: 0.5rem; }
    details { margin: 1rem 0; }
    summary { cursor: pointer; color: var(--hds-accent-light); font-weight: 500; }
    .report-footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--hds-border);
      color: var(--hds-text-muted);
      font-size: 0.8rem;
      text-align: center;
    }
    @media print {
      body { background: #fff; color: #111; max-width: 100%; padding: 1rem; }
      .kpi-card { border: 1px solid #ccc; }
      .exec-summary { border-left-color: #333; background: #f9f9f9; }
      .badge-pass { background: #d1fae5; color: #000; }
      .badge-warn { background: #fef3c7; color: #000; }
      .badge-fail { background: #fee2e2; color: #000; }
      .code-block { background: #f5f5f5; border-color: #ccc; }
      h2 { border-bottom-color: #ccc; }
    }
    @media (max-width: 640px) {
      body { padding: 1rem; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <h1>${title}</h1>
    <p class="dateline">${date} &middot; ${agent} &middot; <span class="badge ${statusClass(status)}">${escapeHtml(status)}</span> &middot; Score: ${score}</p>
  </header>
  ${sectionsHtml}
  <footer class="report-footer">Generated by ORCH &bull; ${agent} &bull; ${date}</footer>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#f0f0f0',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a'
      }
    });
  <\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON renderer
// ---------------------------------------------------------------------------
function renderJson(data) {
  const output = {
    title: data.title || "Report",
    date: data.date || null,
    agent: data.agent || null,
    format: "json",
    version: "1.0",
    summary: data.summary || {},
    metrics: data.metrics || [],
    sections: data.sections || [],
    recommendations: data.recommendations || [],
  };
  if (data.coverage) {
    output.coverage = data.coverage;
  }
  return JSON.stringify(output, null, 2);
}

// ---------------------------------------------------------------------------
// Deck renderer (reveal.js)
// ---------------------------------------------------------------------------
function renderDeck(data) {
  const title = escapeHtml(data.title || "Report");
  const date = escapeHtml(data.date || "");
  const agent = escapeHtml(data.agent || "");
  const status = data.summary?.status || "";

  let slides = "";

  // Title slide
  slides += `
        <section>
          <h1>${title}</h1>
          <p>${date} &middot; ${agent}</p>
          <p><span class="badge ${statusClass(status)}">${escapeHtml(status)}</span></p>
        </section>`;

  // Summary slide
  if (data.summary?.bullets?.length) {
    const items = data.summary.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n            ");
    slides += `
        <section>
          <h2>Executive Summary</h2>
          <ul>${items}</ul>
        </section>`;
  }

  // Metrics slide
  if (data.metrics?.length) {
    const rows = data.metrics.map((m) => {
      return `<tr><td>${escapeHtml(m.label)}</td><td><strong>${m.value}${m.unit || ""}</strong></td></tr>`;
    }).join("\n            ");
    slides += `
        <section>
          <h2>Metrics</h2>
          <table>${rows}</table>
        </section>`;
  }

  // Section slides
  if (data.sections?.length) {
    data.sections.forEach((sec) => {
      if (sec.type === "diagram") {
        slides += `
        <section>
          <h2>${escapeHtml(sec.title)}</h2>
          <pre class="mermaid">${escapeHtml(sec.content)}</pre>
        </section>`;
      } else {
        slides += `
        <section>
          <h2>${escapeHtml(sec.title)}</h2>
          <pre><code>${escapeHtml(sec.content)}</code></pre>
        </section>`;
      }
    });
  }

  // Recommendations slide
  if (data.recommendations?.length) {
    const items = data.recommendations.map((r) => {
      const prio = (r.priority || "medium").toUpperCase();
      return `<li><strong>[${prio}]</strong> ${escapeHtml(r.action)}</li>`;
    }).join("\n            ");
    slides += `
        <section>
          <h2>Recommendations</h2>
          <ol>${items}</ol>
        </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/theme/black.css">
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --hds-surface: oklch(0.16 0.02 240);
      --hds-accent:  oklch(0.65 0.15 240);
      --hds-pass:    #22c55e;
      --hds-warn:    #f59e0b;
      --hds-fail:    #ef4444;
    }
    .reveal { font-family: 'Outfit', sans-serif; }
    .reveal h1, .reveal h2, .reveal h3 { font-family: 'Newsreader', serif; }
    .reveal code, .reveal pre { font-family: 'IBM Plex Mono', monospace; font-size: 0.7em; }
    .badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 4px; font-weight: 600; }
    .badge-pass { background: var(--hds-pass); color: #000; }
    .badge-warn { background: var(--hds-warn); color: #000; }
    .badge-fail { background: var(--hds-fail); color: #fff; }
    .reveal table { margin: 0 auto; border-collapse: collapse; }
    .reveal td, .reveal th { padding: 0.4rem 1rem; border-bottom: 1px solid #444; text-align: left; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">${slides}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4/dist/reveal.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
  <script>
    Reveal.initialize({ hash: true, transition: 'slide' });
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  <\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PDF renderer (delegates to HTML → wkhtmltopdf / puppeteer)
// ---------------------------------------------------------------------------
function renderPdf(data, pdfOutputPath) {
  const htmlContent = renderHtml(data);
  const tmpHtml = pdfOutputPath.replace(/\.pdf$/i, ".tmp.html");
  fs.writeFileSync(tmpHtml, htmlContent, "utf-8");

  // Try puppeteer first, then wkhtmltopdf
  try {
    const puppeteer = require("puppeteer");
    (async () => {
      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      await page.pdf({
        path: pdfOutputPath,
        format: "A4",
        margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span style="font-size:8px;color:#888;margin-left:20mm;">' + escapeHtml(data.title || "Report") + "</span>",
        footerTemplate: '<span style="font-size:8px;color:#888;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>',
      });
      await browser.close();
      fs.unlinkSync(tmpHtml);
      console.log(`PDF written to ${pdfOutputPath}`);
    })();
    return null; // async — output handled inside
  } catch (_e) {
    // Puppeteer not available, try wkhtmltopdf
    try {
      execSync(`wkhtmltopdf --margin-top 20mm --margin-bottom 20mm --margin-left 20mm --margin-right 20mm "${tmpHtml}" "${pdfOutputPath}"`, { stdio: "pipe" });
      fs.unlinkSync(tmpHtml);
      console.log(`PDF written to ${pdfOutputPath}`);
      return null;
    } catch (_e2) {
      fs.unlinkSync(tmpHtml);
      console.warn("PDF generation requires puppeteer or wkhtmltopdf.");
      console.warn("Install one of:");
      console.warn("  npm install puppeteer");
      console.warn("  brew install wkhtmltopdf  (or apt-get install wkhtmltopdf)");
      console.warn("HTML version saved as fallback.");
      return htmlContent;
    }
  }
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
function writeOutput(content, ext) {
  const out = outputPath || `${basename}.${ext}`;
  fs.writeFileSync(out, content, "utf-8");
  console.log(`${ext.toUpperCase()} written to ${out}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const formats = format === "all" ? ["md", "html", "json", "pdf", "deck"] : [format];

formats.forEach((fmt) => {
  // For "all" mode, override outputPath per format
  const origOutput = outputPath;
  if (format === "all") {
    outputPath = null; // let writeOutput generate default name
  }

  switch (fmt) {
    case "md":
      writeOutput(renderMarkdown(data), "md");
      break;
    case "html":
      writeOutput(renderHtml(data), "html");
      break;
    case "json":
      writeOutput(renderJson(data), "json");
      break;
    case "pdf": {
      const pdfOut = outputPath || `${basename}.pdf`;
      const fallback = renderPdf(data, pdfOut);
      if (fallback) {
        // wkhtmltopdf/puppeteer not available — write HTML as fallback
        const htmlOut = pdfOut.replace(/\.pdf$/i, ".html");
        fs.writeFileSync(htmlOut, fallback, "utf-8");
        console.log(`HTML fallback written to ${htmlOut}`);
      }
      break;
    }
    case "deck":
      writeOutput(renderDeck(data), "deck.html");
      break;
  }

  outputPath = origOutput;
});
