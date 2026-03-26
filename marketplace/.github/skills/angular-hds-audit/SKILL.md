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

This skill operates from function signatures and bodies. No external reference docs required. When HDS token references are not available, the skill falls back to generic detection patterns (scanning for raw hex values, non-variable spacing, and raw HTML elements that should be HDS wrappers).

## Inputs

- `@angular /angular-hds-audit` — audit entire project
- `@angular /angular-hds-audit src/app/dashboard/` — audit specific directory
- `@angular /angular-hds-audit --severity high` — only report high-severity issues

### Helper Script

Run the compliance scanner before executing steps manually:
```bash
node scripts/scan-hds-compliance.js [project-root]
```
The script outputs JSON to stdout with hardcoded color violations, raw spacing values, and deprecated token usages per file. Use this data to inform the steps below.

## Steps

1. **Load HDS token reference** from `.orch/references/internal/hds/tokens.md` (if available).
   - If the reference doc is not available, proceed with fallback detection patterns described below. The fallback approach detects violations without needing a specific token catalog.

2. **Scan all `.scss`, `.css`, and inline styles in `.ts` files** using these detection patterns:

   **Hardcoded colors** — hex values, rgb(), hsl() not using `var(--hds-*)` tokens:
   ```
   # Detection patterns (regex):
   #[0-9a-fA-F]{3,8}\b              # hex colors: #fff, #3b82f6, #3b82f6ff
   rgb\(\s*\d+                       # rgb(51, 51, 51)
   rgba\(\s*\d+                      # rgba(51, 51, 51, 0.5)
   hsl\(\s*\d+                       # hsl(220, 90%, 56%)
   hsla\(\s*\d+                      # hsla(220, 90%, 56%, 0.5)
   ```
   Exclude from detection: values already inside `var(--hds-*)`, SVG data URIs, and values in comments.

   **Raw spacing** — px/rem values not using HDS spacing scale:
   ```
   # Detection patterns:
   \b\d+px\b                         # 16px, 24px, 8px
   \b\d+(\.\d+)?rem\b               # 1rem, 1.5rem, 0.5rem
   ```
   Exclude: `0px`, values inside `var()`, values inside `calc()` that reference tokens, media queries, and animation keyframes.

   **Raw typography** — font-family, font-size not using HDS type tokens:
   ```
   # Detection patterns:
   font-family:\s*[^v]              # font-family not starting with var(
   font-size:\s*\d+                 # font-size: 14px (not var(--hds-font-*))
   font-weight:\s*\d+               # font-weight: 600 (not var(--hds-font-weight-*))
   line-height:\s*\d+               # line-height: 1.5 (not var(--hds-line-height-*))
   ```

   **Deprecated tokens** — old HDS token names that have been renamed or removed:
   ```
   # Detection patterns (scan for known deprecated prefixes):
   var\(--hds-color-                # old color namespace (now --hds-accent-*, --hds-text-*, etc.)
   var\(--hds-blue-                 # raw palette tokens (should use semantic aliases)
   var\(--hds-gray-                 # raw palette tokens
   var\(--hds-font-sm               # old size tokens (now --hds-type-*)
   ```

3. **Scan all `.html` templates** for component compliance:

   **Missing HDS components** — detect raw HTML that should be HDS wrappers:
   ```
   # Detection patterns:
   <table[\s>]                       # should be <hds-data-grid>
   <select[\s>]                      # should be <hds-select>
   <button[\s>]                      # should be <hds-button> (check if not already wrapped)
   <input[\s>]                       # should be <hds-input> or <hds-form-field>
   <textarea[\s>]                    # should be <hds-textarea>
   <dialog[\s>]                      # should be <hds-dialog>
   <nav[\s>](?!.*hds-)              # should use <hds-nav> or <hds-sidebar>
   ```
   Exclude: elements already inside HDS wrapper components, elements in third-party component templates.

   **Incorrect theming** — missing `[theme]` bindings, hardcoded light/dark values:
   ```
   # Detection patterns:
   class=".*dark.*"                  # hardcoded dark theme class
   class=".*light.*"                 # hardcoded light theme class (should use [data-theme])
   style=".*color:.*"               # inline style with color (never acceptable)
   style=".*background:.*"          # inline style with background
   ```

4. **Check `styles.scss` / `angular.json`** for global setup:
   - **HDS theme import** — is `@yourorg/hds/themes` imported?
     ```scss
     // Expected in styles.scss:
     @use '@yourorg/hds/themes' as hds-theme;
     ```
   - **Global token setup** — are CSS custom properties defined at `:root`?
     ```scss
     // Expected:
     :root {
       @include hds-theme.tokens();
     }
     ```
   - **Theme switching** — is `[data-theme]` attribute handling present?
     ```scss
     // Expected:
     [data-theme='dark'] {
       @include hds-theme.dark-tokens();
     }
     ```

5. **Produce findings per file with severity scoring:**

   | Severity | Criteria | Weight |
   |----------|----------|--------|
   | **Critical** | Missing HDS theme import, no token setup at `:root` | 10 |
   | **High** | Hardcoded colors in component styles, raw HTML elements replacing HDS components | 5 |
   | **Medium** | Raw spacing values, deprecated tokens still in use | 3 |
   | **Low** | Raw typography values, minor theming inconsistencies | 1 |

   **Severity score formula:** `score = sum(issues * weight)`. A file with score > 20 is flagged as "critical non-compliance."

6. **Generate summary** with compliance scorecard:
   - Total files scanned
   - Compliant % (files with zero findings)
   - Non-compliant % broken down by severity
   - Top 5 most common issues
   - Overall compliance score: `(compliant_files / total_files) * 100`

## Output

Structured markdown report:

### Compliance Scorecard

| Metric | Value |
|--------|-------|
| Files scanned | 47 |
| Fully compliant | 31 (66%) |
| Critical issues | 2 |
| High issues | 8 |
| Medium issues | 14 |
| Low issues | 6 |
| Overall score | 66/100 |

### Violation Details

| File | Issue | Severity | Line | Current | Expected |
|------|-------|----------|------|---------|----------|
| dashboard.component.scss | Hardcoded color | high | 14 | `color: #3b82f6` | `color: var(--hds-accent-primary)` |
| dashboard.component.scss | Raw spacing | medium | 22 | `padding: 16px` | `padding: var(--hds-space-md)` |
| trade.component.html | Raw table element | high | 8 | `<table class="trade-grid">` | `<hds-data-grid [data]="trades">` |
| trade.component.html | Raw select element | high | 31 | `<select formControlName="type">` | `<hds-select formControlName="type">` |
| sidebar.component.scss | Deprecated token | medium | 5 | `var(--hds-blue-500)` | `var(--hds-accent-primary)` |
| styles.scss | Missing theme import | critical | — | No HDS import | `@use '@yourorg/hds/themes'` |
| app.component.html | No theme switching | critical | — | No `[data-theme]` | `[attr.data-theme]="themeService.theme()"` |

### Top Issues

| Rank | Issue Type | Count | Files Affected |
|------|-----------|-------|----------------|
| 1 | Hardcoded hex colors | 23 | 12 |
| 2 | Raw spacing (px values) | 18 | 9 |
| 3 | Raw HTML elements | 7 | 4 |
| 4 | Deprecated tokens | 5 | 3 |
| 5 | Missing theme setup | 2 | 2 |

## Validation

- Every `.scss`/`.css` file in scope was scanned
- Every `.html` template in scope was scanned for raw element usage
- No false positives on third-party library styles (node_modules excluded)
- SVG data URIs and CSS comments are excluded from color detection
- Test files (`.spec.ts`) are excluded from the audit
- Severity ratings are consistent with the scoring table
- Compliance score is calculated correctly
- No files were modified (read-only audit)
- When reference docs are unavailable, fallback patterns still detect all common violation types
