# ORCH Global Operating Rules

These rules apply to ALL agents and skills. Read `.orch/config.yaml` at session start for runtime settings.

---

## Safety (non-overridable)

These rules are locked. No agent, skill, or configuration can override them.

- **Never** run `rm -rf` in any form.
- **Never** run `git push --force` or `git push --force-with-lease`.
- **Never** run `npm publish`, `yarn publish`, or any package publishing command.
- **Never** run `git reset --hard`.
- **Never** run `kubectl delete namespace` or equivalent destructive infrastructure commands.
- **Never** expose secrets, tokens, or credentials in output or logs.

## Confirmation (overridable by domain skills)

- Ask the user before deleting any file.
- Ask the user before running destructive git operations (rebase, reset, force-push).
- Ask the user before modifying files outside the current task scope.
- **Override**: If `auto_mode: true` in `.orch/config.yaml`, skip confirmations and execute end-to-end. Domain skills may also override confirmation behavior for their specific scope.

## Audit (non-overridable)

These rules are locked. Every agent must comply.

- Always update `.orch/runs/` with telemetry for every workflow execution (run metadata, plan, handoffs, changes, verification).
- Always respect boundary checks defined in `.orch/audit/config/boundaries.yaml` — do not access tools or file scopes outside your declared boundaries.
- All tool invocations are logged by audit hooks. Do not attempt to bypass or disable hooks.
- Record token usage, timing, and outcome for every agent invocation.

## Config

- Read `.orch/config.yaml` at the start of every session to load runtime settings.
- Respect `workflow.max_retries` for retry loops.
- Respect `workflow.permission_level` for tool access.
- Respect `preflight.*` settings for pre-flight check behavior.

## Agent Routing

- `@orch` is the entry point for all workflows. It triages requests and routes to domain agents.
- Domain agents (e.g., `@angular`, `@docs`, `@audit`) handle ad-hoc requests directly when invoked.
- `@orch` delegates to domain coordinators, which in turn delegate to role-based sub-agents (planner, engineer, verifier).
- Never skip the coordinator — always route through the domain coordinator for workflow-level tasks.

## Model Preferences

- Read the `models:` section from `.orch/config.yaml` to determine which model to use for each role.
- `coordinator`, `planner`, `engineer`, `verifier` each have a configured model.
- Default to `claude-sonnet-4` if no model is specified.

## Resource Limits

- Maximum 50 files changed per single operation. If more changes are needed, break into multiple operations.
- Be token-conscious: prefer compact summaries over verbose output.
- When reading files, read only the sections you need — do not read entire large files unnecessarily.
- Limit codebase searches to targeted queries; avoid broad glob patterns that return hundreds of results.

## Handoff Protocol

- When handing off between agents, pass a compact session state object — not the full conversation history.
- Session state includes: task summary, files modified, current status, blockers, and next action.
- Each agent receiving a handoff should be able to continue without re-reading the full conversation.
- Log all handoffs to `.orch/runs/<run-id>/handoffs.log` with timestamps and agent names.

## Pre-flight

- `@orch-preflight` runs before every workflow (not ad-hoc queries).
- Pre-flight checks: reference freshness, version alignment, audit hooks active, build baseline, git clean state, config validity, dependencies installed.
- Pre-flight behavior is configured via the `preflight:` section in `.orch/config.yaml`.
- If pre-flight fails on a blocking check, halt the workflow and report the issue.

## Overridable vs Locked Rules

### Locked (no agent or skill can override)
- Safety rules (all items in the Safety section above)
- Audit rules (all items in the Audit section above)
- Handoff protocol
- Pre-flight requirement for workflows

### Overridable (domain skills may adjust within their scope)
- Confirmation behavior (e.g., skip confirmation for well-scoped automated tasks)
- Strictness levels (e.g., lint strictness, test coverage thresholds)
- Output format preferences
- Resource limits (within reason, for bounded operations)
