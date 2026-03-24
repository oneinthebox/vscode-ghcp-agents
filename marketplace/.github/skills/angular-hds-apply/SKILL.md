---
name: angular-hds-apply
description: "Fix HDS compliance issues — replace hardcoded values with tokens, migrate deprecated tokens, set up theming, wrap raw elements with HDS components"
references:
  - references/internal/hds/tokens.md            # ADD-HERE: full token reference
  - references/internal/hds/theming.md           # ADD-HERE: theme setup guide
  - references/internal/hds/components.md        # ADD-HERE: component migration patterns
  - references/internal/hds/deprecated-tokens.md # ADD-HERE: old-to-new token map
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Fix HDS design system compliance issues found by `/angular-hds-audit`. Replaces hardcoded values with tokens, migrates deprecated tokens, sets up theming, and wraps raw HTML elements with HDS components. Run `/angular-hds-audit` first to understand what needs fixing.

## Inputs

- `@angular /angular-hds-apply` — fix all issues from most recent audit
- `@angular /angular-hds-apply src/app/dashboard/` — fix specific directory
- `@angular /angular-hds-apply --severity high` — only fix high+ severity issues
- `@angular /angular-hds-apply --dry-run` — show what would change without modifying files

## Steps

1. Read the most recent `/angular-hds-audit` report (or run audit if none exists).
2. Load HDS token map from `.orch/references/internal/hds/tokens.md`.
3. **Replace hardcoded colors:** Map each hex/rgb/hsl value to the closest HDS token. Use the token map for exact matches; for approximate matches, note in output.
4. **Replace raw spacing:** Convert px/rem values to HDS spacing tokens (`--hds-space-*`).
5. **Migrate deprecated tokens:** Use the deprecated-tokens map to replace old names with new.
6. **Set up theming** (if not already configured):
   - Add `@yourorg/hds/themes` import to `styles.scss`
   - Add `:root` CSS custom property block
   - Add `[data-theme]` attribute binding for light/dark switching
7. **Wrap raw elements:** Replace `<table>` with `<hds-data-grid>`, `<select>` with `<hds-select>`, etc. Follow the component migration patterns reference.
   <!-- ADD-HERE: before/after examples for each component migration -->
8. Run `ng build` to verify compilation.
9. Run `ng test` to verify tests pass.
10. Run `/angular-hds-audit` again to verify compliance improved.

## Output

| Action | Files changed | Before | After |
|--------|--------------|--------|-------|
| Token replacement | 14 | `#3b82f6` | `var(--hds-accent-primary)` |
| Deprecated migration | 3 | `--hds-blue-500` | `--hds-accent-primary` |
| Theme setup | 1 | no theme import | `@yourorg/hds/themes` imported |
| Component wrap | 2 | `<table>` | `<hds-data-grid>` |

Compliance: X% before → Y% after. Build: pass. Tests: pass.

## Validation

- Build passes after all changes
- Tests pass after all changes
- Re-audit shows improved compliance %
- No unintended style changes (visual regression check recommended)
