---
name: present-report
description: "Convert any markdown report to a styled, self-contained HTML report — tables, progress bars, status tags, TOC, executive summary. Uses deck-tokens.css for branding."
references:
  - references/orch/report-template-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates structured reports from ORCH skill outputs in multiple formats. Each format serves a different audience:

| Format   | Audience        | Purpose                                      |
|----------|-----------------|----------------------------------------------|
| Markdown | Developers      | Git-friendly, diffable, reviewable in PRs     |
| HTML     | Stakeholders    | Visual, printable, self-contained presentation|
| JSON     | Tooling / CI    | Machine-readable, dashboards, trend tracking  |
| PDF      | Formal distro   | Polished, fixed-layout for email or archive   |
| Deck     | Presentations   | reveal.js slides derived from report data     |

This is a shared skill under @orch, available to any agent. Unlike `/present-deck` (slide format), this produces **document-style reports** — scrollable, printable, with rich formatting — then optionally converts them to other output formats.

## Inputs

```
@orch /present-report from PROJECT-RECAP.md --format md
@orch /present-report from .orch/runs/2026-03-24/report.md --format html
@audit /present-report from audit-output.md --format json
@orch /present-report from report-data.json --format all
```

**Format flags:**

- `--format md` (default) — Markdown report with tables, code blocks, Mermaid fenced blocks
- `--format html` — Self-contained HTML with inline CSS, Mermaid rendering, print styles
- `--format json` — Structured JSON for CI/CD integration, dashboards, trend tracking
- `--format pdf` — PDF via Puppeteer `page.pdf()` or `wkhtmltopdf` from the HTML format
- `--format deck` — reveal.js HTML slides (same as `/present-deck` but from report data)
- `--format all` — Generate all formats simultaneously

**Additional flags:**

- `--output <path>` — Custom output filename (default: same name with format extension)
- `--theme <name>` — Override theme from `.orch/config.yaml`
- `--coverage <path>` — Path to Istanbul/lcov coverage JSON to include coverage section

## Report Structure

All formats share a common report structure (adapted to each format's capabilities):

1. **Header** — title, date, author (agent), scope/branch
2. **Executive summary** — 3-5 bullet points, overall status badge (PASS/WARN/FAIL)
3. **Metrics** — KPI cards (key numbers with trend arrows: up/down/flat)
4. **Detailed findings** — tables, code snippets, before/after diffs
5. **Diagrams** — Mermaid (architecture, flow, state) or SVG charts
6. **Recommendations** — prioritized action items with skill references
7. **Appendix** — raw data, methodology notes, generation metadata

## Steps

### 1. Collect report data

Read the source file (markdown or JSON). If markdown, parse structure into an intermediate JSON representation. If JSON, validate against the report-data schema.

Read `.orch/config.yaml` for branding overrides (logo, colors, theme).

### 2. Determine format(s) to generate

Parse `--format` flag. If `all`, queue: md, html, json, pdf, deck.

### 3. Render Markdown (`--format md`)

- Tables rendered as GFM pipe tables
- Code blocks with language fences
- Mermaid diagrams in ` ```mermaid ` fenced blocks
- Status markers: `[PASS]`, `[WARN]`, `[FAIL]` as plain text badges
- Metrics as a summary table with trend indicators (arrows: up/down/flat)
- Recommendations as numbered list with priority tags

### 4. Render HTML (`--format html`)

Generate a self-contained HTML page with:

- **Inline CSS** — HDS oklch tokens (deep blue palette, hue 240), responsive grid
- **Fonts** — Newsreader (headings), Outfit (body), IBM Plex Mono (code) via Google Fonts CDN
- **Mermaid.js** — CDN script for diagram rendering with theme matching report tokens
- **Print media query** — `@media print` for clean PDF export via Cmd+P
- **Status badges** — PASS (`#22c55e` green), WARN (`#f59e0b` amber), FAIL (`#ef4444` red)
- **Progress bars** — for coverage metrics and completion percentages
- **KPI cards** — horizontal stat strip with trend arrows
- **Collapsible detail sections** — `<details>/<summary>` for appendix and verbose data
- **Table of contents** — clickable anchor links generated from `## Section` headings

Post-generation verification (all checks must pass, max 3 retries):

| Check       | What                                                                      |
|-------------|---------------------------------------------------------------------------|
| CSS         | All `var(--*)` resolve, Google Fonts link present, class names correct     |
| Mermaid     | No HTML-breaking chars in `<pre class="mermaid">`, script tag before `</body>` |
| Structure   | Valid HTML, `<thead>`/`<tbody>` on tables, TOC anchors match section IDs   |
| Content     | No `{{TEMPLATE}}` placeholders, summary is concise, metrics have 4-6 items |

### 5. Render JSON (`--format json`)

Structured output following the report-data schema:

```json
{
  "title": "...",
  "date": "2026-03-24",
  "agent": "@audit",
  "format": "json",
  "version": "1.0",
  "summary": {
    "status": "PASS|WARN|FAIL",
    "bullets": ["...", "..."],
    "score": 85
  },
  "metrics": [
    { "label": "Coverage", "value": 78.4, "unit": "%", "trend": "up", "previous": 72.1 }
  ],
  "sections": [
    { "title": "...", "type": "table|text|code|diagram", "content": "..." }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "action": "...", "skill": "/angular-signals" }
  ],
  "coverage": {
    "total": { "lines": { "total": 1250, "covered": 980, "pct": 78.4 }, "branches": {}, "functions": {} },
    "files": {}
  }
}
```

- Compatible with CI tools (can be parsed for pass/fail gates)
- Coverage section follows Istanbul/lcov conventions
- Version field for forward compatibility

### 6. Render PDF (`--format pdf`)

1. First render the HTML format (step 4)
2. Use Puppeteer `page.pdf()` or `wkhtmltopdf` to convert HTML to PDF
3. PDF settings: A4, margins 20mm, header/footer with page numbers
4. If neither tool is available, log: "Install puppeteer or wkhtmltopdf for PDF support"

```bash
# Via scripts/render-report.js
node scripts/render-report.js report-data.json --format pdf --output report.pdf
```

### 7. Render Deck (`--format deck`)

Extract key slides from report sections and generate reveal.js HTML:

- Slide 1: Title + date + agent
- Slide 2: Executive summary (status badge, 3-5 bullets)
- Slide 3: Metrics dashboard (KPI cards)
- Slides 4-N: One slide per major finding/section
- Final slide: Recommendations (prioritized list)

Uses the same HDS oklch tokens and font stack as the HTML format.

## Coverage Reports

Code coverage is a first-class report type:

- Raw coverage data lives in `.orch/audit/metrics/coverage.json` (Istanbul format)
- `scripts/coverage-to-report.js` converts Istanbul JSON to report-data JSON
- `scripts/render-report.js` then renders the report-data in any format
- JSON format includes the raw coverage data for CI integration
- HTML format renders coverage with progress bars and file-level detail tables

```bash
# Pipeline: coverage → report-data → rendered report
node scripts/coverage-to-report.js coverage-summary.json --output report-data.json
node scripts/render-report.js report-data.json --format html --output coverage-report.html
```

## Output

### Markdown example (abbreviated)

```markdown
# Project Recap — 2026-03-24

**Status:** [PASS] | **Agent:** @audit | **Branch:** feature/signals

## Executive Summary
- Migrated 12 services to Angular Signals (100% complete)
- Code coverage increased from 72.1% to 78.4%
- Zero critical vulnerabilities detected

## Metrics
| Metric        | Value  | Trend | Previous |
|---------------|--------|-------|----------|
| Coverage      | 78.4%  | up    | 72.1%    |
| Bundle Size   | 245 KB | down  | 312 KB   |
```

### HTML example

Self-contained HTML file with inline CSS, Mermaid CDN, KPI cards, status badges, progress bars, collapsible sections. Opens in any browser, prints cleanly.

See `examples/recap-report.html` for a full working example.

### JSON example

```json
{
  "title": "Project Recap",
  "date": "2026-03-24",
  "format": "json",
  "version": "1.0",
  "summary": { "status": "PASS", "score": 85 },
  "metrics": [{ "label": "Coverage", "value": 78.4, "unit": "%", "trend": "up" }]
}
```

See `examples/recap-report.json` for a full working example.

## Validation

- **Markdown:** renders correctly in GitHub, GitLab, and VS Code preview
- **HTML:** opens in any browser without errors, all Mermaid diagrams render, tables are styled, status badges display correct colors, `Cmd+P` produces clean PDF
- **JSON:** validates against `examples/report-schema.json`, parseable by `jq`, CI tools can extract pass/fail status
- **PDF:** pages are properly formatted, no clipped content, header/footer present
- **Deck:** reveal.js slides navigate correctly, content is readable, diagrams render
- **All formats:** no external dependencies (work offline except Google Fonts CDN), no `{{TEMPLATE}}` placeholders remain, Mermaid syntax is clean (no HTML-breaking characters)
