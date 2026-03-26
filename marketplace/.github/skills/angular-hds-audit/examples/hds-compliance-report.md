# HDS Compliance Report

**Generated:** 2026-03-25
**Project:** orch-trading-platform
**Files scanned:** 47 SCSS files

---

## Summary

| Category | Violations | Severity |
|----------|-----------|----------|
| Colors   | 14        | High     |
| Spacing  | 23        | Medium   |
| Fonts    | 4         | High     |
| **Total**| **41**    |          |

## Top Files by Violations

| File | Colors | Spacing | Fonts | Total |
|------|--------|---------|-------|-------|
| `src/app/components/trade-blotter/trade-blotter.component.scss` | 5 | 8 | 1 | 14 |
| `src/app/components/portfolio-grid/portfolio-grid.component.scss` | 4 | 6 | 1 | 11 |
| `src/app/components/market-data/market-data.component.scss` | 3 | 5 | 1 | 9 |
| `src/app/shared/styles/_legacy-overrides.scss` | 2 | 4 | 1 | 7 |

## Color Violations (14 total, severity: high)

Hardcoded hex values must be replaced with `var(--hds-*)` color tokens.

| # | File | Line | Value | Suggested Token |
|---|------|------|-------|-----------------|
| 1 | `trade-blotter.component.scss` | 12 | `#333333` | `var(--hds-text-primary)` |
| 2 | `trade-blotter.component.scss` | 18 | `#666` | `var(--hds-text-secondary)` |
| 3 | `trade-blotter.component.scss` | 24 | `#f5f5f5` | `var(--hds-surface-secondary)` |
| 4 | `trade-blotter.component.scss` | 31 | `#e0e0e0` | `var(--hds-border-default)` |
| 5 | `trade-blotter.component.scss` | 45 | `#1976d2` | `var(--hds-interactive-primary)` |
| 6 | `portfolio-grid.component.scss` | 8 | `#4caf50` | `var(--hds-feedback-success)` |
| 7 | `portfolio-grid.component.scss` | 14 | `#f44336` | `var(--hds-feedback-error)` |
| 8 | `portfolio-grid.component.scss` | 22 | `#ff9800` | `var(--hds-feedback-warning)` |
| 9 | `portfolio-grid.component.scss` | 35 | `#212121` | `var(--hds-text-primary)` |

## Spacing Violations (23 total, severity: medium)

Raw pixel values must be replaced with `var(--hds-spacing-*)` tokens.

| # | File | Line | Value | Suggested Token |
|---|------|------|-------|-----------------|
| 1 | `trade-blotter.component.scss` | 5 | `16px` | `var(--hds-spacing-md)` |
| 2 | `trade-blotter.component.scss` | 9 | `24px` | `var(--hds-spacing-lg)` |
| 3 | `trade-blotter.component.scss` | 14 | `8px` | `var(--hds-spacing-sm)` |
| 4 | `trade-blotter.component.scss` | 20 | `32px` | `var(--hds-spacing-xl)` |
| 5 | `portfolio-grid.component.scss` | 3 | `12px` | `var(--hds-spacing-sm)` |
| 6 | `portfolio-grid.component.scss` | 11 | `48px` | `var(--hds-spacing-2xl)` |

## Font Violations (4 total, severity: high)

Raw font-family declarations must use `var(--hds-font-*)` tokens.

| # | File | Line | Value |
|---|------|------|-------|
| 1 | `trade-blotter.component.scss` | 7 | `'Roboto', sans-serif` |
| 2 | `portfolio-grid.component.scss` | 5 | `Arial, Helvetica, sans-serif` |
| 3 | `market-data.component.scss` | 3 | `'Source Code Pro', monospace` |
| 4 | `_legacy-overrides.scss` | 12 | `'Helvetica Neue', sans-serif` |

---

## Recommendations

1. **High priority** — Replace all hardcoded colors and font-family declarations with HDS tokens before the next release.
2. **Medium priority** — Replace raw px spacing values with `var(--hds-spacing-*)` tokens.
3. Run `node scripts/scan-hds-compliance.js` in CI to prevent new violations.
4. Use `/angular-hds-apply` to auto-replace violations using the token mapping table.
