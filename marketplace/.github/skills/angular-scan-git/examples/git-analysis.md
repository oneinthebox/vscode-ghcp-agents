<!-- Example output from /angular-scan-git — see SKILL.md for usage -->
## Git Scan — Acme Trading Platform

### Summary
| Metric | Value |
|--------|-------|
| Total commits | 1,384 |
| Date range | 2023-09-12 to 2026-03-24 (2 years, 6 months) |
| Contributors (all-time) | 14 |
| Contributors (6 months) | 6 |
| Releases/tags | 27 (v1.0.0 -- v3.2.1) |
| Bus factor | 2 (top 2 contributors own 81% of recent commits) |
| Commit convention adherence | 89% Conventional Commits |
| Average release cadence | 16 days |

### Commit Frequency (last 12 months)
```
2026-03  ████████████████████  44
2026-02  ██████████████████    38
2026-01  ████████████████████  42
2025-12  ████████              17  (holiday period)
2025-11  ██████████████████    36
2025-10  ████████████████████  43
2025-09  ██████████████████    37
2025-08  ██████████████        29
2025-07  ████████              16  (holiday period)
2025-06  ██████████████████    38
2025-05  ████████████████████  41
2025-04  ████████████████████  40
```

### Commit Patterns
| Convention | Example | Count (last 100) | % |
|-----------|---------|-------------------|---|
| `feat:` | `feat(trading): add limit order support` | 31 | 31% |
| `fix:` | `fix(portfolio): correct allocation rounding` | 26 | 26% |
| `chore:` | `chore(deps): update Angular to 19.2` | 14 | 14% |
| `refactor:` | `refactor(dashboard): migrate to signals` | 9 | 9% |
| `test:` | `test(orders): add execution retry specs` | 5 | 5% |
| `perf:` | `perf(watchlist): debounce quote polling` | 2 | 2% |
| `docs:` | `docs: update API endpoint reference` | 2 | 2% |
| Non-conventional | `Update version` | 11 | 11% |

### Active Contributors (last 6 months)
| Contributor | Commits | % of Total | Primary Areas |
|------------|---------|-----------|---------------|
| Alice Chen | 72 | 44% | `features/trading/`, `core/services/`, `shared-ui/` |
| Bob Martinez | 61 | 37% | `features/portfolio/`, `features/dashboard/`, `core/models/` |
| Carol Kim | 14 | 9% | `features/settings/`, `shared-ui/` |
| Dave Wilson | 9 | 5% | `e2e/`, `.github/workflows/` |
| Eve Johnson | 5 | 3% | `docs/`, `README.md` |
| Frank Lee | 3 | 2% | `features/dashboard/analytics/` |

### Release History (last 10 releases)
| Version | Date | Days Since Previous | Commits | Highlights |
|---------|------|--------------------|---------|-----------|
| v3.2.1 | 2026-03-20 | 8 | 6 | Hotfix: order execution timeout handling |
| v3.2.0 | 2026-03-12 | 18 | 22 | Feature: limit order support |
| v3.1.0 | 2026-02-22 | 14 | 16 | Feature: portfolio performance charts |
| v3.0.1 | 2026-02-08 | 5 | 4 | Fix: watchlist sync issue |
| v3.0.0 | 2026-02-03 | 28 | 38 | Breaking: Angular 19 migration |
| v2.8.0 | 2026-01-06 | 20 | 18 | Feature: trade history export |
| v2.7.0 | 2025-12-17 | 16 | 14 | Feature: dark mode for trading view |
| v2.6.0 | 2025-12-01 | 22 | 24 | Feature: advanced order types |
| v2.5.0 | 2025-11-09 | 12 | 10 | Feature: real-time price streaming |
| v2.4.0 | 2025-10-28 | 18 | 20 | Feature: allocation rebalancer |

### Hotspots (most changed files, last 6 months)
| Rank | File | Commits | Contributors | Last Changed | Hotspot Score |
|------|------|---------|-------------|-------------|---------------|
| 1 | `src/app/features/trading/order-form.component.ts` | 32 | 3 | 1 day ago | 32.0 |
| 2 | `src/app/core/services/order.service.ts` | 26 | 2 | 3 days ago | 26.0 |
| 3 | `src/app/features/trading/trade-execution.service.ts` | 21 | 2 | 5 days ago | 21.0 |
| 4 | `src/app/features/dashboard/dashboard.component.ts` | 18 | 3 | 1 week ago | 18.0 |
| 5 | `src/app/shared/ui/data-table/data-table.component.ts` | 15 | 3 | 4 days ago | 15.0 |
| 6 | `src/app/features/portfolio/holdings.component.ts` | 14 | 2 | 2 weeks ago | 9.8 |
| 7 | `src/app/core/services/market-data.service.ts` | 12 | 2 | 3 weeks ago | 8.4 |
| 8 | `src/app/core/interceptors/auth.interceptor.ts` | 10 | 1 | 1 month ago | 7.0 |

### Hotspots by Directory
| Directory | Total Commits | Files Changed | Top Contributor |
|-----------|--------------|---------------|----------------|
| `features/trading/` | 68 | 9 | Alice Chen (58%) |
| `core/services/` | 48 | 7 | Alice Chen (52%) |
| `features/dashboard/` | 34 | 7 | Bob Martinez (62%) |
| `features/portfolio/` | 28 | 5 | Bob Martinez (68%) |
| `shared-ui/` | 22 | 6 | Carol Kim (45%) |

### Dead Zones (no changes in 12+ months)
| File/Directory | Last Commit | Age | Risk |
|---------------|-------------|-----|------|
| `src/app/legacy/v1-adapter.service.ts` | 2024-09-05 | 18 months | Low (scheduled for removal in v4.0) |
| `src/app/shared/pipes/legacy-currency.pipe.ts` | 2024-11-20 | 16 months | Medium (still imported by 2 components) |
| `src/app/shared/directives/drag-drop.directive.ts` | 2025-01-10 | 14 months | Low (replaced by CDK DragDrop) |
| `src/assets/i18n/deprecated/` | 2024-07-15 | 20 months | Low (unused directory) |

### Branch Strategy
| Aspect | Observed Pattern | Evidence |
|--------|-----------------|---------|
| Naming convention | `feature/<ticket>-<description>` (e.g., `feature/TRADE-456-limit-orders`) | 88% of branches follow this pattern |
| Integration branches | `main` (production), `develop` (staging) | Both present in remote |
| Merge style | Squash merge | PR merge commits show squashed format |
| Active branches | 9 (4 feature, 2 bugfix, 1 release, main, develop) | `git branch -a` |
| Stale branches (3+ months) | 3 | `feature/old-websocket-poc`, `bugfix/legacy-format`, `feature/v1-compat` |
| Branch protection | `main` requires PR reviews | No direct pushes to main in history |
