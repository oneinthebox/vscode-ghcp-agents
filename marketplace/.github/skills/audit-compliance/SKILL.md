---
name: audit-compliance
description: "Report boundary violations, adherence scores, and tool/scope violation logs. Reads the ORCH violations ledger to surface agents operating outside their defined boundaries."
references: []
---

## Context

Monitors agent compliance with defined boundaries. Every ORCH agent has declared tool permissions, file scope, and behavioral rules. This skill reads the violations ledger to report on boundary breaches, calculate adherence scores, and identify agents or skills that need tighter guardrails.

## Inputs

- Optional: `--from {date}` — start of date range (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent
- Optional: `--severity {error|warning|all}` — filter by violation severity (default: all)

## Steps

1. Read violation records from `.orch/audit/violations.jsonl`.
2. Parse each record for: timestamp, agent, skill, violation type, severity, details.
3. Apply date range and optional filters.
4. Classify violations:
   a. **Tool violation**: agent used a tool not in its `allowed-tools` list.
   b. **Scope violation**: agent modified files outside its declared file scope.
   c. **Behavioral violation**: agent deviated from its instructions (e.g., auto-resolved when told to flag for human).
   d. **Override**: legitimate override with justification (logged but not penalized).
5. Calculate adherence score per agent: (sessions without violations / total sessions) * 100.
6. Identify repeat offenders: agents with >3 violations in the date range.
7. Produce the compliance report.

## Output

```markdown
## Compliance Report — {from} to {to}

### Overview
| Metric              | Value      |
|---------------------|------------|
| Total violations    | {n}        |
| Tool violations     | {n}        |
| Scope violations    | {n}        |
| Behavioral          | {n}        |
| Overrides (logged)  | {n}        |
| Overall adherence   | {pct}%     |

### Adherence by Agent
| Agent       | Sessions | Violations | Adherence | Status   |
|-------------|----------|------------|-----------|----------|
| @{name}     | {n}      | {n}        | {pct}%    | {status} |

### Violation Log
| Time        | Agent   | Type       | Severity | Detail              |
|-------------|---------|------------|----------|---------------------|
| {timestamp} | @{name} | {type}     | {sev}    | {description}       |

### Repeat Offenders
| Agent       | Violation Count | Most Common Type | Recommendation      |
|-------------|-----------------|------------------|---------------------|
| @{name}     | {n}             | {type}           | {action to take}    |
```

## Validation

- Violation counts match the number of records in `violations.jsonl` for the date range
- Adherence scores are between 0-100%
- Overrides with justification are logged but not counted against adherence
- Every violation includes timestamp, agent, and specific detail
- Repeat offender threshold is consistently applied (>3 violations)
