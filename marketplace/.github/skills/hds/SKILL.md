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

1. Check for overrides: `.github/skill-overrides/hds/overrides.yaml`
2. Load references:
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

## Validation

- No hardcoded hex colors in generated SCSS
- No hardcoded pixel values for spacing (use `--hds-spacing-*`)
- HDS imports used (not raw third-party imports)
- Theme switching works (light/dark)
