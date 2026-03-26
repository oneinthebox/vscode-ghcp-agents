<!-- Example output from /angular-scan-arch — see SKILL.md for usage -->
## Architecture Scan — Acme Trading Platform

### Summary
- Components: 40 (34 standalone, 6 in NgModules)
- Services: 16
- Modules: 3 (legacy)
- Routes: 14 (10 lazy-loaded)
- Nx projects: 8

### System Context (C4 Level 1)
```mermaid
graph TD
    Trader["Trader"] -->|"places orders"| App["Acme Trading Platform\nAngular 19"]
    Investor["Investor"] -->|"views portfolio"| App
    Admin["Admin"] -->|"manages users"| App
    App -->|"REST /api/v2"| OrderSvc["Order Service\nNode.js/Express"]
    App -->|"REST /auth"| IDP["Auth0\nOIDC"]
    App -->|"WebSocket /ws"| PriceFeed["Price Feed\nSocket.io"]
    App -->|"REST /api/v2/market"| MarketData["Market Data API\nExternal vendor"]
    App -->|"CDN"| Assets["Static Assets\nCloudFront"]
```

### Container Diagram (C4 Level 2)
```mermaid
graph TD
    subgraph Frontend
        Shell["app-shell\nAngular 19\nStandalone"]
    end
    subgraph Backend
        API["api-gateway\nExpress 4.18"]
        WS["ws-server\nSocket.io 4.7"]
    end
    subgraph Data
        DB[("PostgreSQL 16\nOrders + Users")]
        Cache[("Redis 7\nSession + Quotes")]
    end
    subgraph External
        Auth0["Auth0\nOIDC Provider"]
        MarketVendor["Market Data\nVendor API"]
    end
    Shell --> API
    Shell --> WS
    API --> DB
    API --> Cache
    WS --> Cache
    API --> Auth0
    API --> MarketVendor
```

### Module/Library Graph
```mermaid
graph LR
    subgraph Apps
        AppShell["app-shell"]
    end
    subgraph Features
        FeatDash["feature-dashboard"]
        FeatTrading["feature-trading"]
        FeatPortfolio["feature-portfolio"]
        FeatSettings["feature-settings"]
    end
    subgraph DataAccess
        DAOrders["data-access-orders"]
        DAMarket["data-access-market"]
        DAAuth["data-access-auth"]
    end
    subgraph SharedUI
        UIComponents["shared-ui"]
    end
    subgraph Util
        UtilFormat["util-formatting"]
    end
    AppShell --> FeatDash
    AppShell --> FeatTrading
    AppShell --> FeatPortfolio
    AppShell --> FeatSettings
    FeatDash --> DAMarket
    FeatDash --> DAOrders
    FeatDash --> UIComponents
    FeatTrading --> DAOrders
    FeatTrading --> DAMarket
    FeatTrading --> UIComponents
    FeatPortfolio --> DAOrders
    FeatPortfolio --> UIComponents
    FeatSettings --> DAAuth
    FeatSettings --> UIComponents
    DAOrders --> UtilFormat
    DAMarket --> UtilFormat
    DAAuth --> UtilFormat
```

### Component Tree
```mermaid
graph TD
    App["AppComponent (S)\n&lt;app-root&gt;"]
    App --> Header["HeaderComponent (S)\n&lt;app-header&gt;"]
    App --> Sidebar["SidebarComponent (S)\n&lt;app-sidebar&gt;"]
    App --> Router["&lt;router-outlet&gt;"]
    App --> Footer["FooterComponent (S)\n&lt;app-footer&gt;"]
    Router --> Dash["DashboardComponent (S)\n&lt;app-dashboard&gt;"]
    Router --> Trading["TradingComponent (S)\n&lt;app-trading&gt;"]
    Router --> Portfolio["PortfolioComponent (S)\n&lt;app-portfolio&gt;"]
    Router --> Settings["SettingsComponent (S)\n&lt;app-settings&gt;"]
    Dash --> StatsCard["StatsCardComponent (S)\n&lt;app-stats-card&gt;"]
    Dash --> PriceChart["PriceChartComponent (S)\n&lt;app-price-chart&gt;"]
    Dash --> Watchlist["WatchlistComponent (S)\n&lt;app-watchlist&gt;"]
    Trading --> OrderForm["OrderFormComponent (S)\n&lt;app-order-form&gt;"]
    Trading --> OrderList["OrderListComponent (S)\n&lt;app-order-list&gt;"]
    Trading --> TradeHistory["TradeHistoryComponent (S)\n&lt;app-trade-history&gt;"]
    Portfolio --> Holdings["HoldingsComponent (S)\n&lt;app-holdings&gt;"]
    Portfolio --> Performance["PerformanceComponent (S)\n&lt;app-performance&gt;"]
    Portfolio --> Allocation["AllocationChartComponent (S)\n&lt;app-allocation-chart&gt;"]
    Settings --> Profile["ProfileComponent (S)\n&lt;app-profile-form&gt;"]
    Settings --> NotifPrefs["NotifPrefsComponent (M)\n&lt;app-notif-prefs&gt;"]
```

### Route Map
| Route | Component | Lazy? | Guards | Resolvers |
|-------|-----------|-------|--------|-----------|
| `/` | redirect to `/dashboard` | -- | -- | -- |
| `/dashboard` | `DashboardComponent` | Yes (`loadComponent`) | `AuthGuard` | `DashboardResolver` |
| `/dashboard/analytics` | `AnalyticsComponent` | Yes | `AuthGuard` | -- |
| `/dashboard/watchlist` | `WatchlistComponent` | Yes | `AuthGuard` | -- |
| `/trading` | `TradingComponent` | Yes (`loadChildren`) | `AuthGuard` | -- |
| `/trading/orders` | `OrderListComponent` | Yes | `AuthGuard` | -- |
| `/trading/orders/new` | `OrderFormComponent` | Yes | `AuthGuard`, `RoleGuard('trader')` | -- |
| `/trading/history` | `TradeHistoryComponent` | Yes | `AuthGuard` | -- |
| `/portfolio` | `PortfolioComponent` | Yes (`loadChildren`) | `AuthGuard` | `PortfolioResolver` |
| `/portfolio/holdings` | `HoldingsComponent` | Yes | `AuthGuard` | -- |
| `/portfolio/performance` | `PerformanceComponent` | Yes | `AuthGuard` | -- |
| `/settings` | `SettingsComponent` | No | `AuthGuard` | -- |
| `/settings/profile` | `ProfileComponent` | No | `AuthGuard` | -- |
| `/login` | `LoginComponent` | No | -- | -- |
| `**` | `NotFoundComponent` | No | -- | -- |

### Service Injection Graph
| Service | Provided In | Dependencies (injected) |
|---------|-------------|------------------------|
| `AuthService` | `root` | `HttpClient`, `Router`, `TokenStorageService` |
| `OrderService` | `root` | `HttpClient`, `AuthService`, `CacheService` |
| `MarketDataService` | `root` | `HttpClient`, `WebSocketService` |
| `WatchlistService` | `root` | `HttpClient`, `AuthService` |
| `PortfolioService` | `root` | `HttpClient`, `AuthService` |
| `AllocationService` | `root` | `HttpClient`, `AuthService` |
| `TradeExecutionService` | `root` | `OrderService`, `MarketDataService`, `NotificationService` |
| `TradeHistoryService` | `root` | `HttpClient`, `AuthService` |
| `ProfileService` | `root` | `HttpClient`, `AuthService` |
| `PreferenceService` | `root` | `HttpClient` |
| `CacheService` | `root` | -- |
| `TokenStorageService` | `root` | -- |
| `WebSocketService` | `root` | `AuthService` |
| `NotificationService` | `root` | -- |
| `DashboardResolver` | `root` | `OrderService`, `MarketDataService` |
| `PortfolioResolver` | `root` | `PortfolioService` |

### Nx Project Graph
| Project | Type | Tags | Depends On |
|---------|------|------|------------|
| `app-shell` | application | `type:app`, `scope:shell` | `feature-dashboard`, `feature-trading`, `feature-portfolio`, `feature-settings`, `shared-ui`, `data-access-auth` |
| `feature-dashboard` | library | `type:feature`, `scope:dashboard` | `data-access-orders`, `data-access-market`, `shared-ui`, `util-formatting` |
| `feature-trading` | library | `type:feature`, `scope:trading` | `data-access-orders`, `data-access-market`, `shared-ui` |
| `feature-portfolio` | library | `type:feature`, `scope:portfolio` | `data-access-orders`, `shared-ui` |
| `feature-settings` | library | `type:feature`, `scope:settings` | `data-access-auth`, `shared-ui` |
| `data-access-auth` | library | `type:data-access` | `util-formatting` |
| `data-access-orders` | library | `type:data-access` | `util-formatting` |
| `data-access-market` | library | `type:data-access` | `util-formatting` |
| `shared-ui` | library | `type:ui` | -- |
| `util-formatting` | library | `type:util` | -- |

### Pattern Adoption
| Pattern | Count | % of Components | Notes |
|---------|-------|-----------------|-------|
| Standalone components | 34 | 85% | 6 legacy NgModule-declared in settings |
| `inject()` function | 30 | 75% | vs. constructor injection |
| `OnPush` change detection | 32 | 80% | 8 use Default |
| Signals (`signal()`, `computed()`) | 14 | 35% | Adopted in newer trading components |
| Lazy-loaded routes | 10 of 14 | 71% | 4 eagerly loaded (login, settings, 404) |
| Control flow (`@if`, `@for`) | 22 | 55% | Newer components; older use `*ngIf`/`*ngFor` |
