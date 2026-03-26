<!-- Example output from /angular-docs-changelog — see SKILL.md for usage -->
# Changelog

All notable changes to the Acme Trading Platform are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-03-25

### Added
- **trade:** Limit order support with configurable expiry (`feat(trade): add limit order with GTD/GTC expiry`) [`a1b2c3d4`]
- **dashboard:** Real-time P&L streaming via WebSocket connection [`e5f6a7b8`]
- **settlement:** T+1 settlement cycle for bonds and options per SEC Rule 15c6-2 [`c9d0e1f2`]

### Fixed
- **positions:** Unrealized P&L calculation now uses mid-price instead of last trade price [`3a4b5c6d`]
- **trade:** Race condition when submitting multiple orders in rapid succession [`7e8f9a0b`]
- **market-data:** WebSocket reconnection no longer drops buffered price updates [`1c2d3e4f`]

### Changed
- **core:** `AuthInterceptor` now refreshes tokens proactively 60s before expiry [`5a6b7c8d`]
- **portfolio:** Performance metrics calculation moved to a Web Worker to avoid main thread blocking [`9e0f1a2b`]

### Deprecated
- **trade:** `TradeService.submitOrder()` is deprecated in favor of `TradeService.submitTrade()`. Will be removed in v3.0.0 [`3c4d5e6f`]

### Breaking Changes
- **settlement:** `SettlementService.calculateSettlementDate()` now returns a `Promise<Date>` instead of `Date` to support async holiday calendar lookups. Update all call sites to use `await`. [`c9d0e1f2`]

---

## [2.3.1] - 2026-03-11

### Fixed
- **dashboard:** Chart tooltip no longer overflows viewport on mobile [`7a8b9c0d`]
- **positions:** CSV export includes all columns when custom column layout is active [`1e2f3a4b`]

---

## [2.3.0] - 2026-02-25

### Added
- **market-data:** Watchlist support with drag-and-drop symbol reordering [`5c6d7e8f`]
- **portfolio:** Sector allocation pie chart on portfolio detail page [`9a0b1c2d`]

### Fixed
- **trade:** Order form resets correctly after successful submission [`3e4f5a6b`]

[2.4.0]: https://github.com/acme-capital/trading-platform/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/acme-capital/trading-platform/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/acme-capital/trading-platform/compare/v2.2.0...v2.3.0
