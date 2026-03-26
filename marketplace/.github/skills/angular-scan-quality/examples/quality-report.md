<!-- Example output from /angular-scan-quality — see SKILL.md for usage -->
## Quality Scan — Acme Trading Platform

### Summary (Quality Scorecard)
| Category | Score | Status | Threshold | Weight |
|----------|-------|--------|-----------|--------|
| Lint | 14 errors / 38 warnings | WARN | 0 errors = PASS, 1-20 errors = WARN, >20 = FAIL | 30% |
| Bundle Size | 492 kB (initial) | PASS | <500kB PASS, 500kB-1MB WARN, >1MB FAIL | 25% |
| Accessibility | 76/100 | WARN | >=90 PASS, >=70 WARN, <70 FAIL | 25% |
| Lighthouse Perf | 68/100 | WARN | >=90 PASS, >=50 WARN, <50 FAIL | 20% |
| **Overall** | **71/100** | **WARN** | >=80 PASS, >=60 WARN, <60 FAIL | -- |

### Lint Results
| Category | Rule | Count | Severity | Auto-fixable? |
|----------|------|-------|----------|--------------|
| Angular | `@angular-eslint/no-empty-lifecycle-method` | 6 | error | No |
| Angular | `@angular-eslint/prefer-on-push-component-change-detection` | 8 | warning | No |
| Angular | `@angular-eslint/use-lifecycle-interface` | 4 | warning | Yes |
| TypeScript | `@typescript-eslint/no-explicit-any` | 10 | warning | No |
| TypeScript | `@typescript-eslint/no-unused-vars` | 5 | error | Yes |
| TypeScript | `@typescript-eslint/no-floating-promises` | 3 | error | No |
| Import | `import/order` | 8 | warning | Yes |
| Import | `import/no-cycle` | 2 | warning | No |
| Code Quality | `no-console` | 4 | warning | No |
| Code Quality | `complexity` | 2 | warning | No |
| Template a11y | `@angular-eslint/template/click-events-have-key-events` | 6 | warning | No |
| Template a11y | `@angular-eslint/template/alt-text` | 2 | warning | No |
| **Total** | -- | **60** | **14 errors, 46 warnings** | **18 auto-fixable** |

### Bundle Analysis
| Chunk | Raw Size | Transfer Size | % of Total | Status | Top Contents |
|-------|----------|---------------|-----------|--------|-------------|
| `main.js` | 492.18 kB | 132.60 kB | 58% | PASS | `@angular/core`, `rxjs`, `@ngrx/store`, app code |
| `polyfills.js` | 33.45 kB | 11.02 kB | 4% | PASS | Zone.js polyfills |
| `styles.css` | 22.10 kB | 5.18 kB | 3% | PASS | Global styles, Material theme |
| `chunk-trading.js` | 168.40 kB | 44.20 kB | 20% | PASS | Trading feature, ag-grid subset |
| `chunk-dashboard.js` | 89.50 kB | 23.80 kB | 10% | PASS | Dashboard feature, Chart.js |
| `chunk-portfolio.js` | 42.30 kB | 11.60 kB | 5% | PASS | Portfolio feature |
| **Total initial** | **547.73 kB** | **148.80 kB** | -- | **WARN** | -- |

### Largest 3rd-Party Dependencies
| Package | Estimated Bundle Impact | Notes |
|---------|------------------------|-------|
| `@angular/core` | ~125 kB | Framework core (cannot reduce) |
| `ag-grid-community` | ~82 kB | Loaded only in trading chunk (lazy) |
| `chart.js` | ~68 kB | Loaded only in dashboard chunk (lazy) |
| `rxjs` | ~48 kB | Tree-shaken, reasonable |
| `@angular/material` | ~58 kB | Only used components are bundled |
| `@ngrx/store` | ~32 kB | State management core |
| `lodash-es` | ~24 kB | Consider replacing with native methods |

### Budget Compliance
| Budget Type | Configured Limit | Actual | Status |
|------------|-----------------|--------|--------|
| `initial` (warning) | 500 kB | 492.18 kB | OK |
| `initial` (error) | 1 MB | 492.18 kB | OK |
| `anyComponentStyle` (warning) | 4 kB | 3.1 kB | OK |
| `anyComponentStyle` (error) | 8 kB | 3.1 kB | OK |
| `anyScript` (warning) | 200 kB | 168.40 kB | OK |
| `anyScript` (error) | 500 kB | 168.40 kB | OK |

### Accessibility Issues
| Issue | Severity | Count | WCAG Criterion | Locations |
|-------|----------|-------|---------------|-----------|
| Click handler without keyboard event | Serious | 6 | 2.1.1 Keyboard | `data-table.component.html` (2), `order-list.component.html` (2), `watchlist.component.html` (2) |
| `<img>` missing `alt` attribute | Serious | 2 | 1.1.1 Non-text Content | `stats-card.component.html`, `holdings.component.html` |
| `<input>` without label | Moderate | 3 | 1.3.1 Info and Relationships | `order-form.component.html` (2), `search-bar.component.html` (1) |
| Heading hierarchy skip (`<h1>` to `<h3>`) | Moderate | 1 | 1.3.1 Info and Relationships | `dashboard.component.html` |
| Low contrast ratio (inline style) | Minor | 2 | 1.4.3 Contrast | `status-badge.component.html`, `price-change.component.html` |
| **Total** | -- | **14** | -- | -- |

### Lighthouse Scores
| Metric | Score | Status | Top Recommendation |
|--------|-------|--------|-------------------|
| Performance | 68 | WARN | Reduce JavaScript execution time (ag-grid lazy load, tree-shake lodash) |
| Accessibility | 82 | WARN | Add missing alt text, fix click-without-keyboard handlers |
| Best Practices | 91 | PASS | -- |
| SEO | 85 | WARN | Add meta description, improve `<title>` tags per route |
| First Contentful Paint | 2.1s | WARN | Target < 1.5s; preload critical fonts, defer non-essential CSS |
| Largest Contentful Paint | 3.5s | WARN | Target < 2.5s; optimize hero chart rendering |
| Cumulative Layout Shift | 0.08 | PASS | Target < 0.1 |
| Total Blocking Time | 320ms | WARN | Target < 200ms; reduce main thread work from ag-grid initialization |
