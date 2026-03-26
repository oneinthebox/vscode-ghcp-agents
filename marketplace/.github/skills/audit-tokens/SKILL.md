---
name: audit-tokens
description: "Report token consumption per agent, model, and skill. Provides cost visibility and budget tracking. Reads ORCH run records and token audit logs."
references:
  - references/orch/audit-record-schema.md
allowed-tools:
  - codebase
---

## Context

Provides visibility into token consumption across ORCH operations. Breaks down usage by agent, model, and skill to identify cost drivers, detect anomalies, and support budget planning. Reads from `.orch/runs/` for session-level data and `.orch/audit/tokens/` for detailed token logs.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Token Data Extraction

From each session record in `.orch/runs/`, extract the `tokens` object:

```json
"tokens": { "input": 12000, "output": 8500, "total": 20500 }
```

Validate that `input + output == total` for every record. Log a warning for any mismatches but use the `total` field as authoritative.

Additionally, read `.orch/audit/tokens/` for detailed per-call token breakdowns when finer granularity is needed (e.g., multi-step skills with multiple LLM calls per session).

## Cost Estimation Formula

Calculate estimated cost per session using this formula:

```
session_cost = (input_tokens / 1000 * input_rate) + (output_tokens / 1000 * output_rate)
```

### Model Pricing Table (per 1K tokens)

| Model              | Input Rate | Output Rate | Effective Date |
|--------------------|------------|-------------|----------------|
| gpt-4o             | $0.0025    | $0.0100     | 2026-01-01     |
| gpt-4o-mini        | $0.000150  | $0.000600   | 2026-01-01     |
| o4-mini            | $0.00110   | $0.00440    | 2026-01-01     |
| claude-sonnet-4    | $0.003     | $0.015      | 2026-01-01     |
| claude-opus-4      | $0.015     | $0.075      | 2026-01-01     |
| claude-haiku-3.5   | $0.0008    | $0.004      | 2026-01-01     |

If a model is not in the table, use a fallback rate of `$0.003 / 1K input` and `$0.015 / 1K output` and flag the session as "unpriced model."

## Budget Tracking

Read budget limits from `.orch/audit/config/boundaries.yaml` under the `token_budgets` key:

```yaml
token_budgets:
  daily_limit: 5000000      # 5M tokens/day across all agents
  weekly_limit: 25000000     # 25M tokens/week
  monthly_limit: 80000000    # 80M tokens/month
  per_agent_daily: 1000000   # 1M tokens/day per agent
  alert_threshold_pct: 80    # Alert when usage hits 80% of any limit
```

Compare actual consumption against these limits and report utilization percentage for each budget boundary.

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--model {name}` — filter to a specific model
- Optional: `--group-by {agent|model|skill|day}` — primary grouping (default: agent)
- Optional: `--budget` — include budget tracking section in output

### Helper Script

Run the aggregation script before executing steps manually:
```bash
node scripts/aggregate-token-usage.js [runs-dir] [--days 7]
```
The script outputs JSON to stdout with token consumption per agent, model, and skill, plus estimated costs. Use this data to inform the steps below.

## Steps

1. Read session records from `.orch/runs/` directory. Parse each `.json` file and extract `tokens`, `model`, `agent`, `skill`, `timestamp`, `outcome`, `files_written`.
2. Read detailed token logs from `.orch/audit/tokens/` if available for sub-session granularity.
3. For each session, extract: `tokens.input`, `tokens.output`, `tokens.total`, `model`, `agent`, `skill`.
4. Apply date range and optional filters.
5. Aggregate metrics:
   a. **By agent**: total tokens (input + output), session count, avg tokens/session, estimated cost.
   b. **By model**: total tokens, session count, estimated cost using the pricing table above.
   c. **By skill**: total tokens, invocation count, avg tokens per invocation.
   d. **Over time**: daily token consumption trend.
6. Calculate estimated costs using the model pricing table and formula above.
7. Compute efficiency metrics:
   a. **Tokens per file written**: `total_tokens / count(files_written)` per session, averaged by agent.
   b. **Tokens per successful outcome**: `sum(total_tokens where outcome=="success") / count(outcome=="success")` per agent.
   c. **Input/output ratio**: `input_tokens / output_tokens` — a ratio >2.0 may indicate excessive context loading.
8. If `--budget` flag is set, load `.orch/audit/config/boundaries.yaml` and compare actual consumption against limits.
9. Detect anomalies: sessions with token counts >2x the skill average.
10. Produce the token consumption report.

## Output

```markdown
## Token Consumption Report — {from} to {to}

### Overview
| Metric              | Value          |
|---------------------|----------------|
| Total tokens        | 4,250,000      |
| Input tokens        | 2,650,000      |
| Output tokens       | 1,600,000      |
| Estimated cost      | $18.42         |
| Sessions            | 415            |
| Avg tokens/session  | 10,241         |
| Input/output ratio  | 1.66           |

### Cost by Model
| Model              | Input Tokens | Output Tokens | Total Tokens | Sessions | Est. Cost  | % of Spend |
|--------------------|-------------|---------------|-------------|----------|------------|------------|
| gpt-4o             | 1,800,000   | 1,100,000     | 2,900,000   | 280      | $15.50     | 84.1%      |
| claude-sonnet-4    | 600,000     | 350,000       | 950,000     | 95       | $7.05      | 12.2%      |
| gpt-4o-mini        | 250,000     | 150,000       | 400,000     | 40       | $0.13      | 0.7%       |

### Cost by Agent
| Agent       | Tokens      | Sessions | Avg/Session | Est. Cost | Tokens/File | Tokens/Success |
|-------------|-------------|----------|-------------|-----------|-------------|----------------|
| @angular    | 1,850,000   | 142      | 13,028      | $7.82     | 6,514       | 12,105         |
| @react      | 1,200,000   | 98       | 12,245      | $5.10     | 7,059       | 13,480         |
| @dotnet     | 750,000     | 76       | 9,868       | $3.22     | 4,934       | 9,500          |
| @devops     | 450,000     | 99       | 4,545       | $2.28     | 4,545       | 4,800          |

### By Skill (Top 10)
| Skill                      | Tokens    | Invocations | Avg/Invocation | Cost   |
|----------------------------|-----------|-------------|----------------|--------|
| /angular-generate-service  | 920,000   | 45          | 20,444         | $3.89  |
| /react-create-component    | 465,000   | 38          | 12,237         | $1.95  |
| /review                    | 196,000   | 28          | 7,000          | $0.85  |

### Efficiency Metrics
| Agent       | Tokens/File Written | Tokens/Success | I/O Ratio | Rating     |
|-------------|---------------------|----------------|-----------|------------|
| @dotnet     | 4,934               | 9,500          | 1.45      | efficient  |
| @devops     | 4,545               | 4,800          | 1.52      | efficient  |
| @angular    | 6,514               | 12,105         | 1.71      | moderate   |
| @react      | 7,059               | 13,480         | 1.88      | review     |

Rating thresholds: efficient (<6K tokens/file), moderate (6K-8K), review (>8K).

### Budget Tracking
| Budget           | Limit        | Used         | Utilization | Status   |
|------------------|-------------|-------------|-------------|----------|
| Daily (today)    | 5,000,000   | 3,800,000   | 76.0%       | ok       |
| Weekly (current) | 25,000,000  | 22,100,000  | 88.4%       | WARNING  |
| Monthly          | 80,000,000  | 58,200,000  | 72.8%       | ok       |
| @angular (daily) | 1,000,000   | 850,000     | 85.0%       | WARNING  |
| @react (daily)   | 1,000,000   | 620,000     | 62.0%       | ok       |

Status: `ok` when utilization < alert_threshold_pct, `WARNING` when >= alert_threshold_pct, `EXCEEDED` when >= 100%.

### Anomalies
| Session           | Agent    | Skill                     | Tokens  | Skill Avg | Multiplier | Flag              |
|-------------------|----------|---------------------------|---------|-----------|------------|-------------------|
| a3f8-...          | @angular | /angular-generate-service | 52,000  | 20,444    | 2.5x       | >2x skill average |
| b7c2-...          | @react   | /react-create-component   | 31,000  | 12,237    | 2.5x       | >2x skill average |
```

## Validation

- Token totals match sum of individual session records
- Cost estimates use the model pricing table defined in this skill (not stale rates)
- Anomaly threshold is consistently applied (>2x average for that specific skill)
- Input + output tokens equal total tokens per session (warn on mismatch)
- Date filtering is inclusive on both ends
- Budget limits are read from `.orch/audit/config/boundaries.yaml`, not hardcoded
- Efficiency rating thresholds: efficient (<6,000 tokens/file), moderate (6,000-8,000), review (>8,000)
- Sessions with `outcome != "success"` are excluded from tokens-per-success calculations
- Unrecognized models use the fallback pricing rate and are flagged in the report
