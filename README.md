# ORCH (Orchestra)

**A curated, enterprise-grade collection of GitHub Copilot customizations — agents, skills, instructions, and hooks — with audit-first observability, designed to standardize AI-assisted development across your organization.**

---

## Executive Summary

ORCH brings consistency, quality, and **full observability** to how teams use GitHub Copilot. Instead of every developer getting generic AI suggestions, ORCH provides purpose-built customizations that encode your organization's standards, patterns, and domain knowledge into Copilot's behavior — while tracking every agent action, tool invocation, token consumption, and behavioral drift.

The result: Copilot stops suggesting generic code and starts suggesting **your team's code** — with the right patterns, the right error handling, the right conventions, every time. And you have a complete audit trail proving it.

### The Problem

- Teams independently configure Copilot (or don't configure it at all), leading to inconsistent AI-generated code
- Coding standards exist in wikis nobody reads — Copilot doesn't know about them
- Onboarding is slow because Copilot can't teach new developers your internal patterns
- No governance over what Copilot agents can access or do in an enterprise environment
- No visibility into what agents actually did — which tools they used, how many tokens they consumed, whether they stayed within their declared boundaries
- No way to compare model quality across tasks or track behavioral drift over time

### The Solution

ORCH delivers **domain-specific Copilot customization sets** — each containing agents (specialized personas), skills (reusable workflows), and instructions (always-on coding standards) — tailored to your technology stack. Every operation runs through a **comprehensive audit framework** that captures sessions, tokens, tool usage, boundary violations, and instruction adherence.

---

## Architecture

ORCH is built on a layered architecture where **audit is the foundation**, not an afterthought.

```
┌─────────────────────────────────────────────────────────┐
│                   Shared Skills                          │
│  /present-deck  /present-dashboard                      │
├─────────────────────────────────────────────────────────┤
│                   Reporting Layer                        │
│  /audit-usage  /audit-tokens  /audit-compliance         │
│  /audit-drift  /audit-benchmark  /audit-context         │
├─────────────────────────────────────────────────────────┤
│              Domain Agents (role-based)                  │
│  @angular: planner → engineer → verifier                │
│  @springboot: planner → engineer → verifier (future)    │
│  @fastapi: planner → engineer → verifier (future)       │
├─────────────────────────────────────────────────────────┤
│              Domain Skills (granular)                    │
│  /angular-scan-*  /angular-generate-*  /angular-test-*  │
│  /angular-migrate-*  /angular-review  /angular-refactor │
├─────────────────────────────────────────────────────────┤
│                   Agents                                 │
│  @orch (orchestrator)  @docs (reference supply chain)   │
│  @audit (observability)  + @orch-preflight              │
├─────────────────────────────────────────────────────────┤
│                   Core Layer                             │
│  Reference Pipeline (/docs-fetch /docs-refresh)         │
│  Registry (.orch/registry.yaml)                         │
├─────────────────────────────────────────────────────────┤
│              ██ AUDIT FRAMEWORK (FOUNDATION) ██         │
│  Session tracking │ Token estimation │ Tool boundaries   │
│  File scope checks │ Prompt capture │ Adherence checks  │
│  Pre-flight │ Per-run telemetry (.orch/runs/)           │
└─────────────────────────────────────────────────────────┘
```

**Every agent, every skill, every tool call passes through audit.** Nothing executes without a complete record.

### How the Layers Work Together

| Layer | Behavior | Example |
|-------|----------|---------|
| **Audit** | Always on. Captures every operation. Foundation for everything. | Logs that @angular used `terminal` tool 3 times, estimated 17K tokens, 91% instruction adherence |
| **Instructions** | Always active for matching files. Passive context. | "All Angular components must use OnPush change detection" |
| **Skills** | Invoked on demand via `/slash-commands`. Task-focused. | `/spring-rest-endpoint` scaffolds a full controller + service + tests |
| **Agents** | Selected per session. Persona with tool access. | `@backend-springboot` reviews PRs with Spring Security expertise |
| **Hooks** | Triggered at lifecycle events. Deterministic. | Block commits containing hardcoded secrets |
| **Action Skills** | Generic workflows that work with any domain agent. | @angular + /generate = Angular component; @springboot + /generate = REST endpoint |
| **Overrides** | Temporary team customizations with 90-day expiry. Escape hatch, not permanent. | Trading desk replaces component template, opens ORCH-142 to absorb into central |
| **Validation** | Post-operation checks. Automated quality gate. | Build pass, test pass, pattern adherence score |
| **Reporting** | On-demand dashboards. Usage, tokens, compliance, drift. | Weekly audit report showing adoption, violations, model performance |
| **Notifications** | Status bar (glanceable) + interrupt-only toasts for decisions/errors/quality. | Status bar shows `ORCH ✓ 67%` for bounded tasks; toast fires only when agent needs input, something broke, or quality degraded |

---

## Domains

| Domain | Stack | Status | Purpose |
|--------|-------|--------|---------|
| `frontend-ts-angular` | TypeScript, Angular | **Implemented** | Component architecture, RxJS patterns, state management, testing standards |
| `backend-java-springboot` | Java, Spring Boot | Future | REST API design, dependency injection, JPA patterns, security configuration |
| `backend-python-fastapi` | Python, FastAPI | Future | Async patterns, Pydantic models, dependency injection, API documentation |
| `operations-ci-glue` | CI/CD, GitHub Actions | Future | Pipeline authoring, build optimization, artifact management, quality gates |
| `operations-cd-dps` | Deployment, Infrastructure | Future | Deployment strategies, environment promotion, rollback procedures, observability |

---

## Roadmap

### Phase 0 — Foundation (Current)
- **Build audit framework first** — session tracking, token estimation, tool boundaries, adherence checks
- Build doc pipeline (reference supply chain — fetch, refresh, drift detection)
- Build Angular domain with role-based agents (planner, engineer, verifier)
- Deploy to pilot teams, measure with full audit data
- Build VS Code status bar extension for glanceable progress + interrupt-only notifications

### Phase 1 — Expand
- Build remaining 4 domain customization sets
- Add governance hooks (secrets scanning, prompt auditing, tool-use gating)
- Add model benchmarking across skills
- Iterate based on pilot feedback + audit data

### Phase 2 — Orchestrator
- Master orchestrator agent with handoffs to domain agents
- Cross-domain workflows (end-to-end feature, full-stack migration)

### Phase 3 — Marketplace
- Package domains as installable plugins
- Internal marketplace with `copilot plugin install frontend-ts-angular@orch`

---

## Principles

1. **Audit is the foundation** — nothing ships without full observability
2. **Domains first, marketplace later** — prove value with real customizations before building distribution infrastructure
3. **One domain, one focus** — each customization set owns a single technology concern
4. **Instructions are the foundation** — they're always-on and require zero effort from developers
5. **Skills reduce hallucination** — bundle real templates, schemas, and reference docs so Copilot doesn't guess
6. **Agents are opinionated** — they have a persona, a model preference, and clear guardrails
7. **Hooks are deterministic** — critical guardrails should not depend on AI recall
8. **Token efficiency matters** — all reference material is markdown-first, aggressively curated for LLM consumption
9. **Enterprise-grade governance** — every agent's tool access is explicitly declared, enforced, and audited
10. **Notifications respect attention** — status bar for glanceable state, toasts only when user action is required. Never interrupt for something the user can see in chat
11. **Overrides are temporary** — 90-day expiry, must have a tracking issue to absorb into central. Escape hatch, not a feature
12. **Skills are domain-specific and granular** — /angular-test-unit, not /test. Each skill does one thing for one domain.
13. **Agents are role-based** — planner (why/what), engineer (how/where), verifier (checks). Coordinators own the loop.

---

## Repository Structure

```
vscode-ghcp-agents/
├── marketplace/          # The ORCH marketplace — agents, skills, instructions, hooks
│   ├── .github/          # agents/, skills/, instructions/, hooks/
│   ├── .orch/            # default config (boundaries, adherence rules), scripts
│   ├── doc-packs/        # Doc pack templates (angular.yaml, etc.)
│   └── orch-status-extension/  # VS Code status bar extension
├── cli/                  # ORCH CLI for installing and managing agents
├── docs/                 # PRD, technical design, delivery plan
└── README.md
```

## Getting Started

```bash
# Install the ORCH CLI
npm install -g @orch/cli

# Initialize ORCH in your project
cd your-project
orch init

# Verify installation
orch doctor
```

Once files are in your repo's `.github/` directory, Copilot picks them up automatically. Audit hooks begin capturing from the first session.

For development setup, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [Product Requirements (PRD)](docs/prd.md) | Vision, scope, capabilities, audit framework, domains, versioning, drift detection, success metrics |
| [Technical Design](docs/tech.md) | C4 architecture, audit schema, file structure, data flows, agent/skill/instruction/hook specs |
| [Delivery Plan](docs/delivery.md) | Phased rollout — audit first, then doc pipeline, then domains. Stages, tasks, estimates, exit criteria |
| [Architecture Redesign](docs/superpowers/specs/2026-03-23-orch-architecture-redesign.md) | New agent architecture, skill granularity, directory structure |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting new domains, skills, or instructions. It covers both internal team development and external marketplace contributions.

All contributions require review by the ORCH team before merging. All new agents and skills must integrate with the audit framework.
