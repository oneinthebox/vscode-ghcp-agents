# Audit Status Deck Template
# Used by /present when --template status is specified

## Slide mapping

| Source section | Slide type | Notes |
|---------------|-----------|-------|
| # ORCH Status — {date range} | title-slide | |
| ## Key Metrics | metrics-slide | KPI cards: sessions, tokens, adherence, active users |
| ## Agent Adoption | content-slide | Table: agent, sessions, users, trend |
| ## Skill Usage | content-slide | Table: skill, invocations, pass rate |
| ## Token Consumption | content-slide | Table: agent, input tokens, output tokens, total |
| ## Compliance | metrics-slide | Violations gauge, adherence gauge |
| ## Behavioral Drift | content-slide | Trend table: agent, this week, last week, delta |
| ## Action Items | content-slide | Prioritized list with severity |

## Data sources

- `.orch/audit/sessions/` — session records
- `.orch/audit/tokens/` — token aggregation
- `.orch/audit/violations.jsonl` — violation log
- `.orch/audit/metrics/` — daily/weekly rollups
