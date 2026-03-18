---
name: report
description: "Generate audit reports — usage (who used what), token consumption (how much), compliance (violations + adherence), and behavioral drift (quality trends). Combines what was previously 4 separate skills into one comprehensive report. Use when you need visibility into how ORCH agents are performing."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

Reads audit data from `.orch/audit/` and produces formatted reports. The user can ask for the full report or a specific section.

## Capabilities

| Section | What it shows | Data source |
|---------|-------------|-------------|
| **Usage** | Sessions by agent, unique users, skills invoked, tools used, trends | `sessions/` |
| **Tokens** | Estimated tokens by agent, model, skill, with breakdown and trends | `tokens/` |
| **Compliance** | Tool boundary violations, file scope violations, adherence scores, guardrail triggers | `violations.jsonl` + `sessions/` |
| **Drift** | Adherence scores over time, regression detection, root cause analysis | `sessions/` + `metrics/` |

## Inputs

- "Show me the full audit report" → all 4 sections
- "How much token usage this week?" → tokens section only
- "Any compliance violations?" → compliance section only
- "Is Angular agent quality drifting?" → drift section for @angular
- Optional: date range (defaults to last 7 days)
- Optional: `--agent` to filter by agent name

## Steps

1. Determine which sections the user wants.
2. Read session files from `.orch/audit/sessions/` for the date range.
3. Read `violations.jsonl` for compliance data.
4. Read `tokens/` for token aggregation.
5. Read `metrics/daily/` for trend comparison.
6. If override data exists, include override status in compliance section.
7. Compile and format as markdown tables.

## Output

```markdown
## ORCH Audit Report — {date_range}

### Usage
| Agent | Sessions | Users | Avg Duration | Top Skills |
|-------|----------|-------|-------------|-----------|

### Token Consumption
| Agent | Sessions | Input (est.) | Output (est.) | Total | Avg/Session |
|-------|----------|-------------|--------------|-------|-------------|

### Compliance
| Metric | Count | Details |
|--------|-------|---------|
| Tool boundary violations | {n} | {agent attempted unauthorized tool} |
| File scope violations | {n} | {agent edited file outside scope} |
| Avg adherence score | {n}% | {by agent} |
| Overrides active | {n} | {n} expired |

### Behavioral Drift
| Agent | This Week | Last Week | Delta | Status |
|-------|-----------|-----------|-------|--------|

### Action Items
1. {prioritized list of things that need attention}
```

## Validation

- Report covers all sessions in the date range
- Token totals are non-negative
- Adherence scores are 0-100
- Violations match violations.jsonl line count for the period
