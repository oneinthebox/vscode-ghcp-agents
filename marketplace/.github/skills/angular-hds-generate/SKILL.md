---
name: angular-hds-generate
description: "Create new Angular components with full HDS design system integration from the start — correct tokens, typography, spacing, theming, and wrapped components"
references:
  - references/internal/hds/tokens.md      # ADD-HERE: token catalog
  - references/internal/hds/theming.md     # ADD-HERE: theme configuration
  - references/internal/hds/components.md  # ADD-HERE: available HDS components
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generate new Angular components that are HDS-compliant from the start. Unlike `/angular-generate-component` (which scaffolds structure), this skill focuses specifically on design system integration: correct token usage, theming support, and HDS component selection.

Use this when the primary concern is "make it look right with our design system" rather than "scaffold the Angular boilerplate."

## Inputs

- `@angular /angular-hds-generate data-table` — create HDS-styled data table component
- `@angular /angular-hds-generate dashboard-card --theme dark` — create with dark theme variant
- `@angular /angular-hds-generate chart-panel --component plotly` — using HDS-wrapped Plotly

## Steps

1. Read HDS component catalog from `.orch/references/internal/hds/components.md`.
   <!-- ADD-HERE: component catalog with available HDS-wrapped components -->
2. Determine which HDS components fit the request (data grid, chart, card, form controls, etc.).
3. Generate `.scss` file using ONLY HDS tokens:
   - Colors: `var(--hds-*)` tokens, never hex/rgb
   - Spacing: `var(--hds-space-*)` scale
   - Typography: `var(--hds-font-*)` tokens
   - Borders: `var(--hds-border-*)` tokens
   <!-- ADD-HERE: examples of correct token usage patterns -->
4. Generate `.html` template using HDS components where available:
   - `<hds-data-grid>` not `<table>`
   - `<hds-select>` not `<select>`
   - `<hds-button>` not `<button>`
   <!-- ADD-HERE: full component mapping table -->
5. Add `[data-theme]` support for light/dark mode switching.
6. Generate `.spec.ts` with visual regression test stubs.
   <!-- ADD-HERE: visual test patterns -->
7. Run `ng build` to verify compilation.

## Output

Generated files:
- `{name}.component.ts` — standalone, OnPush, signals
- `{name}.component.html` — HDS components, semantic HTML
- `{name}.component.scss` — 100% HDS tokens, theme-aware
- `{name}.component.spec.ts` — tests including visual regression stubs

## Validation

- Zero hardcoded color/spacing values in generated `.scss`
- All interactive elements use HDS components
- Theme switching works (light/dark)
- Build passes
