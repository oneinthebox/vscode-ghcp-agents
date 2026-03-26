<!-- Example output from /audit-drift — see SKILL.md for usage -->
# Agent Drift Analysis

**Period:** 2026-03-11 to 2026-03-25 (two-week window)
**Generated:** 2026-03-25T14:30:00Z
**Baseline:** 2026-02-25 to 2026-03-11

---

## Summary

| Metric                 | Baseline | Current | Delta    | Status |
|------------------------|----------|---------|----------|--------|
| Avg Tokens / Session   | 16,200   | 21,400  | +32.1%   | WARN   |
| Overall Success Rate   | 93.5%    | 89.2%   | -4.3 pp  | WARN   |
| Avg Duration           | 10.8s    | 13.1s   | +21.3%   | WARN   |
| Tool Diversity Index   | 0.82     | 0.79    | -0.03    | PASS   |
| Compliance Score       | 0.95     | 0.94    | -0.01    | PASS   |

---

## Per-Agent Drift Metrics

### angular

| Metric            | Baseline | Current | Trend | Severity |
|-------------------|----------|---------|-------|----------|
| Tokens / session  | 18,500   | 24,200  | +30.8% | WARN     |
| Success rate      | 95.0%    | 93.3%   | -1.7 pp | PASS     |
| Avg duration      | 12.4s    | 15.1s   | +21.8% | WARN     |
| Top tool          | readFile (38%) | readFile (41%) | -- | PASS |

**Possible causes:** Increased context window usage due to larger files in the Trade Reconciliation module. Token growth correlates with avg file size increase (1.2K to 1.8K lines).

---

### angular-review

| Metric            | Baseline | Current | Trend | Severity |
|-------------------|----------|---------|-------|----------|
| Tokens / session  | 12,100   | 12,800  | +5.8% | PASS     |
| Success rate      | 96.0%    | 95.5%   | -0.5 pp | PASS     |
| Avg duration      | 7.8s     | 8.1s    | +3.8% | PASS     |
| Top tool          | readFile (52%) | readFile (50%) | -- | PASS |

**Possible causes:** Stable. No significant drift detected.

---

### angular-test-unit

| Metric            | Baseline | Current | Trend | Severity |
|-------------------|----------|---------|-------|----------|
| Tokens / session  | 14,800   | 22,600  | +52.7% | FAIL     |
| Success rate      | 92.9%    | 86.8%   | -6.1 pp | WARN     |
| Avg duration      | 11.2s    | 16.4s   | +46.4% | FAIL     |
| Top tool          | writeFile (45%) | writeFile (38%) | -- | PASS |

**Possible causes:** Recent test failures suggest the agent is retrying test generation when compilation errors occur, inflating both token usage and duration. The Settlements module introduced complex generic types that the agent struggles to mock.

---

### angular-planner

| Metric            | Baseline | Current | Trend | Severity |
|-------------------|----------|---------|-------|----------|
| Tokens / session  | 10,200   | 11,400  | +11.8% | PASS     |
| Success rate      | 88.9%    | 90.0%   | +1.1 pp | PASS     |
| Avg duration      | 8.6s     | 9.6s    | +11.6% | PASS     |
| Top tool          | readFile (60%) | readFile (58%) | -- | PASS |

**Possible causes:** Slight increase aligned with new team adoption. No drift concern.

---

## Tool Distribution Shift

| Tool       | Baseline Share | Current Share | Delta   |
|------------|----------------|---------------|---------|
| readFile   | 42%            | 40%           | -2 pp   |
| writeFile  | 28%            | 26%           | -2 pp   |
| search     | 15%            | 18%           | +3 pp   |
| terminal   | 10%            | 12%           | +2 pp   |
| browser    | 5%             | 4%            | -1 pp   |

> Tool distribution shift is within normal bounds (no single tool > 5pp change).

---

## Severity Classification

| Level  | Criteria                               | Agents Affected       |
|--------|----------------------------------------|-----------------------|
| FAIL   | Any metric > 40% drift                 | angular-test-unit     |
| WARN   | Any metric 20-40% drift or success < 90% | angular            |
| PASS   | All metrics within 20% of baseline     | angular-review, angular-planner |

---

## Recommendations

1. **angular-test-unit:** Add pre-validation for complex generic types before generating mocks. Consider a simpler mock strategy for the Settlements module.
2. **angular:** Monitor token growth. If it exceeds 25K avg/session next week, investigate whether file splitting or context pruning would help.
3. **General:** Re-baseline metrics after the Settlements module stabilizes to avoid persistent false drift alerts.
