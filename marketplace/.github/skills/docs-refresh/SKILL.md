---
name: docs-refresh
description: "Re-fetch and re-convert stale documentation sources. Identifies sources past their freshness threshold and updates them from their original URLs. Keeps the registry current."
references: []
---

## Context

Automates the re-fetching and re-conversion of stale documentation sources. Reads the ORCH registry to find sources where `last_refreshed` exceeds `max_stale_days`, re-fetches from the original source URL, re-converts to token-efficient markdown, and updates the registry entry. Can run unattended for scheduled freshness maintenance.

## Inputs

- "Refresh stale docs" — refresh all stale sources
- Optional: `--id {source-id}` — refresh a specific source regardless of staleness
- Optional: `--all` — refresh every source, not just stale ones
- Optional: `--max-stale-days {n}` — override staleness threshold (default: 30)
- Optional: `--dry-run` — show what would be refreshed without fetching

## Steps

1. Read `.orch/registry.yaml`.
2. Identify stale sources: entries where `last_refreshed` is more than `max_stale_days` ago.
3. If `--id` specified, target that source only. If `--all`, target everything.
4. If `--dry-run`, list targets and exit.
5. For each stale source:
   a. Read the original source URL and type from the registry entry.
   b. Fetch the current content from the source (same logic as `/docs-fetch`).
   c. Compare against the existing converted markdown:
      - If unchanged: update `last_refreshed` only, skip re-conversion.
      - If changed: re-convert via `@doc-convert-worker`, write updated markdown.
   d. Update the registry entry: `last_refreshed`, `tokens`, `status: current`.
6. Log the refresh results.
7. Produce the refresh report.

## Output

```markdown
## Docs Refresh Report

### Summary
| Metric             | Value  |
|--------------------|--------|
| Sources checked    | {n}    |
| Stale found        | {n}    |
| Refreshed          | {n}    |
| Content changed    | {n}    |
| Unchanged (date only) | {n} |
| Failed             | {n}    |

### Refresh Details
| ID              | Previous Refresh | Status      | Content Changed | New Tokens |
|-----------------|------------------|-------------|-----------------|------------|
| {source-id}     | {old-date}       | refreshed   | Yes / No        | {n}        |

### Failures (if any)
| ID              | Error                         | Action               |
|-----------------|-------------------------------|-----------------------|
| {source-id}     | {error message}               | {retry / check URL}   |
```

## Validation

- All stale sources are attempted (none silently skipped)
- Unchanged sources have `last_refreshed` updated but content untouched
- Changed sources are re-converted and token count recalculated
- Registry file is valid YAML after updates
- Failed fetches are reported with actionable error messages, not swallowed
