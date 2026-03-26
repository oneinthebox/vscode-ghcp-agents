---
name: audit-compliance
description: "Report boundary violations, adherence scores, and tool/scope violation logs. Reads the ORCH violations ledger to surface agents operating outside their defined boundaries."
references:
  - references/orch/audit-record-schema.md
  - references/orch/adherence-rules-reference.md
  - references/orch/boundaries-reference.md
allowed-tools:
  - codebase
---

## Context

Monitors agent compliance with defined boundaries. Every ORCH agent has declared tool permissions, file scope, and behavioral rules in `.orch/audit/config/boundaries.yaml`. This skill reads session records and the violations ledger to report on boundary breaches, calculate weighted adherence scores, and identify agents or skills that need tighter guardrails.

Prerequisites: Requires `.orch/runs/` directory with session data and `.orch/audit/config/boundaries.yaml` for declared agent boundaries. These are created automatically by ORCH audit hooks during agent sessions.

## Adherence Scoring Formula

The compliance score for each agent is a **weighted average** of four dimensions:

```
adherence_score = (boundary_respect * 0.40) +
                  (tool_usage * 0.30) +
                  (file_scope * 0.20) +
                  (outcome_quality * 0.10)
```

### Dimension Calculations

| Dimension          | Weight | Formula                                                                                     |
|--------------------|--------|---------------------------------------------------------------------------------------------|
| Boundary Respect   | 40%    | `(sessions_without_boundary_violations / total_sessions) * 100`                             |
| Tool Usage         | 30%    | `(sessions_using_only_allowed_tools / total_sessions) * 100`                                |
| File Scope         | 20%    | `(sessions_writing_only_in_scope_files / total_sessions) * 100`                             |
| Outcome Quality    | 10%    | `(sessions_with_outcome=="success" AND no_behavioral_violations / total_sessions) * 100`    |

Each dimension produces a 0-100 score. The final weighted score is also 0-100.

### Boundary Reference

Load agent boundaries from `.orch/audit/config/boundaries.yaml`:

```yaml
agents:
  angular:
    allowed_tools: [codebase, terminal, edit]
    file_scope: ["src/app/**", "angular.json", "tsconfig*.json"]
    blocked_paths: ["node_modules/**", ".env*", "dist/**"]
  react:
    allowed_tools: [codebase, edit]
    file_scope: ["src/**", "package.json"]
    blocked_paths: ["node_modules/**", ".env*", "build/**"]
```

Cross-reference each session's `tools_used` against `allowed_tools` and each `files_written` entry against `file_scope` and `blocked_paths`.

## Violation Categories and Severity

| Severity   | Code | Category                | Description                                                          | Score Impact |
|------------|------|-------------------------|----------------------------------------------------------------------|-------------|
| **critical** | C  | Wrote outside boundary  | Agent wrote to a file in `blocked_paths` or entirely outside `file_scope` | -15 points  |
| **high**     | H  | Used blocked tool       | Agent invoked a tool not in its `allowed_tools` list                   | -10 points  |
| **medium**   | M  | Excessive retries       | Agent retried a failed operation >3 times in one session              | -5 points   |
| **low**      | L  | Style deviation         | Agent produced output that deviates from declared style/format rules  | -2 points   |

Score impact is applied as a penalty to the raw adherence score (floor at 0).

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--severity {critical|high|medium|low|all}` — filter by violation severity (default: all)

### Helper Script

Run the boundary violation checker before executing steps manually:
```bash
node scripts/check-boundary-violations.js [runs-dir] [--boundaries path/to/boundaries.yaml] [--days 7]
```
The script outputs JSON to stdout with per-agent adherence scores and violation details. Use this data to inform the steps below.

## Steps

1. Read session records from `.orch/runs/` directory. Parse `agent`, `skill`, `timestamp`, `tools_used`, `files_written`, `outcome`, `adherence`.
2. Read violation records from `.orch/audit/violations.jsonl`.
3. Load agent boundary definitions from `.orch/audit/config/boundaries.yaml`.
4. Apply date range and optional filters.
5. For each session, evaluate compliance across all four dimensions:
   a. **Boundary respect**: compare `files_written` against agent's `file_scope` and `blocked_paths`.
   b. **Tool usage**: compare `tools_used` against agent's `allowed_tools`.
   c. **File scope**: verify every path in `files_written` matches at least one `file_scope` glob pattern.
   d. **Outcome quality**: check `outcome == "success"` and no behavioral violations logged.
6. Classify each violation by severity (critical / high / medium / low) using the categories table above.
7. Calculate weighted adherence score per agent using the formula above.
8. Apply severity penalties to derive the final adjusted score.
9. Identify repeat offenders: agents with >3 violations in the date range.
10. Build violation timeline: group violations by week to show trends.
11. Produce the compliance report with scorecard.

## Output

```markdown
## Compliance Report — {from} to {to}

### Overview
| Metric              | Value      |
|---------------------|------------|
| Total sessions      | 415        |
| Total violations    | 23         |
| Critical violations | 2          |
| High violations     | 5          |
| Medium violations   | 9          |
| Low violations      | 7          |
| Overrides (logged)  | 3          |
| Overall adherence   | 91.4%      |

### Compliance Scorecard by Agent
| Agent       | Sessions | Boundary (40%) | Tools (30%) | Scope (20%) | Quality (10%) | Weighted Score | Penalties | Final Score | Grade |
|-------------|----------|----------------|-------------|-------------|---------------|----------------|-----------|-------------|-------|
| @angular    | 142      | 97.2           | 100.0       | 95.8        | 93.0          | 97.1           | -15       | 82.1        | B     |
| @dotnet     | 76       | 100.0          | 100.0       | 100.0       | 95.4          | 99.5           | 0         | 99.5        | A+    |
| @react      | 98       | 93.9           | 96.9        | 91.8        | 89.8          | 93.8           | -20       | 73.8        | C     |
| @devops     | 99       | 98.0           | 100.0       | 97.0        | 96.0          | 98.1           | -5        | 93.1        | A     |

Grade scale: A+ (>=95), A (>=90), B (>=80), C (>=70), D (>=60), F (<60).

### Violation Timeline
| Week Starting | Critical | High | Medium | Low | Total | Trend     |
|---------------|----------|------|--------|-----|-------|-----------|
| 2026-03-03    | 0        | 1    | 2      | 1   | 4     | --        |
| 2026-03-10    | 1        | 2    | 3      | 2   | 8     | worsening |
| 2026-03-17    | 1        | 2    | 4      | 4   | 11    | worsening |

### Violation Log (Most Recent 20)
| Time                | Agent    | Severity | Category            | Skill                     | Detail                                        |
|---------------------|----------|----------|---------------------|---------------------------|-----------------------------------------------|
| 2026-03-24T14:22:00 | @react   | critical | Wrote outside scope | /react-create-component   | Wrote to `server/api/route.ts` (blocked path) |
| 2026-03-24T11:05:00 | @angular | high     | Used blocked tool   | /angular-generate-service | Used `browser` tool (not in allowed_tools)     |
| 2026-03-23T16:30:00 | @react   | medium   | Excessive retries   | /react-create-component   | Retried `edit` 5 times on same file            |
| ...                 |          |          |                     |                           |                                               |

### Repeat Offenders
| Agent       | Violations | Critical | Most Common Category | Recommendation                                |
|-------------|------------|----------|----------------------|-----------------------------------------------|
| @react      | 12         | 2        | Scope violation      | Tighten file_scope; add blocked_paths for /server |
| @angular    | 7          | 0        | Tool violation       | Add `browser` to allowed_tools or block usage  |
```

## Validation

- Violation counts match the number of records in `violations.jsonl` for the date range
- Weighted adherence scores are between 0-100 (penalties can reduce the final score but floor is 0)
- Dimension weights sum to exactly 1.0 (0.40 + 0.30 + 0.20 + 0.10)
- Overrides with justification are logged but not counted against adherence
- Every violation includes timestamp, agent, severity, category, and specific detail
- Repeat offender threshold is consistently applied (>3 violations)
- Grade scale boundaries are applied consistently: A+ (>=95), A (>=90), B (>=80), C (>=70), D (>=60), F (<60)
- Boundary definitions are loaded from `.orch/audit/config/boundaries.yaml`, not hardcoded
- Violation timeline groups by ISO week starting on Monday
