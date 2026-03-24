---
name: audit-drift
description: "Detect behavioral quality trends over time. Track adherence score regression, output quality degradation, and session health patterns across agents and skills."
references: []
allowed-tools:
  - codebase
---

## Context

Monitors agent behavioral quality over time to detect regression. Tracks adherence scores, output quality metrics, and session health trends. Raises alerts when an agent's quality is declining, enabling proactive intervention before users notice degraded output.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Inputs

- Optional: `--from {date}` — start of date range (default: 90 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--window {days}` — rolling average window size (default: 7)
- Optional: `--threshold {pct}` — regression alert threshold (default: 5% drop)

## Steps

1. Read metrics from `.orch/audit/metrics/` directory.
2. Parse time-series data: adherence scores, validation pass rates, token efficiency, session durations.
3. Apply date range and optional agent filter.
4. For each agent, compute:
   a. **Rolling adherence average**: {window}-day rolling mean of adherence scores.
   b. **Trend direction**: linear regression slope (improving / stable / declining).
   c. **Regression detection**: flag if rolling average dropped >{threshold}% from peak.
   d. **Validation pass rate trend**: percentage of sessions passing all deterministic checks.
   e. **Token efficiency trend**: tokens per successful outcome (lower is better).
5. Identify agents with regression alerts.
6. For each regression, analyze potential causes: recent config change, new skill added, model switch.
7. Produce the drift report.

## Output

```markdown
## Behavioral Drift Report — {from} to {to}

### Overview
| Metric                   | Value         |
|--------------------------|---------------|
| Agents monitored         | {n}           |
| With regression          | {n}           |
| Overall adherence trend  | {direction}   |

### Agent Trends
| Agent       | Current Adherence | Peak | Delta  | Trend     | Alert |
|-------------|-------------------|------|--------|-----------|-------|
| @{name}     | {pct}%            | {pct}% | {delta} | {dir}  | {yes/no} |

### Regression Alerts
#### @{agent} — adherence dropped {delta}% over {period}
**Peak:** {pct}% on {date}
**Current:** {pct}% ({window}-day avg)
**Possible cause:** {analysis of recent changes}
**Recommendation:** {specific action}

### Quality Metrics Over Time
| Period      | Adherence | Validation Pass | Token Efficiency |
|-------------|-----------|-----------------|------------------|
| {date}      | {pct}%    | {pct}%          | {tokens/outcome} |
```

## Validation

- Trend calculations use at least 3 data points per agent
- Regression alerts only fire when drop exceeds the threshold
- Rolling averages use the specified window size correctly
- Agents with insufficient data are marked "insufficient data" not "stable"
- Token efficiency uses successful outcomes only (failed sessions excluded)
