<!-- Example output from /angular-test-lint — see SKILL.md for usage -->
## Lint Report — Acme Trading Platform

### Summary Metrics
| Metric           | Value       |
|------------------|-------------|
| Files scanned    | 187         |
| Total violations | 74          |
| Errors           | 14          |
| Warnings         | 60          |
| Auto-fixable     | 31          |
| Manual-fix       | 43          |
| Quality score    | 100 - (5×14) - (2×60) = **-90 → 0/100** |

> **Quality score formula:** `100 - (5 × errors) - (2 × warnings)`, clamped to 0–100.

---

### Violations by Category

#### Angular-specific (`@angular-eslint/*`)
| Rule                                                 | Count | Severity | Fixable |
|------------------------------------------------------|-------|----------|---------|
| `@angular-eslint/no-empty-lifecycle-method`          | 6     | error    | No      |
| `@angular-eslint/prefer-on-push-component-change-detection` | 8 | warning | No      |
| `@angular-eslint/use-lifecycle-interface`            | 4     | warning  | Yes     |
| `@angular-eslint/prefer-standalone`                  | 5     | warning  | Yes     |
| `@angular-eslint/component-selector`                 | 2     | error    | No      |
| **Subtotal**                                         | **25**| 8 err / 17 warn | 9 fixable |

#### TypeScript (`@typescript-eslint/*`)
| Rule                                    | Count | Severity | Fixable |
|-----------------------------------------|-------|----------|---------|
| `@typescript-eslint/no-explicit-any`    | 10    | warning  | No      |
| `@typescript-eslint/no-unused-vars`     | 5     | error    | Yes     |
| `@typescript-eslint/no-floating-promises` | 3   | error    | No      |
| **Subtotal**                            | **18**| 8 err / 10 warn | 5 fixable |

#### Import order (`import/*`)
| Rule              | Count | Severity | Fixable |
|-------------------|-------|----------|---------|
| `import/order`    | 8     | warning  | Yes     |
| `import/no-cycle` | 2     | warning  | No      |
| **Subtotal**      | **10**| 0 err / 10 warn | 8 fixable |

#### Template accessibility (`@angular-eslint/template/*`)
| Rule                                                        | Count | Severity | Fixable |
|-------------------------------------------------------------|-------|----------|---------|
| `@angular-eslint/template/click-events-have-key-events`     | 6     | warning  | No      |
| `@angular-eslint/template/alt-text`                         | 3     | error    | No      |
| `@angular-eslint/template/label-has-associated-control`     | 2     | warning  | No      |
| `@angular-eslint/template/no-positive-tabindex`             | 1     | error    | No      |
| **Subtotal**                                                | **12**| 4 err / 8 warn | 0 fixable |

#### Code quality (general)
| Rule           | Count | Severity | Fixable |
|----------------|-------|----------|---------|
| `no-console`   | 4     | warning  | No      |
| `complexity`   | 2     | warning  | No      |
| `eqeqeq`       | 3     | warning  | Yes     |
| **Subtotal**   | **9** | 0 err / 9 warn | 3 fixable |

---

### Top 10 Rules by Frequency
| Rank | Rule                                                 | Count |
|------|------------------------------------------------------|-------|
| 1    | `@typescript-eslint/no-explicit-any`                 | 10    |
| 2    | `import/order`                                       | 8     |
| 3    | `@angular-eslint/prefer-on-push-component-change-detection` | 8 |
| 4    | `@angular-eslint/no-empty-lifecycle-method`          | 6     |
| 5    | `@angular-eslint/template/click-events-have-key-events` | 6  |
| 6    | `@typescript-eslint/no-unused-vars`                  | 5     |
| 7    | `@angular-eslint/prefer-standalone`                  | 5     |
| 8    | `@angular-eslint/use-lifecycle-interface`            | 4     |
| 9    | `no-console`                                         | 4     |
| 10   | `@typescript-eslint/no-floating-promises`            | 3     |

---

### Auto-Fix Command Suggestions

**Fix all auto-fixable issues at once:**
```bash
npx eslint --fix src/
```

**Fix only import ordering:**
```bash
npx eslint --fix --rule '{"import/order": "error"}' src/
```

**Fix only lifecycle interface violations:**
```bash
npx eslint --fix --rule '{"@angular-eslint/use-lifecycle-interface": "error"}' src/
```

**Fix only unused variables:**
```bash
npx eslint --fix --rule '{"@typescript-eslint/no-unused-vars": "error"}' src/
```

**Dry-run to preview fixable changes:**
```bash
npx eslint --fix-dry-run --format json src/ | jq '.[].messages[] | select(.fix)'
```

> After running auto-fix, re-run `npx eslint --format json src/` to verify the remaining 43 manual-fix issues.
