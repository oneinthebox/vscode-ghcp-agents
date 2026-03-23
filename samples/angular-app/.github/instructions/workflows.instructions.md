---
description: "Defines ORCH workflow stages, state tracking schema, skill chaining rules, and prerequisite/post-action mappings for multi-stage developer journeys. Read by @orch and all domain agents to coordinate work across skills and sessions."
applyTo: "**"
---

## Workflow State

ORCH tracks multi-stage workflows in `.orch/workflow/{name}.yaml`. This state persists across sessions so agents can resume where the developer left off.

### Schema

```yaml
workflow: migration              # "new-app" or "migration"
project: trade-app               # app or project name
started: 2026-03-19T10:00:00Z
started_by: developer@org.com
current_stage: 4                 # 0-indexed into stages array
status: in-progress              # not-started | in-progress | paused | completed | failed

stages:
  - name: discovery
    skills: ["/proof", "/version-matrix"]
    status: completed            # not-started | in-progress | completed | skipped | failed
    started: 2026-03-19T10:00:00Z
    completed: 2026-03-19T10:12:00Z
    outputs:
      - ".github/references/scans/trade-app/2026-03-19/"
    notes: "Angular 17, 156 NgModule components, PrimeNG 16"

decisions:
  - date: 2026-03-19T10:15:00Z
    stage: drift-check
    decision: "Resolved doc-stale drift in auth patterns — updated doc, not code"
    made_by: developer@org.com

context:
  angular_version_from: "17.2"
  angular_version_to: "19.0"
  workspace_type: nx-monorepo
  app_count: 2
```

### State management rules

- **@orch creates** the workflow file when a user says "start migration", "new app", or invokes `@orch` with a multi-stage intent.
- **Domain agents read** the state before executing skills — to check prerequisites and know the current stage.
- **Domain agents update** the state after completing a skill — marking the stage as completed, recording outputs and notes.
- **@orch advances** `current_stage` when all skills in the current stage are completed.
- **State persists across sessions** — a new conversation can read `.orch/workflow/` and resume.

---

## New App Workflow (8 stages)

| # | Stage | Skills | Owner | Purpose |
|---|-------|--------|-------|---------|
| 0 | Discovery | `/explain --generate`, `/proof` | @docs | Understand the project structure, tech stack, patterns |
| 1 | Compatibility | `/version-matrix check package.json` | @docs | Validate installed versions are compatible |
| 2 | Scaffold | `/generate` | @angular | Scaffold features — components, services, routes |
| 3 | Implement | Developer writes code (agent assists) | @angular | Core feature implementation |
| 4 | Document | `/code-comment generate` | @docs | Inline docs (core-pack refs are maintainer-managed) |
| 5 | Test | `/test generate`, `/test improve` | @angular | Generate tests, improve coverage |
| 6 | Review | `/review`, `/hds audit`, `/elevate audit` | @angular | Code quality, design system, platform compliance |
| 7 | Pre-merge | `/review --strict`, `/test`, `/benchmark --validate` | @angular | Composite quality gate before merge |

---

## Migration Workflow (11 stages)

| # | Stage | Skills | Owner | Purpose |
|---|-------|--------|-------|---------|
| 0 | Discovery | `/proof`, `/proof --semantic` | @docs | Deep scan — "before" snapshot with pattern inventory |
| 1 | Compatibility | `/version-matrix upgrade-path` | @docs | Map full upgrade path with all dependent changes |
| 2 | Drift check | `/drift` | @docs | Detect doc-code mismatches before migrating |
| 3 | Drift resolution | `/refactor` (per drift items) | @angular | Fix critical drift items identified in stage 2 |
| 4 | Plan | `/migrate` (plan phase only) | @angular | Plan phases, confidence levels, git strategy |
| 5 | Pilot (optional) | `/migrate --pilot --scope {app}` | @angular | Monorepo only — migrate one app first |
| 6 | Pilot validation | `/test`, `/review --strict`, `/benchmark --validate` | @angular | Validate pilot before proceeding |
| 7 | Execute | `/migrate` (full execution) | @angular | Phase-by-phase migration via @migrate-worker |
| 8 | Post-migration scan | `/proof compare` | @docs | Compare before vs after snapshots |
| 9 | Doc update | `/code-comment repair`, `/drift` | @docs | Update inline docs to match migrated code |
| 10 | Pre-merge | `/review --strict`, `/test`, `/benchmark --validate` | @angular | Composite quality gate before merge |

Stage 5–6 (pilot) are optional — skip for single-app projects or when the user declines.

---

## Skill Chaining Rules

Every skill has prerequisites (what should run before) and post-actions (what should run after).

| Skill | Prerequisites | Post-actions |
|-------|---------------|--------------|
| `/migrate` | `/version-matrix` (recommended), `/proof` (recommended), `/drift` (recommended) | `/code-comment audit`, `/proof compare` |
| `/generate` | None | `/code-comment generate` (recommended), `/test generate` (recommended) |
| `/proof` | None | `/drift` (recommended if reference docs exist) |
| `/drift` | `/proof` (required — needs scan data) | Specific skill invocations per drift item |
| `/test generate` | Working build (mandatory) | `/review` (recommended) |
| `/review` | None | None |
| `/refactor` | None | `/test` (recommended — verify no regressions) |
| `/hds audit` | None | `/refactor --hds-tokens` for violations found |
| `/elevate audit` | None | `/refactor --elevate-compliance` for violations found |
| `/packs status` | None | None (read-only dashboard) |
| `/code-comment generate` | None | None |
| `/version-matrix` | None | `/migrate` (recommended if incompatibilities found) |

### Prerequisite classification

| Type | Meaning | Agent behavior |
|------|---------|---------------|
| **Required** | Cannot produce useful output without it | Note in output: "Best results after running X." Proceed anyway — do not block. |
| **Recommended** | Works without it but results are better with it | Note in summary only. Do not prompt. |
| **Mandatory** | Cannot run at all without it | Explain what's needed and do not proceed. |

### How prerequisite checking works

Before executing a skill:
1. Read the skill's `## Workflow Integration` section for prerequisites.
2. If `.orch/workflow/` exists, check whether the prerequisite stage is marked `completed`.
3. If prerequisite is not met:
   - **Required/Recommended**: Note in output and proceed. Do not block or prompt.
   - **Mandatory**: Explain what's needed and do not proceed.
4. If no workflow state exists, check for prerequisite outputs directly (e.g., does a `/proof` scan snapshot exist?).

### How post-actions work

After completing a skill:
1. Read the skill's `## Workflow Integration` section for post-actions.
2. List post-actions as "Recommended next steps" in the execution summary. Do not prompt or wait for approval.
3. If within a workflow, update `.orch/workflow/` stage status and advance `current_stage` if all stage skills are done.
