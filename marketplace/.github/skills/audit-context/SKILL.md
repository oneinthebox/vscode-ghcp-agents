---
name: audit-context
description: "In-session health check. Detect context rot, measure session quality, and generate compact handoff summaries for seamless session continuity."
references:
  - references/orch/audit-record-schema.md
allowed-tools:
  - codebase
---

## Context

Monitors the current session's health in real time. Detects context rot (declining output quality as context window fills), measures adherence and productivity metrics, and generates token-efficient handoff summaries when a fresh session is needed. Designed to be invoked mid-session when quality feels off, or proactively at regular intervals. Also supports cross-session analysis of context health patterns from historical data in `.orch/runs/`.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Context Window Health Metrics

### Average Context Utilization

Calculate how much of the model's context window is consumed per session:

```
context_utilization_pct = (tokens.input / model_context_limit) * 100
```

Model context limits:

| Model              | Context Window | Effective Limit (90% safety) |
|--------------------|---------------|------------------------------|
| gpt-4o             | 128,000       | 115,200                      |
| gpt-4o-mini        | 128,000       | 115,200                      |
| o4-mini            | 200,000       | 180,000                      |
| claude-sonnet-4    | 200,000       | 180,000                      |
| claude-opus-4      | 200,000       | 180,000                      |
| claude-haiku-3.5   | 200,000       | 180,000                      |

Use the **effective limit** (90% of raw context window) as the denominator, since the last 10% often degrades output quality.

### Truncation Events

A truncation event occurs when a session's `tokens.input` exceeds 80% of the model's effective limit. These sessions are at high risk of context rot.

```
truncation_risk = tokens.input >= (effective_limit * 0.80)
truncation_count = count(sessions where truncation_risk == true)
truncation_rate = truncation_count / total_sessions * 100
```

### Context Pressure Zones

| Zone     | Utilization %  | Risk Level | Expected Quality Impact                     |
|----------|---------------|------------|---------------------------------------------|
| Green    | 0-50%         | Low        | Full context available; no degradation       |
| Yellow   | 50-75%        | Medium     | Monitor; complex tasks may lose early context|
| Orange   | 75-90%        | High       | Likely truncation of early instructions      |
| Red      | 90-100%       | Critical   | Active context rot; start fresh session      |

### Session State Compression Analysis

Evaluate how efficiently session state is maintained by measuring:

```
compression_ratio = handoff_summary_tokens / full_session_tokens
```

- **Target compression ratio**: <5% (a 20,000 token session should compress to <1,000 token handoff)
- **Acceptable**: 5-10%
- **Inefficient**: >10% — indicates the handoff contains too much raw content instead of summarized state

### Recommendations for Reducing Context Pressure

Apply these optimizations ranked by impact:

| Optimization                   | Typical Savings | How                                                           |
|-------------------------------|-----------------|---------------------------------------------------------------|
| Skill reference deduplication | 15-25%          | Load skill references once; use IDs in subsequent turns       |
| State compression             | 10-20%          | Replace full file contents with diffs or checksums            |
| Tool output trimming          | 5-15%           | Truncate large tool outputs to relevant sections              |
| Conversation pruning          | 10-30%          | Drop resolved Q&A pairs from context; keep only decisions     |
| Handoff instead of continuing | 40-60%          | Start fresh with compressed handoff when utilization >75%     |

## Inputs

- "Check session health" or "How is this session doing?" — run health check
- "Create a handoff" or "I need to start fresh" — generate compact handoff summary
- "Context report" or "Show context health" — cross-session context health analysis
- Optional: `--verbose` — include detailed metric breakdown
- Optional: `--max-tokens {n}` — handoff summary token budget (default: 300)
- Optional: `--from {date}` — start of date range for cross-session analysis (default: 30 days ago)
- Optional: `--to {date}` — end of date range (default: today)
- Optional: `--agent {name}` — filter to a specific agent

## Steps

### Health Check (Current Session)
1. Read current session state: elapsed time, messages exchanged, tools invoked, tokens consumed so far.
2. Calculate context utilization: `tokens.input / effective_limit * 100`. Map to pressure zone (green/yellow/orange/red).
3. Assess quality indicators:
   a. **Repetition rate**: count duplicate or near-duplicate outputs within the session. Threshold: >10% = warn, >25% = poor.
   b. **Tool failure rate**: `failed_tool_calls / total_tool_calls * 100`. Threshold: >15% = warn, >30% = poor.
   c. **Instruction drift**: compare cosine similarity of recent output embeddings against the agent's instruction preamble. Threshold: similarity <0.70 = high drift.
   d. **Response coherence**: detect contradictions between early and recent responses by checking for conflicting assertions about the same file or decision.
4. Calculate overall health status:
   - **good**: all indicators ok AND utilization in green zone.
   - **fair**: 1 indicator at warn OR utilization in yellow zone.
   - **declining**: 2+ indicators at warn OR utilization in orange zone.
   - **poor**: any indicator at critical OR utilization in red zone.
5. If declining or poor, identify the likely cause and recommend action (compress state, start handoff, or prune conversation).

### Handoff Summary
1. Analyze the session to extract:
   a. **Accomplished**: files modified (with paths), patterns migrated, decisions made, skills invoked.
   b. **Remaining**: tasks mentioned but not completed, in-progress work with specific next steps.
   c. **Key decisions**: choices made during the session that affect future work, with rationale.
   d. **References**: file paths and doc paths used during the session.
   e. **State**: any variables, counters, or iteration state that must persist.
2. Compress into a handoff prompt under `{max-tokens}` tokens.
3. Validate compression ratio: `handoff_tokens / session_tokens < 0.05` (target), warn if >0.10.
4. Format for copy-paste into a new session.

### Cross-Session Context Health Report
1. Read all session records from `.orch/runs/` within the date range.
2. For each session, compute `context_utilization_pct` using the model context limits table.
3. Aggregate:
   a. Mean context utilization per agent.
   b. Truncation event count and rate per agent.
   c. Distribution across pressure zones (green/yellow/orange/red) per agent.
   d. Sessions that ended in `outcome != "success"` correlated with high utilization.
4. Identify agents and skills with chronic context pressure (>50% of sessions in yellow+ zone).
5. Generate optimization recommendations based on the savings table above.

## Output

### Health Check (Current Session)
```markdown
## Session Health

### Status: declining

### Context Utilization
| Metric                 | Value        | Zone     |
|------------------------|-------------|----------|
| Input tokens so far    | 92,400      |          |
| Model context limit    | 128,000     |          |
| Effective limit (90%)  | 115,200     |          |
| Utilization            | 80.2%       | ORANGE   |
| Truncation risk        | YES         |          |

### Quality Indicators
| Indicator          | Value      | Threshold   | Status  |
|--------------------|------------|-------------|---------|
| Duration           | 34 min     | --          | ok      |
| Messages           | 42         | --          | ok      |
| Repetition rate    | 12.3%      | >10% warn   | WARN    |
| Tool failure rate  | 8.5%       | >15% warn   | ok      |
| Instruction drift  | 0.68       | <0.70 high  | WARN    |
| Response coherence | consistent | --          | ok      |

### Recommendation
Context utilization is in the ORANGE zone (80.2%) with instruction drift detected.
**Action:** Create a handoff summary and start a fresh session. Run `/audit-context handoff` to generate.
**Quick wins before handoff:**
- Drop resolved Q&A pairs (est. savings: ~15,000 tokens)
- Trim tool output from file reads (est. savings: ~8,000 tokens)
```

### Handoff Summary
```markdown
## Handoff Summary
**Session:** a3f8-... | **Duration:** 34 min | **Compression:** 280 / 92,400 tokens (0.3%)

### Accomplished
- Created `src/app/fund.service.ts` with FundService class (CRUD + validation)
- Created `src/app/fund.service.spec.ts` with 12 unit tests (all passing)
- Updated `src/app/app.module.ts` to register FundService provider

### Remaining
- [ ] Add error handling for HTTP 429 rate limits in FundService.fetch()
- [ ] Wire FundService into TradeComponent (file: `src/app/trade.component.ts`)
- [ ] Run e2e tests after integration

### Key Decisions
- Used Observable pattern (not Promise) for HTTP calls — consistent with existing services
- Chose `fund` as the route prefix (not `funds`) — matches existing singular convention

### State
- Working branch: `feature/fund-service`
- Last test run: all 12 unit tests passing
- No uncommitted changes

---
> **Handoff prompt** (copy into new session):
> Continue building FundService integration. Done: created `src/app/fund.service.ts` (CRUD+validation), spec file (12 tests passing), registered in app.module. Remaining: add HTTP 429 handling in FundService.fetch(), wire into TradeComponent (`src/app/trade.component.ts`), run e2e. Decisions: Observable pattern for HTTP, singular `fund` route prefix. Branch: `feature/fund-service`, clean working tree.
```

### Cross-Session Context Health Dashboard
```markdown
## Context Health Dashboard — {from} to {to}

### Overview
| Metric                        | Value    |
|-------------------------------|----------|
| Total sessions analyzed       | 415      |
| Avg context utilization       | 42.3%    |
| Truncation events (>80%)      | 28       |
| Truncation rate               | 6.7%     |
| Sessions in red zone          | 8        |
| Corr: red zone + failure      | 75.0% (6/8 failed) |

### Context Utilization by Agent
| Agent       | Sessions | Avg Util % | Green | Yellow | Orange | Red | Truncation Rate |
|-------------|----------|------------|-------|--------|--------|-----|-----------------|
| @angular    | 142      | 48.5%      | 68    | 42     | 24     | 8   | 11.3%           |
| @react      | 98       | 39.2%      | 61    | 28     | 9      | 0   | 2.0%            |
| @dotnet     | 76       | 35.1%      | 58    | 15     | 3      | 0   | 0.0%            |
| @devops     | 99       | 22.8%      | 92    | 7      | 0      | 0   | 0.0%            |

### High-Pressure Skills (>50% of sessions in yellow+ zone)
| Skill                      | Sessions | Avg Util % | Yellow+ Rate | Recommendation                          |
|----------------------------|----------|------------|-------------|-----------------------------------------|
| /angular-migrate-module    | 22       | 72.1%      | 81.8%       | Break into sub-skills; add state checkpoints |
| /angular-generate-service  | 45       | 55.3%      | 53.3%       | Deduplicate reference loading            |
| /react-migrate-hooks       | 15       | 61.0%      | 60.0%       | Trim tool outputs; compress file reads   |

### Optimization Recommendations
| Priority | Agent    | Optimization                      | Est. Savings | Impact             |
|----------|----------|-----------------------------------|-------------|--------------------|
| 1        | @angular | Break /migrate-module into phases | 30-40%      | Eliminate red zone  |
| 2        | @angular | Deduplicate skill references      | 15-25%      | Reduce yellow zone  |
| 3        | @react   | Compress file read outputs        | 10-15%      | Reduce orange zone  |
| 4        | ALL      | Auto-handoff at 75% utilization   | 40-60%      | Prevent context rot |
```

## Validation

- Health status accurately reflects session quality (not always "good")
- Handoff prompt is under the specified token budget (default 300 tokens)
- Compression ratio is calculated as `handoff_tokens / session_total_tokens`
- All accomplished work is accurately listed (no hallucinated progress)
- Remaining items are specific and actionable (not vague)
- Handoff prompt includes enough context to resume without re-reading all files
- Context utilization uses effective limit (90% of model context window), not raw limit
- Pressure zones use consistent thresholds: green (0-50%), yellow (50-75%), orange (75-90%), red (90-100%)
- Truncation event threshold is consistently applied at 80% of effective limit
- Cross-session analysis correlates high utilization with failure rate to demonstrate impact
- Optimization recommendations are ranked by estimated token savings
