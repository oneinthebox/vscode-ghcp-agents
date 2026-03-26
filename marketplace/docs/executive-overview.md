# ORCH -- Executive Overview

## Overview

ORCH (Orchestrated Reasoning for Code Handling) is an enterprise framework that transforms GitHub Copilot from a general-purpose AI assistant into a domain-aware engineering partner. It encodes your organization's Angular patterns, coding standards, and migration playbooks into a multi-agent system that plans, executes, and verifies changes -- with a complete audit trail.

---

## What Problem Does It Solve?

Out of the box, GitHub Copilot gives every developer generic suggestions. It does not know your team's component patterns, your design system tokens, your internal platform libraries, or which Angular version you are running. Teams independently configure Copilot (or skip configuration entirely), leading to inconsistent AI-generated code, repeated mistakes, and no visibility into what Copilot is actually doing.

ORCH solves this by providing **curated, version-specific agent customizations** that make Copilot suggest your team's code -- the right patterns, the right error handling, the right conventions -- every time.

---

## How It Works

When a developer asks ORCH to perform a task, it follows a structured pipeline:

1. **Triage**: The coordinator classifies the request as a question (answer directly), a quick fix (engineer then verify), or a multi-step workflow (plan, execute, verify).

2. **Plan**: For complex tasks, the planner scans the codebase -- architecture, dependencies, test coverage, quality metrics -- and produces a structured plan with explicit file paths and version-appropriate patterns.

3. **Execute**: The engineer writes code following the plan and curated reference docs. Migrations run phase by phase with git checkpoints at each stage.

4. **Verify**: The verifier runs build, tests, lint, and code review. Failures trigger automatic retries with targeted feedback to the engineer. The coordinator manages up to 3 retry cycles before escalating to the developer.

5. **Report**: For workflows, a final report is generated with phase timelines, before/after metrics, risk items, and recommended next steps. Reports can be rendered as Markdown, self-contained HTML, JSON (for CI integration), PDF, or presentation slides.

---

## What Happens Behind the Scenes

- **Skills load curated reference docs**: Instead of relying on the LLM's training data, each skill injects version-specific documentation into context. A migration skill loads the exact Angular upgrade guide, compatibility matrix, and breaking change list for the target version.

- **Version-aware detection**: ORCH reads `package.json` to detect the project's Angular version and loads only the patterns that apply. A v17 project gets NgModule guidance; a v19 project gets signals and standalone patterns. No manual configuration needed.

- **Audit trail**: Every agent action is logged -- which tools were used, which files were accessed, how many tokens were consumed, whether boundary rules were followed. This provides full observability for compliance teams and enables drift detection over time.

- **Token tracking**: ORCH estimates token consumption per agent, per skill, and per session. This data feeds cost tracking dashboards and model comparison benchmarks.

---

## Coverage

ORCH includes 60 skills across these categories:

- **Project scanning** -- dependencies, architecture, quality, tests, deployment, git history, documentation
- **Code generation** -- components, services, routes with org-standard patterns and co-located tests
- **Migration** -- standalone, signals, control flow, Jest, Playwright, Angular version upgrades
- **Documentation** -- TSDoc generation, README, changelog, API docs, inline comments
- **Design system** -- HDS token compliance, themed component generation
- **Platform integration** -- Elevate auth, logging, configuration services
- **Mock data** -- HAR capture, synthetic data generation, json-server, WebSocket replay
- **Reporting** -- multi-format reports, slide decks, dashboards

---

## How Teams Use It

| Use Case | What Happens |
|----------|-------------|
| **New feature development** | Scaffold components with org-standard patterns, HDS design tokens, Elevate services, and full test coverage |
| **Angular version upgrades** | Multi-phase migration with compatibility checks, pattern transforms, git checkpoints, and rollback at each step |
| **Project onboarding** | Generate a comprehensive project recap -- architecture diagrams, dependency analysis, test coverage, quality metrics -- for new team members |
| **Code quality** | Audit documentation coverage, fix stale docs, enforce design system compliance, review code for anti-patterns |
| **Observability** | Track agent usage, token consumption, compliance scores, and behavioral drift over time |

---

## What You Need

| Requirement | Details |
|-------------|---------|
| **VS Code** | With GitHub Copilot extension enabled |
| **Node.js** | 18.19+ or 20.11+ or 22+ |
| **ORCH CLI** | `npm install -g @orch/cli` |
| **Git** | For checkpoint and rollback support |
| **jq** | For audit hook scripts |
| **python3** | For token estimation scripts |

Setup takes under 5 minutes: `orch new nx-angular my-app` scaffolds a project and initializes ORCH in one command.
