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

1. **Triage**: `@orch` auto-detects your project's technology stack -- Angular from `package.json`, Spring Boot from `pom.xml`, Python from `requirements.txt`/`pyproject.toml` -- and routes to the right domain agent. The coordinator then classifies the request as a question (answer directly), a quick fix (engineer then verify), or a multi-step workflow (plan, execute, verify).

2. **Plan**: For complex tasks, the planner scans the codebase -- architecture, dependencies, test coverage, quality metrics -- and produces a structured plan with explicit file paths and version-appropriate patterns.

3. **Execute**: One command triggers a full migration -- ORCH runs script phases automatically, dispatches AI phases via VS Code's `code chat` API, and generates a report at the end. Each phase runs in a fresh context via the event-driven relay, preventing context rot. Migrations run phase by phase with git checkpoints at each stage.

4. **Approve**: By default, the relay pauses before AI write phases for user approval. Send `approve` to proceed, `approve-all` to unlock the remaining pipeline, or `skip` to bypass a phase. Pass `--auto` for full autonomous execution.

5. **Verify**: The verifier runs build, tests, lint, and code review. Failures trigger automatic retries with targeted feedback to the engineer. The coordinator manages up to 3 retry cycles before escalating to the developer.

6. **Report**: For workflows, a final report is generated from standardized templates with phase timelines, before/after metrics, trend comparisons, risk items, and recommended next steps. Reports can be rendered as Markdown, self-contained HTML, JSON (for CI integration), PDF, or presentation slides.

---

## What Happens Behind the Scenes

- **Event-driven autonomous execution**: Workflows run via a file-based event system with a terminal relay process. The coordinator publishes phase events; the relay dispatches them sequentially. Script phases execute automatically; AI phases are dispatched via VS Code's `code chat --mode agent` CLI. Each phase runs in a fresh context, eliminating context rot across long workflows.

- **Safe by default**: The relay pauses before AI write phases for explicit approval. Users can approve individually, approve all remaining phases, or skip. The `--auto` flag enables full unattended execution for CI environments or trusted pipelines.

- **Skills load curated reference docs**: Instead of relying on the LLM's training data, each skill injects version-specific documentation into context. A migration skill loads the exact Angular upgrade guide, compatibility matrix, and breaking change list for the target version.

- **Version-aware stack resolution**: The `check-stack.js` hook detects the project's Angular version from `package.json` on session start (under 5 ms) and caches the result. The resolver maps features to version gates, so a v17 project gets NgModule guidance while a v19 project gets signals and standalone patterns. This saves approximately 50% of reference tokens.

- **Comprehensive boundary enforcement**: Two layers of protection -- VS Code's `blocked_commands` in `.vscode/settings.json` (hard enforcement, cannot be bypassed) and ORCH's `boundaries.yaml` (soft enforcement, logged by audit hooks). Together they prevent dangerous operations like `rm -rf` or `git push --force`.

- **Audit trail**: Every agent action is logged -- which tools were used, which files were accessed, how many tokens were consumed, whether boundary rules were followed. This provides full observability for compliance teams and enables drift detection over time.

- **Token tracking**: ORCH estimates token consumption per agent, per skill, and per session. This data feeds cost tracking dashboards and model comparison benchmarks.

---

## Coverage

ORCH includes 62 skills, 58 scripts, 92 examples, and 5 shared libraries across these categories:

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
