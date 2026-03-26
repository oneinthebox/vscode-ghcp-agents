---
name: angular-docs-readme
description: "Generate or update README.md for the project — setup instructions, architecture overview, available scripts, tech stack, contributing guide, and ORCH agent usage. Reads actual project structure, not templates."
references:
  - references/angular/v19/best-practices.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates a comprehensive README.md (or updates an existing one) based on the actual project state. Reads package.json, angular.json, nx.json, route configs, and ORCH setup to produce accurate, up-to-date documentation. Not a generic template — every section reflects what's really in the project.

## Inputs

- `@angular /angular-docs-readme` — generate README for the project
- `@angular /angular-docs-readme --update` — update existing README, preserve custom sections
- `@angular /angular-docs-readme --sections setup,architecture,scripts` — generate specific sections only

## Steps

1. **Read project metadata**: `package.json` (name, version, description, scripts), `angular.json` or `nx.json` (projects, apps, libs).
2. **Read tech stack**: detect Angular version, TypeScript, RxJS, UI libraries (AG Grid, PrimeNG, Plotly), test frameworks (Jest, Playwright).
3. **Read ORCH setup**: `.github/agents/`, `.github/skills/`, `.orch/config.yaml` — what agents and skills are available.
4. **Read existing README.md** (if `--update`). Identify custom sections to preserve.
5. **Detect stale content** by comparing actual project state against existing README text:
   - Angular version in `package.json` vs version mentioned in README
   - Scripts in `package.json` vs scripts documented in README
   - Project list in `angular.json`/`nx.json` vs projects mentioned in README
   - Node version in `.nvmrc`/`engines` vs prerequisites section
   Flag any mismatches in the output report.
6. **Generate sections** using these detection patterns for each required section:

   - **Project name + description** — read `package.json` fields: `name`, `description`, `version`. If `description` is missing, derive from `angular.json` project type.
   - **Tech stack** — scan `dependencies` and `devDependencies` for known libraries. Map to table rows: `@angular/core` -> "Angular", `ag-grid-angular` -> "AG Grid", `rxjs` -> "RxJS", `jest` -> "Jest", `@playwright/test` -> "Playwright".
   - **Prerequisites** — read `.nvmrc` or `package.json` `engines.node` for Node version. Check for `docker-compose.yml` or `Dockerfile`. Check for `.env.example` files.
   - **Getting started** — map `package.json` `scripts` keys: `start`/`serve` -> dev server command, `build` -> build command, `test` -> unit test command, `e2e` -> e2e test command.
   - **Project structure** — run `ls` on top-level directories; for Nx workspaces, read `nx.json` `projects` or scan `apps/` and `libs/` directories.
   - **Architecture overview** — if `scan-arch` output exists, include it; otherwise, parse `angular.json` projects and describe each.
   - **Available scripts** — list every key from `package.json` `scripts` with inferred description.
   - **Testing** — detect test runner from devDependencies (`jest` vs `karma`), detect e2e framework (`@playwright/test` vs `cypress`), find coverage config in `jest.config` or `karma.conf`.
   - **ORCH agents** — list all `.github/agents/*.md` filenames and skill count from `.github/skills/`.
   - **Contributing** — check for `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/PULL_REQUEST_TEMPLATE.md`.

7. If `--update`: merge new sections with existing, preserve custom content marked with `<!-- custom -->` blocks.
8. Write README.md.

### Full Example README Output (Nx Angular Workspace)

```markdown
# Trade Platform

> Real-time trading platform built with Angular 19, Nx, and AG Grid.

![Build](https://img.shields.io/github/actions/workflow/status/org/trade-platform/ci.yml)
![Angular](https://img.shields.io/badge/Angular-19.2-red)

## Tech Stack

| Library          | Version | Purpose                        |
|------------------|---------|--------------------------------|
| Angular          | 19.2.0  | Application framework          |
| Nx               | 20.3.0  | Monorepo build orchestration   |
| TypeScript       | 5.7.2   | Type-safe development          |
| RxJS             | 7.8.1   | Reactive data streams          |
| AG Grid          | 33.0.0  | High-performance data grids    |
| Plotly.js        | 2.35.0  | Interactive charts             |
| Jest             | 29.7.0  | Unit testing                   |
| Playwright       | 1.50.0  | End-to-end testing             |

## Prerequisites

- Node.js >= 20.11.0 (see `.nvmrc`)
- npm >= 10.x
- Docker & Docker Compose (for local API mock)

## Getting Started

\`\`\`bash
git clone https://github.com/org/trade-platform.git
cd trade-platform
npm install
npx nx serve trade-app        # dev server on http://localhost:4200
npx nx test trade-app          # unit tests
npx nx e2e trade-app-e2e       # Playwright e2e tests
\`\`\`

## Project Structure

\`\`\`
apps/
  trade-app/              # Main trading application
  trade-app-e2e/          # Playwright e2e tests
libs/
  shared/ui/              # Reusable UI components
  shared/data-access/     # HTTP services and state
  trading/feature-blotter/# Trade blotter feature
\`\`\`

## Available Scripts

| Script              | Command                       | Description                  |
|---------------------|-------------------------------|------------------------------|
| serve               | `npx nx serve trade-app`      | Start dev server             |
| build               | `npx nx build trade-app`      | Production build             |
| test                | `npx nx test trade-app`       | Run unit tests (Jest)        |
| e2e                 | `npx nx e2e trade-app-e2e`    | Run e2e tests (Playwright)   |
| lint                | `npx nx lint trade-app`       | ESLint check                 |
| storybook           | `npx nx storybook shared-ui`  | Component library            |

## Testing

- **Unit tests**: `npx nx test <project>` — Jest with ng-mocks
- **E2E tests**: `npx nx e2e trade-app-e2e` — Playwright, headless by default
- **Coverage**: `npx nx test trade-app --coverage` — threshold: 80% lines

## ORCH Agents

11 agents and 60+ skills available. Example commands:
- `@angular /angular-scan-arch` — analyze project architecture
- `@angular /angular-test-unit src/app/services/trade.service.ts` — generate unit tests
- `@angular /angular-docs-api` — generate API documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
```

## Output

```markdown
## README Generated/Updated

Sections: {n}
Lines: {n}
Mode: {generate|update}
Custom sections preserved: {n} (if update)

### Sections included
- Project overview
- Tech stack (10 libraries detected)
- Prerequisites
- Getting started (5 scripts)
- Project structure
- Architecture (2 apps, 3 libs)
- Available scripts (12 detected)
- Testing
- ORCH agents (11 agents, 60 skills available)
```

## Validation

- All detected scripts are listed
- Tech stack versions match package.json
- Setup instructions actually work (npm install → ng serve)
- Links are valid (no broken references)
- No hallucinated content — everything comes from actual project files
