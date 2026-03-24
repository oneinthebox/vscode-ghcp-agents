# ORCH Architecture Redesign — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## 1. Overview

Redesign ORCH from monolithic agents with generic skills to a role-based sub-agent architecture with domain-specific granular skills, unified directory structure, and clear separation of concerns.

---

## 2. Agent Architecture

### 2.1 Master Orchestrator

`@orch` — delegator with baked-in audit. Routes to domain agents or shared skills.

Sub-agents:
- `@orch-preflight` — pre-flight checks before any workflow (reference freshness, version alignment, audit hooks, build baseline, git clean)

Shared skills (under @orch):
- `/present-deck` — general-purpose markdown → branded reveal.js HTML or PPTX
- `/present-dashboard` — metrics dashboard, single-page HTML

### 2.2 Domain Agents (Angular example, pattern repeats for all domains)

**Coordinator:** `@angular` — triage (query/quick-fix/workflow) + loop owner (max 3 retries)

**3 role-based sub-agents:**
| Agent | Role | What it does |
|-------|------|-------------|
| `@angular-planner` | Why, What | Scans, plans, explains, produces reports |
| `@angular-engineer` | How, Where | Writes code, runs migrations, generates artifacts |
| `@angular-verifier` | Checks | Validates output meets plan, build/test/lint pass |

**Triage modes:**
| Mode | Trigger | Pipeline |
|------|---------|----------|
| Query | Read-only, no file changes | `@angular` answers directly |
| Quick fix | Single-file, clear intent | `@angular-engineer` → `@angular-verifier` |
| Workflow | Multi-file, ambiguous, structural | `@angular-planner` → `@angular-engineer` → `@angular-verifier` |

**Loop:** Verifier fails → feedback to coordinator → coordinator decides: minor fix (→ engineer), plan wrong (→ planner), blocked (→ human). Max 3 retries, configurable in `.orch/config.yaml`.

**Engineer self-escalation:** If engineer discovers scope exceeds quick-fix, hands back to coordinator for full workflow routing.

### 2.3 Docs Agent

`@docs` — narrowed to reference material supply chain ONLY.

Skills:
- `/docs-fetch` — fetch source (URL, PDF, Confluence, OpenAPI, Storybook), convert to token-efficient markdown
- `/docs-status` — dashboard of all sources, versions, freshness
- `/docs-refresh` — re-fetch and re-convert stale sources
- `/docs-drift` — compare reference docs against code for doc-code mismatch

Sub-agent: `@doc-convert-worker` — heavy conversion jobs

### 2.4 Audit Agent

`@audit` — single agent, no sub-agent split (read-only reporting doesn't justify it).

Skills:
- `/audit-usage` — who, what, how often
- `/audit-tokens` — cost tracking
- `/audit-compliance` — boundary violations, adherence scores
- `/audit-drift` — behavioral quality trends over time
- `/audit-benchmark` — comparison engine with two modes:
  - **Model comparison** (`--compare models`): run same task across Claude Sonnet 4, GPT-4.1, o4-mini — compare quality, speed, adherence, token cost per model per skill
  - **Approach comparison** (`--compare approaches`): run same task with ORCH agents vs raw prompts — compare total tokens, turns to completion, standards adherence, build/test pass rate, time to completion
  - Supports cross-product: approaches x models (e.g., "ORCH + Claude vs raw + GPT-4.1")
  - Output: side-by-side report with metrics table, winner per dimension, recommendation
- `/audit-context` — in-session health check + handoff generation

### 2.5 @local Agent (Shared)

`@local` — local environment setup agent, shared across all domains.

Skills:
- `/local-setup-env` — configure shell, language runtimes, environment variables
- `/local-setup-docker` — set up Docker, docker-compose, localstack
- `/local-setup-deps` — install and verify project dependencies
- `/local-diagnose` — diagnose environment issues: port conflicts, version mismatches, missing tools

No sub-agents — scope is narrow enough for a single agent.

### 2.6 Removed

- `@showcase` — replaced by shared `/present-deck` and `/present-dashboard` under `@orch`
- `@scan-worker` — replaced by domain-specific scanners (e.g., invoked by `@angular-planner`)
- `@ci` / `@cd` — CI/CD is domain-specific. Each domain agent includes its own CI/CD skills (e.g., `/angular-ci-pipeline`, `/angular-cd-deploy`). There are no standalone CI/CD agents.

---

## 3. Skills — Domain-Specific and Granular

### 3.1 Angular Domain Skills

**Planner skills (scan/understand):**
- `/angular-scan-deps` — dependencies, versions, changelog matrix, upgrade benefits
- `/angular-scan-arch` — architecture, module/component graph, route map
- `/angular-scan-quality` — lint, Lighthouse, bundle size, a11y, performance
- `/angular-scan-tests` — test inventory, coverage %, gap analysis
- `/angular-scan-deploy` — pipeline config, releases, environments
- `/angular-scan-git` — changelog, release notes, commit patterns, contributors
- `/angular-scan-docs` — README completeness, code docs coverage
- `/angular-scan-features` — functional inventory, feature map, API surface
- `/angular-explain` — C4 architecture walkthrough (interactive or PROJECT.md)
- `/angular-compatibility` — version compatibility matrix + upgrade path

**Engineer skills (build/change):**
- `/angular-generate-component` — scaffold component with org standards
- `/angular-generate-service` — scaffold injectable service
- `/angular-generate-route` — scaffold route + lazy loading
- `/angular-migrate-standalone` — NgModules → standalone
- `/angular-migrate-signals` — observables/inputs → signals
- `/angular-migrate-control-flow` — *ngIf/*ngFor → @if/@for
- `/angular-migrate-jest` — Karma → Jest
- `/angular-migrate-playwright` — Cypress → Playwright
- `/angular-migrate-version` — Angular version upgrade (17→18→19)
- `/angular-refactor` — modernize patterns
- `/angular-docs-generate` — add TSDoc to undocumented APIs
- `/angular-docs-repair` — fix stale/wrong-format docs (JSDoc → TSDoc)

**Verifier skills (check/validate):**
- `/angular-test-unit` — generate unit tests
- `/angular-test-e2e` — generate e2e tests
- `/angular-test-lint` — run lint checks
- `/angular-review` — code review for anti-patterns
- `/angular-docs-audit` — check TSDoc coverage, find gaps

**CI/CD skills (domain-specific, under engineer):**
- `/angular-ci-pipeline` — generate/update Angular CI pipeline (GitHub Actions)
- `/angular-ci-optimize` — optimize CI: caching, parallelization, incremental builds
- `/angular-cd-deploy` — deployment: environment promotion, CDN upload, artifact management
- `/angular-cd-rollback` — rollback procedures and verification

> **Pattern repeats for all domains:** @springboot gets `/springboot-ci-pipeline`, `/springboot-cd-deploy`, etc. @fastapi gets `/fastapi-ci-pipeline`, `/fastapi-cd-deploy`, etc. CI/CD is inherently stack-specific — there are no standalone @ci or @cd agents.

### 3.2 @local Skills (shared)

- `/local-setup-env` — configure shell, language runtimes, environment variables
- `/local-setup-docker` — set up Docker, docker-compose, localstack
- `/local-setup-deps` — install and verify project dependencies
- `/local-diagnose` — diagnose environment issues

### 3.3 Shared Skills (under @orch)

- `/present-deck` — markdown → branded reveal.js HTML or PPTX
- `/present-dashboard` — metrics → single-page HTML dashboard

### 3.4 Skill-to-Reference Dependencies

Each SKILL.md declares its reference dependencies:

```yaml
---
name: angular-migrate-standalone
description: "Migrate NgModules to standalone components"
references:
  - orch://references/angular/v19/standalone-guide.md
  - orch://references/angular/v19/migration-guide.md
---
```

Only declared references are loaded — no context bloat.

---

## 4. Directory Structure

### 4.1 Project-level (after `orch init`)

```
.github/                          # VS Code reads (mandatory location)
  copilot-instructions.md         # Global operating rules
  agents/                         # Agent definitions
  skills/                         # Skill definitions (SKILL.md + local references/)
  instructions/
    auto-mode.instructions.md     # Bridges config.yaml → agent behavior
  hooks/                          # Audit lifecycle hooks

.orch/                            # Everything ORCH owns
  config.yaml                     # Runtime settings
  manifest.json                   # CLI install tracking + checksums
  registry.yaml                   # Doc source registry (moved from root)
  config/
    boundaries.yaml               # Agent tool + scope boundaries
    adherence-rules.yaml          # Post-session compliance checks
  scripts/
    audit/                        # Hook scripts (bash)
    semantic/                     # Language adapters (ts-morph)
  references/                     # Fetched/converted reference docs (versioned)
    angular/
      v18/
      v19/
    primeng/
    internal/
  runs/                           # Per-run telemetry (date-bucketed)
    2026-03-23/
      <run-id>/
        run.yaml                  # Metadata
        plan.md                   # Planner output
        handoffs.log              # Agent chain + timestamps
        changes.diff              # File changes
        verify.md                 # Verifier output
        report.md                 # Final report
  audit/                          # Aggregated audit data
    metrics/
    tokens/
    violations.jsonl
  workflow/                       # Multi-session workflow state
```

### 4.2 Marketplace-level (source repo)

```
marketplace/
  .github/
    agents/                       # Agent .md files
    skills/                       # Skill directories
    instructions/                 # Instruction files
    hooks/                        # Hook JSON configs
  .orch/
    config/                       # Default boundaries + adherence rules
    scripts/                      # Audit + semantic scripts
  doc-packs/                      # Doc pack templates (angular.yaml, etc.)
  orch-status-extension/          # VS Code extension
```

### 4.3 Removed

- `marketplace/docs-staging/` — no intermediate staging needed
- `marketplace/.github/skill-overrides/` — cascade model replaces it
- `marketplace/.github/references/` — moves to `.orch/references/`
- Top-level `docs-registry.yaml` — moves to `.orch/registry.yaml`
- Top-level `scripts/` — moves to `.orch/scripts/`

---

## 5. Config & Instructions

### 5.1 `.github/copilot-instructions.md` — Global Rules

Applies to ALL agents and skills. Contains:
- Safety rules (no `rm -rf`, no `git push --force`, no `npm publish`)
- Confirmation rules (ask before destructive operations, unless auto_mode)
- Audit rules (always update `.orch/runs/`, respect boundary checks)
- Agent routing (how @orch delegates, handoff protocol)
- Model preferences (read from config.yaml)
- Resource limits (max files open, max changes per operation)
- Overridable markers (which rules domain skills can override)

Non-overridable rules: safety, audit. Overridable rules: confirmation, strictness.

### 5.2 `.github/instructions/auto-mode.instructions.md`

Bridges config.yaml to agent behavior:
- Reads `.orch/config.yaml` auto_mode setting
- If true: skip confirmations, execute end-to-end
- If false: show plan, wait for approval

### 5.3 `.orch/config.yaml`

```yaml
workflow:
  max_retries: 3
  auto_mode: false
  permission_level: allow    # allow | allow-with-permissions | auto

preflight:
  check_references: true
  max_stale_days: 30
  check_build_baseline: true
  check_git_clean: true
  auto_refresh_docs: true

models:
  coordinator: claude-sonnet-4
  planner: claude-sonnet-4
  engineer: claude-sonnet-4
  verifier: claude-sonnet-4

presentation:
  logo_path: ./assets/placeholder-logo.svg
  cover_background: "#0a0e17"
  hds_theme: null              # path to custom HDS theme CSS
  default_format: html         # html | pptx
```

### 5.4 Removed Instruction Files

- `angular-typescript.instructions.md` → absorbed into Angular skill references
- `internal-component-lib.instructions.md` → becomes reference doc in `.orch/references/internal/`
- `doc-conversion.instructions.md` → absorbed into `@docs` agent definition
- `workflows.instructions.md` → removed (handoff chain replaces it)

---

## 6. References — Hybrid Model

### 6.1 Shared References (`.orch/references/`)

Managed by `@docs`. Fetched from external/internal sources, converted to token-efficient markdown.

Versioned: `orch://references/angular/v19/migration-guide.md`

Updated via: `orch update` (CLI-assisted version bumps) + `@orch-preflight` (runtime freshness checks triggering `@docs /docs-refresh`).

### 6.2 Skill-Local References

Authored by skill creators. Live inside skill directory:

```
.github/skills/angular-migrate-standalone/
  ├── SKILL.md
  ├── references/          # Skill-specific (examples, templates, checklists)
  │   ├── before-after-standalone.ts
  │   └── migration-checklist.md
  └── scripts/
```

### 6.3 Validation

`orch doctor` checks: every skill's declared `orch://references/...` dependencies exist and are fresh.

---

## 7. CLI Changes

### 7.1 `orch init`

Primary install path. Detects project type, copies agents/skills/hooks/config, creates `.orch/` structure, generates registry from doc-packs.

### 7.2 `orch update`

Updates ORCH tooling/artifacts from marketplace. CLI-assisted reference version updates when project dependencies change.

### 7.3 `orch reset`

Preview + confirm. `--force` for clean wipe. Preserves non-ORCH files.

### 7.4 `orch doctor`

Health checks: bash, jq, python3 availability (platform-specific install guidance). Reference dependency validation. Config schema validation.

---

## 8. Presentation Engine

### 8.1 `/present-deck`

General-purpose markdown → branded slides.

- **Input**: any markdown file or `.orch/runs/` output
- **Output**: self-contained HTML (reveal.js bundled, minified, no CDN) or PPTX
- **Branding**: HDS defaults shipped as placeholders, overridable via `.orch/config.yaml`
- **Assets bundled**: `reveal.min.js`, `reveal.min.css`, `placeholder-logo.svg`, `cover-template.html`, `hds-theme.css`

### 8.2 `/present-dashboard`

Metrics → single-page HTML. Same branding system. No external dependencies.

---

## 9. Pre-flight

`@orch-preflight` runs before every workflow:

| Check | Action if failed |
|-------|-----------------|
| References fresh | Trigger `@docs /docs-refresh` |
| Version aligned | Warn user, offer `orch update` |
| Audit hooks active | Block, instruct user to run `orch doctor` |
| Build baseline | Warn: build already failing |
| Git clean | Warn: uncommitted changes |
| Config valid | Block: fix config |
| Dependencies installed | Warn: run npm install |

Configurable via `.orch/config.yaml` `preflight:` section.

---

## 10. Project Recap Workflow

User: `@angular recap this project`

Planner orchestrates 8 scan skills → stitches into `PROJECT-RECAP.md` with TOC + executive summary. Only produces deck if user explicitly says "present it."

Scans: deps, arch, quality, tests, deploy, git, docs, features.

Each scan is independently invocable for ad-hoc use.
