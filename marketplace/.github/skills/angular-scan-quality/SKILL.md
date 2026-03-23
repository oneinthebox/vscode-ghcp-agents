---
name: angular-scan-quality
description: "Run lint, Lighthouse CLI, bundle size analysis, and accessibility audit"
---

## Context

Runs quality analysis tools against the project to produce a code health report. Executes ESLint/TSLint, Lighthouse CI, webpack bundle analyzer, and a11y audits. Collects results into a single consolidated report. This is a read-only planner skill — it runs analysis tools but never modifies source files.

## Inputs

- "Run quality scan" — full quality analysis (lint + bundle + a11y + Lighthouse)
- "Check bundle size" — bundle size breakdown only
- "Run a11y audit" — accessibility audit only
- "Lint the project" — lint results only

## Steps

1. Detect available tooling: check `package.json` scripts for `lint`, `build`, existing tool configs (`.eslintrc`, `lighthouserc`, etc.).
2. Run lint analysis:
   - Execute the project's lint command (e.g., `ng lint` or `nx lint`).
   - Count errors and warnings by rule category.
   - Identify the top 5 most frequent lint violations.
3. Run bundle size analysis:
   - Execute a production build with stats (`ng build --stats-json` or equivalent).
   - Parse the stats output to identify largest bundles, lazy chunks, and tree-shaking effectiveness.
   - Compare against budget thresholds if defined in `angular.json`.
4. Run accessibility audit:
   - Scan templates for a11y anti-patterns: missing `alt`, missing `aria-label`, improper heading hierarchy.
   - If `axe-core` or `pa11y` is available, run automated a11y checks.
5. Run Lighthouse CI (if available):
   - Execute Lighthouse against served app or use `lhci` if configured.
   - Extract performance, accessibility, best practices, and SEO scores.
6. Compile all results into a single report.

## Output

```markdown
## Quality Scan — {project_name}

### Summary
| Category | Score | Status |
|----------|-------|--------|
| Lint | {errors}/{warnings} | {pass/warn/fail} |
| Bundle Size | {main_kb} KB | {under/over budget} |
| Accessibility | {score}/100 | {pass/warn/fail} |
| Lighthouse Perf | {score}/100 | {pass/warn/fail} |

### Lint Results
| Rule | Count | Severity | Auto-fixable? |

### Bundle Analysis
| Chunk | Size (KB) | % of Total | Contents |

### Accessibility Issues
| Issue | Severity | Count | Location |

### Lighthouse Scores
| Metric | Score | Recommendation |
```

## Validation

- Lint results come from actual tool execution, not source reading
- Bundle sizes are from actual production build output
- a11y issues reference real template files and line numbers
- Lighthouse scores are from actual Lighthouse runs (or clearly marked as unavailable)
- No source files are modified during the scan
