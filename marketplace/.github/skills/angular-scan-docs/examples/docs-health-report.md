<!-- Example output from /angular-scan-docs — see SKILL.md for usage -->
## Documentation Scan — Acme Trading Platform

### Summary
| Metric | Value | Status | Threshold |
|--------|-------|--------|-----------|
| README completeness | 71% (5/7 sections) | WARN | pass >= 85%, warn >= 50%, fail < 50% |
| TSDoc coverage | 41% (52/126 symbols) | WARN | pass >= 70%, warn >= 40%, fail < 40% |
| Comment quality score | 68/100 | WARN | pass >= 80, warn >= 50, fail < 50 |
| Doc tooling | Compodoc configured | PASS | -- |
| Storybook coverage | 45% (18/40 components) | WARN | pass >= 60%, warn >= 30%, fail < 30% |

### README Assessment
| Section | Status | Notes |
|---------|--------|-------|
| Project description | Present | Clear one-paragraph description of the trading platform |
| Installation | Present | Node 20+, `npm install` documented |
| Usage / Getting started | Present | `ng serve`, proxy config for market data API |
| Configuration | Partial | Mentions `.env` but no key descriptions for WS_ENDPOINT |
| Build & Deploy | Missing | No build or deployment instructions |
| Contributing | Present | Links to `CONTRIBUTING.md` with PR template |
| License | Missing | No LICENSE file or section |
| Angular version accuracy | WARN | README says "Angular 18", `package.json` has `^19.2.0` |

### TSDoc Coverage by Module
| Module/Feature | Exported Symbols | Documented | Coverage % | Status |
|----------------|-----------------|------------|-----------|--------|
| `core/services` | 28 | 22 | 79% | PASS |
| `core/models` | 18 | 14 | 78% | PASS |
| `features/trading` | 24 | 8 | 33% | FAIL |
| `features/dashboard` | 20 | 5 | 25% | FAIL |
| `features/portfolio` | 14 | 2 | 14% | FAIL |
| `features/settings` | 10 | 1 | 10% | FAIL |
| `shared-ui` | 12 | 0 | 0% | FAIL |
| **Total** | **126** | **52** | **41%** | **WARN** |

### Undocumented Public APIs (top 15 by impact)
| File | Symbol | Type | Public Methods |
|------|--------|------|---------------|
| `src/app/features/trading/order-form.component.ts` | `OrderFormComponent` | Component | `onSubmit()`, `validateOrder()`, `resetForm()` |
| `src/app/features/trading/trade-execution.service.ts` | `TradeExecutionService` | Service | `execute()`, `retry()`, `cancel()` |
| `src/app/features/dashboard/dashboard.component.ts` | `DashboardComponent` | Component | `refresh()`, `onFilterChange()`, `exportData()` |
| `src/app/features/dashboard/watchlist.component.ts` | `WatchlistComponent` | Component | `addSymbol()`, `removeSymbol()`, `sort()` |
| `src/app/shared/ui/data-table/data-table.component.ts` | `DataTableComponent` | Component | `sort()`, `paginate()`, `filter()` |
| `src/app/shared/ui/price-chart/price-chart.component.ts` | `PriceChartComponent` | Component | `updateData()`, `setTimeRange()` |
| `src/app/features/portfolio/holdings.component.ts` | `HoldingsComponent` | Component | `refresh()`, `expandRow()` |
| `src/app/features/portfolio/allocation.service.ts` | `AllocationService` | Service | `getBreakdown()`, `rebalance()` |
| `src/app/features/settings/profile.component.ts` | `ProfileComponent` | Component | `onSave()`, `validate()` |
| `src/app/features/trading/order-list.component.ts` | `OrderListComponent` | Component | `cancelOrder()`, `filterByStatus()` |
| `src/app/shared/ui/confirm-dialog/confirm-dialog.component.ts` | `ConfirmDialogComponent` | Component | `open()`, `confirm()` |
| `src/app/shared/ui/loading-spinner/loading-spinner.component.ts` | `LoadingSpinnerComponent` | Component | -- |
| `src/app/features/dashboard/analytics.component.ts` | `AnalyticsComponent` | Component | `setDateRange()`, `refresh()` |
| `src/app/features/portfolio/performance.component.ts` | `PerformanceComponent` | Component | `setTimeRange()`, `toggleBenchmark()` |
| `src/app/features/trading/trade-history.component.ts` | `TradeHistoryComponent` | Component | `exportCsv()`, `filterByDate()` |

### Comment Quality Issues
| Issue | Count | Severity | Top Files |
|-------|-------|----------|-----------|
| `// TODO` / `// FIXME` | 16 | Medium | `order.service.ts` (5), `trade-execution.service.ts` (3), `dashboard.component.ts` (2) |
| Commented-out code blocks | 8 | High | `market-data.service.ts` (3), `portfolio.component.ts` (2), `watchlist.component.ts` (2) |
| Empty doc blocks (`/** */`) | 4 | Medium | `data-table.component.ts`, `price-chart.component.ts`, `confirm-dialog.component.ts`, `loading-spinner.component.ts` |
| `// @ts-ignore` | 3 | High | `v1-adapter.service.ts` (2), `legacy-currency.pipe.ts` (1) |
| `// eslint-disable` | 6 | Low | `custom-validators.ts` (2), `date-utils.ts` (1), `format-helpers.ts` (1), `order-form.component.ts` (2) |
| Single-word comments | 9 | Low | Various files |

### Documentation Tooling
| Tool | Configured? | Config File | Notes |
|------|------------|-------------|-------|
| Compodoc | Yes | `tsconfig.doc.json`, `"docs": "compodoc -p tsconfig.doc.json"` | Last generated: unknown (check `documentation/` dir) |
| Storybook | Yes | `.storybook/main.ts` | 18 story files for 40 components (45% coverage) |
| Typedoc | No | -- | Not installed |
| ADRs | Yes | `docs/decisions/` | 7 ADRs, most recent: `007-signals-migration.md` |

### Documentation Format Consistency
| Format | Usage | Percentage |
|--------|-------|-----------|
| TSDoc (`@param name - desc`) | 38 doc blocks | 73% |
| JSDoc (`@param {type} name desc`) | 14 doc blocks | 27% |
| **Recommendation** | Standardize on TSDoc format -- it is the dominant convention and correct for TypeScript |
