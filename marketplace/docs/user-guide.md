# ORCH User Guide

Comprehensive guide for using ORCH (Orchestra) to standardize AI-assisted Angular development with GitHub Copilot.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Understanding ORCH](#2-understanding-orch)
3. [CLI Commands Reference](#3-cli-commands-reference)
4. [Working with Agents in VS Code](#4-working-with-agents-in-vs-code)
5. [Configuration](#5-configuration)
6. [Workflows](#6-workflows)
7. [Reports](#7-reports)
8. [Audit and Observability](#8-audit-and-observability)
9. [Auto Mode](#9-auto-mode)
10. [Design System and Platform Integration](#10-design-system-and-platform-integration)
11. [Troubleshooting](#11-troubleshooting)
12. [Mock Data and Local API Server](#12-mock-data-and-local-api-server)
13. [Creating a New Project](#13-creating-a-new-project)
14. [Creating and Updating Skills](#14-creating-and-updating-skills)
15. [Example: Building a Fund Screener App](#15-example-building-a-fund-screener-app)
16. [Contributing](#16-contributing)
17. [Quick Reference Card](#17-quick-reference-card)

---

## 1. Quick Start

### Prerequisites

| Requirement | Minimum | Install (macOS) | Install (Windows) |
|-------------|---------|-----------------|-------------------|
| Node.js | 18.19+ or 20.11+ or 22+ | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| VS Code | Latest | `brew install --cask visual-studio-code` | `winget install Microsoft.VisualStudioCode` |
| GitHub Copilot | Extension enabled | VS Code Extensions marketplace | VS Code Extensions marketplace |
| Git | 2.x+ | `brew install git` | `winget install Git.Git` |
| jq | 1.6+ | `brew install jq` | `winget install jqlang.jq` |
| python3 | 3.10+ | `brew install python3` | `winget install Python.Python.3.12` |

**Recommended**: Use [fnm](https://github.com/Schniz/fnm) (Fast Node Manager) for managing Node.js versions. It reads `.nvmrc` files automatically.

```bash
# Install fnm
brew install fnm              # macOS
winget install Schniz.fnm     # Windows

# Use the right Node version for a project
fnm use                       # reads .nvmrc
```

### New project

```bash
npm install -g @orch/cli
orch new nx-angular my-app    # scaffold Nx Angular monorepo + initialize ORCH
cd my-app
orch doctor                    # verify everything is healthy
```

### Existing project

```bash
npm install -g @orch/cli
cd your-existing-project
orch init                      # detect project, install agents + skills + config
orch doctor                    # verify setup
```

After initialization, open the project in VS Code. Agents are available immediately in the Copilot Chat panel.

---

## 2. Understanding ORCH

### Agents

Agents are specialized AI personas with defined roles, tool access, and scope boundaries. ORCH uses a role-based architecture:

| Role | Purpose | Example |
|------|---------|---------|
| **Coordinator** | Triages requests, routes to sub-agents, owns the retry loop | `@angular`, `@orch` |
| **Planner** | Scans, analyzes, explains, produces plans. Read-only. | `@angular-planner` |
| **Engineer** | Writes code, runs migrations, generates artifacts | `@angular-engineer` |
| **Verifier** | Runs tests, lint, review. Only edits test files. | `@angular-verifier` |
| **Shared** | Cross-cutting concerns: docs, audit, environment, reporting | `@docs`, `@audit`, `@local` |

### Skills

Skills are reusable, task-focused operations invoked via `/slash-commands`. Each skill has a `SKILL.md` defining its inputs, steps, outputs, and validation criteria. Skills carry their own reference docs, templates, scripts, and examples.

```
@angular /angular-generate-component TradeConfirmation
@angular /angular-scan-deps
@audit /audit-tokens --period 7d
@local /local-mock-generate "50 trades with symbol, price, quantity"
```

### Workflows

Workflows are multi-phase operations defined in `.orch/workflows/*.yaml`. Each phase specifies the agent, skill, pre/post checks, checkpoint behavior, and failure handling. The three built-in workflows are:

- **angular-migration** -- Angular version upgrade with phased pattern migrations
- **angular-new-feature** -- Feature scaffolding with planning, generation, HDS/Elevate integration, and verification
- **angular-project-recap** -- Full codebase analysis producing a comprehensive project overview

### Triage

When a request arrives at `@angular`, the coordinator classifies it into one of three modes:

| Mode | Trigger | Pipeline | Example |
|------|---------|----------|---------|
| **Query** | Read-only question | Coordinator answers directly | "What Angular version is this?" |
| **Quick-fix** | Single-file, clear scope | Engineer then Verifier | "Add a new component for settings" |
| **Workflow** | Multi-file, ambiguous scope | Planner then Engineer then Verifier | "Migrate to Angular 19" |

---

## 3. CLI Commands Reference

### `orch new <type> <name>`

Scaffold a new project and initialize ORCH in one step.

| Type | Description |
|------|-------------|
| `nx-angular` | Nx Angular monorepo with shared libs, module boundaries, Jest, ESLint |
| `angular` | Standalone Angular CLI app with routing, strict mode |

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `--style <format>` | CSS preprocessor (scss, css, less) | `scss` |
| `--package-manager <pm>` | Package manager (npm, yarn, pnpm) | `npm` |
| `--angular-version <ver>` | Target Angular version to install | Latest |

**Example:**

```bash
orch new nx-angular trade-app --style scss --angular-version 19
```

### `orch init`

Initialize ORCH in an existing project. Detects the project type (Angular, Spring Boot, FastAPI), workspace type (Nx, Angular CLI, vanilla), and installed versions. Installs agents, skills, instructions, hooks, audit config, and creates the docs registry.

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `--domain <name>` | Restrict to specific domain(s) | Auto-detect |
| `--skip-scan` | Skip initial codebase scan recommendation | `false` |

**Example:**

```bash
cd my-angular-project
orch init
orch init --domain angular --domain audit
```

### `orch install @<agent>`

Install a specific agent package into an existing ORCH project. Use this to add agent domains incrementally.

**Available packages:** `@angular`, `@docs`, `@audit`, `@orch`, `@local`

Each package includes the agent definitions, all associated skills, and any required semantic adapters.

**Example:**

```bash
orch install @angular    # 5 agents + 35+ skills + TypeScript adapter
orch install @local      # 1 agent + 8 skills
```

### `orch doctor`

Comprehensive health check. Validates:

- Project detection (type, workspace, versions)
- Node.js version compatibility (per Angular version requirements)
- Required tools (bash, jq, python3)
- Dependency compatibility
- Audit hooks (lifecycle, prompts, tools, scope)
- Audit config (boundaries.yaml, adherence-rules.yaml)
- Audit scripts (session tracking, boundary checks, token estimation)
- Semantic adapters (TypeScript ts-morph)
- Agent and skill installation
- File integrity (checksum verification against manifest)
- ORCH config, workflows, and global instructions
- Reference doc registry (current, stale, draft status)

**Example:**

```bash
orch doctor
```

### `orch status`

Show all installed components: agents (with coordinator/worker classification), skills (with asset types), instructions, hooks, integrity report, registry status, workflows, and run history.

**Example:**

```bash
orch status
```

### `orch list`

Show all available agents and skills from the marketplace, indicating which are installed.

**Flags:**

| Flag | Description |
|------|-------------|
| `--packs` | Show available doc packs instead of agents |

**Example:**

```bash
orch list              # show all agents and skills
orch list --packs      # show available doc packs
```

---

## 4. Working with Agents in VS Code

Open the Copilot Chat panel (`Cmd+Shift+I` or `Ctrl+Shift+I`) and type `@` followed by the agent name.

### Query Mode

Ask questions directly. No files are modified.

```
@angular What Angular version is this project on?
@angular How is routing set up in this app?
@angular Explain the auth flow
@angular What testing framework does this project use?
```

### Quick Fix Mode

Request a bounded change. The coordinator routes to the engineer, then the verifier checks the result.

```
@angular /angular-generate-component UserSettings
@angular /angular-generate-service NotificationService
@angular Convert this component to standalone
@angular Fix the lint errors in trade.component.ts
@angular /angular-refactor src/app/services/auth.service.ts
@angular /angular-docs-generate src/app/services/
```

### Workflow Mode

Request a multi-step operation. The coordinator routes through planner, engineer, and verifier with checkpoint and verification at each phase.

```
@angular Migrate this project to Angular 19
@angular Convert all NgModules to standalone
@angular Recap this project
@angular Set up a new feature module with routing, services, and tests
@orch Create a new Nx Angular project called portfolio-tracker
```

### Shared Agent Commands

```
@docs /docs-status                           # reference doc freshness dashboard
@docs /docs-fetch https://angular.dev/guide  # fetch and convert to markdown
@docs /docs-drift                            # check for doc-code mismatches
@audit /audit-usage                          # who used what, how often
@audit /audit-tokens --period 30d            # token consumption report
@audit /audit-compliance                     # boundary violations, adherence scores
@audit /audit-drift                          # behavioral quality trends
@local /local-setup-env                      # configure runtimes and tools
@local /local-diagnose                       # troubleshoot environment issues
@local /local-mock-generate "50 funds with name, nav, category"
@orch /present-report from PROJECT-RECAP.md --format html
@orch /present-deck from PROJECT-RECAP.md
```

---

## 5. Configuration

### 5.1. config.yaml

All runtime settings live in `.orch/config.yaml`. Key sections:

```yaml
workflow:
  max_retries: 3              # max retry cycles for failed verifications
  auto_mode: safe             # step-by-step | safe | all
  permission_level: allow     # allow | allow-with-permissions | auto

preflight:
  check_references: true      # validate reference file paths
  max_stale_days: 30          # flag references older than N days
  check_build_baseline: true  # run ng build before migrations
  check_git_clean: true       # require clean git working tree
  auto_refresh_docs: true     # auto-fetch stale references

models:
  coordinator: claude-sonnet-4
  planner: claude-sonnet-4
  engineer: claude-sonnet-4
  verifier: claude-sonnet-4

stack:
  angular_version: auto       # auto | "16" | "17" | "18" | "19" | "20" | "21"

audit:
  log_retention_days: 90
  verbosity: normal            # minimal | normal | verbose
  export_format: json          # json | csv

presentation:
  logo_path: null
  cover_background: "#0a0e17"
  hds_theme: null
  default_format: html
```

### 5.2. copilot-instructions.md

Global operating rules that apply to all agents and skills. Located at `.github/copilot-instructions.md`. Defines:

- **Safety rules** (non-overridable): no `rm -rf`, no `git push --force`, no secret exposure
- **Confirmation rules** (overridable by skills): ask before deleting files, before destructive git ops
- **Audit rules** (non-overridable): always log to `.orch/runs/`, respect boundaries, record token usage
- **Routing rules**: `@orch` is the entry point for workflows; domain agents handle ad-hoc requests
- **Resource limits**: max 50 files per operation, token-conscious output

### 5.3. boundaries.yaml

Declares which tools and file scopes each agent is allowed to access. Located at `.orch/audit/config/boundaries.yaml`. The audit framework enforces these boundaries at runtime and logs violations.

### 5.4. Stack Detection and Version Awareness

ORCH auto-detects your project's Angular version, TypeScript version, and installed libraries from `package.json` and `angular.json`. The detection flow:

1. **Detection**: The `check-stack.js` hook computes a SHA-256 fingerprint over 4 project files (`package.json`, `angular.json`, `nx.json`, `tsconfig.json`) and reads `package.json` on session start (under 5 ms). Cascade order: cache → detect → pin → default.
2. **Caching**: The stack profile is cached in `.orch/cache/stack.yaml`.
3. **Resolution**: The `resolve-references.js` script and the resolver (`.orch/references/angular/resolver.yaml`) map features to version gates. Each feature entry declares `available` (usable from) and `recommended` (best practice from) versions as string expressions (e.g., `">=17"`).
4. **Filtering**: The coordinator filters features by the detected version and passes only relevant reference doc paths to sub-agents.

#### Version-specific behavior

| Angular Version | Component Model | Template Syntax | DI Pattern | State | Builder |
|----------------|----------------|-----------------|------------|-------|---------|
| 17 (LTS) | NgModules common, standalone opt-in | `*ngIf`/`*ngFor` (control flow opt-in) | Constructor injection | RxJS, BehaviorSubject | Webpack (esbuild opt-in) |
| 18 (LTS) | Standalone default | `@if`/`@for` recommended | `inject()` preferred | Signals stable | esbuild default |
| 19 (LTS) | Standalone only | `@if`/`@for` required | `inject()` standard | Signal inputs, resource API, NgRx SignalStore | esbuild only |
| 20 | Standalone only | `@if`/`@for` required | `inject()` standard | Signal forms (preview), mutation API | esbuild only |
| 21 (Current stable) | Standalone only | `@if`/`@for` required | `inject()` standard | Signal forms (stable), `ng migrate` command | esbuild only |

#### Pinning a version

To override auto-detection, set `stack.angular_version` in `.orch/config.yaml`:

```yaml
stack:
  angular_version: "17"   # pin to Angular 17 patterns
```

To force re-detection, delete `.orch/cache/` or run `orch doctor`.

#### Skill variants

Some skills have a `variants/` directory with version-specific step overrides:

- `variants/modern.md` -- steps for v18+ (standalone, signals, control flow)
- `variants/legacy.md` -- steps for v16-v17 (NgModules, structural directives)

The coordinator selects the correct variant based on the detected version.

---

## 6. Workflows

Workflows are defined in `.orch/workflows/*.yaml`. Each workflow has a trigger pattern, a sequence of phases, and post-workflow actions (report generation, git tag, status bar notification).

### 6.1. angular-migration

**Trigger**: "upgrade", "migrate", "update angular"

Phases:

| # | Phase | Agent | Skill | Checkpoint | Verify |
|---|-------|-------|-------|-----------|--------|
| 1 | Scan dependencies | Planner | /angular-scan-deps | No | No |
| 2 | Compatibility check | Planner | /angular-compatibility | No | No |
| 3 | Upgrade TypeScript | Engineer | /angular-migrate-version --scope typescript-only | Yes | Yes |
| 4 | Upgrade Angular core | Engineer | /angular-migrate-version --scope angular-core | Yes | Yes |
| 5 | Standalone migration | Engineer | /angular-migrate-standalone | Yes | Yes |
| 6 | Control flow migration | Engineer | /angular-migrate-control-flow | Yes | Yes |
| 7 | Signals migration | Engineer | /angular-migrate-signals | Yes | Yes |
| 8 | Third-party compatibility | Engineer | /angular-migrate-version --scope third-party | Yes | Yes |
| 9 | Final verification | Verifier | /angular-test-unit + /angular-test-e2e + /angular-test-lint + /angular-review | No | No |
| 10 | Post-scan | Planner | /angular-scan-deps | No | No |

Pattern migration phases (standalone, control flow, signals) include pre/post architecture scans to compute pattern deltas. Failed phases trigger rollback to the last git checkpoint.

Post-workflow: generates a migration report, creates a git commit and tag (`migrate/angular-{version}-{date}`), and updates the VS Code status bar.

### 6.2. angular-new-feature

**Trigger**: "create", "scaffold", "generate", "add feature", "new component"

Phases:

| # | Phase | Agent | Skill |
|---|-------|-------|-------|
| 1 | Scan context (before) | Planner | /angular-scan-arch |
| 2 | Generate component | Engineer | /angular-generate-component |
| 3 | Generate service | Engineer | /angular-generate-service |
| 4 | Generate route | Engineer | /angular-generate-route |
| 5 | Setup mock server | Local | /local-mock-generate |
| 6 | Apply HDS design system | Engineer | /angular-hds-generate |
| 7 | Integrate Elevate services | Engineer | /angular-elevate-generate |
| 8 | Generate tests | Verifier | /angular-test-unit |
| 9 | Final verification | Verifier | /angular-test-unit + /angular-test-lint + /angular-review + /angular-hds-audit + /angular-elevate-audit |
| 10 | Post-scan (after) | Planner | /angular-scan-arch |

Produces a feature creation report with system context diagrams (C4), architecture decisions, code highlights, test coverage, and design system compliance.

### 6.3. angular-project-recap

**Trigger**: "recap", "explain", "overview", "onboard", "walkthrough"

Runs 10 analysis phases sequentially (architecture, features, dependencies, compatibility, tests, quality, documentation, git history, deployment, project explanation) — 8 scan skills plus angular-compatibility and angular-explain — and stitches the results into a comprehensive `PROJECT-RECAP.md`. The final phase renders the report in all requested formats.

Collected data includes: C4 diagrams, module graphs, component trees, route maps, dependency classifications, test coverage by module, quality scorecards, bundle analysis, commit frequency, contributor analysis, pipeline stages, and an executive summary.

---

## 7. Reports

ORCH generates reports through the `/present-report` shared skill. Reports can be produced from any markdown source or collected workflow data.

### Formats

| Format | Audience | Command |
|--------|----------|---------|
| Markdown | Developers | `@orch /present-report from RECAP.md --format md` |
| HTML | Stakeholders | `@orch /present-report from RECAP.md --format html` |
| JSON | CI / Tooling | `@orch /present-report from RECAP.md --format json` |
| PDF | Formal distribution | `@orch /present-report from RECAP.md --format pdf` |
| Deck | Presentations | `@orch /present-deck from RECAP.md` |
| All | Multiple audiences | `@orch /present-report from RECAP.md --format all` |

### Report structure

All formats share a common structure:

1. **Header** -- title, date, agent, scope/branch
2. **Executive summary** -- 3-5 bullet points, overall status badge (PASS/WARN/FAIL)
3. **Metrics** -- KPI cards with trend arrows (up/down/flat)
4. **Detailed findings** -- tables, code snippets, before/after diffs
5. **Diagrams** -- Mermaid (architecture, flow, state)
6. **Recommendations** -- prioritized action items with skill references
7. **Appendix** -- raw data, methodology, generation metadata

### HTML features

Self-contained HTML reports include: HDS oklch color tokens, Google Fonts (Newsreader, Outfit, IBM Plex Mono), Mermaid.js CDN for diagram rendering, print media query for clean PDF via Cmd+P, status badges, progress bars for coverage metrics, KPI cards, collapsible detail sections, and a clickable table of contents.

### Coverage integration

Code coverage is a first-class report type. Pass `--coverage <path>` to include Istanbul/lcov coverage data in any report format. The JSON format includes raw coverage data for CI integration, and the HTML format renders coverage with progress bars and file-level detail tables.

```bash
@orch /present-report from report.md --format html --coverage coverage-summary.json
```

---

## 8. Audit and Observability

The audit framework captures data automatically via hooks on every agent session. The `@audit` agent reads this data and produces reports.

### Audit skills

| Skill | Purpose | Example |
|-------|---------|---------|
| `/audit-usage` | Who used what, how often, which skills and agents | `@audit /audit-usage` |
| `/audit-tokens` | Token consumption by agent, model, skill, time period | `@audit /audit-tokens --period 7d` |
| `/audit-compliance` | Boundary violations, tool misuse, scope breaches, adherence scores | `@audit /audit-compliance` |
| `/audit-drift` | Behavioral quality trends over time | `@audit /audit-drift` |
| `/audit-benchmark` | Model and approach comparison (ORCH vs raw prompts, Claude vs GPT) | `@audit /audit-benchmark --compare models` |
| `/audit-context` | In-session health check and compact handoff for fresh sessions | `@audit /audit-context` |

### Data sources

| Source | Location | Contents |
|--------|----------|----------|
| Session records | `.orch/runs/{date}/` | Identity, prompts, tools, files, tokens, boundaries, adherence |
| Violations | `.orch/audit/violations.jsonl` | Append-only log of boundary and scope violations |
| Token estimates | `.orch/audit/tokens/{date}/` | Usage by agent, model, skill |
| Daily metrics | `.orch/audit/metrics/daily/` | Aggregated rollups |
| Session status | `.orch/audit/session-status.json` | Current session health (good/fair/declining/poor) |
| Benchmarks | `.orch/audit/benchmarks/` | Model and approach comparison results |
| Boundaries | `.orch/audit/config/boundaries.yaml` | Declared tools and scope per agent |
| Adherence rules | `.orch/audit/config/adherence-rules.yaml` | Rule definitions per domain |

### Benchmark modes

The `/audit-benchmark` skill supports two comparison axes and their cross-product:

- **Model comparison** (`--compare models`): Same task across different LLMs. Compares quality, speed, adherence, and cost.
- **Approach comparison** (`--compare approaches`): ORCH agents vs raw prompts. Compares tokens, turns, adherence, and pass rate.
- **Cross-product** (`--compare models --compare approaches`): Full matrix producing a comprehensive comparison grid.

---

## 9. Auto Mode

ORCH supports three automation levels, configured in `.orch/config.yaml` under `workflow.auto_mode` or overridden per invocation.

### Levels

| Level | Behavior | Pauses for |
|-------|----------|-----------|
| `step-by-step` | Show plan, wait for approval at every step | Everything |
| `safe` (default) | Read-only skills run immediately; write skills show plan, get one approval, then execute | Plan approval (write ops), build/test failures, low-confidence decisions |
| `all` | Execute everything end-to-end without asking | Build/test failures, unresolvable errors only |

### Read-only skills (always run immediately, no approval)

- `/angular-scan-*` -- codebase scans
- `/angular-compatibility` -- compatibility check
- `/angular-explain` -- project walkthrough
- `/angular-review` -- code review
- `/docs-status` -- reference dashboard
- `/docs-drift` -- doc-code mismatch detection

### Write skills (plan approval in safe mode)

- `/angular-migrate-*` -- code migration
- `/angular-generate-*` -- scaffold new files
- `/angular-refactor` -- restructure code
- `/angular-docs-*` -- add/modify documentation
- `/angular-test-*` -- write test files

### Per-invocation overrides

```
@angular step by step migrate to Angular 19    # pause at every step
@angular --auto=all migrate to Angular 19       # full auto, only stop on failures
```

### Safety mitigations

- **Worktree mode**: `--auto=all --worktree` runs in a git worktree. If anything breaks, delete the worktree. Zero risk to the working copy.
- **Checkpoints**: Every migration phase creates a git commit and tag. Rollback to any point with `git checkout`.
- **Post-run report**: Auto mode always produces a detailed execution summary.

---

## 10. Design System and Platform Integration

### HDS (Design System)

ORCH enforces your organization's design system through dedicated skills:

| Skill | Purpose |
|-------|---------|
| `/angular-hds-audit` | Scan components for compliance -- hardcoded colors, missing tokens, deprecated tokens |
| `/angular-hds-apply` | Fix compliance issues -- replace hardcoded values with HDS tokens, migrate deprecated tokens |
| `/angular-hds-generate` | Create new components with full HDS integration from the start |

Generated components use `var(--hds-*)` CSS custom properties for all colors, spacing, typography, borders, and radii. No hardcoded values.

### Elevate (Platform Services)

ORCH integrates with your organization's Elevate platform libraries:

| Skill | Purpose |
|-------|---------|
| `/angular-elevate-audit` | Scan for Elevate compliance -- missing platform services, incorrect usage |
| `/angular-elevate-apply` | Migrate to platform services (auth, logging, config) |
| `/angular-elevate-generate` | Create new services and components using Elevate from the start |

| Library | Package | Purpose |
|---------|---------|---------|
| Elevate | `@yourorg/elevate` | Auth, logging, config, preferences |
| Elevate Common | `@yourorg/elevate-common` | Shared component library |
| HDS | `@yourorg/hds` | Theming for PrimeNG, AG Grid, Plotly |

Generated code always prefers internal library components over raw PrimeNG/AG Grid/Material. If `@yourorg/hds` provides a themed version, ORCH uses it.

---

## 11. Troubleshooting

### `orch doctor`

The first troubleshooting step is always `orch doctor`. It validates every component of the ORCH installation and reports issues with specific remediation instructions.

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| "No project detected" | No `package.json` in current directory | Run `orch init` from the project root |
| "Could not detect project type" | Angular not found in dependencies | Install `@angular/core` or specify `--domain angular` |
| Agent not responding in VS Code | Agent files not in `.github/agents/` | Run `orch init` or `orch install @angular` |
| Stale reference docs | References older than `max_stale_days` | Run `@docs /docs-refresh` or set `preflight.auto_refresh_docs: true` |
| Wrong Angular version detected | Cached stack profile outdated | Delete `.orch/cache/` or run `orch doctor` |
| Build failures during migration | Incompatible dependency versions | Check the compatibility matrix with `@angular /angular-compatibility` |
| Context degradation warnings | Long session, too many tool calls | Start a fresh chat session as prompted |
| Skills not loading references | Reference file paths don't match | Verify with `preflight.check_references: true` and run `orch doctor` |
| Audit hooks missing | Hooks not installed during init | Run `orch init` again or manually copy from marketplace |
| "Manifest MISSING" | ORCH not properly initialized | Run `orch init` to create the manifest |
| Checksum mismatch (modified files) | Local edits to ORCH-managed files | Run `orch update` to restore originals, or accept local modifications |
| Pin version not working | `stack.angular_version` not set | Edit `.orch/config.yaml` and set `stack.angular_version: "17"` |

### Context health monitoring

All agents monitor context health via `.orch/audit/session-status.json`. When quality degrades:

- **good/fair**: No action needed.
- **declining**: Finish the current task, then start a fresh chat session.
- **poor**: Start a new session immediately.

---

## 12. Mock Data and Local API Server

ORCH provides a complete mock data pipeline through the `@local` agent, from data capture to a running API server.

### Pipeline overview

```
Capture (HAR/Chrome) --> Schema --> Generate (synthetic/captured) --> Serve (json-server + WebSocket)
```

### Step 1: Capture (`/local-mock-capture`)

Import HAR files or use the Chrome DevTools snippet to capture real API traffic. Extracts endpoints, request/response schemas, relationships, and WebSocket channels.

```
@local /local-mock-capture from api-traffic.har
```

### Step 2: Generate (`/local-mock-generate`)

Generate mock data from any source: HAR schema, OpenAPI/Swagger YAML, TypeScript interfaces, or a plain-text description.

```
@local /local-mock-generate --from .orch/mocks/schema.json --count 50
@local /local-mock-generate --from api-spec.yaml --mode synthetic
@local /local-mock-generate --from src/app/models/ --count 100
@local /local-mock-generate "50 trades with symbol, price, quantity, status"
```

Two generation modes:

- **captured**: Use real data from HAR capture as-is
- **synthetic** (default): Generate realistic fake data matching the schema (context-aware field generation, referential integrity, configurable record counts)

### Step 3: Serve (`/local-mock-server`)

Start a mock API server with full CRUD REST endpoints, WebSocket replay, CORS configuration, and relationship-aware routing.

```
@local /local-mock-server
```

The server reads `.orch/mocks/db.json`, `.orch/mocks/routes.json`, and `.orch/mocks/ws-messages.json`.

### Step 4: Wire (`/angular-mock-wire`)

Generate Angular services, TypeScript interfaces, environment configuration, and contract tests from the mock data schema.

```
@angular /angular-mock-wire
```

This creates typed Angular services that consume the mock API, with environment switching between mock and real endpoints.

---

## 13. Creating a New Project

### Nx Angular Monorepo (recommended)

```bash
orch new nx-angular my-app
cd my-app
```

This command:

1. Runs `npx create-nx-workspace` with Angular monorepo preset
2. Creates shared libraries: `shared-models`, `shared-ui`, `data-access`
3. Runs `orch init` to install agents, skills, config, hooks, and audit framework
4. Produces a ready-to-use project with `orch doctor` passing

**Next steps after creation:**

```bash
npx nx serve my-app                           # start dev server
@angular recap this project                    # understand the codebase
@angular /angular-generate-component Dashboard # create your first component
@local /local-mock-generate "your data"        # set up mock API
```

### Standalone Angular CLI

```bash
orch new angular my-app
cd my-app
```

Creates a single Angular CLI app with routing, strict mode, SCSS, and ORCH initialized.

### Adding apps to an Nx workspace

Use the `/angular-create-app` skill to add new apps to an existing Nx workspace:

```
@angular /angular-create-app portfolio-tracker
```

This generates a new app with routing, HDS design system, Elevate services, and module boundary configuration.

---

## 14. Creating and Updating Skills

### SKILL.md structure

Every skill requires a `SKILL.md` with YAML frontmatter:

```yaml
---
name: angular-<action>-<target>
description: "Clear description with trigger keywords. 10-1024 chars."
metadata:
  author: orch-team
  version: "1.0"
references:
  - references/angular/v19/<doc>.md
allowed-tools:
  - codebase
  - terminal
  - edit
---
```

Followed by these sections:

- **Context**: What the skill does and when to use it
- **Inputs**: What the user provides (arguments, flags, file paths)
- **Steps**: Numbered imperative instructions the agent follows
- **Output**: What the agent produces (formatted as a markdown template)
- **Validation**: How to verify the output is correct (build, tests, specific checks)

### Skill directory contents

```
.github/skills/<skill-name>/
  SKILL.md              # Required: skill definition
  references/           # Optional: skill-authored docs (templates, checklists)
  scripts/              # Optional: automation scripts (Node.js, bash)
  examples/             # Optional: before/after examples, usage examples
  variants/             # Optional: version-specific step overrides
```

### Adding references to a skill

Reference docs are specified in the `references:` frontmatter field. Paths are relative to `.orch/references/`. The resolver may override these paths based on the detected Angular version.

### Adding scripts

Scripts in the `scripts/` directory should be pure Node.js (no external deps), include a shebang (`#!/usr/bin/env node`), use strict mode, and output JSON to stdout.

### Adding examples

Examples in the `examples/` directory provide before/after code or usage demonstrations. They are injected into the agent context when the skill is invoked.

### Version variants

If the skill behaves differently for different Angular versions, add a `variants/` directory:

- `variants/modern.md` -- steps for v18+ (standalone, signals, control flow)
- `variants/legacy.md` -- steps for v16-v17 (NgModules, structural directives)

Update the resolver (`.orch/references/angular/resolver.yaml`) if the skill introduces new version-gated features.

---

## 15. Example: Building a Fund Screener App

This walkthrough demonstrates building a complete feature using ORCH, from project creation through a running app with mock data.

### Step 1: Create the project

```bash
orch new nx-angular fund-screener
cd fund-screener
```

### Step 2: Understand the codebase

Open VS Code and use the Copilot Chat panel:

```
@angular recap this project
```

ORCH scans the architecture, dependencies, tests, and quality, then produces a `PROJECT-RECAP.md` with C4 diagrams and metrics.

### Step 3: Generate the fund list component

```
@angular /angular-generate-component FundList in src/app/features/funds
```

ORCH generates `fund-list.component.ts` (standalone, OnPush, signals), `.html` (with `@if`/`@for` control flow and `data-testid` attributes), `.scss` (HDS tokens), and `.spec.ts` (TestBed, mocked services).

### Step 4: Generate the fund service

```
@angular /angular-generate-service FundService in src/app/features/funds
```

ORCH generates an injectable service with typed HTTP methods, error handling, and a co-located test file.

### Step 5: Set up mock data

```
@local /local-mock-generate "50 funds with id, name, nav, category, riskRating, ytdReturn. 200 holdings with id, fundId, symbol, quantity, price"
```

ORCH generates `.orch/mocks/db.json` with 50 funds and 200 holdings (referential integrity enforced), plus `routes.json`, `relationships.json`, and `schema.json`.

### Step 6: Start the mock server

```
@local /local-mock-server
```

Mock API running at `http://localhost:3001` with full CRUD endpoints.

### Step 7: Wire the mock API to Angular

```
@angular /angular-mock-wire
```

ORCH generates TypeScript interfaces from the schema, Angular services configured to call the mock API, and environment files for mock/real switching.

### Step 8: Add routing

```
@angular /angular-generate-route funds --path /funds --component FundListComponent
```

### Step 9: Verify everything

```
@angular /angular-test-unit
@angular /angular-test-lint
@angular /angular-review
```

### Step 10: Generate a report

```
@orch /present-report from PROJECT-RECAP.md --format html
```

A self-contained HTML report opens in the browser with architecture diagrams, dependency analysis, test coverage, and quality metrics.

---

## 16. Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:

- Adding new skills (SKILL.md structure, references, scripts, examples, variants)
- Adding new agents (coordinator + planner + engineer + verifier pattern)
- Adding reference docs (doc packs, docs-fetch, token budget)
- Version-aware skills (variants, resolver.yaml)
- Testing changes (orch doctor, orch init, preflight)
- Code style (Node.js scripts, YAML, Markdown)

---

## 17. Quick Reference Card

### CLI Commands

| Command | Description |
|---------|-------------|
| `orch new nx-angular <name>` | New Nx Angular monorepo + ORCH |
| `orch new angular <name>` | New standalone Angular app + ORCH |
| `orch init` | Initialize ORCH in existing project |
| `orch install @angular` | Install Angular agent package |
| `orch doctor` | Health check |
| `orch status` | Show installed components |
| `orch list` | Show available agents |
| `orch list --packs` | Show available doc packs |

### Common Agent Commands

| Command | What it does |
|---------|-------------|
| `@angular recap this project` | Full project analysis with C4 diagrams |
| `@angular /angular-generate-component Name` | Scaffold component (standalone, OnPush, signals, HDS, tests) |
| `@angular /angular-generate-service Name` | Scaffold injectable service with tests |
| `@angular /angular-scan-deps` | Dependency analysis with upgrade recommendations |
| `@angular /angular-compatibility` | Version compatibility matrix |
| `@angular /angular-migrate-version` | Angular version upgrade workflow |
| `@angular /angular-migrate-standalone` | NgModules to standalone |
| `@angular /angular-migrate-signals` | Observables to signals |
| `@angular /angular-migrate-control-flow` | Structural directives to @if/@for |
| `@angular /angular-refactor <file>` | Modernize patterns |
| `@angular /angular-review` | Code review for anti-patterns |
| `@angular /angular-test-unit` | Generate and run unit tests |
| `@angular /angular-docs-generate` | Add TSDoc to public APIs |
| `@docs /docs-status` | Reference doc freshness dashboard |
| `@docs /docs-refresh` | Re-fetch stale reference docs |
| `@audit /audit-usage` | Usage report |
| `@audit /audit-tokens` | Token consumption report |
| `@local /local-mock-generate "description"` | Generate mock data |
| `@local /local-mock-server` | Start mock API server |
| `@local /local-diagnose` | Troubleshoot environment |
| `@orch /present-report from FILE --format html` | Generate HTML report |
| `@orch /present-deck from FILE` | Generate presentation deck |

### Authoritative Sources

| Category | Source | What it provides |
|----------|--------|-----------------|
| Version governance | `.orch/references/angular/supported-versions.md` | Supported Angular versions and EOL dates |
| Style and patterns | `.orch/references/angular/v19/best-practices.md` | Coding patterns (detailed docs exist for v19; other versions have `whats-new.md` only) |
| Upgrade guide | `.orch/references/angular/migrations-reference.md` | Cross-version migration patterns |
| Migration schematics | `.orch/references/angular/v{N}/standalone-guide.md`, `signals-guide.md`, `control-flow-guide.md` | Step-by-step migration instructions |
| Version changelogs | `.orch/references/angular/v{N}/whats-new.md` | Breaking changes per version (note: detailed docs only exist for v19; other versions have `whats-new.md` summaries only) |
| State management | `.orch/references/angular/v{N}/state-management-guide.md` | NgRx Store, NgRx SignalStore, signals |
| Module federation | `.orch/references/nx/module-federation-guide.md` | Nx Module Federation setup |
| PrimeNG | `.orch/references/primeng/` | Component library reference |
| AG Grid | `.orch/references/ag-grid/` | Data grid reference |
| Migration guides | `.orch/references/angular/v{N}/karma-to-jest-migration.md`, `cypress-to-playwright-migration.md` | Test framework migration |
| Version resolution | `.orch/references/angular/resolver.yaml` | Feature-to-version gate mapping |
| Nx version matrix | `.orch/references/angular/nx-angular-version-matrix.md` | Nx and Angular version compatibility |
| Internal libraries | `.orch/references/internal/` | Elevate, HDS, Elevate Common docs |

### Auto Mode Levels

| Level | Behavior |
|-------|----------|
| `step-by-step` | Pause before every action |
| `safe` (default) | Read ops immediate; write ops need one plan approval |
| `all` | Execute everything, stop only on failures |

### Triage Modes

| Mode | When | Pipeline |
|------|------|----------|
| Query | Read-only question | Coordinator answers directly |
| Quick-fix | Single file, clear scope | Engineer then Verifier |
| Workflow | Multi-file, ambiguous scope | Planner then Engineer then Verifier |
