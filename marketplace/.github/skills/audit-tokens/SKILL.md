---
name: audit-tokens
description: "Report token consumption per agent, model, and skill. Provides cost visibility and budget tracking. Reads ORCH run records and token audit logs."
references: []
---

## Context

Provides visibility into token consumption across ORCH operations. Breaks down usage by agent, model, and skill to identify cost drivers, detect anomalies, and support budget planning. Reads from `.orch/runs/` for session-level data and `.orch/audit/tokens/` for detailed token logs.

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--model {name}` — filter to a specific model
- Optional: `--group-by {agent|model|skill|day}` — primary grouping (default: agent)

## Steps

1. Read session records from `.orch/runs/` directory.
2. Read detailed token logs from `.orch/audit/tokens/` if available.
3. For each session, extract: input tokens, output tokens, model used, agent, skill.
4. Apply date range and optional filters.
5. Aggregate metrics:
   a. **By agent**: total tokens (input + output), session count, avg tokens/session.
   b. **By model**: total tokens, cost estimate (using model pricing table).
   c. **By skill**: total tokens, avg per invocation.
   d. **Over time**: daily/weekly token consumption trend.
6. Calculate estimated costs using standard model pricing.
7. Detect anomalies: sessions with token counts >2x the skill average.
8. Produce the token consumption report.

## Output

```markdown
## Token Consumption Report — {from} to {to}

### Overview
| Metric             | Value          |
|--------------------|----------------|
| Total tokens       | {n}            |
| Input tokens       | {n}            |
| Output tokens      | {n}            |
| Estimated cost     | ${amount}      |
| Sessions           | {n}            |
| Avg tokens/session | {n}            |

### By Agent
| Agent       | Tokens    | Sessions | Avg/Session | Est. Cost |
|-------------|-----------|----------|-------------|-----------|
| @{name}     | {n}       | {n}      | {n}         | ${amt}    |

### By Model
| Model              | Tokens    | Sessions | Est. Cost |
|--------------------|-----------|----------|-----------|
| {model-name}       | {n}       | {n}      | ${amt}    |

### By Skill
| Skill       | Tokens    | Invocations | Avg/Invocation |
|-------------|-----------|-------------|----------------|
| /{name}     | {n}       | {n}         | {n}            |

### Anomalies
| Session      | Agent  | Skill  | Tokens  | Expected | Flag     |
|-------------|--------|--------|---------|----------|----------|
| {session_id}| @{name}| /{skill}| {n}    | {avg}    | {reason} |
```

## Validation

- Token totals match sum of individual session records
- Cost estimates use current model pricing (not stale rates)
- Anomaly threshold is consistently applied (>2x average)
- Input + output tokens equal total tokens per session
- Date filtering is inclusive on both ends
