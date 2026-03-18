---
name: present
description: "Convert markdown content into styled HTML slide decks (reveal.js) or PPTX. Supports templates for architecture, migration, status, design-system, intro, and custom presentations. Renders mermaid diagrams as SVG. Branded with HDS design tokens. Use when presenting ORCH project data in meetings, forums, or reviews."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(npx:*) Read Edit
---

## Context

Takes structured markdown (from /explain, /proof, /report, or any source) and produces a polished slide deck. Each `##` heading becomes a slide. Mermaid blocks render as inline SVG. Tables become styled HTML. All branded with HDS tokens.

## Templates

| Template | Source content | Slides it produces |
|----------|--------------|-------------------|
| `architecture` | PROJECT.md or /explain output | Title → System Context (diagram) → Containers (diagram + table) → Components (per-app details + data flow) → Patterns → Tech Stack → Code Health → Getting Started |
| `migration` | .orch/plans/ + /proof scans | Title → Current State (before scan) → Target State → Phase Plan (timeline) → Progress (metrics) → Before/After (comparison) → Risks/Blockers → Next Steps |
| `status` | /report audit data | Title → Adoption (usage chart) → Token Consumption → Compliance (scorecard) → Drift (trend) → Action Items |
| `design-system` | /hds references | Title → Color Tokens (swatches) → Typography (specimens) → Spacing → Components (AG Grid, Plotly themed) → Themes (light/dark) |
| `intro` | README + PROJECT.md | Title → What Is This → Problem/Solution → Architecture (diagram) → Tech Stack → Demo (screenshots) → Getting Started |
| `custom` | Any markdown file | Title (from # heading) → each ## heading becomes a slide |

## Inputs

- "Create an architecture deck" → uses `architecture` template, reads PROJECT.md
- "Present the migration status" → uses `migration` template, reads .orch/plans/
- "Make slides from this file" → uses `custom` template, reads specified file
- Optional: `--format html` (default) or `--format pptx`
- Optional: `--output path/to/output.html`
- Optional: `--theme dark` (default) or `--theme light`

## Steps

1. Determine template from user request.
2. Read source content (PROJECT.md, audit data, plan files, or specified markdown).
3. Read HDS tokens for branding: colors, fonts, spacing.
4. Parse markdown into slide structure:
   - `#` → title slide
   - `##` → section divider or content slide
   - `###` → sub-content within a slide
   - Tables → styled HTML tables
   - Mermaid code blocks → inline SVG (render via mermaid CLI or embed for client-side)
   - Code blocks → syntax highlighted
   - Bullet lists → styled list
5. Apply template layout (which sections get which slide types).
6. Generate output:
   - **HTML**: self-contained reveal.js file from [assets/reveal-base.html](assets/reveal-base.html) with [assets/orch-theme.css](assets/orch-theme.css)
   - **PPTX**: via [scripts/generate-pptx.ts](scripts/generate-pptx.ts) using pptxgenjs
7. Write output file.

## Slide structure per template

### Architecture (from /explain C4 output)

```
Slide 1:  [Title]     "{Project} — Architecture Overview" + date
Slide 2:  [Section]   "System Context"
Slide 3:  [Diagram]   System context mermaid (full-width SVG)
Slide 4:  [Content]   External systems table
Slide 5:  [Section]   "Containers"
Slide 6:  [Diagram]   Container diagram
Slide 7:  [Content]   Apps + libraries table with serve commands
Slide 8:  [Section]   "Components"
Slide 9:  [Content]   Per-app feature routes + services
Slide 10: [Diagram]   Data flow sequence diagram
Slide 11: [Section]   "Design Principles"
Slide 12: [Content]   Patterns table (architecture, state mgmt, DI)
Slide 13: [Content]   Tech stack — library × version × usage
Slide 14: [Section]   "Health & Status"
Slide 15: [Metrics]   Doc coverage, anti-patterns, test coverage, migration readiness
Slide 16: [Content]   Getting started + available ORCH skills
```

### Migration (from .orch/plans/ + /proof)

```
Slide 1:  [Title]     "Migration to {target} — Status"
Slide 2:  [Metrics]   Phases: {done}/{total}, Files: {changed}/{total}
Slide 3:  [Timeline]  Phase list with ✓/⚠/pending status per phase
Slide 4:  [Comparison] Before/after pattern counts (from scan diff)
Slide 5:  [Content]   Current phase details + what's happening
Slide 6:  [Content]   Blockers + decisions needed
Slide 7:  [Content]   Remaining phases + effort estimates
Slide 8:  [Metrics]   Velocity + estimated completion date
```

### Status (from /report)

```
Slide 1:  [Title]     "ORCH Status — {date range}"
Slide 2:  [Metrics]   Sessions, users, tokens (KPI cards)
Slide 3:  [Content]   Usage by agent (table)
Slide 4:  [Content]   Top skills invoked (table)
Slide 5:  [Metrics]   Compliance score + violations
Slide 6:  [Content]   Behavioral drift trend
Slide 7:  [Content]   Action items
```

## Output format

### HTML (default)
Self-contained single HTML file:
- reveal.js embedded (no CDN dependency)
- Mermaid diagrams as inline SVG
- HDS theme CSS embedded
- Works offline, send as attachment, deploy to internal site
- Keyboard navigation: arrows for slides, ESC for overview, F for fullscreen

### PPTX
Standard PowerPoint file:
- One slide per section
- Mermaid diagrams as embedded PNG (rendered server-side)
- HDS colors applied to theme
- Editable — stakeholders can modify

## Validation

- Output opens in browser (HTML) or PowerPoint (PPTX)
- Mermaid diagrams render (not raw text)
- HDS branding applied (check colors, fonts)
- Every ## section from source has a corresponding slide
- No broken layouts (tables fit, diagrams not clipped)
