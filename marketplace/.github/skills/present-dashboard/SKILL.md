---
name: present-dashboard
description: "Generate a single-page HTML dashboard from audit and scan data. Self-contained, zero external dependencies, HDS themed. Produces a ready-to-open status board for teams and stakeholders."
references: []
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Produces a self-contained HTML dashboard from ORCH audit data, scan results, and migration progress. Single file, zero external dependencies, inline CSS and SVG charts. Opens in any browser, works offline. HDS dark theme by default with light theme option. Designed for status boards, executive views, team monitors, and meeting presentations.

## Inputs

- "Create a dashboard" — full dashboard with all available sections
- "Show me agent adoption" — usage section only
- "Migration dashboard" — migration progress section only
- Optional: `--output {path}` — output file path (default: `.orch/output/dashboard.html`)
- Optional: `--theme {dark|light}` — theme selection (default: dark)
- Optional: `--sections {list}` — comma-separated sections to include

## Steps

1. Determine which sections to render (all, or filtered by user request / `--sections`).
2. Read data sources for each section:
   a. **Adoption**: `.orch/runs/` — sessions per day, users per agent, skill popularity.
   b. **Tokens**: `.orch/audit/tokens/` — consumption trends, per-agent breakdown.
   c. **Compliance**: `.orch/audit/violations.jsonl` — violation count, adherence score.
   d. **Migration**: `.orch/plans/` — phase progress, before/after metrics.
   e. **Code Health**: scan output — doc coverage, anti-pattern count, test coverage.
   f. **Registry**: `.orch/registry.yaml` — doc freshness, staleness counts.
3. Load HDS tokens for theming (colors, fonts, spacing).
4. Generate the HTML dashboard:
   a. KPI cards at top: sessions, tokens, adherence %, migration progress.
   b. Charts rendered as inline SVG (no chart library dependency).
   c. Tables for detailed breakdowns.
   d. Progress bars for migration phases.
   e. Responsive grid layout.
5. Embed all CSS inline (HDS tokens, theme colors).
6. Write single self-contained HTML file.

## Output

```markdown
## Dashboard Generated

### Details
| Field         | Value               |
|---------------|---------------------|
| Sections      | {list}              |
| Theme         | {dark / light}      |
| Output        | {file path}         |
| Size          | {file size}         |
| Data range    | {from} to {to}      |

### Sections Included
| Section       | Data Points | Status   |
|---------------|-------------|----------|
| Adoption      | {n}         | rendered |
| Tokens        | {n}         | rendered |
| Compliance    | {n}         | rendered |
| Migration     | {n}         | rendered |
| Code Health   | {n}         | rendered |
| Registry      | {n}         | rendered |
```

## Validation

- Opens in browser without errors or console warnings
- All metrics display correctly (no NaN, undefined, or missing values)
- HDS theme applied (check colors, fonts against token definitions)
- Charts render as inline SVG (no external chart library requests)
- Responsive layout works on 1080p and 4K displays
- Zero external dependencies — no network requests when opened offline
- Auto-refresh meta tag included for live dashboard use
