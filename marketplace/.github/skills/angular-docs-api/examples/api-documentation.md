<!-- Example output from /angular-docs-api — see SKILL.md for usage -->
# API Documentation — Acme Trading Platform

**Generated:** 2026-03-25T14:30:00Z
**Source:** `apps/trading-platform/src/app`
**Services scanned:** 6

---

## TradeService

Base URL: `/api/v2/trades`

| Method | URL | Description | Auth | Request Body | Response |
|--------|-----|-------------|------|--------------|----------|
| `GET` | `/api/v2/trades` | List trades with pagination and filters | Bearer JWT | — | `PaginatedResponse<Trade>` |
| `GET` | `/api/v2/trades/:id` | Get trade by ID | Bearer JWT | — | `Trade` |
| `POST` | `/api/v2/trades` | Submit a new trade order | Bearer JWT | `CreateTradeRequest` | `Trade` |
| `PUT` | `/api/v2/trades/:id` | Update pending trade | Bearer JWT | `UpdateTradeRequest` | `Trade` |
| `DELETE` | `/api/v2/trades/:id/cancel` | Cancel a pending trade | Bearer JWT | — | `{ status: 'cancelled' }` |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INVALID_TRADE` | Request body fails validation (missing symbol, invalid quantity) |
| `401` | `UNAUTHORIZED` | Missing or expired JWT token |
| `404` | `TRADE_NOT_FOUND` | Trade ID does not exist |
| `409` | `TRADE_ALREADY_SETTLED` | Cannot modify a settled trade |
| `429` | `RATE_LIMIT` | Exceeded 100 requests per minute |

---

## PortfolioService

Base URL: `/api/v2/portfolios`

| Method | URL | Description | Auth | Request Body | Response |
|--------|-----|-------------|------|--------------|----------|
| `GET` | `/api/v2/portfolios` | List all portfolios for current user | Bearer JWT | — | `Portfolio[]` |
| `GET` | `/api/v2/portfolios/:id` | Get portfolio with holdings | Bearer JWT | — | `PortfolioDetail` |
| `GET` | `/api/v2/portfolios/:id/performance` | Get performance metrics | Bearer JWT | — | `PerformanceMetrics` |
| `POST` | `/api/v2/portfolios` | Create a new portfolio | Bearer JWT | `CreatePortfolioRequest` | `Portfolio` |
| `PATCH` | `/api/v2/portfolios/:id` | Update portfolio name/tags | Bearer JWT | `UpdatePortfolioRequest` | `Portfolio` |

---

## MarketDataService

Base URL: `/api/v2/market`

| Method | URL | Description | Auth | Request Body | Response |
|--------|-----|-------------|------|--------------|----------|
| `GET` | `/api/v2/market/quotes/:symbol` | Get latest quote for a symbol | API Key | — | `Quote` |
| `GET` | `/api/v2/market/quotes` | Batch quotes (up to 50 symbols) | API Key | — | `Quote[]` |
| `WS` | `/api/v2/market/stream` | Real-time price stream | API Key | — | `PriceUpdate` (stream) |

---

## Interceptors

| Name | Order | Purpose | Headers Modified |
|------|-------|---------|------------------|
| `AuthInterceptor` | 1 | Attaches Bearer token from AuthService | `Authorization` |
| `RetryInterceptor` | 2 | Retries failed requests (1x on 500/503) | — |
| `CacheInterceptor` | 3 | Caches GET responses for 30s | `X-Cache-Status` |
| `ErrorInterceptor` | 4 | Maps HTTP errors to domain error types | — |

---

## Request / Response Types

| Type | Fields | Notes |
|------|--------|-------|
| `CreateTradeRequest` | `symbol: string, side: 'buy'\|'sell', quantity: number, orderType: 'market'\|'limit', limitPrice?: number` | `limitPrice` required when `orderType` is `limit` |
| `UpdateTradeRequest` | `quantity?: number, limitPrice?: number` | Only modifiable fields; trade must be in `pending` status |
| `Trade` | `id, symbol, side, quantity, orderType, limitPrice, status, createdAt, settledAt` | `status`: `pending \| filled \| cancelled \| failed` |
| `Portfolio` | `id, name, tags, createdAt, holdingCount` | |
| `PortfolioDetail` | `...Portfolio, holdings: Holding[], totalValue: number` | |
| `Holding` | `symbol, quantity, avgCost, currentPrice, unrealizedPnl` | `unrealizedPnl` calculated server-side |
| `PerformanceMetrics` | `returnPercent, sharpeRatio, maxDrawdown, periodDays` | Default period: 30 days |
| `Quote` | `symbol, bid, ask, last, volume, timestamp` | |
| `PriceUpdate` | `symbol, price, change, changePercent, timestamp` | WebSocket message format |
| `PaginatedResponse<T>` | `items: T[], total: number, page: number, pageSize: number` | Default `pageSize`: 25 |
