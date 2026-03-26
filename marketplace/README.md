# ORCH (Orchestra) for GitHub Copilot

**Enterprise framework that gives GitHub Copilot your team's Angular expertise -- version-aware agents, 61 skills, 44 scripts, event-driven workflows, audit trail, and safe-by-default automation.**

---

## Quick Start

```bash
# Install the CLI
npm install -g @orch/cli

# New project from scratch
orch new nx-angular my-app        # Nx Angular monorepo (recommended)
cd my-app
orch doctor                        # verify everything is healthy

# Existing project
cd your-existing-project
orch init                          # detect project, install agents + skills
orch doctor                        # verify setup
```

Once installed, open VS Code and use the Copilot Chat panel to invoke agents:

```
@angular recap this project
@angular /angular-generate-component TradeConfirmation
@orch migrate to Angular 19
```

---

## Architecture

`@orch` is the universal entry point. It detects the project domain from project files (`package.json`, `pom.xml`, `pyproject.toml`) via `detect-domains.js`, runs pre-flight checks, and routes to the appropriate domain agent. For multi-domain tasks, `@orch` composes plans spanning multiple agents (e.g., `@angular` + `@local`). `@angular` can also be invoked directly as a fast path that skips pre-flight and domain detection.

```
┌─────────────────────────────────────────────────────────���────┐
│                     Domain Agents                             │
│                                                               │
│   @angular (coordinator)                                      │
│       ├── @angular-planner    (Why & What — scans, plans)     │
│       ├── @angular-engineer   (How & Where — code, migrate)   │
│       │       └── @migrate-worker  (context-isolated phases)  │
│       └── @angular-verifier   (Check — tests, lint, review)   │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                     Shared Agents                             │
│                                                               │
│   @orch            Universal entry — auto-detects domain,      │
│       │            runs pre-flight, composes plans, monitors   │
│       └── @orch-preflight   Pre-flight readiness checks       │
│   @audit           Observability — usage, tokens, compliance  │
│   @docs            Reference supply chain — fetch, drift      │
│       └── @doc-convert-worker   Document conversion           │
│   @local           Environment setup, mock data pipeline      │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                     Foundation                                │
│                                                               │
│   Skills (61)  │  Workflows (3)  │  Audit hooks  │  Config   │
│   Event relay  │  Version resolver  │  Reference docs  │  Registry │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Details |
|---------|---------|
| **61 skills, 44 scripts** | Scanning, generation, migration, refactoring, documentation, testing, design system, platform integration, mock data, reporting, 92 examples, 5 shared libs |
| **11 agents** | 1 coordinator (@angular) + 3 sub-agents (planner, engineer, verifier) + 7 shared (orch, preflight, audit, docs, doc-convert-worker, local, migrate-worker) |
| **3 workflows** | `angular-migration` (10 phases), `angular-new-feature` (10 phases), `angular-project-recap` (11 phases) |
| **Event-driven relay** | File-based event system with terminal relay process. Script phases run automatically; AI phases dispatched via `code chat --mode agent` (VS Code 1.112+). Safe-by-default: pauses before AI writes for `approve` / `approve-all` / `skip`. Pass `--auto` for full autonomy. |
| **Version-aware stack resolution** | `check-stack.js` auto-detects Angular version from `package.json` (<5 ms), `resolver.yaml` maps features to version gates, `resolve-references.js` filters reference docs. Saves ~50% reference tokens. |
| **Audit trail** | Session tracking, token estimation, tool boundary enforcement, compliance scoring, drift detection |
| **Comprehensive boundaries** | Two-layer system: `blocked_commands` in `.vscode/settings.json` (hard, VS Code-enforced) + `boundaries.yaml` (soft, ORCH audit hooks) |
| **Report templates + trends** | 4 templates in `.orch/templates/` (migration, recap, audit, feature). Trend snapshots in `.orch/trends/` for tracking metrics over time. |
| **VS Code settings.json** | Ships autopilot mode, terminal auto-approve, edit auto-accept, and blocked_commands for safe autonomous operation |
| **Mock data pipeline** | HAR capture, OpenAPI/TypeScript/manual source, synthetic generation, json-server, WebSocket replay |
| **Multi-format reports** | Markdown, HTML (self-contained), JSON (CI-friendly), PDF, reveal.js deck |
| **Isolated dependencies** | `.orch/package.json` with ts-morph, json-server in separate `.orch/node_modules/`, isolated from project deps |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `orch new <type> <name>` | Scaffold new project (nx-angular, angular) and initialize ORCH |
| `orch init` | Initialize ORCH in an existing project — detect stack, install agents + skills |
| `orch install @<agent>` | Install a specific agent package (angular, docs, audit, orch, local) |
| `orch doctor` | Health check — project, Node.js, tools, agents, skills, hooks, config, integrity |
| `orch status` | Show installed agents, skills, instructions, hooks, workflows, run history |
| `orch list` | Show all available agents and their skills from the marketplace |

---

## Agents

| Agent | Role | User-invocable | Skills |
|-------|------|---------------|--------|
| `@angular` | Domain coordinator — triages, routes, owns retry loop | Yes | Routes to sub-agents |
| `@angular-planner` | Why & What — scans, analyzes, explains, plans | Internal | 11 scan/analysis skills |
| `@angular-engineer` | How & Where — writes code, runs migrations | Internal | 20+ generation/migration skills |
| `@angular-verifier` | Check & Validate — tests, lint, review | Internal | 7 verification skills |
| `@orch` | Universal entry — auto-detects domain, runs pre-flight, composes plans, monitors workflows | Yes | /present-report, /present-deck, /present-dashboard |
| `@orch-preflight` | Pre-flight readiness checks before workflows | Internal | 7 validation checks |
| `@audit` | Observability — usage, tokens, compliance, drift, benchmarks | Yes | 6 audit skills |
| `@docs` | Reference supply chain — fetch, convert, refresh, drift | Yes | 4 docs skills |
| `@doc-convert-worker` | Document conversion (internal worker for @docs) | Internal | Conversion pipeline |
| `@local` | Environment setup, mock data pipeline, diagnostics | Yes | 8 local skills |
| `@migrate-worker` | Context-isolated migration phases (internal worker) | Internal | Phase execution |

---

## Version-Aware Stack Resolution

ORCH auto-detects your project's Angular version from `package.json` via the `check-stack.js` hook and caches the result in `.orch/cache/stack.yaml`. Detection is checksum-based (SHA-256 fingerprint over `package.json`, `angular.json`, `nx.json`, `tsconfig.json`) and completes in under 5 ms.

The resolver (`.orch/references/angular/resolver.yaml`) maps features to version gates. The `resolve-references.js` script filters reference docs by the detected version. Skills automatically load only the reference docs that apply to your project's version:

- **Angular 17 (LTS)**: NgModules, structural directives, constructor DI, RxJS patterns
- **Angular 18 (LTS)**: Standalone default, control flow recommended, `inject()`, signals stable
- **Angular 19 (LTS)**: Standalone only, control flow required, signal inputs, NgRx SignalStore
- **Angular 20**: Vitest support, signal forms (preview), mutation API
- **Angular 21 (Current stable)**: Signal forms (stable), `ng migrate` command

This saves approximately 50% of reference tokens by filtering out documentation for features unavailable in the target version.

To pin a specific version:

```yaml
# .orch/config.yaml
stack:
  angular_version: "17"   # override auto-detection
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [User Guide](docs/user-guide.md) | Comprehensive setup, configuration, CLI, agents, workflows, skills, troubleshooting |
| [Executive Overview](docs/executive-overview.md) | Leadership-friendly summary of what ORCH does and why it matters |
| [CONTRIBUTING](CONTRIBUTING.md) | How to add skills, agents, reference docs, and version variants |

---

## License

See [LICENSE](../LICENSE).
