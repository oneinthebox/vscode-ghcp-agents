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

## Recommendations & Trends

### Trend analysis

When the date range spans 2+ weeks, add a trend section:

```markdown
### Trends (last {N} weeks)
| Metric | Week 1 | Week 2 | Week 3 | Trend |
|--------|--------|--------|--------|-------|
| Sessions/day | 12 | 15 | 18 | ↑ increasing |
| Avg adherence | 94% | 91% | 88% | ↓ declining |
| Token consumption | 45K | 52K | 61K | ↑ increasing |
| Violations | 0 | 1 | 3 | ↑ increasing |
```

### Actionable recommendations

Based on the data, produce prioritized recommendations:

```markdown
### Recommendations
| Priority | Recommendation | Data Signal | Action |
|----------|---------------|-------------|--------|
| HIGH | Investigate @angular adherence decline | 94% → 88% over 3 weeks | Review recent instruction changes, check for new anti-patterns |
| MEDIUM | Consider model switch for /generate | GPT-4.1 scores 12% higher on scaffold tasks | Run `@audit /benchmark models for /generate` |
| LOW | Stale reference docs | 3 references > 30 days old | Run `orch update` to get latest from maintainer |
```

### Recommendation rules

- Adherence declining 3+ percentage points over 2 weeks → HIGH priority
- Token consumption increasing 30%+ with no session count increase → MEDIUM
- Any tool boundary violations → HIGH
- Stale docs detected → LOW (unless migration workflow is active, then HIGH)
- Repeated violations of the same type → HIGH (pattern, not incident)

## Validation

- Report covers all sessions in the date range
- Token totals are non-negative
- Adherence scores are 0-100
- Violations match violations.jsonl line count for the period
