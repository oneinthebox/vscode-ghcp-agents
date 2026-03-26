# Audit Record Schema
Source: ORCH internal
Last refreshed: 2026-03-24

Complete JSON schema for session audit records stored in `.orch/runs/{date}/{session_id}.json`. These records are created by audit hook scripts and read by all `/audit-*` skills.

## Directory Layout

```
.orch/
  runs/
    2026-03-24/
      abc123.json        # one file per session
      def456.json
  audit/
    violations.jsonl     # append-only violation log
    metrics/             # aggregated metrics (daily)
    tokens/              # token consumption logs
```

## Session Record — Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | Unique session identifier (UUID) |
| `identity` | object | yes | Who/where the session ran |
| `timing` | object | yes | Start, end, duration |
| `agent` | object | yes | Agent that owned the session |
| `prompts` | array | yes | User prompts submitted during session |
| `tools_used` | array | yes | Every tool invocation logged |
| `files` | object | yes | File access categorized by action |
| `tokens` | object | yes | Token consumption breakdown |
| `boundaries` | object | yes | Tool and scope violation records |
| `adherence` | object | yes | Rule-check results post-session |
| `validation` | object | yes | Build/test/lint results |

## Identity Fields

| Field | Type | Example | Source |
|-------|------|---------|--------|
| `identity.user` | string | `"Jane Dev"` | `git config user.name` |
| `identity.email` | string | `"jane@corp.com"` | `git config user.email` |
| `identity.machine` | string | `"JANE-MBP"` | `hostname` |
| `identity.repo` | string | `"git@github.com:org/app.git"` | `git remote get-url origin` |
| `identity.branch` | string | `"feature/signals"` | `git branch --show-current` |

## Timing Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `timing.started` | ISO 8601 | `"2026-03-24T14:30:00Z"` | Set by `log-session-start.sh` |
| `timing.ended` | ISO 8601 \| null | `"2026-03-24T14:45:12Z"` | Set by `log-session-end.sh`; null if session still active |
| `timing.duration_sec` | number \| null | `912` | Computed: `ended - started` in seconds |

## Agent Fields

| Field | Type | Example |
|-------|------|---------|
| `agent.name` | string | `"angular"` |
| `agent.role` | string | `"coordinator"` |
| `agent.model` | string | `"claude-sonnet-4"` |
| `agent.skills_invoked` | string[] | `["/angular-scan-deps", "/angular-migrate-version"]` |

## Prompts Array

Each entry in `prompts[]`:

| Field | Type | Example |
|-------|------|---------|
| `text` | string | `"Upgrade Angular from v18 to v21"` |
| `timestamp` | ISO 8601 | `"2026-03-24T14:30:05Z"` |
| `estimated_tokens` | number | `42` |

## Tools Used Array

Each entry in `tools_used[]`:

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `tool` | string | `"edit"` | Tool name: `codebase`, `terminal`, `edit`, `fetch` |
| `action` | string | `"write"` | Action performed: `read`, `write`, `execute`, `http_get` |
| `file` | string \| null | `"src/app/app.component.ts"` | File path if applicable |
| `timestamp` | ISO 8601 | `"2026-03-24T14:31:00Z"` | When the tool was invoked |
| `allowed` | boolean | `true` | Whether the tool was in the agent's allowed list |
| `in_scope` | boolean | `true` | Whether the file was within declared scope |
| `duration_ms` | number | `245` | Execution time in milliseconds |
| `lines_changed` | number \| null | `12` | Lines modified (write operations only) |

## Files Object

| Field | Type | Description |
|-------|------|-------------|
| `files.read` | string[] | Files opened for reading |
| `files.modified` | string[] | Existing files that were edited |
| `files.created` | string[] | New files written |
| `files.deleted` | string[] | Files removed |
| `files.outside_scope` | string[] | Files accessed that were outside the agent's declared scope |

## Tokens Object

| Field | Type | Description |
|-------|------|-------------|
| `tokens.input_estimated` | number | Total input tokens consumed |
| `tokens.output_estimated` | number | Total output tokens generated |
| `tokens.total_estimated` | number | `input_estimated + output_estimated` |

### Input Token Breakdown (verbose mode)

When `audit.verbosity: verbose` in config.yaml, the `tokens` object includes:

| Field | Type | Description |
|-------|------|-------------|
| `tokens.input_breakdown.prompts` | number | Tokens from user prompts |
| `tokens.input_breakdown.instructions` | number | Tokens from SKILL.md and agent instructions |
| `tokens.input_breakdown.references` | number | Tokens from `.orch/references/` docs loaded |
| `tokens.input_breakdown.codebase_reads` | number | Tokens from file reads during session |

## Boundaries Object

| Field | Type | Description |
|-------|------|-------------|
| `boundaries.tool_violations` | array | Tools used that were not in `allowed_tools` |
| `boundaries.scope_violations` | array | Files accessed outside `allowed_scope` |
| `boundaries.tools_used_but_not_declared` | string[] | Unique tool names attempted but not declared |

### Tool Violation Entry

| Field | Type | Example |
|-------|------|---------|
| `tool` | string | `"edit"` |
| `timestamp` | ISO 8601 | `"2026-03-24T14:32:00Z"` |
| `blocked` | boolean | `true` |

### Scope Violation Entry

| Field | Type | Example |
|-------|------|---------|
| `file` | string | `"deploy/k8s/prod.yaml"` |
| `tool` | string | `"edit"` |
| `action` | string | `"write"` |
| `timestamp` | ISO 8601 | `"2026-03-24T14:33:00Z"` |
| `logged` | boolean | `true` |

## Adherence Object

| Field | Type | Description |
|-------|------|-------------|
| `adherence.score` | number \| null | Percentage: `(rules_passed / rules_checked) * 100` |
| `adherence.rules_checked` | number | Total rules evaluated |
| `adherence.rules_passed` | number | Rules that passed |
| `adherence.rules_failed` | array | Details of each failed rule |

### Failed Rule Entry

| Field | Type | Example |
|-------|------|---------|
| `rule_id` | string | `"no_any_type"` |
| `file` | string | `"src/app/services/fund.service.ts"` |
| `line` | number | `42` |
| `message` | string | `"'any' type found -- use specific type or 'unknown'"` |
| `severity` | string | `"medium"` |

## Validation Object

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `validation.build` | string \| null | `"pass"`, `"fail"`, `null` | `ng build` / `nx build` result |
| `validation.test` | string \| null | `"pass"`, `"fail"`, `null` | `ng test` / `nx test` result |
| `validation.lint` | string \| null | `"pass"`, `"fail"`, `null` | `ng lint` / `nx lint` result |
| `validation.overall_score` | number \| null | 0-100 | Weighted: build=40%, test=40%, lint=20% |

Score calculation:

```
overall_score = (build_pass * 40) + (test_pass * 40) + (lint_pass * 20)
```

Where `*_pass` is 1 if `"pass"`, 0 if `"fail"`, null if not run.

## Complete Example

```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "identity": {
    "user": "Jane Dev",
    "email": "jane@corp.com",
    "machine": "JANE-MBP",
    "repo": "git@github.com:acme/trading-app.git",
    "branch": "feature/angular-21-upgrade"
  },
  "timing": {
    "started": "2026-03-24T14:30:00Z",
    "ended": "2026-03-24T14:45:12Z",
    "duration_sec": 912
  },
  "agent": {
    "name": "angular",
    "role": "coordinator",
    "model": "claude-sonnet-4",
    "skills_invoked": ["/angular-scan-deps", "/angular-migrate-version"]
  },
  "prompts": [
    {
      "text": "Upgrade Angular from v18 to v21",
      "timestamp": "2026-03-24T14:30:05Z",
      "estimated_tokens": 42
    }
  ],
  "tools_used": [
    {
      "tool": "codebase",
      "action": "read",
      "file": "package.json",
      "timestamp": "2026-03-24T14:30:10Z",
      "allowed": true,
      "in_scope": true,
      "duration_ms": 15,
      "lines_changed": null
    },
    {
      "tool": "edit",
      "action": "write",
      "file": "src/app/app.component.ts",
      "timestamp": "2026-03-24T14:35:20Z",
      "allowed": true,
      "in_scope": true,
      "duration_ms": 245,
      "lines_changed": 12
    }
  ],
  "files": {
    "read": ["package.json", "angular.json", "src/app/app.component.ts"],
    "modified": ["src/app/app.component.ts", "package.json"],
    "created": [],
    "deleted": [],
    "outside_scope": []
  },
  "tokens": {
    "input_estimated": 12450,
    "output_estimated": 3200,
    "total_estimated": 15650
  },
  "boundaries": {
    "tool_violations": [],
    "scope_violations": [],
    "tools_used_but_not_declared": []
  },
  "adherence": {
    "score": 93.3,
    "rules_checked": 15,
    "rules_passed": 14,
    "rules_failed": [
      {
        "rule_id": "no_any_type",
        "file": "src/app/services/fund.service.ts",
        "line": 42,
        "message": "'any' type found -- use specific type or 'unknown'",
        "severity": "medium"
      }
    ]
  },
  "validation": {
    "build": "pass",
    "test": "pass",
    "lint": "fail",
    "overall_score": 80
  }
}
```

## File Naming Convention

```
.orch/runs/{YYYY-MM-DD}/{session_id}.json
```

- `session_id` is a UUID generated at session start
- Date directory groups sessions by calendar day (UTC)
- One JSON file per session (not JSONL)

## Status Lifecycle

```
session_start → active → tools_running → adherence_check → validation → ended
```

The session file is updated incrementally: hooks append to arrays (`prompts`, `tools_used`) and update counters (`tokens`) throughout the session. Final fields (`timing.ended`, `adherence`, `validation`) are written by `log-session-end.sh`.
