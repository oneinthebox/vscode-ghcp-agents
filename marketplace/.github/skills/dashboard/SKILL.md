---
name: dashboard
description: "Generate a single-page HTML dashboard with charts and metrics from ORCH audit data, scan results, and migration progress. Self-contained, zero dependencies, HDS dark theme. Use for status boards, executive views, or team monitors."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(node:*) Read Edit
---

## Context

Produces a live-data HTML dashboard from ORCH audit and scan data. Single-file, self-contained, zero external dependencies. Opens in any browser. HDS dark theme by default.

## Inputs

- "Create a dashboard" → full dashboard with all sections
- "Show me agent adoption" → usage section only
- "Migration dashboard" → migration progress section only
- Optional: `--output path/to/dashboard.html`
- Optional: `--theme dark` (default) or `--theme light`

## Data sources

| Section | Source | What it shows |
|---------|--------|-------------|
| **Adoption** | `.orch/audit/sessions/` | Sessions/day chart, users/agent, skill popularity |
| **Tokens** | `.orch/audit/tokens/` | Token consumption trend, by-agent breakdown |
| **Compliance** | `.orch/audit/violations.jsonl` | Violation count, adherence score gauge, trend |
| **Migration** | `.orch/plans/` + `/proof` scans | Phase progress bars, before/after metrics, velocity |
| **Code Health** | `/proof` scan + `/code-comment` | Doc coverage, anti-pattern count, test coverage |
| **Registry** | `docs-registry.yaml` | Doc freshness — current/stale/draft counts |

## Steps

1. Read audit data from `.orch/audit/` (sessions, tokens, violations).
2. Read latest `/proof` scan output if available.
3. Read `.orch/plans/` for active migration progress.
4. Read `docs-registry.yaml` for doc freshness.
5. Load HDS tokens for branding.
6. Generate dashboard HTML from [templates/dashboard.html](templates/dashboard.html):
   - KPI cards at top (sessions, tokens, adherence, migration %)
   - Charts using inline SVG (no chart library dependency)
   - Tables for detailed breakdowns
   - Progress bars for migration phases
7. Write single HTML file.

## Dashboard layout

```
┌─────────────────────────────────────────────────────────┐
│  ORCH Dashboard — {project name} — {date}               │
├──────────┬──────────┬──────────┬───────────────────────── │
│ Sessions │ Tokens   │ Adherence│ Migration               │
│   47     │  84.2K   │   96%    │  6/10 phases (60%)      │
│  +12%    │  +8%     │   ✓      │  ▓▓▓▓▓▓░░░░            │
├──────────┴──────────┴──────────┴───────────────────────── │
│                                                           │
│  Usage by Agent              Token Trend (7 days)         │
│  ┌──────────────┐           ┌──────────────────┐         │
│  │ @angular  47 │           │ ╱‾‾╲   ╱‾╲       │         │
│  │ @docs     12 │           │╱    ╲_╱   ╲__╱   │         │
│  │ @audit     8 │           │                    │         │
│  └──────────────┘           └──────────────────┘         │
│                                                           │
│  Compliance                  Migration Progress           │
│  ┌──────────────┐           ┌──────────────────┐         │
│  │ Violations: 2│           │ Phase 1: TS ✓     │         │
│  │ Adherence:96%│           │ Phase 2: Ng19 ✓   │         │
│  │ Overrides: 1 │           │ Phase 3: Ng20 ✓   │         │
│  └──────────────┘           │ Phase 4: Ng21 ✓   │         │
│                              │ Phase 5: Stand ◐  │         │
│  Code Health                 │ Phase 6: CtrlF ○  │         │
│  ┌──────────────┐           └──────────────────┘         │
│  │ Docs:   67%  │                                         │
│  │ Tests:  82%  │           Doc Registry                  │
│  │ Issues: 23   │           ┌──────────────────┐         │
│  └──────────────┘           │ Current: 42      │         │
│                              │ Stale:    3      │         │
│                              │ Draft:    7      │         │
│                              └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Output

Single self-contained HTML file:
- Inline CSS (HDS tokens, dark theme)
- Inline SVG for charts (no chart library)
- Responsive grid layout
- Auto-refresh meta tag (optional: `<meta http-equiv="refresh" content="300">`)
- Works offline, zero dependencies

## Validation

- Opens in browser without errors
- All metrics display (no NaN or undefined)
- HDS dark theme applied
- Charts render as SVG
- Responsive — works on 1080p and 4K
