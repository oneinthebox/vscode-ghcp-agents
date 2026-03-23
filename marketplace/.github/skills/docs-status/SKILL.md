---
name: docs-status
description: "Dashboard of all documentation sources in the ORCH registry. Shows versions, freshness, staleness warnings, and conversion status. Read-only view of .orch/registry.yaml."
references: []
---

## Context

Provides a read-only dashboard view of all documentation sources tracked in the ORCH registry. Shows each source's version, last refresh date, staleness status, and token size. Surfaces stale sources that need re-fetching and draft sources not yet converted. This is the go-to skill for understanding the current state of reference documentation.

## Inputs

- "Show doc status" or "What docs do we have?" — full dashboard
- Optional: `--stale-only` — show only sources past their freshness threshold
- Optional: `--domain {name}` — filter to a specific domain (e.g., angular, primeng)
- Optional: `--max-stale-days {n}` — override staleness threshold (default: 30)

## Steps

1. Read `.orch/registry.yaml`.
2. For each registry entry, calculate:
   a. **Age**: days since `last_refreshed`.
   b. **Status**: current (<max_stale_days), stale (>max_stale_days), draft (no conversion).
   c. **Token size**: from the registry or by counting the reference file.
3. Apply optional filters (stale-only, domain).
4. Group entries by domain or `managed_by` field.
5. Calculate summary statistics: total sources, current count, stale count, draft count.
6. Produce the dashboard table.

## Output

```markdown
## Documentation Registry — {n} sources

### Summary
| Status    | Count |
|-----------|-------|
| Current   | {n}   |
| Stale     | {n}   |
| Draft     | {n}   |

### Sources
| ID                      | Domain   | Version | Status  | Last Refreshed | Age   | Tokens |
|-------------------------|----------|---------|---------|----------------|-------|--------|
| {source-id}             | {domain} | {ver}   | current | {date}         | {n}d  | {n}    |
| {source-id}             | {domain} | {ver}   | stale   | {date}         | {n}d  | {n}    |
| {source-id}             | {domain} | —       | draft   | —              | —     | —      |

### Action Items
- **Stale sources**: Run `/docs-refresh` to update {n} stale sources.
- **Draft sources**: Run `/docs-fetch` to convert {n} draft sources.
```

## Validation

- Source count matches entries in `.orch/registry.yaml`
- Staleness calculation uses the correct threshold (default 30 or overridden)
- Status classification is accurate (current/stale/draft)
- All registry fields rendered (no missing columns)
- Empty registry produces "No sources registered" message, not an error
