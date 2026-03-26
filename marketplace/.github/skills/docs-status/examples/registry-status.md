<!-- Example output from /docs-status — see SKILL.md for usage -->
# Registry Status Dashboard

**Generated:** 2026-03-25T14:30:00Z
**Registry:** `.orch/registry.yaml`
**Stale threshold:** 30 days

---

## Summary

| Metric           | Value  |
|------------------|--------|
| Total Entries    | 58     |
| Current          | 42     |
| Draft            | 16     |
| Freshness        | 72.4%  |
| Stale (>30 days) | 9      |

---

## Per-Domain Breakdown

| Domain     | Total | Current | Draft | Stale | Freshness |
|------------|-------|---------|-------|-------|-----------|
| angular    | 28    | 22      | 6     | 3     | 78.6%     |
| nx         | 8     | 6       | 2     | 1     | 75.0%     |
| primeng    | 7     | 5       | 2     | 2     | 71.4%     |
| ag-grid    | 5     | 3       | 2     | 1     | 60.0%     |
| orch       | 6     | 4       | 2     | 1     | 66.7%     |
| hds        | 4     | 2       | 2     | 1     | 50.0%     |

---

## Staleness Warnings

The following entries have not been refreshed in over 30 days and may contain outdated information.

| Entry                    | Domain   | Status  | Last Refreshed | Days Stale |
|--------------------------|----------|---------|----------------|------------|
| primeng-table-api        | primeng  | current | 2026-02-10     | 43         |
| ag-grid-server-side      | ag-grid  | draft   | 2026-02-15     | 38         |
| angular-signals-guide    | angular  | current | 2026-02-18     | 35         |
| hds-color-tokens         | hds      | draft   | 2026-02-20     | 33         |
| nx-task-pipeline         | nx       | current | 2026-02-21     | 32         |
| primeng-dialog-api       | primeng  | draft   | 2026-02-22     | 31         |
| angular-ssr-hydration    | angular  | draft   | 2026-02-22     | 31         |
| orch-boundary-schema     | orch     | current | 2026-02-23     | 30         |
| angular-control-flow     | angular  | current | 2026-02-23     | 30         |

---

## Recommendations

1. **Refresh primeng-table-api** (43 days stale). PrimeNG v18.2 shipped breaking changes to the Table API since last refresh.
2. **Promote ag-grid-server-side to current.** The draft has been stable for 5 weeks with no reported issues.
3. **Re-fetch angular-signals-guide.** Angular 19.2 added `linkedSignal()` which is not covered in the current entry.
4. **Schedule bulk refresh** for all entries older than 35 days before the next sprint planning.

---

## Freshness Trend

| Week Ending | Current | Total | Freshness |
|-------------|---------|-------|-----------|
| 2026-03-04  | 38      | 55    | 69.1%     |
| 2026-03-11  | 40      | 56    | 71.4%     |
| 2026-03-18  | 41      | 57    | 71.9%     |
| 2026-03-25  | 42      | 58    | 72.4%     |

> Freshness has been gradually improving (+3.3pp over 4 weeks). Target: 85% by end of Q1.
