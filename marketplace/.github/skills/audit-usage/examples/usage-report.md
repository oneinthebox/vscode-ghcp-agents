<!-- Example output from /audit-usage — see SKILL.md for usage -->
# Agent Usage Report

**Period:** 2026-03-18 to 2026-03-25
**Generated:** 2026-03-25T14:30:00Z

---

## Summary

| Metric              | Value  |
|---------------------|--------|
| Total Sessions      | 135    |
| Unique Agents       | 4      |
| Overall Success Rate| 91.1%  |
| Avg Duration        | 12.4s  |
| Skills Invoked      | 18     |

---

## Sessions Per Day

| Date       | Sessions | Successes | Failures | Success Rate |
|------------|----------|-----------|----------|--------------|
| 2026-03-18 | 22       | 20        | 2        | 90.9%        |
| 2026-03-19 | 24       | 22        | 2        | 91.7%        |
| 2026-03-20 | 26       | 24        | 2        | 92.3%        |
| 2026-03-21 | 20       | 18        | 2        | 90.0%        |
| 2026-03-22 | 8        | 7         | 1        | 87.5%        |
| 2026-03-23 | 6        | 6         | 0        | 100.0%       |
| 2026-03-24 | 15       | 14        | 1        | 93.3%        |
| 2026-03-25 | 14       | 12        | 2        | 85.7%        |

---

## Skill Frequency Ranking

| Rank | Skill                  | Invocations | Avg Duration | Success Rate |
|------|------------------------|-------------|--------------|--------------|
| 1    | angular-review         | 28          | 8.2s         | 96.4%        |
| 2    | angular-test-unit      | 24          | 14.5s        | 91.7%        |
| 3    | angular-generate-component | 19      | 11.3s        | 94.7%        |
| 4    | angular-docs-generate  | 16          | 6.8s         | 93.8%        |
| 5    | angular-scan-deps      | 12          | 4.1s         | 100.0%       |
| 6    | angular-migrate-signals| 10          | 18.7s        | 80.0%        |
| 7    | angular-explain        | 8           | 9.4s         | 87.5%        |
| 8    | angular-docs-repair    | 7           | 5.2s         | 100.0%       |
| 9    | angular-hds-audit      | 6           | 7.9s         | 83.3%        |
| 10   | angular-scan-arch      | 5           | 3.6s         | 100.0%       |

---

## Success Rate Per Agent

| Agent              | Sessions | Success Rate | Avg Duration | Top Skill              |
|--------------------|----------|--------------|--------------|------------------------|
| angular            | 45       | 93.3%        | 14.2s        | angular-generate-component |
| angular-review     | 22       | 95.5%        | 8.1s         | angular-review         |
| angular-test-unit  | 38       | 86.8%        | 15.8s        | angular-test-unit      |
| angular-planner    | 30       | 90.0%        | 9.6s         | angular-explain        |

---

## Trend Alerts

> Metrics with >20% week-over-week change are flagged below.

| Agent              | Metric          | Previous | Current | Change   | Severity |
|--------------------|-----------------|----------|---------|----------|----------|
| angular-test-unit  | session_volume  | 28       | 38      | +35.7%   | MEDIUM   |
| angular-test-unit  | success_rate    | 92.9%    | 86.8%   | -6.1%    | MEDIUM   |
| angular-planner    | session_volume  | 18       | 30      | +66.7%   | HIGH     |

### Observations

- **angular-test-unit** usage is rising but success rate dropped. Investigate recent failures for timeout or test compilation errors.
- **angular-planner** adoption increased significantly. Likely driven by onboarding of the Settlements team.
- **angular-review** remains the most reliable agent with consistent 95%+ success rate.
