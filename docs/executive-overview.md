# ORCH — Executive Overview

> **ORCHESTRA (ORCH) standardizes how developers use GitHub Copilot across the organization — custom agents, enforced standards, full audit, one CLI.**

---

## Overview

ORCH is a curated marketplace of custom GitHub Copilot agents, skills, and workflows — installed with one CLI command. It turns generic AI suggestions into standardized, auditable, org-specific development workflows. Copilot stops suggesting generic code and starts suggesting **your team's code**.

---

## What's This About

### The Problem

| Pain Point | Impact |
|------------|--------|
| Generic AI suggestions don't follow org standards | Inconsistent code quality; patterns exist in wikis nobody reads |
| No visibility into what AI agents do | Zero governance over tool access, token spend, or behavioral drift |
| Migration and upgrade effort is manual | Angular 17 to 19 takes weeks of inconsistent, error-prone work |
| Onboarding is slow | Copilot can't teach new developers your internal patterns or conventions |

---

### The Solution

ORCH is a **marketplace of custom Copilot agents, skills, and workflows** installed via CLI. Each technology domain (Angular, Spring Boot, FastAPI) gets a complete, audited AI development toolkit:

| Capability | Description |
|------------|-------------|
| **Role-based agents** | Planner, Engineer, and Verifier sub-agents per domain |
| **60 granular skills** | One skill per task — scan, generate, migrate, test, deploy |
| **Declarative workflows** | YAML-defined, phase-by-phase execution with checkpoints |
| **Full audit trail** | Every action logged — tokens, tools, adherence, drift |

---

### Key Features

| Feature | What It Does | Developer Benefit |
|---------|-------------|-------------------|
| Role-based agents | Planner &rarr; Engineer &rarr; Verifier pipeline | Every task is planned, built, and verified |
| Granular skills | Domain-specific, one skill per task | Repeatable quality across all developers |
| Workflow engine | Declarative YAML, phase-by-phase execution | One command to upgrade Angular 17 &rarr; 19 |
| Audit & observability | Every action logged, token tracking | Cost visibility, compliance, quality drift detection |
| Design system (HDS) integration | Audit + apply + generate with org tokens | Consistent look and feel across all UIs |
| Platform (Elevate) integration | Auth, logging, config compliance | No rogue `console.log` or custom auth patterns |
| Reports | HTML reports with diagrams, progress bars | Recap a project, migration status, audit compliance |
| Mock data pipeline | Capture from running apps, generate from OpenAPI/interfaces, serve locally with full CRUD + WebSocket | Develop frontend without waiting for backend. Contract-first development. |
| Marketplace CLI | `orch list`, `install`, `update`, `doctor`, `reset` | One CLI for everything |

---

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    @orch (Orchestrator)                   │
│         Preflight checks + shared presentation skills    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  @angular    │  │ @springboot  │  │  @fastapi     │   │
│  │  ┌────────┐  │  │  ┌────────┐ │  │  ┌────────┐   │   │
│  │  │planner │  │  │  │planner │ │  │  │planner │   │   │
│  │  │engineer│  │  │  │engineer│ │  │  │engineer│   │   │
│  │  │verifier│  │  │  │verifier│ │  │  │verifier│   │   │
│  │  └────────┘  │  │  └────────┘ │  │  └────────┘   │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Shared Agents:  @docs (references)  │  @audit  │ @local │
├──────────────────────────────────────────────────────────┤
│  ██████████  AUDIT FRAMEWORK (FOUNDATION)  ██████████   │
│  Sessions │ Tokens │ Tool boundaries │ Adherence │ Drift │
└──────────────────────────────────────────────────────────┘
```

**Three tiers:**

| Tier | Agents | Purpose |
|------|--------|---------|
| Orchestrator | `@orch`, `@orch-preflight` | Route requests, run pre-flight checks, shared skills |
| Domain | `@angular`, `@springboot`, `@fastapi` | Each with planner / engineer / verifier sub-agents |
| Shared | `@docs`, `@audit`, `@local` | Documentation pipeline, observability, environment setup |

**Request triage — every request is classified before execution:**

| Mode | Trigger | Pipeline |
|------|---------|----------|
| Query | Read-only question | Agent answers directly |
| Quick fix | Single-file, clear intent | Engineer &rarr; Verifier |
| Workflow | Multi-file, structural change | Planner &rarr; Engineer &rarr; Verifier |

---

### Angular Domain — Reference Implementation

The Angular domain serves as the reference implementation. All domains follow the same pattern.

### Skill Inventory (39 skills)

| Category | Count | Examples |
|----------|-------|----------|
| Planner skills | 10 | `angular-scan-deps`, `angular-scan-arch`, `angular-explain`, `angular-compatibility` |
| Engineer skills | 12 | `angular-generate-component`, `angular-migrate-signals`, `angular-refactor` |
| Verifier skills | 5 | `angular-test-unit`, `angular-test-e2e`, `angular-review` |
| HDS (Design System) | 3 | `angular-hds-audit`, `angular-hds-apply`, `angular-hds-generate` |
| Elevate (Platform) | 3 | `angular-elevate-audit`, `angular-elevate-apply`, `angular-elevate-generate` |
| Documentation | 4 | `angular-docs-readme`, `angular-docs-api`, `angular-docs-changelog`, `angular-docs-comment` |
| Mock integration | 1 | `angular-mock-wire` |
| **Total** | **38** | |

### Example: Upgrade to Angular 19

**Command:** `@angular upgrade to Angular 19`

| Phase | Agent | Skill | Output |
|-------|-------|-------|--------|
| 1. Pre-flight | preflight | Environment & build check | Baseline snapshot |
| 2. Scan | planner | `angular-scan-deps` | Project analysis |
| 3. Plan | planner | `angular-scan-arch` | Migration plan with risk assessment |
| 4. Dependencies | engineer | `angular-migrate-version` | Updated `package.json`, lock file |
| 5. Breaking changes | engineer | `angular-migrate-control-flow` | Code fixes for API changes |
| 6. Signals migration | engineer | `angular-migrate-signals` | Convert to Angular signals |
| 7. Standalone | engineer | `angular-migrate-standalone` | Remove NgModules |
| 8. Verify | verifier | `angular-test-lint` | Build + test + lint pass |
| 9. HDS check | verifier | `angular-hds-audit` | Design system compliance |
| 10. Report | orch | `present-report` | Full HTML report with diffs |

Each phase includes **checkpoints** (git commits), **verification gates**, and **rollback-on-failure** support.

### Example: Recap This Project

**Command:** `@angular recap this project`

Generates a 13-section HTML report covering architecture, dependencies, patterns, test coverage, HDS compliance, technical debt, and recommendations — with diagrams and progress indicators.

---

### Marketplace & Extensibility

### CLI Commands

| Command | Purpose |
|---------|---------|
| `orch init` | Initialize ORCH in current project |
| `orch install <domain>` | Install a domain agent (e.g., `angular`) |
| `orch update` | Update all installed domains to latest |
| `orch doctor` | Validate environment, dependencies, config |
| `orch list` | Show available and installed domains |
| `orch reset` | Reset local config to defaults |

### Adding a New Domain

Every domain follows the same pattern:

```
domains/<name>/
  agents/
    <name>-planner.md
    <name>-engineer.md
    <name>-verifier.md
  skills/
    <name>-scan-*.md
    <name>-generate-*.md
    <name>-migrate-*.md
    <name>-verify-*.md
  workflows/
    <name>-migration.yaml
    <name>-recap.yaml
    <name>-new-app.yaml
```

Community contribution follows `CONTRIBUTING.md` — add skills, submit workflows, propose new domains.

---

---

## What Happens Behind the Scenes

### Version Governance

Agents never suggest upgrading to a version the org hasn't tested. A **curated compatibility matrix** acts as a governance gate:

| Step | Who | What |
|------|-----|------|
| 1 | Framework team ships v20 | New version available on npm |
| 2 | ORCH maintainer tests it | Validates compatibility with TypeScript, Nx, internal libs |
| 3 | Maintainer updates matrix | Adds v20 to the approved compatibility rules |
| 4 | `orch update` distributes | All projects receive the updated matrix |
| 5 | Developers can now upgrade | `/angular-migrate-version` plans the path using approved versions |

If a developer asks to upgrade to a version that isn't in the matrix, the agent responds: "Version not yet approved — contact the ORCH maintainer." No untested versions reach production code.

### Audit & Observability

Every agent action passes through the audit framework. Nothing executes without a complete record.

| What Is Tracked | How |
|-----------------|-----|
| Session start/end | Unique run ID, timestamps |
| Token consumption | Per-skill estimation, aggregated per session |
| Tool invocations | Which tools, how many times, on which files |
| Boundary violations | Agent accessed files outside declared scope |
| Instruction adherence | % of org standards followed per session |
| Behavioral drift | Model output comparison over time |
| Quality gates | Build pass, test pass, lint pass per phase |

**Output:** `.orch/runs/<run-id>/` — structured JSON, queryable, reportable.

---

### Impact Metrics

| Metric | Current State | Target with ORCH |
|--------|--------------|------------------|
| Pattern adherence | Ad hoc, unmeasured | **90%+** |
| Developer onboarding time | ~4 weeks to productivity | **-40%** (~2.5 weeks) |
| Code review turnaround | Hours of standards checking | **-30%** (pre-verified) |
| AI sessions with audit trail | 0% | **100%** |
| Migration effort (e.g., Angular upgrade) | Weeks, manual | **Hours, automated** |
| Cross-team code consistency | Low | **High** (shared skills) |

---

---

## What You Need

### Getting Started

```bash
npm install -g @orch/cli
orch init
orch doctor
```

Then in VS Code with GitHub Copilot:

```
@angular recap this project
@angular upgrade to Angular 19
@angular create a new feature: user dashboard
```

---

## Summary

| Question | Answer |
|----------|--------|
| What is ORCH? | A marketplace of custom Copilot agents, skills, and workflows for enterprise teams |
| Why do we need it? | Generic Copilot doesn't know our standards, patterns, or conventions |
| What does it replace? | Ad hoc Copilot usage with no governance or consistency |
| What's the first domain? | Angular — 39 skills, 3 role-based agents, declarative workflows |
| What about other stacks? | Same pattern — Spring Boot, FastAPI, and any domain follow the coordinator + planner + engineer + verifier model |
| Is it audited? | 100% — every session, every token, every tool call |
| How do teams adopt it? | `orch init` — one command to start |
