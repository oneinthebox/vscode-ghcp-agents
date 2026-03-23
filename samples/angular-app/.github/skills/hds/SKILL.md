---
name: hds
description: "Work with the @yourorg/hds design system — apply design tokens, set up theming (light/dark), use HDS-wrapped components (AG Grid, Plotly, PrimeNG). Ensures consistent look and feel across all applications. Use when styling, theming, or integrating data grids and charts."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

HDS (@yourorg/hds) is the organization's design system. It provides:
- **Design tokens** — CSS custom properties for colors, spacing, typography, borders, shadows
- **Theming** — light/dark mode, theme switching, custom theme creation
- **Wrapped components** — HDS-themed versions of AG Grid, Plotly.js, and PrimeNG

## Capabilities

| Action | When to use |
|--------|------------|
| **Apply tokens** | Styling a new or existing component with HDS design tokens |
| **Set up theming** | Adding light/dark mode, configuring theme switching |
| **Integrate grid** | Setting up AG Grid with HDS theme |
| **Integrate chart** | Setting up Plotly chart with HDS theme |
| **Audit styles** | Find hardcoded colors/spacing that should use HDS tokens |

## Steps

1. Load references:
   - Token catalog: [references/tokens.md](references/tokens.md)
   - Theming guide: [references/theming.md](references/theming.md)
   - Component guide: [references/components.md](references/components.md)
3. Study examples: [examples/](examples/)
4. Determine action from user prompt.
5. Apply HDS patterns.
6. Verify: no hardcoded colors/spacing, all using `var(--hds-*)` tokens.

## Key rules

- **Always use HDS tokens** — `var(--hds-surface-primary)` not `#ffffff`
- **Always use HDS-wrapped components** — `HdsAgGridModule` not raw `AgGridModule`
- **Never hardcode colors, spacing, typography, borders, or shadows**
- **Use HdsThemeService for theme switching** — never manipulate CSS classes directly
- **Check token catalog** before inventing new styles — there's probably a token for it

## Audit sub-command (/hds audit)

When invoked as `/hds audit` or `/hds audit {scope}`:

### Steps

1. Scan the target scope (default: `src/`) for SCSS/CSS files.
2. Detect hardcoded values that should use HDS tokens:
   - Hex colors (`#xxx`, `#xxxxxx`, `rgb()`, `rgba()`, `hsl()`)
   - Pixel values for spacing (`margin: 16px`, `padding: 8px`)
   - Font declarations (`font-family: Arial`, `font-size: 14px`)
   - Hardcoded shadows and borders
3. For each violation, suggest the correct HDS token.
4. Produce a structured report.

### Output

```markdown
## HDS Audit — {scope}

### Violations
| File | Line | Current | Suggested Token |
|------|------|---------|----------------|
| `trade-card.component.scss` | 12 | `background: #1a1a2e` | `var(--hds-surface-primary)` |
| `dashboard.component.scss` | 45 | `padding: 16px` | `var(--hds-spacing-md)` |
| `header.component.scss` | 8 | `font-family: Arial` | `var(--hds-font-family)` |

### Summary
- Files scanned: {N}
- Violations found: {N}
- Estimated fix time: {N} minutes

### Auto-fix
Run `@angular /refactor --hds-tokens {scope}` to automatically replace hardcoded values with HDS tokens.
```

## Workflow Integration

### Prerequisites

None. `/hds audit` can run standalone at any time.

### Post-actions (recommended)

After audit finds violations: `/refactor --hds-tokens {scope}` to auto-fix.

Update `.orch/workflow/` stage status to `completed` if running within a workflow.

## Validation

- No hardcoded hex colors in generated SCSS
- No hardcoded pixel values for spacing (use `--hds-spacing-*`)
- HDS imports used (not raw third-party imports)
- Theme switching works (light/dark)
