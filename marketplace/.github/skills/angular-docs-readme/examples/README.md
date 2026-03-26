<!-- Example output from /angular-docs-readme — see SKILL.md for usage -->
# Acme Trading Platform

A real-time trading and portfolio management application built with Angular 19, PrimeNG, and AG Grid. Provides institutional-grade trade execution, position tracking, and market data streaming for the Acme Capital equities desk.

---

## Prerequisites

| Tool       | Version  | Notes                              |
|------------|----------|------------------------------------|
| Node.js    | >= 20.11 | LTS recommended                    |
| npm        | >= 10.2  | Comes with Node.js                 |
| Angular CLI| 19.2.x   | Installed globally or via npx      |
| Docker     | >= 24.0  | Required for local API mock server |

---

## Installation

```bash
git clone https://github.com/acme-capital/trading-platform.git
cd trading-platform
npm install
```

---

## Quick Start

```bash
# Start the mock API server (runs on port 3100)
npm run mock:server

# Start the dev server (runs on port 4200)
npm start

# Open http://localhost:4200 in your browser
```

Default credentials for the mock server: `trader@acme.dev` / `password`.

---

## Project Structure

```
apps/
  trading-platform/        # Main Angular application
    src/
      app/
        core/              # Singleton services, interceptors, guards
        features/
          dashboard/       # Real-time portfolio dashboard
          trade/           # Trade entry and execution
          positions/       # Position and P&L tracking
          market-data/     # Quotes, watchlists, price charts
          settlement/      # Settlement status and reconciliation
        shared/            # Reusable components, pipes, directives
        layout/            # Shell, header, sidebar, footer
libs/
  ui/                      # HDS-themed PrimeNG component wrappers
  data-access/             # API client services and state management
  util/                    # Pure utility functions and types
```

---

## Available Scripts

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `npm start`              | Dev server with HMR on port 4200         |
| `npm run build`          | Production build to `dist/`              |
| `npm run build:analyze`  | Production build + bundle analyzer       |
| `npm test`               | Run unit tests with Jest                 |
| `npm run test:watch`     | Run tests in watch mode                  |
| `npm run e2e`            | Run Playwright end-to-end tests          |
| `npm run lint`           | Lint with ESLint + Angular ESLint        |
| `npm run mock:server`    | Start Express mock API on port 3100      |
| `npm run mock:generate`  | Regenerate mock data fixtures            |
| `npm run storybook`      | Launch Storybook on port 6006            |

---

## Testing

Unit tests use Jest with Angular testing utilities. Run the full suite:

```bash
npm test
```

End-to-end tests use Playwright targeting Chrome and Firefox:

```bash
npm run e2e
```

Test coverage threshold is enforced at 80% for statements and branches.

---

## Deployment

The application deploys via the CI/CD pipeline defined in `.github/workflows/deploy.yml`.

| Environment | Branch   | URL                                    |
|-------------|----------|----------------------------------------|
| Development | `develop`| https://trading-dev.acme.internal      |
| Staging     | `main`   | https://trading-staging.acme.internal  |
| Production  | tags     | https://trading.acme.internal          |

To build locally for production:

```bash
npm run build
```

Output is written to `dist/trading-platform/` and can be served by any static file server with SPA fallback configured.

---

## Contributing

1. Create a feature branch from `develop`: `git checkout -b feat/your-feature`
2. Follow conventional commit format: `feat(trade): add limit order support`
3. Ensure all tests pass: `npm test && npm run lint`
4. Open a PR targeting `develop` and request review from the platform team
