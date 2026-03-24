# ORCH Developer User Guide

A hands-on guide for developers using ORCH daily. Follow top to bottom on your first day, then use as a reference.

---

## Table of Contents

1. [Quick Start](#1-quick-start) — prerequisites, install, init
2. [Understanding ORCH](#2-understanding-orch) — agents, skills, workflows, triage
3. [CLI Commands Reference](#3-cli-commands-reference) — all orch commands
4. [Working with Agents in VS Code](#4-working-with-agents-in-vs-code) — query, quick fix, workflow modes + examples
5. [Configuration](#5-configuration) — config.yaml, copilot-instructions, boundaries
6. [Workflows](#6-workflows) — how they work, available workflows, custom workflows
7. [Reports](#7-reports) — recap, create, migrate, docs, local reports
8. [Audit & Observability](#8-audit--observability) — what's captured, viewing data, benchmarking
9. [Auto Mode](#9-auto-mode) — step-by-step, safe, all
10. [Design System & Platform Integration](#10-design-system--platform-integration) — HDS, Elevate
11. [Troubleshooting](#11-troubleshooting) — orch doctor, common issues
12. [Mock Data & Local API Server](#12-mock-data--local-api-server) — capture, generate, serve, wire
13. [Creating a New Project](#13-creating-a-new-project) — Nx monorepo, Angular CLI, adding apps
14. [Creating and Updating Skills](#14-creating-and-updating-skills) — SKILL.md, references, scripts
15. [Contributing](#15-contributing)
16. [Quick Reference Card](#quick-reference-card)

---

## 1. Quick Start

### Prerequisites

| Requirement | Version | Check | macOS (brew) | Windows (winget) |
|-------------|---------|-------|-------------|-----------------|
| Node.js | 18+ | `node --version` | `brew install fnm && fnm install 18` | `winget install Schniz.fnm && fnm install 18` |
| VS Code | Latest | — | [code.visualstudio.com](https://code.visualstudio.com) | `winget install Microsoft.VisualStudioCode` |
| GitHub Copilot | Extension + subscription | VS Code extensions panel | Install from marketplace | same |
| Git | 2.30+ | `git --version` | `brew install git` | `winget install Git.Git` |
| bash | Any | `bash --version` | Pre-installed | Git Bash (comes with Git) |
| jq | Any | `jq --version` | `brew install jq` | `winget install jqlang.jq` |
| python3 | 3.9+ | `python3 --version` | `brew install python3` | `winget install Python.Python.3.12` |

> **Recommended Node.js manager:** [fnm](https://github.com/Schniz/fnm) (Fast Node Manager) — cross-platform, faster than nvm, works on Windows/macOS/Linux. Install: `brew install fnm` (macOS), `winget install Schniz.fnm` (Windows).

> `orch doctor` checks all of these and provides platform-specific install guidance for anything missing.

### Install and Initialize

```bash
npm install -g @orch/cli
cd your-project
orch init
orch doctor
```

**What `orch init` does:** Detects your stack (reads `package.json`, `angular.json`, etc.), copies agents/skills/hooks into `.github/`, creates `.orch/` with config, references, and registry, and generates a manifest tracking what was installed.

After init, your project has two new directories:

```
.github/                          # VS Code / Copilot reads this
  copilot-instructions.md         # Global safety + audit rules
  agents/                         # Agent definitions
  skills/                         # Skill definitions (SKILL.md + references)
  instructions/                   # Behavioral instructions (auto-mode bridge)
  hooks/                          # Audit lifecycle hooks

.orch/                            # Everything ORCH owns
  config.yaml                     # Runtime settings — edit this
  manifest.json                   # CLI install tracking + checksums
  registry.yaml                   # Doc source registry
  config/
    boundaries.yaml               # Agent tool + file scope boundaries
    adherence-rules.yaml          # Post-session compliance checks
  scripts/                        # Audit hooks (bash) + language adapters (ts-morph)
  references/                     # Versioned reference docs (angular/v18/, v19/, etc.)
  runs/                           # Per-run telemetry (date-bucketed)
  audit/                          # Aggregated audit data
  workflow/                       # Multi-session workflow state
```

**What `orch doctor` checks:** bash, jq, python3 availability; audit hooks installed; config schema valid; reference dependencies resolve; agent boundaries defined. Gives platform-specific install guidance for anything missing.

---

## 2. Understanding ORCH

### 2.1 Agents

Specialized AI personas invoked with `@mention` in Copilot Chat. You talk to the **coordinator** — it routes to sub-agents internally.

| Agent | Role |
|-------|------|
| `@angular` | Domain coordinator — triages, routes, owns retry loop |
| `@angular-planner` | Scans, plans, explains (read-only) |
| `@angular-engineer` | Writes code, runs migrations, generates artifacts |
| `@angular-verifier` | Validates: tests, lint, review |
| `@orch` | Master orchestrator — routes to domain agents |
| `@docs` | Reference supply chain — fetch, convert, refresh, drift-check |
| `@audit` | Observability — usage, tokens, compliance, drift, benchmarking |
| `@local` | Local environment setup — shell, Docker, deps, diagnostics |

### 2.2 Skills

Granular, domain-specific tasks invoked with `/slash-command`. Each does one thing for one domain and declares which reference docs it needs (no context bloat).

```
@angular /angular-scan-deps         — scan dependencies
@angular /angular-generate-component — scaffold a component
@docs /docs-fetch                    — fetch and convert reference docs
```

### 2.3 Workflows

Declarative YAML files in `.orch/workflows/` defining multi-step operations. Each workflow declares phases (ordered steps with agents, skills, pre/post checks, checkpoints, verification, and failure handling). The coordinator matches your request against the workflow `trigger` field and executes it automatically.

### 2.4 The Triage System

Every request to `@angular` is classified:

| Mode | Trigger | Pipeline |
|------|---------|----------|
| **Query** | Read-only question | Coordinator answers directly |
| **Quick fix** | Single-file, clear intent | Engineer → Verifier |
| **Workflow** | Multi-file, ambiguous, structural | Planner → Engineer → Verifier |

Decision: No file changes? Query. Clear and bounded? Quick fix. Everything else? Workflow. If the engineer discovers scope exceeds a quick fix, it self-escalates to a full workflow.

---

## 3. CLI Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `orch init` | Initialize ORCH in your project | `cd my-app && orch init` |
| `orch install @angular` | Install a specific domain | `orch install @angular` |
| `orch update` | Pull latest tooling + references | `orch update` |
| `orch doctor` | Health check (env + ORCH) | `orch doctor` |
| `orch list` | Show available agents/skills | `orch list` |
| `orch status` | Show installed components + freshness | `orch status` |
| `orch reset` | Remove ORCH (with confirmation) | `orch reset` |
| `orch reset --force` | Clean wipe without confirmation | `orch reset --force` |
| `orch maintain convert` | Convert doc sources to markdown | `orch maintain convert` |
| `orch maintain refresh` | Refresh stale reference docs | `orch maintain refresh` |

**`orch init`** detects project type, copies agents/skills/hooks, creates `.orch/` structure, fetches reference docs from doc-packs.

**`orch update`** updates agents, skills, and references from the marketplace. Assists with reference version bumps when project dependencies change.

**`orch reset`** shows a preview of what will be removed and requires confirmation. Preserves non-ORCH files in `.github/`. Use `--force` to skip the prompt.

**`orch maintain`** commands are for ORCH maintainers managing the reference doc pipeline (converting from PDF/Confluence/OpenAPI to token-efficient markdown).

---

## 4. Working with Agents in VS Code

### 4.1 Query Mode (Ask Questions)

```
@angular What version of Angular is this?
@angular Explain the trade service
@angular How is routing set up in this project?
@angular What state management pattern are we using?
```

The coordinator reads source files and answers directly. No sub-agents, no plans, no file modifications. Fast.

### 4.2 Quick Fix Mode (Small Changes)

```
@angular Add trackBy to this @for loop
@angular Fix the lint error in dashboard.component.ts
@angular Convert this component to standalone
@angular Add OnPush change detection to trade-list.component.ts
```

Coordinator routes to engineer (makes the change), then verifier (confirms build/tests pass).

### 4.3 Workflow Mode (Multi-Step Operations)

> **Prerequisites:** Git must be clean (no uncommitted changes). Reference docs should be current (run `@docs /docs-status` to check). `.orch/workflows/` must have the relevant workflow YAML (installed by `orch init`). See [Section 5](#5-configuration) for config settings and [Section 6](#6-workflows) for workflow details.

#### Example: Upgrade Angular

```
@angular upgrade this app from Angular 17 to 19
```

1. **Triage:** Coordinator matches `angular-migration.yaml` (trigger: `upgrade|migrate|update angular`).
2. **Pre-flight:** `@orch-preflight` checks reference freshness, audit hooks, build baseline, git clean.
3. **Phase execution** (10 phases):

| # | Phase | Agent | What happens |
|---|-------|-------|-------------|
| 1 | Scan dependencies | Planner | Captures current versions |
| 2 | Compatibility check | Planner | Generates upgrade path |
| 3 | Upgrade TypeScript | Engineer | Bumps TS, fixes types, git checkpoint |
| 4 | Upgrade Angular core | Engineer | Major version bump, git checkpoint |
| 5 | Standalone migration | Engineer | NgModules → standalone, git checkpoint |
| 6 | Control flow migration | Engineer | `*ngIf`/`*ngFor` → `@if`/`@for`, git checkpoint |
| 7 | Signals migration | Engineer | Inputs/observables → signals, git checkpoint |
| 8 | Third-party compat | Engineer | Update PrimeNG, AG Grid, etc. |
| 9 | Final verification | Verifier | Unit + E2E + lint + review |
| 10 | Post-scan | Planner | Captures final versions |

4. **Status bar** shows real-time progress: `ORCH: Migration 4/10 ✓`
5. **Report:** `PROJECT-MIGRATE-REPORT.md` with before/after versions, phase timeline, verification results, risk items, git history, recommendations.
6. **Git tag:** `migrate/angular-v19-2026-03-24`

#### Example: Recap a Project

```
@angular recap this project
```

Planner runs 8 scan skills (deps, arch, quality, tests, deploy, git, docs, features) and stitches results into `PROJECT-RECAP.md` with TOC, executive summary, C4 diagrams, quality scores, coverage, and prioritized recommendations linked to specific skills:

```markdown
1. **Upgrade Angular 17 → 19** — Run: @angular upgrade this app to Angular 19
2. **Fix HDS compliance** — 23 files with hardcoded colors. Run: @angular /angular-hds-audit
3. **Replace console.log** — 12 files. Run: @angular /angular-elevate-audit --lib logging
```

#### Example: Create a Feature

```
@angular create a trade blotter with AG Grid and real-time prices
```

Matches `angular-new-feature.yaml`. Phases: scan context → generate component → generate service → generate route → apply HDS → integrate Elevate → generate tests → verify → post-scan. Report: `PROJECT-CREATE-REPORT.md` with system context, impact summary (before/after counts), architecture decisions, design system compliance, Elevate integration, verification.

### 4.4 Using Specific Skills

**Scanning (planner):**
```
@angular /angular-scan-deps        — dependencies, versions, upgrade matrix
@angular /angular-scan-arch        — component graph, route map, C4 diagrams
@angular /angular-scan-quality     — lint, Lighthouse, bundle size, a11y
@angular /angular-scan-tests       — test inventory, coverage %, gaps
@angular /angular-scan-deploy      — CI/CD config, environments
@angular /angular-scan-git         — commit patterns, contributors
@angular /angular-scan-docs        — README completeness, TSDoc coverage
@angular /angular-scan-features    — functional inventory, API surface
@angular /angular-explain          — C4 architecture walkthrough
@angular /angular-compatibility    — version compat matrix + upgrade path
```

**Generation (engineer):**
```
@angular /angular-generate-component  — standalone, OnPush, signals
@angular /angular-generate-service    — injectable service
@angular /angular-generate-route      — route with lazy loading
```

**Migration (engineer):**
```
@angular /angular-migrate-standalone    — NgModules → standalone
@angular /angular-migrate-signals       — observables/inputs → signals
@angular /angular-migrate-control-flow  — *ngIf/*ngFor → @if/@for
@angular /angular-migrate-jest          — Karma → Jest
@angular /angular-migrate-playwright    — Cypress → Playwright
@angular /angular-migrate-version       — Angular version upgrade (17→18→19)
```

**Testing (verifier):**
```
@angular /angular-test-unit    — generate unit tests
@angular /angular-test-e2e     — generate e2e tests
@angular /angular-test-lint    — run lint checks
@angular /angular-review       — code review for anti-patterns
```

**CI/CD (engineer):**
```
@angular /angular-ci-pipeline    — generate/update GitHub Actions CI
@angular /angular-ci-optimize    — caching, parallelization
@angular /angular-cd-deploy      — deployment configuration
@angular /angular-cd-rollback    — rollback procedures
```

**Documentation:**
```
@angular /angular-docs-generate   — add TSDoc to undocumented APIs
@angular /angular-docs-repair     — JSDoc → TSDoc
@angular /angular-docs-readme     — generate README
@angular /angular-docs-changelog  — generate CHANGELOG
@angular /angular-docs-api        — API documentation
@angular /angular-docs-audit      — TSDoc coverage, find gaps
```

**Audit & observability:**
```
@audit /audit-usage this week                  — who used what, how often
@audit /audit-tokens                           — token consumption
@audit /audit-compliance                       — boundary violations, adherence scores
@audit /audit-drift                            — quality trends over time
@audit /audit-benchmark --compare models       — Claude vs GPT vs o4-mini
@audit /audit-benchmark --compare approaches   — ORCH agents vs raw prompts
@audit /audit-context                          — in-session context health
```

**Reference docs:**
```
@docs /docs-fetch --origin https://angular.dev/guide/signals  — fetch + convert
@docs /docs-status         — freshness dashboard
@docs /docs-refresh        — re-fetch stale sources
@docs /docs-drift          — doc-code mismatch detection
```

**Local environment:**
```
@local /local-setup-env      — shell, runtimes, env vars
@local /local-setup-docker   — Docker, docker-compose, localstack
@local /local-setup-deps     — install and verify project deps
@local /local-diagnose       — port conflicts, version mismatches
```

**Presentation:**
```
@orch /present-report from PROJECT-RECAP.md   — markdown → styled HTML report
@orch /present-deck from PROJECT-RECAP.md     — markdown → reveal.js slides
@orch /present-dashboard                       — metrics → HTML dashboard
```

---

## 5. Configuration

### 5.1 `.orch/config.yaml`

```yaml
workflow:
  max_retries: 3             # Retries before giving up
  auto_mode: safe            # step-by-step | safe | all (see Section 9)
  permission_level: allow    # allow | allow-with-permissions | auto

preflight:
  check_references: true     # Validate skill reference paths resolve
  max_stale_days: 30         # Days before a reference is "stale"
  check_build_baseline: true # Run build before migrations
  check_git_clean: true      # Require clean working tree
  auto_refresh_docs: true    # Auto re-fetch stale refs

models:
  coordinator: claude-sonnet-4
  planner: claude-sonnet-4
  engineer: claude-sonnet-4
  verifier: claude-sonnet-4

presentation:
  logo_path: ./assets/placeholder-logo.svg
  cover_background: "#0a0e17"
  hds_theme: null            # Path to custom HDS theme CSS
  default_format: html       # html | pptx

audit:
  log_retention_days: 90
  verbosity: normal          # minimal | normal | verbose
  export_format: json        # json | csv
```

**Common changes:**

| Goal | Setting |
|------|---------|
| No approval prompts | `auto_mode: all` |
| Pause at every step | `auto_mode: step-by-step` |
| Try GPT-4.1 for code gen | `models.engineer: gpt-4.1` |
| Skip build check | `preflight.check_build_baseline: false` |
| More retries | `workflow.max_retries: 5` |

### 5.2 `.github/copilot-instructions.md`

Global rules for ALL agents. You do not edit this file — it ships with ORCH.

**Locked (non-overridable):** Safety (never `rm -rf`, `git push --force`, `npm publish`, expose secrets). Audit (always log to `.orch/runs/`, respect boundaries). Handoff protocol. Pre-flight for workflows.

**Overridable by domain skills:** Confirmation behavior, strictness levels, output format, resource limits.

### 5.3 Version Governance (Compatibility Matrix)

ORCH uses a **curated compatibility matrix** to control which versions agents recommend. This is a governance gate, not just a reference doc.

```
Maintainer validates new version
    ↓
Updates compatibility matrix (.orch/references/angular/v19/compatibility-matrix.md)
    ↓
Runs: orch update (distributes to all projects)
    ↓
Developers can now upgrade to the new version
```

**Why this matters:**
- Agents will NEVER suggest upgrading to a version the org hasn't tested
- If Angular 21 ships but the matrix only covers v19, `/angular-compatibility` says "no upgrade path available beyond 19"
- The matrix is the single source of truth for what's approved
- Pre-flight warns if the matrix is older than `max_stale_days` — prompts the maintainer to refresh

**How the matrix gets updated:**
1. New framework version ships (e.g., Angular 20)
2. Org maintainer tests it — validates compatibility with TypeScript, Nx, AG Grid, internal libs
3. Maintainer updates the matrix: edit directly or `@docs /docs-fetch` from angular.dev
4. `orch update` distributes the updated matrix to all projects
5. Now `/angular-compatibility` and `/angular-migrate-version` know about v20

**For developers:** You don't manage the matrix. You just run `@angular upgrade to Angular 20` — the planner reads the matrix and plans the upgrade path. If v20 isn't in the matrix yet, you'll be told "version not yet approved — contact the ORCH maintainer."

**For maintainers:** See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to update the matrix and reference docs.

### 5.4 Boundaries (`.orch/audit/config/boundaries.yaml`)

Defines which tools each agent can use and which files it can touch:

- **Coordinator:** triages + orchestrates (`codebase`, `terminal`, `edit` — reads config for triage, writes workflow state to `.orch/workflow/`, runs `git commit` for checkpoints)
- **Planner:** read-only (scans source files, never writes)
- **Engineer:** broad write access (`codebase`, `terminal`, `edit` tools, writes to `src/**`)
- **Verifier:** writes only test files (`*.spec.ts`, `*.test.ts`)
- **Docs:** writes only to `.orch/references/`
- **Audit:** writes only to `.orch/audit/`

Boundary violations are logged in `.orch/audit/violations.jsonl`.

---

## 6. Workflows

### 6.1 How Workflows Work

```
User message → Coordinator triage → matches workflow trigger
  → @orch-preflight (refs fresh? build ok? git clean?)
  → Phase loop:
      Phase N: pre-check → execute skill → post-check
              → checkpoint (git commit) → verify (build/test)
              → update status bar → collect data
  → Report stitching (all collected data → PROJECT-{TYPE}-REPORT.md)
  → Post-workflow (git tag, final status)
```

**Failure handling:**

| `on-failure` | Behavior |
|--------------|----------|
| `stop` | Halt workflow, report progress |
| `pause` | Ask user what to do |
| `rollback-to-checkpoint` | Revert to last git commit, then pause |
| `continue` | Log failure, skip phase, continue |
| `report-as-partial` | Continue but mark report incomplete |

**Retry loop:** Verifier fails → coordinator reads feedback → minor fix (→ engineer) / plan wrong (→ planner) / blocked (→ user). Max 3 retries (configurable).

### 6.2 Available Workflows

**`angular-migration.yaml`** — Trigger: `upgrade|migrate|update angular`. 10 phases: scan → compat → TS → Angular core → standalone → control flow → signals → third-party → verify → post-scan. Git checkpoints after each migration phase. Report: `PROJECT-MIGRATE-REPORT.md`.

**`angular-new-feature.yaml`** — Trigger: `create|scaffold|generate|build|add feature`. 9 phases: scan context → component → service → route → HDS → Elevate → tests → verify → post-scan. Report: `PROJECT-CREATE-REPORT.md`.

### 6.3 Custom Workflows

> **Prerequisite:** Your workflow references skills by name. Those skills must exist as directories in `.github/skills/`. See [Section 13.1](#131-create-a-new-skill-step-by-step) for creating new skills that your workflow can reference.

Create YAML files in `.orch/workflows/`. Template:

```yaml
name: my-workflow
description: "What this does"
trigger: "keyword1|keyword2"
report:
  template: custom-report
  title: "Title — {{variable}}"

phases:
  - name: Phase name
    id: unique-id
    agent: planner | engineer | verifier
    skill: /skill-name
    args: --optional-flags
    pre-check:                        # Optional
      skill: /check-skill
      capture: before-data
    post-check:                       # Optional
      skill: /check-skill
      capture: after-data
    checkpoint: true | false          # Git commit?
    verify: true | false              # Build/test gate?
    approval: none | auto=safe
    collect: [metric-1, metric-2]
    report-section: "Section Name"
    on-failure: stop | pause | rollback-to-checkpoint | continue

post-workflow:
  report:
    sections: ["Section 1", "Risk Items", "Recommendations"]
  git:
    message: "type: description"
    tag: "type/name-{{date}}"         # null = no tag
  notify:
    status-bar: "Complete — {{phases-passed}}/{{phases-total}}"
```

---

## 7. Reports

### 7.1 Report Types

| Report | Generated by | Key sections |
|--------|-------------|-------------|
| **Recap** (`PROJECT-RECAP.md`) | `@angular recap this project` | Dependencies, architecture (C4), quality, tests, deploy, git, security, features, UX, docs, platform, recommendations |
| **Create** (`PROJECT-CREATE-REPORT.md`) | Feature creation workflows | System context, impact summary, what was created, decisions, tests, HDS/Elevate compliance, verification |
| **Migrate** (`PROJECT-MIGRATE-REPORT.md`) | Migration workflows | Before/after versions, phase timeline, phase details, verification, risks, git history, recommendations |
| **Docs** | `@angular /angular-docs-audit` | Freshness, doc-code drift, TSDoc coverage, gaps |
| **Local** | `@local /local-setup-env` | Runtime versions, Docker status, env vars, port availability |

> **Note:** Reports are richer when reference docs are populated. Scan skills read from `.orch/references/` for compatibility matrices, migration guides, and anti-pattern checklists. See [Section 13.2](#132-add-or-update-reference-docs) to set up reference docs.

### 7.2 Generating Styled Output

```
@orch /present-report from PROJECT-RECAP.md    — styled HTML (tables, progress bars, TOC, print-friendly)
@orch /present-deck from PROJECT-RECAP.md      — branded reveal.js slides or PPTX
@orch /present-dashboard                        — single-page HTML metrics dashboard
```

All outputs are self-contained (no CDN dependencies, works offline). HTML reports include Mermaid diagram rendering, status tags (`[ok]`/`[warn]`/`[bad]`), and `Cmd+P` PDF export.

---

## 8. Audit & Observability

Every agent action is tracked. Audit is the foundation — nothing executes without a record.

### 8.1 What Gets Captured

Per-run telemetry in `.orch/runs/{date}/{run-id}/`: metadata (`run.yaml`), planner output (`plan.md`), agent handoffs (`handoffs.log`), file changes (`changes.diff`), verification (`verify.md`), final report (`report.md`).

Tracked: agent, tools used, files touched, tokens consumed, timing, adherence score, boundary violations, handoff chain.

### 8.2 Viewing Audit Data

```
@audit /audit-usage this week      — who used what, how often, success rates
@audit /audit-tokens               — token counts per agent/skill/model (cost tracking)
@audit /audit-compliance           — boundary violations, adherence scores
@audit /audit-drift                — quality trends over time
@audit /audit-context              — in-session context health check
```

### 8.3 Benchmarking

**Model comparison** — run same task across Claude Sonnet 4, GPT-4.1, o4-mini:

```
@audit /audit-benchmark --compare models
```

Produces side-by-side report with quality, speed, tokens, consistency. Composite score: quality 60%, speed 20%, conciseness 20%.

**Approach comparison** — ORCH agents vs raw prompts on same task:

```
@audit /audit-benchmark --compare approaches
```

Measures quality, adherence, completeness. Shows the orchestration delta (what ORCH adds).

**Cross-product** — every model x every approach:

```
@audit /audit-benchmark --compare both
```

Results saved to `.orch/audit/benchmarks/` for longitudinal tracking.

---

## 9. Auto Mode

Controls human approval requirements. Set in `.orch/config.yaml`:

**`step-by-step`** — Maximum control. Pauses at every step for approval. Best for learning ORCH or auditing behavior.

**`safe`** (default) — Balanced. Read-only runs immediately. Write operations show plan first, execute after one approval. Status bar shows progress without interrupting.

**`all`** — Full automation. Everything runs end-to-end. You see the final report. Best for batch ops or CI/CD.

Safety note: even in `all` mode, locked rules still apply. ORCH never runs `rm -rf`, `git push --force`, `npm publish`, or exposes secrets regardless of auto mode.

---

## 10. Design System & Platform Integration

> **Prerequisites:** HDS and Elevate skills need reference docs to operate at full effectiveness. Run `@docs /docs-fetch --origin <your-hds-storybook-url> --format html` to populate `.orch/references/internal/hds/`. See [Section 13.2](#132-add-or-update-reference-docs) for details.

### 10.1 HDS (Design System)

```
@angular /angular-hds-audit      — find non-compliant components
@angular /angular-hds-apply      — fix compliance issues
@angular /angular-hds-generate   — create HDS-compliant components from scratch
```

**Audit** scans `.scss`/`.css`/`.html` for: hardcoded colors (hex/rgb not using `var(--hds-*)`), raw spacing, deprecated tokens, missing HDS components (`<table>` instead of `<hds-data-grid>`), incorrect theming. Scoped: `--severity high` or target a directory.

**Apply** fixes audit findings: replaces hardcoded values with tokens, migrates deprecated tokens, sets up theming, wraps raw elements. Runs build + test + re-audit to verify. Use `--dry-run` to preview.

**Generate** creates new components with 100% HDS tokens, HDS components, theme switching, and visual regression test stubs from day one.

### 10.2 Elevate (Platform Services)

```
@angular /angular-elevate-audit     — find missing platform services
@angular /angular-elevate-apply     — integrate platform services
@angular /angular-elevate-generate  — create with Elevate from the start
```

**Sub-library registry:**

| Sub-lib | Package | Detects |
|---------|---------|---------|
| auth | `@yourorg/elevate/auth` | Custom login flows, manual JWT |
| authorization | `@yourorg/elevate/authorization` | Hardcoded role checks |
| logging | `@yourorg/elevate/logging` | `console.log/error/warn` in source |
| config | `@yourorg/elevate/config` | localStorage, hardcoded config |
| preferences | `@yourorg/elevate/preferences` | Custom settings storage |
| common-grid | `@yourorg/elevate-common/grid` | Raw AG Grid without wrapper |
| common-chart | `@yourorg/elevate-common/chart` | Raw Plotly/Chart.js |
| common-dialog | `@yourorg/elevate-common/dialog` | Custom modal implementations |

**Audit** detects installed sub-libs from `package.json`, scans for compliance issues per sub-lib. Scoped: `--lib auth,logging` or target a directory.

**Apply** migrates to platform services: replaces `console.log` with `LoggingService`, custom auth with `ElevateAuthService`, raw AG Grid with `<elevate-grid>`. Installs missing packages, runs build + test + re-audit.

**Generate** creates services/components with Elevate wired in: `LoggingService` (not `console`), `ConfigService` (not `localStorage`), `ElevateAuthGuard`, `inject()` pattern, elevate-common components, tests with `provideElevateTesting()` mocks.

---

## 11. Troubleshooting

### 11.1 `orch doctor` Findings

| Finding | Fix |
|---------|-----|
| `[bad] jq not found` | macOS: `brew install jq`. Windows: `winget install jqlang.jq` |
| `[bad] python3 not found` | macOS: `brew install python3`. Windows: `winget install Python.Python.3.12` |
| `[bad] Node.js not found` | macOS: `brew install fnm && fnm install 18`. Windows: `winget install Schniz.fnm && fnm install 18` |
| `[bad] Audit hooks not installed` | Run `orch init` again |
| `[bad] Config schema invalid` | Fix YAML syntax in `.orch/config.yaml` |
| `[warn] N stale references` | Run `@docs /docs-refresh` |
| `[bad] References missing` | Run `@docs /docs-fetch` |

### 11.2 Common Issues

**Port conflicts:** Run `@local /local-diagnose` to identify which process holds a port.

**Bad suggestions / outdated advice:** References may be stale. Run `@docs /docs-status` then `@docs /docs-refresh`.

**Build fails before migration:** Fix the build first (`@angular What is causing the build failure?`), or set `preflight.check_build_baseline: false` (not recommended).

**Git not clean:** Commit or `git stash` your changes. Or set `preflight.check_git_clean: false`.

**"Quality declining" warning:** Context window is filling up. Finish current task, start a new Copilot Chat session. ORCH handoff protocol passes compact state so you do not lose progress.

**Max retries exceeded:** Fix the issue manually based on feedback, increase `max_retries`, or run the failing skill directly to debug: `@angular /angular-migrate-standalone`.

**Low adherence scores:** Check `@audit /audit-compliance`. May be caused by stale references, model quality, or context overflow.

---

## 12. Mock Data & Local API Server

### 12.1 Overview

The mock data pipeline lets you build frontend features against a fully functional local API before the real backend exists. The full flow:

```
Source (HAR / OpenAPI / TypeScript / manual)
    ↓
/local-mock-capture or /local-mock-generate
    ↓
.orch/mocks/ (db.json + routes + schema + relationships + ws-messages)
    ↓
/local-mock-server (REST :3001 + WebSocket)
    ↓
/angular-mock-wire (services + interfaces + environment + contract tests)
    ↓
Angular app → flip URL when real API ready → contract tests verify
```

### 12.2 Capture from a Running App (HAR + Chrome Snippet)

**Prerequisites:** Chrome DevTools access to the running app.

**Step-by-step:**

1. Open Chrome DevTools → Network tab
2. Navigate the app (load funds, click fund, drill into holdings)
3. Right-click in Network tab → "Save all as HAR with content"
4. (Optional) For click-to-endpoint mapping: paste Chrome snippet in Console, click Start, navigate, click Stop, save JSON
5. Run: `@local /local-mock-capture --from export.har --snippet clicks.json`
6. Output: `.orch/mocks/schema.json`, `routes.json`, `relationships.json`, `captured-data.json`, `ws-messages.json`

### 12.3 Generate from OpenAPI / Swagger

**Step-by-step:**

1. Get the API spec (YAML or JSON)
2. Run: `@local /local-mock-generate --from api-spec.yaml --mode synthetic --count 50`
3. Output: `.orch/mocks/db.json` with 50 records per collection

### 12.4 Generate from TypeScript Interfaces

**Step-by-step:**

1. Have your model files ready (e.g., `src/app/models/`)
2. Run: `@local /local-mock-generate --from src/app/models/ --mode synthetic`
3. Output: `db.json` matching your interfaces

### 12.5 Start the Mock Server

**Prerequisites:** Requires `json-server` and `ws` npm packages. The mock server skill generates a `package.json` in `.orch/mocks/` — run `npm install` in that directory before starting.

```bash
# Start immediately (skill manages process)
@local /local-mock-server --start --port 3001

# Or generate standalone script (you own it)
@local /local-mock-server --generate
node .orch/mocks/server.js
```

**Features:** Full CRUD, CORS, pagination, filtering, cascade deletes, WebSocket replay, optional auth mock, optional error simulation.

Example of mixed REST + WebSocket:

```
REST:  http://localhost:3001/api/funds          (GET, POST, PUT, DELETE)
REST:  http://localhost:3001/api/funds/3/holdings (GET, POST)
WS:    ws://localhost:3001/ws/prices             (real-time price ticks)
WS:    ws://localhost:3001/ws/orders             (order status updates)
```

### 12.6 Wire into Angular

```
@angular /angular-mock-wire
```

**What it generates:**

- TypeScript interfaces in `src/app/models/`
- Angular services in `src/app/services/` (inject(), ConfigService for URL)
- Environment config (mock URL vs real URL)
- Contract tests (verify real API matches mock contract)

URL switching:

```typescript
// environment.ts (dev/mock)
apiBaseUrl: 'http://localhost:3001/api'

// environment.prod.ts (real)
apiBaseUrl: 'https://api.yourorg.com'
```

### 12.7 Contract Tests

When real API is available:

```bash
# Run contract tests against real API
ng test --include='**/contract/**'
```

These tests verify every endpoint returns data matching the TypeScript interfaces you built against. If the real API differs from the mock, the contract test fails — you know immediately.

**When a contract test fails:**
1. Compare the failing field — is the type different? Field renamed? Field missing?
2. If the real API changed intentionally: update the TypeScript interface, regenerate the service, update the mock data
3. If the real API is wrong: file a bug with the API team, attach the contract test output
4. Re-run contract tests after fixing: `ng test --include='**/contract/**'`

**Full sequence:**

```
Developer → Chrome (capture HAR) → /local-mock-capture → /local-mock-generate → /local-mock-server → /angular-mock-wire → Angular app uses mock → Real API available → Flip URL → Contract tests verify → Ship
```

---

## 13. Creating a New Project

### 13.1 Create an Nx Angular Monorepo (Recommended)

> **Prerequisites:** Node.js 18+ (via fnm), Git. See [Section 1](#1-quick-start) for full prerequisites.

```bash
@local /local-create-workspace nx-angular my-trade-app
```

What happens:
1. Runs `npx create-nx-workspace@latest` with Angular monorepo preset
2. Configures TypeScript strict mode, Jest, ESLint + @angular-eslint
3. Creates shared libraries: `shared-models`, `shared-ui`, `data-access`
4. Sets up Nx module boundary rules
5. Runs `orch init` to install ORCH agents, skills, hooks
6. Runs `orch doctor` to verify setup
7. Runs initial build + test

Output: complete Nx workspace with ORCH installed, ready to develop.

### 13.2 Create a Standalone Angular CLI App

```bash
@local /local-create-workspace angular my-simple-app
```

Same flow but uses `npx @angular/cli@latest new` instead of Nx. No shared libraries or module boundaries. Simpler but less scalable.

### 13.3 Add an App to an Existing Workspace

Already have an Nx workspace? Add another app:

```bash
@angular /angular-create-app trading-app --port 4201 --hds --elevate auth,logging
```

This creates a new app within the existing workspace, connects it to shared libraries, configures HDS + Elevate, and sets up module boundary tags.

### 13.4 Options

| Flag | Default | Description |
|------|---------|-------------|
| `--style` | scss | Stylesheet format |
| `--prefix` | app | Component selector prefix |
| `--package-manager` | npm | npm, yarn, or pnpm |
| `--docker` | false | Add Dockerfile + docker-compose |
| `--ci github-actions` | none | Add CI pipeline template |
| `--hds` | false | Pre-configure HDS design system |
| `--elevate auth,logging` | none | Pre-configure Elevate platform services |
| `--mock` | false | Set up mock server for the app |

### 13.5 After Creation

```bash
cd my-trade-app
@angular recap this project           # understand what was created
@angular /angular-generate-component   # create your first component
@local /local-mock-generate "50 trades with symbol, price, quantity"  # mock data
@local /local-mock-server --start      # start mock API
```

---

## 14. Creating and Updating Skills

### 13.1 Create a New Skill (Step by Step)

**Step 1: Create the skill directory**
```bash
mkdir -p .github/skills/angular-my-new-skill
```

**Step 2: Write the SKILL.md**
```yaml
# .github/skills/angular-my-new-skill/SKILL.md
---
name: angular-my-new-skill
description: "What this skill does — clear trigger keywords"
references:
  - references/angular/v19/my-guide.md    # declare what docs you need
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context
When and why to use this skill.

## Inputs
- "Example trigger phrase 1"
- "Example trigger phrase 2"

## Steps
1. Read reference doc from .orch/references/angular/v19/my-guide.md
2. Scan the target code
3. Make changes
4. Run build + test verification

## Output
What the skill produces (tables, diagrams, files).

## Validation
How to verify the output is correct.
```

**Step 3: Add reference docs (if needed)**

> **Important:** If your SKILL.md declares `references:`, those docs MUST exist before the skill works. Complete this step BEFORE testing (Step 7). See [Section 13.2](#132-add-or-update-reference-docs) for the full reference doc lifecycle.

Option A — fetch from a URL:
```
@docs /docs-fetch --origin https://example.com/guide --format html
# Creates .orch/references/angular/v19/my-guide.md automatically
```

Option B — fetch from internal source code:
```
@docs /docs-fetch --origin src/libs/my-lib/ --format tsdoc
# Runs typedoc, extracts API surface, writes .orch/references/internal/my-lib.md
```

Option C — manually create the reference:
```bash
# Write the markdown yourself (max 500 lines, token-efficient)
cat > .orch/references/angular/v19/my-guide.md << 'EOF'
# My Guide
## API Reference
| Method | Params | Returns | Description |
...
EOF
```

**Step 4: Add examples (optional)**
```bash
mkdir -p .github/skills/angular-my-new-skill/references
# Add skill-specific examples, templates, checklists
echo "# Before/After example" > .github/skills/angular-my-new-skill/references/example.md
```

**Step 5: Add scripts (optional)**
```bash
mkdir -p .github/skills/angular-my-new-skill/scripts
# Add automation scripts the skill invokes
echo "#!/bin/bash" > .github/skills/angular-my-new-skill/scripts/count-patterns.sh
chmod +x .github/skills/angular-my-new-skill/scripts/count-patterns.sh
```

**Step 6: Register in the agent**

Add the skill name to the appropriate agent's skill list. For example, in the `@angular-engineer` agent or the `@angular-planner` agent depending on whether the skill reads or writes.

**Step 7: Test it**
```
@angular /angular-my-new-skill src/app/features/trade/
```

### 13.2 Add or Update Reference Docs

**Check what you have:**
```
@docs /docs-status
```
Shows all sources, versions, freshness, staleness warnings.

**Fetch a new external doc:**
```
@docs /docs-fetch --origin https://angular.dev/guide/signals --format html
# Fetched → converted to markdown → written to .orch/references/ → registered in .orch/registry.yaml
```

**Fetch from internal source code:**
```
@docs /docs-fetch --origin src/libs/hds/ --format tsdoc
# Runs typedoc → extracts public API → writes .orch/references/internal/hds/components.md
```

**Refresh stale docs:**
```
@docs /docs-refresh
# Re-fetches and re-converts all sources older than max_stale_days (default: 30)
```

**Check for doc-code drift:**
```
@docs /docs-drift
# Compares reference docs against actual code — flags mismatches
```

**Reference lifecycle:**
```
Register → Fetch & Convert → Reference from Skill → Refresh when stale
  @docs      @docs             SKILL.md yaml         @docs or orch update
/docs-fetch  /docs-fetch       references:            /docs-refresh
                                 - references/...
```

### 13.3 Skill File Structure

A complete skill directory can contain:
```
.github/skills/angular-my-skill/
  SKILL.md              # Required — skill definition
  references/            # Optional — skill-specific examples, templates, checklists
    before-after.ts      # Before/after code examples
    checklist.md         # Migration checklist
    template.component.ts  # Code template
  scripts/               # Optional — automation scripts
    count-patterns.sh    # Pattern counting
    verify.sh            # Verification script
```

**Key distinction:**
- **Shared references** (`.orch/references/`) — fetched by `@docs`, shared across skills, versioned, refreshable
- **Skill-local references** (`skills/<name>/references/`) — authored by the skill creator, specific to this skill, not fetched from external sources

### 13.4 Updating an Existing Skill

1. Edit the SKILL.md — update steps, references, output format
2. If references changed, run `@docs /docs-fetch` for new sources
3. Test: invoke the skill and verify output
4. If the skill is part of a workflow, test the full workflow too

## 15. Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full details on adding domains, agents, workflows, and passing the quality bar.

---

## Quick Reference Card

```
@angular "question"                    — query mode (read-only, fast)
@angular "fix this"                    — quick fix (engineer → verifier)
@angular "migrate/create/recap"        — workflow (planner → engineer → verifier)
@angular /skill-name                   — invoke specific skill
orch doctor                            — health check
orch update                            — pull latest
```

**When things go wrong:**
```
orch doctor                            — environment health
@audit /audit-context                  — context health
@docs /docs-status                     — reference freshness
@local /local-diagnose                 — local environment
```

**Config cheat sheet (`.orch/config.yaml`):**
```yaml
workflow.auto_mode: safe               # step-by-step | safe | all
workflow.max_retries: 3                # increase for complex migrations
preflight.check_git_clean: true        # disable if needed
models.engineer: claude-sonnet-4       # change to test other models
```
