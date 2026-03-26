<!-- Example output from /angular-scan-tests — see SKILL.md for usage -->
## Test Scan — Acme Trading Platform

### Summary
| Metric | Count | Status | Threshold |
|--------|-------|--------|-----------|
| Unit tests | 136 | -- | -- |
| Integration tests (TestBed) | 52 | -- | -- |
| E2E tests (Playwright) | 22 | -- | -- |
| Total test files | 68 | -- | -- |
| Skipped tests | 8 | WARN | 0 = PASS, 1-10 = WARN, >10 = FAIL |
| Overall line coverage | 66% | WARN | >=80% PASS, >=60% WARN, <60% FAIL |
| Overall branch coverage | 52% | WARN | >=70% PASS, >=50% WARN, <50% FAIL |
| Overall function coverage | 70% | WARN | >=80% PASS, >=60% WARN, <60% FAIL |
| Files with no spec | 13 of 56 | FAIL | 0 = PASS, 1-5 = WARN, >5 = FAIL |

### Coverage by Module
| Module/Feature | Source Files | Spec Files | Line Coverage | Branch Coverage | Function Coverage | Status |
|---------------|-------------|-----------|---------------|-----------------|-------------------|--------|
| `core/services` | 9 | 9 | 84% | 72% | 88% | PASS |
| `core/models` | 6 | 5 | 92% | 82% | 96% | PASS |
| `core/guards` | 3 | 3 | 80% | 68% | 82% | PASS |
| `core/interceptors` | 3 | 2 | 58% | 42% | 62% | WARN |
| `features/trading` | 9 | 7 | 60% | 45% | 64% | WARN |
| `features/dashboard` | 7 | 5 | 64% | 50% | 60% | WARN |
| `features/portfolio` | 5 | 3 | 48% | 34% | 52% | FAIL |
| `features/settings` | 4 | 2 | 52% | 38% | 55% | WARN |
| `shared-ui` | 6 | 4 | 72% | 58% | 76% | WARN |
| `shared/pipes` | 4 | 4 | 96% | 92% | 100% | PASS |
| **Total** | **56** | **44** | **66%** | **52%** | **70%** | **WARN** |

### Coverage Detail (per-file, sorted by lowest coverage)
| File | Line % | Branch % | Function % | Status |
|------|--------|----------|------------|--------|
| `trading/order-form.component.ts` | 28% | 14% | 32% | FAIL |
| `portfolio/allocation-chart.component.ts` | 30% | 18% | 35% | FAIL |
| `portfolio/performance.component.ts` | 34% | 20% | 38% | FAIL |
| `settings/notif-prefs.component.ts` | 38% | 26% | 42% | FAIL |
| `interceptors/loading.interceptor.ts` | 40% | 28% | 48% | FAIL |
| `trading/trade-history.component.ts` | 42% | 30% | 50% | FAIL |
| `dashboard/analytics.component.ts` | 45% | 32% | 52% | FAIL |
| `settings/profile.component.ts` | 48% | 35% | 55% | FAIL |

### Gap Analysis -- Untested Files (no spec exists)
| File | Type | Public Methods | Severity |
|------|------|---------------|----------|
| `src/app/core/interceptors/error.interceptor.ts` | Interceptor | `intercept()` | Critical |
| `src/app/features/trading/trade-execution.service.ts` | Service | `execute()`, `retry()`, `cancel()` | Critical |
| `src/app/features/portfolio/allocation.service.ts` | Service | `getBreakdown()`, `rebalance()` | Critical |
| `src/app/features/trading/order-confirm-dialog.component.ts` | Component | `onConfirm()`, `onCancel()` | High |
| `src/app/features/trading/price-ticker.component.ts` | Component | `subscribe()`, `unsubscribe()` | High |
| `src/app/features/dashboard/export-dialog.component.ts` | Component | `onExport()` | Medium |
| `src/app/features/dashboard/watchlist-edit.component.ts` | Component | `addSymbol()`, `removeSymbol()` | Medium |
| `src/app/features/portfolio/holdings-detail.component.ts` | Component | `expandRow()`, `refresh()` | Medium |
| `src/app/features/settings/theme.service.ts` | Service | `toggle()`, `getCurrentTheme()` | Critical |
| `src/app/shared/directives/tooltip.directive.ts` | Directive | `show()`, `hide()` | Low |
| `src/app/shared/directives/click-outside.directive.ts` | Directive | -- (host listener only) | Low |
| `src/app/shared/pipes/truncate.pipe.ts` | Pipe | `transform()` | Low |
| `src/app/shared/pipes/relative-time.pipe.ts` | Pipe | `transform()` | Low |

### Gap Analysis -- Untested Public Methods (spec exists but method not tested)
| File | Method | Spec File Exists? | Notes |
|------|--------|-------------------|-------|
| `order.service.ts` | `cancelOrder()` | Yes | Method name absent from any test block |
| `order.service.ts` | `bulkUpdate()` | Yes | Method name absent from any test block |
| `market-data.service.ts` | `reconnect()` | Yes | Only happy path tested, no error case |
| `auth.service.ts` | `refreshToken()` | Yes | Only tested in happy path, no error/expiry case |
| `dashboard.component.ts` | `exportData()` | Yes | No test covers this method |
| `data-table.component.ts` | `onSort()`, `onPageChange()` | Yes | Event handlers untested |
| `holdings.component.ts` | `expandRow()` | Yes | No test covers row expansion |

### Test Quality Issues
| Issue | Count | Severity | Files |
|-------|-------|----------|-------|
| Skipped tests (`xit`/`xdescribe`) | 5 | Medium | `order-form.component.spec.ts` (2), `trade-history.component.spec.ts` (2), `auth.service.spec.ts` (1) |
| Focused tests (`fdescribe`/`fit`) | 1 | High | `order.service.spec.ts` -- will cause other tests to skip in CI |
| Empty assertions | 4 | High | `settings.component.spec.ts` (2), `portfolio.component.spec.ts` (1), `watchlist.component.spec.ts` (1) |
| `NO_ERRORS_SCHEMA` usage | 5 | Medium | `dashboard.component.spec.ts`, `order-list.component.spec.ts`, `holdings.component.spec.ts`, `settings.component.spec.ts`, `analytics.component.spec.ts` |
| Missing async handling | 3 | Medium | `websocket.service.spec.ts`, `market-data.service.spec.ts`, `notification.service.spec.ts` |
| `test.skip` / `describe.skip` | 2 | Medium | `performance.component.spec.ts` (1), `trade-history.component.spec.ts` (1) |

### Framework Config
| Framework | Version | Config File | Purpose | Runner |
|-----------|---------|-------------|---------|--------|
| Jest | 29.7.0 | `jest.config.ts` | Unit and integration tests | `ng test` / `nx test` |
| @angular-builders/jest | 19.0.0 | `angular.json` | Angular-Jest bridge | -- |
| Playwright | 1.42.0 | `playwright.config.ts` | E2E tests | `npx playwright test` |
| istanbul (via Jest) | -- | `jest.config.ts` coverageReporters | Coverage reporting | lcov, json-summary |

### Test Infrastructure Health
| Aspect | Status | Notes |
|--------|--------|-------|
| Test runner configured | PASS | Jest via @angular-builders/jest |
| Coverage reporting | PASS | Istanbul lcov + json-summary |
| E2E framework | PASS | Playwright configured with 3 browser projects |
| CI test execution | PASS | `nx affected:test --code-coverage` in CI workflow |
| Coverage enforcement | WARN | No `coverageThreshold` in `jest.config.ts` -- coverage can silently regress |
| Test file co-location | PASS | Spec files co-located with source files |
| Test data factories | WARN | No shared test data builders detected; tests create inline test data |
