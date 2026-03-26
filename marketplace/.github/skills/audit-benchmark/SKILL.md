---
name: audit-benchmark
description: "Benchmark agent quality across models and approaches. Compare Claude/GPT/o4-mini on the same task, or ORCH agents vs raw prompts. Side-by-side report with composite scoring."
references:
  - references/orch/audit-record-schema.md
allowed-tools:
  - codebase
  - terminal
---

## Context

Two benchmark modes: `--compare models` runs the same task across multiple LLM models to find the best performer; `--compare approaches` tests ORCH-orchestrated agents against raw prompts to quantify the orchestration value. Cross-product mode (`--compare both`) combines both dimensions. Results are saved to `.orch/audit/benchmarks/` for longitudinal tracking.

Prerequisites: Requires `.orch/runs/` directory with session data. This directory is created automatically by ORCH audit hooks during agent sessions.

## Scoring Methodology

### Model Comparison Scoring

Each benchmark run is scored on four dimensions. The composite score is a weighted combination:

```
composite = (correctness * 0.40) + (token_efficiency * 0.25) + (speed * 0.20) + (adherence * 0.15)
```

| Dimension         | Weight | How Measured                                                                 | Scale  |
|-------------------|--------|-----------------------------------------------------------------------------|--------|
| Correctness       | 40%    | Deterministic validation checks pass rate + heuristic output review          | 0-100  |
| Token Efficiency  | 25%    | Inverse of tokens used, normalized: `100 * (1 - (tokens - min) / (max - min))` | 0-100  |
| Speed             | 20%    | Inverse of wall-clock time, normalized: `100 * (1 - (time - min) / (max - min))` | 0-100  |
| Adherence         | 15%    | Adherence score from session record (`adherence.score * 100`)                | 0-100  |

Normalization is relative to the benchmark cohort (min/max across all variants in this benchmark run).

### Approach Comparison Scoring

When comparing ORCH-orchestrated runs vs raw prompts:

| Dimension       | Weight | ORCH Measurement                                    | Raw Measurement                          |
|-----------------|--------|-----------------------------------------------------|------------------------------------------|
| Quality         | 35%    | Validation pass rate                                | Validation pass rate                     |
| Adherence       | 25%    | Adherence score from session record                 | Manual adherence check (no guardrails)   |
| Completeness    | 25%    | All required files created + tests passing          | Same check applied                       |
| Correctness     | 15%    | Output matches expected patterns / golden reference | Same check applied                       |

```
orchestration_delta = orch_composite - raw_composite
```

A positive delta quantifies the value ORCH orchestration adds.

### Statistical Significance

- **Minimum samples**: 10 runs per variant for reportable results. Fewer than 10 produces a "preliminary" tag.
- **Confidence reporting**: report mean, standard deviation, and 95% confidence interval for each metric.
- **Confidence interval**: `mean +/- 1.96 * (std_dev / sqrt(n))`
- **Significant difference**: two variants are "significantly different" when their 95% confidence intervals do not overlap.
- With the default `--runs 3`, results are tagged as "preliminary (3 runs)" — increase to 10+ for publication-quality benchmarks.

### Percentile Rankings

For each metric, calculate the percentile rank of each model/approach within the benchmark:

```
percentile_rank = (count of scores below this score) / (total scores - 1) * 100
```

Report as P25, P50 (median), P75, P95 for multi-run distributions.

## Inputs

- **task**: The skill or prompt to benchmark (e.g., `/review src/app/`, a migration step, a doc conversion)
- **--compare {models|approaches|both}**: benchmark dimension
- Optional: `--models {list}` — models to compare (default: claude-sonnet-4, gpt-4o, o4-mini)
- Optional: `--runs {n}` — repetitions per configuration for statistical confidence (default: 3, recommended: 10+)
- Optional: `--output {path}` — save report to specific location

## Steps

### Mode: `--compare models`
1. Define the benchmark task from user input.
2. For each model in the model list:
   a. Run the task `{runs}` times using the ORCH agent with that model.
   b. Capture per run: output content, wall-clock duration (`duration_ms`), token counts (`tokens.input`, `tokens.output`, `tokens.total`), output length, `adherence.score`, `outcome`.
   c. Run validation checks on each output (deterministic checks: file exists, compiles, tests pass; heuristic checks: output structure, naming conventions).
3. Aggregate per model: mean and std dev for each dimension. Compute composite score using weights above.
4. Normalize speed and token efficiency scores relative to the cohort min/max.
5. Rank models by composite score. Calculate percentile ranks.

### Mode: `--compare approaches`
1. Define the benchmark task from user input.
2. Run with ORCH agent (full orchestration, references, guardrails) for `{runs}` iterations.
3. Run with raw prompt (same task description, no ORCH context, no references, no guardrails) for `{runs}` iterations.
4. Score both approaches on: quality, adherence, completeness, correctness using the approach scoring table above.
5. Calculate the orchestration delta: `orch_composite - raw_composite`.
6. Determine if the delta is statistically significant (non-overlapping confidence intervals).

### Mode: `--compare both`
1. Cross-product: each model x each approach.
2. Run `{runs}` iterations per cell.
3. Produce a matrix report with composite scores per cell.

### Common
6. Save results to `.orch/audit/benchmarks/{date}-{task}.json`.
7. If prior benchmark results exist for the same task, load and include longitudinal comparison.
8. Produce the side-by-side report.

## Output

```markdown
## Benchmark Report — {task}

### Configuration
| Setting        | Value                                    |
|----------------|------------------------------------------|
| Mode           | models                                   |
| Models         | claude-sonnet-4, gpt-4o, o4-mini         |
| Runs/config    | 10                                       |
| Task           | /angular-generate-service for TradeService|
| Stat threshold | 95% confidence (1.96 sigma)              |

### Model Comparison
| Model           | Correct (40%) | Efficiency (25%) | Speed (20%) | Adherence (15%) | Composite | Rank |
|-----------------|---------------|------------------|-------------|-----------------|-----------|------|
| gpt-4o          | 92.0 +/-2.1   | 71.5 +/-4.3      | 85.0 +/-3.2 | 95.0 +/-1.1     | 86.1      | 1    |
| claude-sonnet-4 | 94.5 +/-1.8   | 65.2 +/-5.1      | 72.0 +/-4.5 | 97.0 +/-0.8     | 84.3      | 2    |
| o4-mini         | 78.0 +/-3.5   | 95.0 +/-2.0      | 92.0 +/-2.8 | 88.0 +/-2.5     | 86.0      | 3    |

### Percentile Distribution
| Model           | Correctness     | Efficiency      | Speed           | Adherence       |
|-----------------|-----------------|-----------------|-----------------|-----------------|
|                 | P25/P50/P75/P95 | P25/P50/P75/P95 | P25/P50/P75/P95 | P25/P50/P75/P95 |
| gpt-4o          | 89/92/94/96     | 67/72/75/80     | 82/85/88/91     | 94/95/96/97     |
| claude-sonnet-4 | 92/95/96/98     | 60/65/69/74     | 68/72/76/80     | 96/97/98/99     |
| o4-mini         | 74/78/81/85     | 92/95/97/99     | 89/92/94/97     | 86/88/90/93     |

### Raw Data Summary
| Model           | Avg Tokens | Avg Duration (s) | Success Rate | Avg Output Len |
|-----------------|------------|-------------------|-------------|----------------|
| gpt-4o          | 20,500     | 38.2              | 92%         | 2,450 chars    |
| claude-sonnet-4 | 24,800     | 45.1              | 95%         | 3,100 chars    |
| o4-mini         | 8,200      | 22.5              | 78%         | 1,800 chars    |

### Approach Comparison (if applicable)
| Approach     | Quality (35%) | Adherence (25%) | Completeness (25%) | Correctness (15%) | Composite | Delta     |
|-------------|---------------|-----------------|--------------------|--------------------|-----------|-----------|
| ORCH agent  | 93.0 +/-1.5   | 96.0 +/-1.0     | 91.0 +/-2.2        | 94.0 +/-1.8        | 93.5      | --        |
| Raw prompt  | 74.0 +/-4.2   | 62.0 +/-6.5     | 68.0 +/-5.8        | 71.0 +/-5.0        | 69.3      | -24.2     |

**Orchestration delta: +24.2 points** (statistically significant; CIs do not overlap).

### Recommendation
| Dimension       | Winner           | Rationale                                                    |
|-----------------|-----------------|--------------------------------------------------------------|
| Best overall    | gpt-4o           | Highest composite (86.1); strong balance of speed + quality  |
| Best quality    | claude-sonnet-4  | Highest correctness (94.5) and adherence (97.0)             |
| Best efficiency | o4-mini          | 60% fewer tokens; suitable for high-volume low-complexity    |
| ORCH value      | +24.2 points     | Orchestration adds guardrails, references, structured output |

### Statistical Notes
- Results based on {n} runs per variant
- {n < 10 ? "PRELIMINARY: fewer than 10 runs — increase --runs for publication-quality results" : "Meets minimum sample size for reportable results"}
- 95% confidence intervals shown as +/- values
- Variants with overlapping CIs are NOT significantly different
```

## Validation

- Each configuration runs the specified number of times (no short-circuiting)
- Composite scoring weights sum to 100% (model: 0.40+0.25+0.20+0.15=1.0; approach: 0.35+0.25+0.25+0.15=1.0)
- Raw prompt approach uses no ORCH context (true baseline)
- Results saved to `.orch/audit/benchmarks/` for future comparison
- Statistical consistency reported (std dev and 95% CI across runs)
- Minimum 10 samples per variant for "reportable" status; fewer is tagged "preliminary"
- Percentile ranks calculated only when n >= 4 runs
- Normalization uses cohort min/max (not absolute scale) for speed and efficiency
- Confidence intervals use 1.96 * std_dev / sqrt(n) for 95% level
