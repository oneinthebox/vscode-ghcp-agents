---
name: audit-drift
description: "Detect behavioral quality trends over time. Track adherence score regression, output quality degradation, and session health patterns across agents and skills."
references:
  - references/orch/audit-record-schema.md
allowed-tools:
  - codebase
---

## Context

Monitors agent behavioral quality over time to detect regression. Tracks adherence scores, output quality metrics, and session health trends. Raises alerts when an agent's quality is declining, enabling proactive intervention before users notice degraded output.

Prerequisites: Requires `.orch/runs/` directory with session data and `.orch/audit/metrics/` for aggregated time-series metrics. These are created automatically by ORCH audit hooks during agent sessions.

## Drift Detection Model

Drift is detected by comparing a **recent window** of N sessions against a **baseline window** (the prior N sessions, or a stored baseline). Five metrics are tracked independently:

### Metrics and Thresholds

| Metric               | Baseline Source              | Drift Threshold       | Direction   | Severity    |
|----------------------|-----------------------------|-----------------------|-------------|-------------|
| Avg tokens/session   | Prior N sessions            | >30% increase         | Higher=bad  | medium      |
| Success rate         | Prior N sessions            | >10% drop             | Lower=bad   | high        |
| Tool distribution    | Baseline tool frequency map | Cosine similarity <0.85 | Shift=bad | low         |
| File scope deviation | Baseline file patterns      | >20% new paths        | More=bad    | medium      |
| Avg duration         | Prior N sessions            | >40% increase         | Higher=bad  | low         |

### Rolling Window Calculation

For a given agent with window size `W` (default: 20 sessions):

```
recent_window  = most recent W sessions (by timestamp)
baseline_window = the W sessions immediately before recent_window

For each metric M:
  baseline_value = mean(M) over baseline_window
  recent_value   = mean(M) over recent_window
  pct_change     = (recent_value - baseline_value) / baseline_value * 100

  if abs(pct_change) > drift_threshold[M]:
    flag as DRIFT
```

If fewer than `W` sessions exist for an agent, use all available sessions split in half. If fewer than 6 total sessions, mark the agent as `insufficient-data`.

### Tool Distribution Shift

Calculate tool usage frequency vectors for baseline and recent windows:

```
For each window, build a vector:
  tool_freq[tool_name] = count(sessions using tool) / total_sessions_in_window

cosine_similarity = dot(baseline_freq, recent_freq) / (||baseline_freq|| * ||recent_freq||)

If cosine_similarity < 0.85, flag as tool distribution drift.
```

## Inputs

- Optional: `--from {date}` — start of date range (default: 90 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--window {n}` — number of sessions per comparison window (default: 20)
- Optional: `--threshold {pct}` — override default drift thresholds (applied uniformly)

## Steps

1. Read session records from `.orch/runs/` directory. Parse `agent`, `skill`, `timestamp`, `duration_ms`, `tokens.total`, `outcome`, `tools_used`, `files_written`, `adherence.score`.
2. Read aggregated metrics from `.orch/audit/metrics/` for pre-computed time-series data.
3. Apply date range and optional agent filter.
4. For each agent, sort sessions by timestamp and split into baseline and recent windows.
5. Compute drift metrics:
   a. **Token drift**: compare `mean(tokens.total)` between windows. Flag if >30% increase.
   b. **Success rate drift**: compare `success_count / total` between windows. Flag if >10% drop.
   c. **Tool distribution drift**: build frequency vectors, compute cosine similarity. Flag if <0.85.
   d. **File scope drift**: count distinct file paths in `files_written` that appear in recent but not baseline. Flag if >20% are new.
   e. **Duration drift**: compare `mean(duration_ms)` between windows. Flag if >40% increase.
6. Compute rolling adherence average using the `adherence.score` field from session records.
7. Determine overall drift status per agent:
   - **No drift**: zero metrics flagged.
   - **Minor drift**: 1 metric flagged (low or medium severity).
   - **Significant drift**: 2+ metrics flagged, or any high-severity metric flagged.
   - **Critical drift**: 3+ metrics flagged including at least one high severity.
8. For each agent with drift, analyze potential causes by examining recent sessions for: model changes, new skills invoked, config changes in `.orch/audit/config/`.
9. Produce the drift report with trend arrows.

## Output

```markdown
## Behavioral Drift Report — {from} to {to}

### Overview
| Metric                   | Value              |
|--------------------------|--------------------|
| Agents monitored         | 4                  |
| With drift detected      | 2                  |
| Critical drift           | 1                  |
| Overall adherence trend  | declining          |
| Window size              | 20 sessions        |

### Agent Drift Summary
| Agent       | Tokens Avg | Token Delta | Success % | Success Delta | Tool Sim | Duration Avg | Status          |
|-------------|------------|-------------|-----------|---------------|----------|--------------|-----------------|
| @angular    | 13,200     | +8%         | 93.0%     | -2%           | 0.97     | 38s          | no drift        |
| @react      | 15,800     | +35% !!     | 82.0%     | -12% !!       | 0.78 !!  | 51s          | critical drift  |
| @dotnet     | 10,100     | +12%        | 94.0%     | -1%           | 0.92     | 33s          | no drift        |
| @devops     | 5,200      | +31% !!     | 95.0%     | +1%           | 0.91     | 22s          | minor drift     |

`!!` = exceeds drift threshold.

### Drift Detail: @react (critical)
| Metric             | Baseline (prev 20) | Recent (last 20) | Change   | Threshold | Status |
|--------------------|---------------------|-------------------|----------|-----------|--------|
| Avg tokens/session | 11,700              | 15,800            | +35.0%   | >30%      | DRIFT  |
| Success rate       | 92.0%               | 82.0%             | -10.9%   | >10% drop | DRIFT  |
| Tool similarity    | --                  | 0.78              | <0.85    | <0.85     | DRIFT  |
| New file paths     | --                  | 28% new           | >20%     | >20%      | DRIFT  |
| Avg duration       | 42s                 | 51s               | +21.4%   | >40%      | ok     |

**Possible causes:**
- Model switched from `gpt-4o` to `claude-sonnet-4` in 8 of last 20 sessions
- New skill `/react-migrate-hooks` introduced 2026-03-18, accounts for 6 sessions
- Tool `browser` appeared in 4 recent sessions (0 in baseline)

**Recommendations:**
- Review `/react-migrate-hooks` skill definition for token efficiency
- Evaluate whether `browser` tool should be in `allowed_tools`
- Consider reverting model assignment pending further benchmarking

### Drift Detail: @devops (minor)
| Metric             | Baseline (prev 20) | Recent (last 20) | Change   | Threshold | Status |
|--------------------|---------------------|-------------------|----------|-----------|--------|
| Avg tokens/session | 3,970               | 5,200             | +31.0%   | >30%      | DRIFT  |
| Success rate       | 94.0%               | 95.0%             | +1.1%    | >10% drop | ok     |
| Tool similarity    | --                  | 0.91              | >=0.85   | <0.85     | ok     |
| New file paths     | --                  | 12% new           | <20%     | >20%      | ok     |
| Avg duration       | 19s                 | 22s               | +15.8%   | >40%      | ok     |

**Possible cause:** Increased context loading for new CI pipeline configs.
**Recommendation:** Monitor; no action required unless token trend continues.

### Adherence Trend (Rolling {window}-Session Average)
| Period (ending)  | @angular | @react   | @dotnet  | @devops  |
|------------------|----------|----------|----------|----------|
| 2026-03-11       | 96.2%    | 91.5%    | 99.0%    | 97.8%    |
| 2026-03-18       | 95.8%    | 87.3%    | 98.5%    | 98.1%    |
| 2026-03-25       | 95.5%    | 81.2%    | 99.2%    | 97.5%    |
| Trend arrow      |    -->   |    vvv   |    -->   |    -->   |

Trend arrows: ^^^ (improving >5%), --> (stable +/-5%), vvv (declining >5%).
```

## Validation

- Trend calculations require at least 6 sessions per agent (3 per window minimum)
- Regression alerts only fire when drift threshold is exceeded for that specific metric
- Rolling averages use the specified window size correctly
- Agents with fewer than 6 sessions are marked "insufficient-data" (not "no drift")
- Token efficiency uses successful outcomes only (failed sessions excluded from token averages)
- Cosine similarity is computed only when both windows have tool usage data
- Drift severity classification follows the defined rules: no drift (0 flags), minor (1 flag), significant (2+ or any high), critical (3+ with high)
- Trend arrows use 5% threshold: ^^^ (>+5%), --> (within +/-5%), vvv (>-5%)
