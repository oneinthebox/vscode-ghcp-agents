---
name: docs-status
description: "Dashboard of all documentation sources in the ORCH registry. Shows versions, freshness, staleness warnings, and conversion status. Read-only view of .orch/registry.yaml."
references:
  - references/orch/registry-schema-reference.md
allowed-tools:
  - codebase
---

## Context

Provides a read-only dashboard view of all documentation sources tracked in the ORCH registry. Shows each source's version, last refresh date, staleness status, and token size. Surfaces stale sources that need re-fetching and draft sources not yet converted. This is the go-to skill for understanding the current state of reference documentation.

## Inputs

- "Show doc status" or "What docs do we have?" — full dashboard
- Optional: `--stale-only` — show only sources past their freshness threshold
- Optional: `--domain {name}` — filter to a specific domain (e.g., angular, primeng)
- Optional: `--max-stale-days {n}` — override staleness threshold (default: 30)

## Registry Parsing Logic

The skill reads `.orch/registry.yaml` which contains an array of source entries:

```yaml
sources:
  - id: angular-dev-guide-signals
    source: https://angular.dev/guide/signals
    type: url
    domain: angular
    version: v19
    last_refreshed: "2026-02-10"
    max_stale_days: 30
    tokens: 2860
    status: current
    managed_by: docs-fetch
```

Each entry is parsed into a structured record. Missing fields receive defaults:
- `max_stale_days`: defaults to `--max-stale-days` flag or 30
- `domain`: derived from the first path segment of the source URL host
- `version`: `"—"` if not set
- `tokens`: recalculated from file if missing

## Freshness Calculation Formula

For each source entry:

```
today          = current date
last_refreshed = entry.last_refreshed (date)
age_days       = (today - last_refreshed).days
threshold      = entry.max_stale_days ?? global_max_stale_days ?? 30
freshness_pct  = max(0, 100 - (age_days / threshold * 100))

Status logic:
  if entry.status == "draft" or last_refreshed is null:
      status = "draft"
  elif age_days > threshold:
      status = "stale"
  else:
      status = "current"
```

`freshness_pct` provides a gradient view: a source at 90% is nearly fresh, one at 10% is about to go stale.

## Coverage Metrics

The skill computes documentation coverage across the entire registry:

```
total_sources   = count(all entries)
current_count   = count(status == "current")
stale_count     = count(status == "stale")
draft_count     = count(status == "draft")
coverage_pct    = (current_count / total_sources) * 100
total_tokens    = sum(tokens for all current sources)
avg_tokens      = total_tokens / current_count
```

Coverage is also broken down per domain (angular, primeng, rxjs, internal, etc.).

## Steps

1. Read `.orch/registry.yaml`.
2. For each registry entry, calculate:
   a. **Age**: days since `last_refreshed`.
   b. **Freshness**: percentage remaining before staleness threshold.
   c. **Status**: current (age <= threshold), stale (age > threshold), draft (no conversion).
   d. **Token size**: from the registry or by counting the reference file.
3. Apply optional filters (stale-only, domain).
4. Group entries by domain or `managed_by` field.
5. Calculate summary statistics and per-domain coverage breakdown.
6. Produce the health dashboard.

## Concrete Example: Full Dashboard

Running `/docs-status` on 2026-03-25 with a registry containing 78 sources:

```markdown
## Documentation Registry — 78 sources

### Summary
| Status    | Count | Percentage |
|-----------|-------|------------|
| Current   | 48    | 61.5%      |
| Stale     | 22    | 28.2%      |
| Draft     | 8     | 10.3%      |

### Coverage by Domain
| Domain    | Total | Current | Stale | Draft | Coverage | Total Tokens |
|-----------|-------|---------|-------|-------|----------|--------------|
| angular   | 24    | 18      | 4     | 2     | 75.0%    | 62,400       |
| primeng   | 18    | 12      | 5     | 1     | 66.7%    | 28,500       |
| rxjs      | 8     | 6       | 2     | 0     | 75.0%    | 19,200       |
| ag-grid   | 10    | 5       | 4     | 1     | 50.0%    | 15,800       |
| internal  | 12    | 4       | 5     | 3     | 33.3%    | 9,600        |
| nx        | 6     | 3       | 2     | 1     | 50.0%    | 8,400        |

### Staleness Warnings (22 sources)
| ID                          | Domain  | Age  | Threshold | Freshness | Last Refreshed |
|-----------------------------|---------|------|-----------|-----------|----------------|
| ag-grid-api-reference       | ag-grid | 65d  | 30d       | 0%        | 2026-01-19     |
| internal-auth-patterns      | internal| 52d  | 14d       | 0%        | 2026-02-01     |
| primeng-table-docs          | primeng | 45d  | 30d       | 0%        | 2026-02-08     |
| angular-ssr-guide           | angular | 38d  | 30d       | 0%        | 2026-02-15     |
| ...                         |         |      |           |           |                |

### Sources
| ID                          | Domain   | Version | Status  | Last Refreshed | Age  | Tokens |
|-----------------------------|----------|---------|---------|----------------|------|--------|
| angular-dev-guide-signals   | angular  | v19     | current | 2026-03-20     | 5d   | 2,860  |
| primeng-org-autocomplete    | primeng  | v18     | current | 2026-03-18     | 7d   | 1,950  |
| rxjs-dev-guide-operators    | rxjs     | v7      | stale   | 2026-01-15     | 69d  | 3,400  |
| internal-design-system      | internal | —       | draft   | —              | —    | —      |

### Token Budget Summary
| Metric                | Value       |
|-----------------------|-------------|
| Total tokens (current)| 143,900     |
| Average per source    | 2,998       |
| Largest source        | 8,200 (angular-full-api-reference) |
| Smallest source       | 480 (rxjs-creation-operators)       |

### Action Items
- **Stale sources**: Run `/docs-refresh` to update 22 stale sources.
- **Draft sources**: Run `/docs-fetch` to convert 8 draft sources.
- **High priority**: 3 sources are 2x past their staleness threshold — refresh immediately.
- **Token budget**: Total context load is 143,900 tokens across 48 current sources.
```

## Validation

- Source count matches entries in `.orch/registry.yaml`
- Staleness calculation uses the correct threshold (per-source `max_stale_days` or global default)
- Freshness percentage is clamped to `[0, 100]` and computed from `age_days / threshold`
- Status classification is accurate (current/stale/draft)
- Coverage percentages are calculated as `current / total * 100` per domain
- All registry fields rendered (no missing columns or NaN values)
- Token counts are summed only for current sources (stale and draft excluded from totals)
- Empty registry produces "No sources registered" message, not an error
