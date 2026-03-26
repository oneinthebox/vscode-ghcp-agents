<!-- Example output from /angular-scan-features — see SKILL.md for usage -->
## Feature Scan — Acme Trading Platform

### Summary
- Feature areas: 4 (Dashboard, Trading, Portfolio, Settings)
- Routes: 12 (8 lazy-loaded, 4 eager)
- API endpoints consumed: 22
- Shared components: 6
- Feature flags detected: 2

### Feature Map
| Feature Area | Routes | Components | Services | API Endpoints | Complexity |
|-------------|--------|------------|----------|---------------|-----------|
| Dashboard | 3 | 7 | 3 | 6 | High (29) |
| Trading | 4 | 9 | 4 | 8 | High (38) |
| Portfolio | 3 | 5 | 2 | 5 | Medium (22) |
| Settings | 2 | 4 | 2 | 3 | Medium (15) |

### Route-to-Component Map
| Route | Component | Lazy? | Guards | Feature Area |
|-------|-----------|-------|--------|-------------|
| `/` | redirect to `/dashboard` | -- | -- | -- |
| `/dashboard` | `DashboardComponent` | Yes (`loadComponent`) | `AuthGuard` | Dashboard |
| `/dashboard/analytics` | `AnalyticsComponent` | Yes | `AuthGuard` | Dashboard |
| `/dashboard/watchlist` | `WatchlistComponent` | Yes | `AuthGuard` | Dashboard |
| `/trading` | `TradingComponent` | Yes (`loadChildren`) | `AuthGuard` | Trading |
| `/trading/orders` | `OrderListComponent` | Yes | `AuthGuard` | Trading |
| `/trading/orders/new` | `OrderFormComponent` | Yes | `AuthGuard`, `RoleGuard('trader')` | Trading |
| `/trading/history` | `TradeHistoryComponent` | Yes | `AuthGuard` | Trading |
| `/portfolio` | `PortfolioComponent` | Yes (`loadChildren`) | `AuthGuard` | Portfolio |
| `/portfolio/holdings` | `HoldingsComponent` | Yes | `AuthGuard` | Portfolio |
| `/portfolio/performance` | `PerformanceComponent` | Yes | `AuthGuard` | Portfolio |
| `/settings` | `SettingsComponent` | No | `AuthGuard` | Settings |
| `/settings/profile` | `ProfileComponent` | No | `AuthGuard` | Settings |
| `/login` | `LoginComponent` | No | -- | Auth |
| `**` | `NotFoundComponent` | No | -- | -- |

### External API Surface
| Endpoint | Method | Called By (Service) | Feature Area |
|----------|--------|-------------------|-------------|
| `/api/v2/market/quotes` | GET | `MarketDataService` | Dashboard |
| `/api/v2/market/quotes/:symbol` | GET | `MarketDataService` | Dashboard |
| `/api/v2/watchlist` | GET | `WatchlistService` | Dashboard |
| `/api/v2/watchlist` | POST | `WatchlistService` | Dashboard |
| `/api/v2/watchlist/:id` | DELETE | `WatchlistService` | Dashboard |
| `/api/v2/analytics/summary` | GET | `AnalyticsService` | Dashboard |
| `/api/v2/orders` | GET | `OrderService` | Trading |
| `/api/v2/orders` | POST | `OrderService` | Trading |
| `/api/v2/orders/:id` | GET | `OrderService` | Trading |
| `/api/v2/orders/:id` | PUT | `OrderService` | Trading |
| `/api/v2/orders/:id` | DELETE | `OrderService` | Trading |
| `/api/v2/orders/:id/execute` | POST | `OrderService` | Trading |
| `/api/v2/trades/history` | GET | `TradeHistoryService` | Trading |
| `/api/v2/trades/export` | POST | `TradeHistoryService` | Trading |
| `/api/v2/portfolio/holdings` | GET | `PortfolioService` | Portfolio |
| `/api/v2/portfolio/holdings/:id` | GET | `PortfolioService` | Portfolio |
| `/api/v2/portfolio/performance` | GET | `PortfolioService` | Portfolio |
| `/api/v2/portfolio/allocations` | GET | `AllocationService` | Portfolio |
| `/api/v2/portfolio/allocations` | PUT | `AllocationService` | Portfolio |
| `/api/v2/users/me` | GET | `ProfileService` | Settings |
| `/api/v2/users/me` | PUT | `ProfileService` | Settings |
| `/api/v2/users/me/preferences` | PUT | `PreferenceService` | Settings |

### Feature Dependency Graph
```mermaid
graph TD
    subgraph Features
        Dash["Dashboard\n7 components\nComplexity: High"]
        Trading["Trading\n9 components\nComplexity: High"]
        Portfolio["Portfolio\n5 components\nComplexity: Medium"]
        Settings["Settings\n4 components\nComplexity: Medium"]
    end
    subgraph Shared
        SharedUI["shared-ui\n6 components"]
        CoreServices["core/services\n5 services"]
    end
    subgraph APIs["Backend APIs"]
        MarketAPI["/api/v2/market\n2 endpoints"]
        OrderAPI["/api/v2/orders\n6 endpoints"]
        PortfolioAPI["/api/v2/portfolio\n4 endpoints"]
        UserAPI["/api/v2/users\n3 endpoints"]
    end
    Dash --> SharedUI
    Dash --> CoreServices
    Dash --> MarketAPI
    Trading --> SharedUI
    Trading --> CoreServices
    Trading --> OrderAPI
    Portfolio --> SharedUI
    Portfolio --> CoreServices
    Portfolio --> PortfolioAPI
    Settings --> CoreServices
    Settings --> UserAPI
    Trading -.->|"uses MarketDataService"| Dash
```

### User Journey — Trader Flow
```mermaid
sequenceDiagram
    actor Trader as "Trader"
    participant App as "Trading View"
    participant API as "Order API"
    participant Market as "Market Data API"
    Trader->>App: Navigate to /trading/orders/new
    Note over App: AuthGuard + RoleGuard('trader') check
    App->>Market: GET /api/v2/market/quotes/:symbol
    Market-->>App: Current price data
    App-->>Trader: Order form with live prices
    Trader->>App: Submit buy order
    App->>API: POST /api/v2/orders
    API-->>App: Order created (pending)
    App->>API: POST /api/v2/orders/:id/execute
    API-->>App: Execution confirmed
    App-->>Trader: Success notification + updated portfolio
```

### User Journey — Portfolio Review
```mermaid
sequenceDiagram
    actor User as "Investor"
    participant App as "Portfolio View"
    participant API as "Portfolio API"
    User->>App: Navigate to /portfolio
    Note over App: AuthGuard check
    App->>API: GET /api/v2/portfolio/holdings
    API-->>App: Holdings list
    App->>API: GET /api/v2/portfolio/performance
    API-->>App: Performance metrics
    App-->>User: Portfolio overview with charts
    User->>App: Click "Holdings" tab
    App->>API: GET /api/v2/portfolio/holdings/:id
    API-->>App: Holding detail
    App-->>User: Detailed holding breakdown
```
