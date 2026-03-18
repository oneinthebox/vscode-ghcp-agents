# Migration Status Deck Template
# Used by /present when --template migration is specified

## Slide mapping

| Source section | Slide type | Notes |
|---------------|-----------|-------|
| # Migration to {target} | title-slide | With status badge (in progress / complete) |
| ## Overview | metrics-slide | KPI cards: phases done/total, files changed, tests passing, adherence |
| ## Phase Timeline | timeline-slide | All phases with ✓/◐/○ status |
| ## Before / After | comparison-slide | Side-by-side pattern counts from scan diff |
| ## Current Phase | content-slide | What's happening now, blockers |
| ## Completed Phases | content-slide | Table with duration, files, build/test status |
| ## Remaining Phases | content-slide | Table with effort estimate, confidence level |
| ## Compatibility Changes | content-slide | Table: library, before version, after version |
| ## Risks & Decisions | content-slide | Bulleted list of blockers + decisions needed |
| ## Velocity | metrics-slide | Changes/day, estimated completion date |

## Data sources

- `.orch/plans/{plan-id}/plan.yaml` — phase list, status, confidence
- `.orch/plans/{plan-id}/status.yaml` — progress tracking
- `.github/references/scans/` — before/after scan snapshots
- Git log for migration branch — commits per phase
