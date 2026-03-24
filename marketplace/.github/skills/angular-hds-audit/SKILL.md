---
name: angular-hds-audit
description: "Scan Angular components for HDS design system compliance — detect hardcoded colors, raw spacing, missing tokens, deprecated tokens, incorrect theming, and partial adoption"
references:
  - references/internal/hds/tokens.md            # ADD-HERE: export from HDS Storybook or source
  - references/internal/hds/theming.md           # ADD-HERE: light/dark mode token mappings
  - references/internal/hds/components.md        # ADD-HERE: HDS-wrapped component catalog
  - references/internal/hds/deprecated-tokens.md # ADD-HERE: deprecated token migration map
allowed-tools:
  - codebase
---

## Context

Scan an Angular project for HDS design system compliance. Produces a detailed report showing which components use HDS correctly, which don't, and what needs fixing. Run this before `/angular-hds-apply` to understand the scope of work.

This skill operates from function signatures and bodies. No external reference docs required.

## Inputs

- `@angular /angular-hds-audit` — audit entire project
- `@angular /angular-hds-audit src/app/dashboard/` — audit specific directory
- `@angular /angular-hds-audit --severity high` — only report high-severity issues

## Steps

1. Load HDS token reference from `.orch/references/internal/hds/tokens.md` (if available).
2. Scan all `.scss`, `.css`, and inline styles in `.ts` files for:
   - **Hardcoded colors** — hex values, rgb(), hsl() not using `var(--hds-*)` tokens
   - **Raw spacing** — px/rem values not using HDS spacing scale
   - **Raw typography** — font-family, font-size not using HDS type tokens
   - **Deprecated tokens** — old HDS token names that have been renamed or removed
3. Scan all `.html` templates for:
   - **Missing HDS components** — using raw `<table>` instead of HDS DataGrid, raw `<select>` instead of HDS Select
   - **Incorrect theming** — missing `[theme]` bindings, hardcoded light/dark values
4. Check `styles.scss` / `angular.json` for:
   - **HDS theme import** — is `@yourorg/hds/themes` imported?
   - **Global token setup** — are CSS custom properties defined at `:root`?
5. Produce findings per file with severity (critical/high/medium/low).
6. Generate summary: total files scanned, compliant %, non-compliant %, top issues.

## Output

Structured markdown report:

| File | Issue | Severity | Current | Expected |
|------|-------|----------|---------|----------|
| dashboard.component.scss | Hardcoded color | high | `#3b82f6` | `var(--hds-accent-primary)` |
| trade.component.html | Raw table | medium | `<table>` | `<hds-data-grid>` |

Summary: X files scanned, Y% compliant, Z critical issues, W high issues.

## Validation

- Every `.scss`/`.css` file in scope was scanned
- No false positives on third-party library styles (node_modules excluded)
- Severity ratings are consistent
- No files were modified (read-only audit)
