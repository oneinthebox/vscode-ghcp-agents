# Boundaries Reference
Source: ORCH internal
Last refreshed: 2026-03-24

Defines how agent boundaries are configured and enforced at runtime. Boundaries restrict which tools an agent may use, which files it may access, and which shell commands are blocked.

## Configuration File

Boundaries are defined in `.orch/audit/config/boundaries.yaml`.

## YAML Format

```yaml
agents:
  {agent-name}:
    allowed_tools:
      - codebase
      - terminal
      - edit
      - fetch
    allowed_scope:
      - "src/**/*.ts"
      - "package.json"
    blocked_commands:
      - "rm -rf"
      - "git push --force"
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agents` | map | yes | Top-level key; maps agent name to its boundary config |
| `allowed_tools` | string[] | yes | Tools the agent may invoke |
| `allowed_scope` | string[] | yes | Glob patterns for files the agent may access |
| `blocked_commands` | string[] | no | Shell commands that are always rejected |

## Tool Permissions

| Tool | Capability | Operations | Description |
|------|-----------|------------|-------------|
| `codebase` | Read files | `read` | Read any file within `allowed_scope` |
| `terminal` | Run commands | `execute` | Execute shell commands (subject to `blocked_commands`) |
| `edit` | Write files | `write`, `create`, `delete` | Modify files within `allowed_scope` |
| `fetch` | HTTP requests | `http_get`, `http_post` | Fetch external URLs (documentation, APIs) |

An agent without `edit` in `allowed_tools` is effectively read-only. An agent without `terminal` cannot execute shell commands.

## Scope Patterns

Scope uses glob syntax matching against repository-root-relative file paths.

| Pattern | Matches | Example Files |
|---------|---------|---------------|
| `src/**/*.ts` | All TypeScript files under src/ | `src/app/app.component.ts` |
| `src/**` | Everything under src/ | `src/index.html`, `src/styles.scss` |
| `*.json` | JSON files in root only | `package.json`, `tsconfig.json` |
| `**/*.spec.ts` | All spec files anywhere | `src/app/app.component.spec.ts` |
| `.orch/**` | Everything under .orch/ | `.orch/config.yaml` |
| `libs/**/*.ts` | TS files in any lib | `libs/shared/src/index.ts` |

### Glob Rules

- `*` matches any characters within a single path segment
- `**` matches zero or more path segments
- `?` matches a single character
- `{a,b}` matches either `a` or `b`
- Patterns are matched against repo-root-relative paths (no leading `./`)

## Blocked Commands

Blocked commands use **substring matching** against the full command string.

| Blocked String | Will Block | Will NOT Block |
|---------------|------------|----------------|
| `rm -rf` | `rm -rf /tmp`, `rm -rf node_modules` | `rm file.txt`, `rm -r dir/` |
| `git push --force` | `git push --force origin main` | `git push origin main` |
| `git reset --hard` | `git reset --hard HEAD~1` | `git reset HEAD file.ts` |
| `npm publish` | `npm publish --tag latest` | `npm install`, `npm run publish-docs` |

Match algorithm:

```python
def is_blocked(command: str, blocked_list: list[str]) -> bool:
    return any(blocked in command for blocked in blocked_list)
```

## Enforcement Flow

### preToolUse Hook (Tool Boundary Check)

```
Agent requests tool
  --> VS Code fires preToolUse event
    --> check-tool-boundary.sh receives: { sessionId, toolName }
      1. Read agent name from session file
      2. Load boundaries.yaml
      3. Look up agent in agents.{name}.allowed_tools
      4. If tool in allowed_tools --> exit 0 (ALLOW)
      5. If tool NOT in allowed_tools --> log violation, exit 1 (BLOCK)
```

On BLOCK:
- Tool call is rejected; agent receives an error
- Violation appended to `.orch/audit/violations.jsonl`
- Session record updated: `boundaries.tool_violations[]` gets a new entry

### postToolUse Hook (File Scope Check)

```
Tool completes execution
  --> VS Code fires postToolUse event
    --> check-file-scope.sh receives: { sessionId, toolName, filePath }
      1. Read agent name from session file
      2. Load boundaries.yaml
      3. Look up agent in agents.{name}.allowed_scope
      4. Match filePath against each glob pattern
      5. If ANY pattern matches --> exit 0 (IN SCOPE)
      6. If NO pattern matches --> log violation, exit 0 (LOG ONLY, do not block)
```

Scope violations are **logged but not blocked** (post-hoc enforcement). The tool call has already completed, so blocking would be destructive. Instead, the violation is recorded for audit reporting.

### Terminal Command Check

```
Agent requests terminal tool with a command
  --> check-tool-boundary.sh (same flow as above, checks terminal is allowed)
  --> if allowed, command string checked against blocked_commands
    --> if substring match found --> exit 1 (BLOCK)
    --> if no match --> exit 0 (ALLOW)
```

## Violation Records

### violations.jsonl Format

One JSON object per line, appended:

```json
{"type":"tool_boundary","session":"abc123","agent":"angular-planner","tool":"edit","timestamp":"2026-03-24T14:32:00Z","action":"blocked"}
{"type":"file_scope","session":"abc123","agent":"angular-engineer","file":"deploy/prod.yaml","tool":"edit","timestamp":"2026-03-24T14:33:00Z","action":"logged"}
```

| Field | Values | Description |
|-------|--------|-------------|
| `type` | `tool_boundary`, `file_scope`, `blocked_command` | Violation category |
| `session` | UUID | Session ID |
| `agent` | string | Agent that triggered it |
| `tool` | string | Tool involved |
| `file` | string \| absent | File path (scope violations only) |
| `timestamp` | ISO 8601 | When the violation occurred |
| `action` | `blocked`, `logged` | Whether the call was blocked or just logged |

## Example Boundaries by Agent Role

### Read-Only Planner

```yaml
angular-planner:
  allowed_tools:
    - codebase
    - terminal
  allowed_scope:
    - "src/**"
    - "libs/**"
    - "angular.json"
    - "package.json"
    - ".orch/references/**"
  blocked_commands:
    - "rm -rf"
    - "git push --force"
    - "git reset --hard"
    - "npm publish"
```

### Write-Capable Engineer

```yaml
angular-engineer:
  allowed_tools:
    - codebase
    - terminal
    - edit
  allowed_scope:
    - "src/**/*.ts"
    - "src/**/*.html"
    - "src/**/*.scss"
    - "src/**/*.spec.ts"
    - ".orch/mocks/**"
  blocked_commands:
    - "rm -rf"
    - "git push --force"
    - "git reset --hard"
    - "npm publish"
```

### Docs Agent (with fetch)

```yaml
docs:
  allowed_tools:
    - codebase
    - terminal
    - fetch
    - edit
  allowed_scope:
    - ".orch/references/**"
    - ".orch/registry.yaml"
  blocked_commands:
    - "rm -rf"
    - "git push --force"
    - "npm publish"
```

### Audit Agent (read-only)

```yaml
audit:
  allowed_tools:
    - codebase
    - terminal
  allowed_scope:
    - ".orch/audit/**"
    - ".github/skills/*/SKILL.md"
  blocked_commands:
    - "rm -rf"
    - "git push --force"
    - "npm publish"
```

## Fail-Open Behavior

The boundary enforcement is designed to **fail open** in edge cases:

| Condition | Behavior |
|-----------|----------|
| No `boundaries.yaml` file | All tools allowed (warning logged) |
| No session file found | Tool allowed (warning logged) |
| Agent not in boundaries config | All tools allowed for that agent |
| `allowed_tools` is empty list | All tools allowed (no restrictions) |
| `python3` not available | Boundary check skipped (warning logged) |
| YAML parse error | Tool allowed (error logged to stderr) |

This ensures that a misconfigured audit system never blocks legitimate development work.
