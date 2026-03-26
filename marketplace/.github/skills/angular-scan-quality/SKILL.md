---
name: angular-scan-quality
description: "Run lint, Lighthouse CLI, bundle size analysis, and accessibility audit"
references:
  - references/angular/v19/best-practices.md
allowed-tools:
  - codebase
  - terminal
---

## Context

Runs quality analysis tools against the project to produce a code health report. Executes ESLint/TSLint, Lighthouse CI, webpack bundle analyzer, and a11y audits. Collects results into a single consolidated report. This is a read-only planner skill — it runs analysis tools but never modifies source files.

## Inputs

- "Run quality scan" — full quality analysis (lint + bundle + a11y + Lighthouse)
- "Check bundle size" — bundle size breakdown only
- "Run a11y audit" — accessibility audit only
- "Lint the project" — lint results only

## Steps

1. **Detect available tooling** — check `package.json` for devDependencies and scripts:
   - **Linting**: look for `eslint`, `@angular-eslint/schematics`, `@typescript-eslint/eslint-plugin` in devDependencies. Check for config files: `.eslintrc.json`, `.eslintrc.js`, `eslint.config.js` (flat config), `.eslintrc.yml`. Check scripts for `"lint": "ng lint"` or `"lint": "nx lint"`.
   - **Bundle analysis**: check for `webpack-bundle-analyzer`, `source-map-explorer`, or `@next/bundle-analyzer` in devDependencies. Check `angular.json` for `budgets` configuration.
   - **Accessibility**: check for `axe-core`, `@axe-core/cli`, `pa11y`, `pa11y-ci`, or `jest-axe` in devDependencies.
   - **Lighthouse**: check for `@lhci/cli`, `lighthouse`, or `lighthouserc.js`/`.lighthouserc.json` config files.
   - **If a tool is not installed**, note it as "not available" in the report and skip that analysis step — do not attempt to install tools.

2. **Run lint analysis** — execute the project's lint command and parse results:
   - Run: `npx ng lint --format=json 2>&1` or `npx nx lint <project> --format=json 2>&1`
   - If JSON output is available, parse it. Otherwise, parse text output line by line.
   - **Categorize ESLint rules** by type:
     - **Angular-specific**: `@angular-eslint/component-selector`, `@angular-eslint/no-empty-lifecycle-method`, `@angular-eslint/prefer-on-push-component-change-detection`, `@angular-eslint/use-lifecycle-interface`
     - **TypeScript**: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/explicit-function-return-type`, `@typescript-eslint/no-floating-promises`
     - **Import order**: `import/order`, `import/no-cycle`, `simple-import-sort/imports`
     - **Code quality**: `no-console`, `no-debugger`, `complexity`, `max-lines-per-function`
     - **Accessibility (template)**: `@angular-eslint/template/alt-text`, `@angular-eslint/template/click-events-have-key-events`, `@angular-eslint/template/label-has-associated-control`
   - Count errors and warnings per category. Identify the top 5 most frequent violations.
   - Note which violations are auto-fixable (`--fix` capable).

3. **Run bundle size analysis** — build and analyze:
   - Run: `npx ng build --configuration production --stats-json 2>&1`
   - The stats file is written to `dist/<project>/stats.json`.
   - If `source-map-explorer` is available: `npx source-map-explorer dist/<project>/browser/*.js --json`
   - Parse the build output for chunk sizes. Angular CLI prints:
     ```
     Initial chunk files   | Names   | Raw size | Estimated transfer size
     main.js               | main    | 482.31 kB | 128.45 kB
     polyfills.js          | polyfills | 33.12 kB | 10.88 kB
     styles.css            | styles  | 18.45 kB | 4.12 kB
     ```
   - **Check against budgets** from `angular.json`:
     ```json
     "budgets": [
       { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
       { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
     ]
     ```
   - **Threshold values** (use project budgets if defined, otherwise these defaults):
     - Initial bundle: PASS < 500kB, WARN 500kB-1MB, FAIL > 1MB
     - Any lazy chunk: PASS < 200kB, WARN 200kB-500kB, FAIL > 500kB
     - Any component style: PASS < 4kB, WARN 4kB-8kB, FAIL > 8kB
   - Identify the largest 3rd-party dependencies in the bundle (e.g., `@angular/core`, `rxjs`, `lodash`, `moment`).

4. **Run accessibility audit** — two-pass approach:
   - **Pass 1 — Static template scan** (always available): scan all `*.component.html` files for anti-patterns:
     - `<img>` without `alt` attribute
     - `<input>` without associated `<label>` or `aria-label`
     - Click handlers without keyboard equivalent: `(click)` without `(keydown)` or `(keyup)`
     - Improper heading hierarchy: `<h3>` appearing before any `<h1>` or `<h2>` in a template
     - Missing `role` attributes on interactive custom elements
     - Color contrast issues in inline styles (if detectable)
   - **Pass 2 — Automated a11y scan** (if `axe-core` or `pa11y` available):
     - Run: `npx pa11y http://localhost:4200 --reporter=json` (requires app to be served)
     - Or run `jest-axe` tests if configured in test suite.
   - Classify issues by severity: Critical, Serious, Moderate, Minor (following WCAG 2.1 AA).

5. **Run Lighthouse CI** (if available):
   - Check if `@lhci/cli` is installed and `lighthouserc` config exists.
   - Run: `npx lhci autorun` or `npx lighthouse http://localhost:4200 --output=json --chrome-flags="--headless"`
   - Extract scores for: Performance, Accessibility, Best Practices, SEO.
   - **Threshold values**:
     - Performance: PASS >= 90, WARN >= 50, FAIL < 50
     - Accessibility: PASS >= 90, WARN >= 70, FAIL < 70
     - Best Practices: PASS >= 90, WARN >= 70, FAIL < 70
     - SEO: PASS >= 90, WARN >= 70, FAIL < 70
   - If Lighthouse is not available, clearly mark "Lighthouse: not configured" and skip.

6. **Compute overall quality scorecard** — weighted score:
   ```
   Overall Score = (lint_score * 0.30) + (bundle_score * 0.25) + (a11y_score * 0.25) + (lighthouse_perf * 0.20)

   where:
     lint_score    = 100 - (errors * 2) - (warnings * 0.5), clamped to [0, 100]
     bundle_score  = 100 if under warning budget, 70 if between warn/error, 0 if over error budget
     a11y_score    = 100 - (critical * 10) - (serious * 5) - (moderate * 2) - (minor * 1), clamped to [0, 100]
     lighthouse_perf = Lighthouse performance score (0-100), or skip if unavailable
   ```

7. **Compile all results** into a single consolidated report.

## Output

```markdown
## Quality Scan — {project_name}

### Summary (Quality Scorecard)
| Category | Score | Status | Threshold | Weight |
|----------|-------|--------|-----------|--------|
| Lint | 12 errors / 34 warnings | WARN | 0 errors = PASS, 1-20 errors = WARN, >20 = FAIL | 30% |
| Bundle Size | 482 kB (initial) | PASS | <500kB PASS, 500kB-1MB WARN, >1MB FAIL | 25% |
| Accessibility | 78/100 | WARN | >=90 PASS, >=70 WARN, <70 FAIL | 25% |
| Lighthouse Perf | 72/100 | WARN | >=90 PASS, >=50 WARN, <50 FAIL | 20% |
| **Overall** | **73/100** | **WARN** | >=80 PASS, >=60 WARN, <60 FAIL | — |

### Lint Results
| Category | Rule | Count | Severity | Auto-fixable? |
|----------|------|-------|----------|--------------|
| Angular | `@angular-eslint/no-empty-lifecycle-method` | 5 | error | No |
| Angular | `@angular-eslint/prefer-on-push-component-change-detection` | 10 | warning | No |
| TypeScript | `@typescript-eslint/no-explicit-any` | 8 | warning | No |
| TypeScript | `@typescript-eslint/no-unused-vars` | 4 | error | Yes |
| Import | `import/order` | 12 | warning | Yes |
| Code Quality | `no-console` | 3 | error | No |
| Template a11y | `@angular-eslint/template/click-events-have-key-events` | 4 | warning | No |
| **Total** | — | **46** | **12 errors, 34 warnings** | **16 auto-fixable** |

### Bundle Analysis
| Chunk | Raw Size | Transfer Size | % of Total | Status | Top Contents |
|-------|----------|---------------|-----------|--------|-------------|
| `main.js` | 482.31 kB | 128.45 kB | 62% | PASS | `@angular/core`, `rxjs`, app code |
| `polyfills.js` | 33.12 kB | 10.88 kB | 4% | PASS | Zone.js polyfills |
| `styles.css` | 18.45 kB | 4.12 kB | 2% | PASS | Global styles, Material theme |
| `chunk-dashboard.js` | 145.20 kB | 38.90 kB | 19% | PASS | Dashboard feature, Chart.js |
| `chunk-reports.js` | 98.30 kB | 26.10 kB | 13% | PASS | Reports feature |
| **Total initial** | **533.88 kB** | **143.45 kB** | — | **WARN** | — |

### Largest 3rd-Party Dependencies
| Package | Estimated Bundle Impact | Notes |
|---------|------------------------|-------|
| `@angular/core` | ~120 kB | Framework core (cannot reduce) |
| `rxjs` | ~45 kB | Tree-shaken, reasonable |
| `chart.js` | ~65 kB | Consider lazy-loading or lighter alternative |
| `@angular/material` | ~55 kB | Only used components are bundled |
| `lodash-es` | ~28 kB | Consider replacing with native methods |

### Budget Compliance
| Budget Type | Configured Limit | Actual | Status |
|------------|-----------------|--------|--------|
| `initial` (warning) | 500 kB | 533.88 kB | EXCEEDED |
| `initial` (error) | 1 MB | 533.88 kB | OK |
| `anyComponentStyle` (warning) | 4 kB | 2.8 kB | OK |
| `anyComponentStyle` (error) | 8 kB | 2.8 kB | OK |

### Accessibility Issues
| Issue | Severity | Count | WCAG Criterion | Locations |
|-------|----------|-------|---------------|-----------|
| `<img>` missing `alt` attribute | Serious | 3 | 1.1.1 Non-text Content | `hero.component.html`, `product-card.component.html` |
| Click handler without keyboard event | Serious | 4 | 2.1.1 Keyboard | `data-table.component.html` (2), `card.component.html` (2) |
| `<input>` without label | Moderate | 2 | 1.3.1 Info and Relationships | `search-bar.component.html`, `filter.component.html` |
| Heading hierarchy skip (`<h1>` → `<h3>`) | Moderate | 1 | 1.3.1 Info and Relationships | `dashboard.component.html` |
| Low contrast ratio (inline style) | Minor | 2 | 1.4.3 Contrast | `status-badge.component.html` |
| **Total** | — | **12** | — | — |

### Lighthouse Scores (if available)
| Metric | Score | Status | Top Recommendation |
|--------|-------|--------|-------------------|
| Performance | 72 | WARN | Reduce JavaScript execution time (chart.js lazy load) |
| Accessibility | 85 | WARN | Add missing alt text, fix heading hierarchy |
| Best Practices | 92 | PASS | — |
| SEO | 88 | WARN | Add meta description, improve `<title>` tags |
| First Contentful Paint | 1.8s | WARN | Target < 1.5s; preload critical fonts |
| Largest Contentful Paint | 3.2s | WARN | Target < 2.5s; optimize hero image |
| Cumulative Layout Shift | 0.05 | PASS | Target < 0.1 |
| Total Blocking Time | 280ms | WARN | Target < 200ms; reduce main thread work |
```

## Validation

- **Lint results from actual execution**: lint counts must come from running `ng lint` or `nx lint`, not from manually scanning source files. The exact command used must be documented. If lint execution fails, report the failure reason and skip the section.
- **Bundle sizes from actual build**: the chunk sizes must come from actual `ng build --configuration production` output. Verify by checking that `dist/` directory was created with the reported files. If the build fails, report the error and skip the section.
- **Budget comparison accuracy**: the configured budgets must be read from `angular.json` → `architect.build.configurations.production.budgets`. The actual vs. configured comparison must be arithmetically correct.
- **A11y issue traceability**: every accessibility issue must reference an actual template file that exists on disk. The issue type must be verifiable by opening the template and finding the anti-pattern (e.g., `<img>` without `alt`).
- **Lighthouse source clarity**: Lighthouse scores must either come from an actual Lighthouse run (document the command) or be explicitly marked "Lighthouse: not configured — scores unavailable." Never estimate Lighthouse scores.
- **Threshold consistency**: the Status column must correctly apply the stated thresholds. For example, if the threshold is "PASS >= 90" and the score is 85, the status must be WARN, not PASS.
- **Overall score calculation**: verify the overall score by re-computing using the weighted formula and the individual category scores. The result must match within 1 point.
- **No source files modified**: confirm that no `.ts`, `.html`, `.scss`, `.json`, or config files were changed. The only artifacts created are build outputs in `dist/` (which are expected from `ng build`).
