---
name: audit-usage
description: "Report agent and skill usage: who used which agents, how often, session counts by date range. Reads ORCH run records to produce adoption and activity metrics."
references:
  - references/orch/audit-record-schema.md
allowed-tools:
  - codebase
---

## Context

Produces usage analytics from ORCH session records. Answers questions like: which agents are most used, which skills are popular, who are the active users, and how usage trends over time. Reads `.orch/runs/` directory for session data.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Session Record Parsing

Each JSON file in `.orch/runs/` represents one agent invocation. Extract these fields from every record:

| Field             | JSON Path              | Type     | Used For                    |
|-------------------|------------------------|----------|-----------------------------|
| Session ID        | `session_id`           | string   | Deduplication               |
| Agent             | `agent`                | string   | Agent-level grouping        |
| Skill             | `skill`                | string   | Skill frequency ranking     |
| Timestamp         | `timestamp`            | ISO 8601 | Date filtering and trending |
| Duration (ms)     | `duration_ms`          | integer  | Performance metrics         |
| Outcome           | `outcome`              | string   | Success rate calculation     |
| Tools Used        | `tools_used`           | string[] | Tool adoption tracking      |
| Files Written     | `files_written`        | string[] | Productivity metrics        |
| User Feedback     | `user_feedback`        | string?  | Satisfaction tracking       |

Parse all `.json` files in `.orch/runs/`, skipping any files that fail JSON parsing (log skipped filenames to stderr).

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--user {name}` — filter to a specific user
- Optional: `--group-by {day|week|month}` — time grouping (default: day)

### Helper Script

Run the aggregation script before executing steps manually:
```bash
node scripts/aggregate-usage-logs.js [runs-dir] [--days 7]
```
The script outputs JSON to stdout with session counts, success rates, durations, and trends per agent and skill. Use this data to inform the steps below.

## Steps

1. Read session records from `.orch/runs/` directory. Parse each `.json` file and deserialize into session objects.
2. Parse each session record for: `agent`, `skill`, `timestamp`, `duration_ms`, `outcome`, `tools_used`, `files_written`.
3. Apply date range and optional agent/user filters. Date filtering is inclusive on both ends.
4. Compute core usage metrics:
   a. **Sessions per day**: total sessions / number of distinct calendar days in range.
   b. **Skills by frequency**: count invocations per skill, sort descending. Include the top agent caller for each skill.
   c. **Success rate per agent**: `(sessions where outcome == "success") / total_sessions * 100` per agent.
   d. **Average duration per agent**: `sum(duration_ms) / session_count` per agent, displayed in seconds.
   e. **Productivity rate**: average `files_written.length` per successful session, per agent.
5. Aggregate groupings:
   a. **Sessions by agent**: count per agent, sorted descending, with percentage of total.
   b. **Sessions by skill**: count per skill, sorted descending, with top agent.
   c. **Sessions over time**: count per time bucket (day/week/month) based on `--group-by`.
6. Detect trends using week-over-week comparison:
   - For each agent, compare session count in the most recent 7 days against the prior 7 days.
   - **Flag threshold**: >20% increase or decrease week-over-week triggers a trend flag.
   - Classify as: `trending-up` (>+20%), `trending-down` (>-20%), or `stable` (within +/-20%).
   - Formula: `wow_change = (current_week_count - prior_week_count) / prior_week_count * 100`
   - Require minimum 3 sessions in the prior week to calculate trend; otherwise mark as `insufficient-data`.
7. Produce the usage report with dashboard-style output.

## Output

```markdown
## Usage Report — {from} to {to}

### Overview
| Metric                | Value   |
|-----------------------|---------|
| Total sessions        | {n}     |
| Unique users          | {n}     |
| Active agents         | {n}     |
| Active skills         | {n}     |
| Avg sessions/day      | {n.n}   |
| Overall success rate  | {pct}%  |
| Avg duration (sec)    | {n.n}   |

### Sessions by Agent
| Agent       | Sessions | % Total | Success % | Avg Duration | WoW Change | Trend        |
|-------------|----------|---------|-----------|--------------|------------|--------------|
| @angular    | 142      | 34.2%   | 93.0%     | 38.2s        | +12%       | stable       |
| @react      | 98       | 23.6%   | 89.8%     | 42.1s        | +28%       | trending-up  |
| @dotnet     | 76       | 18.3%   | 95.4%     | 31.5s        | -25%       | trending-down|
| ...         |          |         |           |              |            |              |

### Skills by Frequency
| # | Skill                      | Sessions | Top Agent  | Success % |
|---|----------------------------|----------|------------|-----------|
| 1 | /angular-generate-service  | 45       | @angular   | 95.6%     |
| 2 | /react-create-component    | 38       | @react     | 89.5%     |
| 3 | /dotnet-scaffold-api       | 31       | @dotnet    | 96.8%     |
| 4 | /review                    | 28       | @angular   | 100.0%    |
| 5 | /migrate-module            | 22       | @angular   | 86.4%     |

### Usage Over Time (ASCII Chart)
Sessions per {day|week|month}:

{date_label}  | {bar}  {count}
─────────────────────────────────────
2026-03-18    | ████████████████████  42
2026-03-19    | ███████████████       31
2026-03-20    | ████████████████████████  48
2026-03-21    | ██████████████████    37
2026-03-22    | ███████               14
2026-03-23    | ████                   8
2026-03-24    | ████████████████████████████  56

### Trend Alerts
| Agent       | WoW Change | Direction     | Note                                    |
|-------------|------------|---------------|-----------------------------------------|
| @react      | +28%       | trending-up   | Crossed 20% threshold — review capacity |
| @dotnet     | -25%       | trending-down | Crossed -20% threshold — investigate    |
```

The ASCII chart renders one bar character per `ceil(count / max_count * 30)` units, so the longest bar is 30 characters wide.

## Validation

- Session counts match the number of records in `.orch/runs/` for the date range
- Date filtering is inclusive on both ends
- Percentages sum to 100% (within rounding)
- Trend detection uses at least 3 data points in the prior week before flagging
- Week-over-week change threshold is exactly 20% (configurable via future flag)
- Empty date ranges produce "No sessions found" instead of errors
- Skipped/unparseable JSON files are reported in a footnote with filenames
- Success rate formula: `outcome == "success"` count divided by total sessions, times 100
- Duration is rendered in seconds (divide `duration_ms` by 1000)
