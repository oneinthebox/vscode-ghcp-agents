# Config YAML Reference
Source: ORCH internal
Last refreshed: 2026-03-24

Complete reference for `.orch/config.yaml` -- the runtime configuration for all ORCH agents, workflows, and skills.

## File Location

```
.orch/config.yaml
```

## Workflow Section

Controls how workflows execute and when they require human approval.

| Setting | Type | Default | Valid Values | Description |
|---------|------|---------|-------------|-------------|
| `workflow.max_retries` | number | `3` | 0-10 | Maximum retries for failed skill invocations before giving up |
| `workflow.auto_mode` | string | `safe` | `step-by-step`, `safe`, `all` | How much human approval is required |
| `workflow.permission_level` | string | `allow` | `allow`, `allow-with-permissions`, `auto` | Tool access policy |

### auto_mode Behavior

| Mode | Read-Only Skills | Write Skills | Workflow Phases |
|------|-----------------|-------------|-----------------|
| `step-by-step` | Show plan, wait for approval | Show plan, wait for approval | Always prompt at approval gates |
| `safe` | Run immediately | Show plan, then execute | Prompt only at `approval: always` gates |
| `all` | Run immediately | Run immediately | Skip all approval gates except `approval: always` |

### permission_level Behavior

| Level | Description |
|-------|-------------|
| `allow` | Agent may only use tools listed in its `allowed-tools` frontmatter (strictest) |
| `allow-with-permissions` | Allowed tools plus any tools the user explicitly approves at runtime |
| `auto` | Agent selects tools automatically based on task needs (least restrictive) |

## Preflight Section

Checks run before any skill execution to ensure a healthy starting state.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `preflight.check_references` | bool | `true` | Validate that all file paths in skill `references` frontmatter resolve to real files |
| `preflight.max_stale_days` | number | `30` | Days after which a reference doc is flagged as stale |
| `preflight.check_build_baseline` | bool | `true` | Run `ng build` / `nx build` before starting migrations or refactors |
| `preflight.check_git_clean` | bool | `true` | Require clean git working tree (no uncommitted changes) before write operations |
| `preflight.auto_refresh_docs` | bool | `true` | Automatically re-fetch stale reference docs before skills that depend on them |

### Preflight Flow

```
User invokes skill
  --> Preflight runs:
    1. check_git_clean? --> git status --porcelain (fail if dirty)
    2. check_references? --> resolve each path in skill's references[] (warn if missing)
    3. max_stale_days? --> check last_refreshed in registry for each reference
    4. auto_refresh_docs? --> if stale, invoke /docs-refresh before continuing
    5. check_build_baseline? --> ng build / nx build (fail if broken)
  --> If all pass: proceed to skill execution
  --> If any fail: report which checks failed, offer remediation
```

## Models Section

Specifies which LLM model each agent role uses. Agent roles map to model IDs.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `models.coordinator` | string | `claude-sonnet-4` | Model for the master orchestrator (routing, preflight, triage) |
| `models.planner` | string | `claude-sonnet-4` | Model for planner agents (scanning, analysis, plan generation) |
| `models.engineer` | string | `claude-sonnet-4` | Model for engineer agents (code generation, migration, refactoring) |
| `models.verifier` | string | `claude-sonnet-4` | Model for verifier agents (build/test verification, code review) |

### How Models Are Read by Agents

```
Workflow phase specifies: agent: planner
  --> Coordinator reads config.yaml models.planner
  --> Launches agent with model_id from config
  --> Agent inherits model setting for its entire session
```

Valid model IDs depend on the environment. Common values:

| Model ID | Vendor | Best For |
|----------|--------|----------|
| `claude-sonnet-4` | Anthropic | Balanced speed/quality, default for all roles |
| `claude-opus-4` | Anthropic | Complex reasoning, large codebases |
| `gpt-4o` | OpenAI | Alternative for engineer/verifier |
| `o4-mini` | OpenAI | Fast iteration, cost-sensitive tasks |

## Presentation Section

Controls branding and output format for `/present-*` skills.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `presentation.logo_path` | string | `./assets/placeholder-logo.svg` | Path to logo file (SVG, PNG, JPG) used in reports and decks |
| `presentation.cover_background` | string | `"#0a0e17"` | CSS color for slide deck cover background |
| `presentation.hds_theme` | string \| null | `null` | Path to custom HDS CSS theme; null uses built-in defaults |
| `presentation.default_format` | string | `html` | Default output: `html` or `pptx` |

### Logo Resolution

```
1. If logo_path is set and file exists --> use it
2. If logo_path is set but file missing --> use placeholder, log warning
3. If logo_path is null --> no logo in output
```

### Theme Override

When `hds_theme` is set to a CSS file path:
- Variables from that file override `deck-tokens.css` defaults
- Only variables defined in the override file are replaced
- All other variables fall back to defaults

## Audit Section

Controls audit logging behavior for session records and metrics.

| Setting | Type | Default | Valid Values | Description |
|---------|------|---------|-------------|-------------|
| `audit.log_retention_days` | number | `90` | 1-365 | How many days to keep `.orch/runs/` data |
| `audit.verbosity` | string | `normal` | `minimal`, `normal`, `verbose` | Detail level of session records |
| `audit.export_format` | string | `json` | `json`, `csv` | Format for enterprise observability export |

### Verbosity Levels

| Level | Session Record Includes |
|-------|------------------------|
| `minimal` | session_id, identity, timing, agent.name, validation.overall_score |
| `normal` | All fields at standard detail (default schema) |
| `verbose` | All fields plus `tokens.input_breakdown`, full tool durations, command outputs |

### Log Retention

Sessions older than `log_retention_days` are eligible for cleanup:

```
cleanup trigger: daily or on orch update
  --> scan .orch/runs/{date}/ directories
  --> if date < today - log_retention_days: delete directory
  --> aggregate metrics are preserved in .orch/audit/metrics/ (never deleted)
```

## Complete Example

```yaml
# .orch/config.yaml

workflow:
  max_retries: 3
  auto_mode: safe
  permission_level: allow

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
  hds_theme: null
  default_format: html

audit:
  log_retention_days: 90
  verbosity: normal
  export_format: json
```

## auto_mode and Approval Gate Interaction

Full decision matrix for whether a phase runs or prompts:

| `auto_mode` | Phase `approval` | Phase has write tools? | Result |
|-------------|-----------------|----------------------|--------|
| `step-by-step` | `none` | no | Show plan, wait |
| `step-by-step` | `none` | yes | Show plan, wait |
| `step-by-step` | `auto=safe` | no | Show plan, wait |
| `step-by-step` | `auto=safe` | yes | Show plan, wait |
| `step-by-step` | `always` | any | Show plan, wait |
| `safe` | `none` | no | Run immediately |
| `safe` | `none` | yes | Run immediately |
| `safe` | `auto=safe` | no | Run immediately |
| `safe` | `auto=safe` | yes | Show plan, then execute |
| `safe` | `always` | any | Show plan, wait |
| `all` | `none` | any | Run immediately |
| `all` | `auto=safe` | any | Run immediately |
| `all` | `always` | any | Show plan, wait |

Key: "Show plan, wait" means the coordinator displays what will happen and waits for user confirmation. "Run immediately" means no user interaction. "Show plan, then execute" means the plan is shown but execution proceeds without waiting.
