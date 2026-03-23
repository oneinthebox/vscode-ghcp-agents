---
name: angular-explain
description: "C4 architecture walkthrough for Angular projects — interactive or generates PROJECT.md. Can invoke scan skills for deep analysis."
references:
  - references/angular/v19/architecture-patterns.md
---

## Context

A new developer needs to understand an Angular project fast. This skill produces a comprehensive, always-current project walkthrough at C4 architecture depth. It reads project files, can invoke `angular-scan-*` skills for deeper analysis, and checks recent git history to understand how the project is evolving. Adapted for Angular-specific patterns: standalone components, signals, inject(), NgModules, and Angular-specific tooling.

## Inputs

- "Explain this Angular project" — interactive C4 walkthrough
- "Generate PROJECT.md" — produces a committable C4-structured project document
- "Explain the architecture" — focused on Level 2 (containers) and Level 3 (components)
- "What patterns does this project use?" — focused on Level 4 (code patterns)

## Steps

1. **Read project files** — `package.json`, `angular.json` or `nx.json`, `tsconfig.json`, `README.md`.
2. **Read Angular-specific config** — detect Angular version, standalone vs NgModule usage, signals adoption, SSR config, i18n setup.
3. **Read `references/angular/v19/architecture-patterns.md`** for current best-practice patterns to compare against.
4. **Check for existing scan output** — if recent `angular-scan-arch` or `angular-scan-features` results exist in `.orch/references/scans/`, use them. Otherwise, invoke those scans.
5. **Read git history** — last 5 commits, recent contributors, active branches.
6. **Compose C4 output**:
   - **Level 1 — System Context**: what the app is, what it interacts with (APIs, auth, external systems).
   - **Level 2 — Containers**: apps, libraries (Nx), shared modules, backend dependencies.
   - **Level 3 — Components**: feature areas, route-to-component map, service graph, key data flows.
   - **Level 4 — Code Patterns**: Angular patterns in use (standalone, signals, inject, OnPush, lazy loading), state management, DI style, testing approach.
7. **Add Angular-specific sections**: migration readiness, pattern adoption percentages, Angular version status.
8. **If generating PROJECT.md** — write the full document to `PROJECT.md` in the project root.

## Output

```markdown
## {Project Name} — Architecture Overview

### Level 1: System Context
{What this system is and what it interacts with}
{Mermaid diagram: system context}

### Level 2: Containers
{Apps, libraries, shared code}
{Mermaid diagram: container view}

### Level 3: Components
{Feature modules, routes, services, key data flows}
{Mermaid diagram: component view}

### Level 4: Angular Patterns
| Pattern | Adoption | Status |
{Standalone, signals, inject, OnPush, lazy loading, etc.}

### Tech Stack
| Library | Version | How It's Used | Where |

### Recent Activity
{Last 5 commits, active contributors, active branches}

### Angular Health
| Metric | Value | Notes |
{Version currency, pattern adoption, migration readiness}
```

## Validation

- All 4 C4 levels are present in output
- Tech stack shows HOW each library is used, not just version numbers
- Mermaid diagrams are syntactically valid
- Git data is from actual repository, not hallucinated
- Angular pattern adoption percentages match actual codebase counts
- No files are modified during the scan (unless `--generate` writes PROJECT.md)
