---
name: audit-usage
description: "Report agent and skill usage: who used which agents, how often, session counts by date range. Reads ORCH run records to produce adoption and activity metrics."
references: []
allowed-tools:
  - codebase
---

## Context

Produces usage analytics from ORCH session records. Answers questions like: which agents are most used, which skills are popular, who are the active users, and how usage trends over time. Reads `.orch/runs/` directory for session data.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--user {name}` — filter to a specific user
- Optional: `--group-by {day|week|month}` — time grouping (default: day)

## Steps

1. Read session records from `.orch/runs/` directory.
2. Parse each session record for: agent name, skill invoked, user, timestamp, duration.
3. Apply date range and optional agent/user filters.
4. Aggregate metrics:
   a. **Sessions by agent**: count per agent, sorted descending.
   b. **Sessions by skill**: count per skill, sorted descending.
   c. **Sessions by user**: count per user, sorted descending.
   d. **Sessions over time**: count per time bucket (day/week/month).
   e. **Average session duration**: per agent and overall.
5. Detect trends: increasing/decreasing/stable usage per agent over the date range.
6. Produce the usage report.

## Output

```markdown
## Usage Report — {from} to {to}

### Overview
| Metric             | Value   |
|--------------------|---------|
| Total sessions     | {n}     |
| Unique users       | {n}     |
| Active agents      | {n}     |
| Avg session/day    | {n}     |

### Sessions by Agent
| Agent       | Sessions | % of Total | Trend     |
|-------------|----------|------------|-----------|
| @{name}     | {n}      | {pct}%     | {up/down/stable} |

### Sessions by Skill
| Skill       | Sessions | Top Agent   |
|-------------|----------|-------------|
| /{name}     | {n}      | @{agent}    |

### Sessions by User
| User        | Sessions | Top Agent   |
|-------------|----------|-------------|
| {name}      | {n}      | @{agent}    |

### Usage Over Time
| {Period}    | Sessions |
|-------------|----------|
| {date}      | {n}      |
```

## Validation

- Session counts match the number of records in `.orch/runs/` for the date range
- Date filtering is inclusive on both ends
- Percentages sum to 100% (within rounding)
- Trend detection uses at least 3 data points
- Empty date ranges produce "No sessions found" instead of errors
