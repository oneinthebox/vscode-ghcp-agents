# Elevate Compliance Report

**Generated:** 2026-03-25
**Project:** orch-trading-platform
**Files scanned:** 89 TypeScript files (excluding specs)

---

## Summary

| Category | Violations | Severity | Required Service |
|----------|-----------|----------|-----------------|
| Logging  | 31        | High     | `LoggingService` |
| Config   | 12        | High     | `ConfigService` |
| URLs     | 8         | Medium   | `ConfigService` |
| Auth     | 5         | High     | `ElevateAuthService` |
| **Total**| **56**    |          |                 |

## Violations by Library

| Library / Feature Area | Logging | Config | URL | Auth | Total |
|------------------------|---------|--------|-----|------|-------|
| `libs/trade-execution` | 12 | 4 | 3 | 2 | 21 |
| `libs/portfolio-analytics` | 8 | 3 | 2 | 0 | 13 |
| `libs/market-data` | 6 | 2 | 1 | 1 | 10 |
| `libs/shared/utils` | 3 | 2 | 1 | 0 | 6 |
| `apps/shell` | 2 | 1 | 1 | 2 | 6 |

## Logging Violations (31 total, severity: high)

Direct `console.*` calls must be replaced with `LoggingService`.

| # | File | Line | Found | Replace With |
|---|------|------|-------|--------------|
| 1 | `trade-execution/order.service.ts` | 45 | `console.log('Order submitted')` | `this.logger.info(...)` |
| 2 | `trade-execution/order.service.ts` | 78 | `console.error('Failed')` | `this.logger.error(...)` |
| 3 | `trade-execution/blotter.component.ts` | 32 | `console.log('Blotter loaded')` | `this.logger.info(...)` |
| 4 | `portfolio-analytics/risk.service.ts` | 22 | `console.warn('Stale data')` | `this.logger.warn(...)` |
| 5 | `portfolio-analytics/pnl.component.ts` | 56 | `console.log('P&L calculated')` | `this.logger.info(...)` |
| ... | *26 more violations* | | | |

## Config Violations (12 total, severity: high)

Direct `localStorage`/`sessionStorage` access must use `ConfigService`.

| # | File | Line | Found | Replace With |
|---|------|------|-------|--------------|
| 1 | `trade-execution/preferences.service.ts` | 14 | `localStorage.getItem('theme')` | `this.config.get('theme')` |
| 2 | `trade-execution/preferences.service.ts` | 28 | `localStorage.setItem('theme', v)` | `this.config.set('theme', v)` |
| 3 | `market-data/cache.service.ts` | 9 | `sessionStorage.getItem('ws-token')` | `this.config.get('ws-token')` |
| 4 | `shared/utils/feature-flags.ts` | 11 | `localStorage.getItem('flags')` | `this.config.get('flags')` |
| ... | *8 more violations* | | | |

## URL Violations (8 total, severity: medium)

Hardcoded URLs must use `ConfigService.getApiBaseUrl()`.

| # | File | Line | Found |
|---|------|------|-------|
| 1 | `trade-execution/order.service.ts` | 12 | `'https://api.prod.orch.com/v1/orders'` |
| 2 | `market-data/stream.service.ts` | 8 | `'wss://ws.prod.orch.com/market'` |
| 3 | `portfolio-analytics/report.service.ts` | 15 | `'https://api.prod.orch.com/v1/reports'` |
| ... | *5 more violations* | | |

## Auth Violations (5 total, severity: high)

Custom authentication patterns must use `ElevateAuthService`.

| # | File | Line | Found |
|---|------|------|-------|
| 1 | `apps/shell/auth-interceptor.ts` | 22 | Manual Authorization header construction |
| 2 | `apps/shell/token.utils.ts` | 8 | `atob()` for manual token decoding |
| 3 | `apps/shell/token.utils.ts` | 15 | Manual JWT decode |
| 4 | `market-data/ws-auth.service.ts` | 31 | Manual Authorization header construction |
| 5 | `apps/shell/session.guard.ts` | 12 | Direct cookie access via `document.cookie` |

---

## Recommendations

1. **Critical** — Replace all `console.*` calls with `inject(LoggingService)` to enable structured logging and log aggregation.
2. **Critical** — Migrate `localStorage`/`sessionStorage` to `ConfigService` for environment-aware configuration.
3. **Critical** — Remove custom auth code and use `ElevateAuthService` for SSO and token management.
4. **High** — Replace hardcoded URLs with `ConfigService.getApiBaseUrl()` for environment portability.
5. Run `node scripts/scan-elevate-compliance.js` in CI to prevent regressions.
6. Use `/angular-elevate-apply` to auto-migrate logging and config patterns.
