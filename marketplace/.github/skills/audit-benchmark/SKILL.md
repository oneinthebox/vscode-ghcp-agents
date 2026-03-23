---
name: audit-benchmark
description: "Benchmark agent quality across models and approaches. Compare Claude/GPT/o4-mini on the same task, or ORCH agents vs raw prompts. Side-by-side report with composite scoring."
references: []
---

## Context

Two benchmark modes: `--compare models` runs the same task across multiple LLM models to find the best performer; `--compare approaches` tests ORCH-orchestrated agents against raw prompts to quantify the orchestration value. Cross-product mode (`--compare both`) combines both dimensions. Results are saved to `.orch/audit/benchmarks/` for longitudinal tracking.

## Inputs

- **task**: The skill or prompt to benchmark (e.g., `/review src/app/`, a migration step, a doc conversion)
- **--compare {models|approaches|both}**: benchmark dimension
- Optional: `--models {list}` — models to compare (default: claude-sonnet-4, gpt-4.1, o4-mini)
- Optional: `--runs {n}` — repetitions per configuration for statistical confidence (default: 3)
- Optional: `--output {path}` — save report to specific location

## Steps

### Mode: `--compare models`
1. Define the benchmark task from user input.
2. For each model in the model list:
   a. Run the task {runs} times using the ORCH agent with that model.
   b. Capture: output content, wall-clock duration, token counts, output length.
   c. Run validation checks on each output (deterministic + heuristic).
3. Aggregate per model: mean quality score, mean duration, mean tokens, consistency (std dev).
4. Rank by composite score: quality 60%, speed 20%, conciseness 20%.

### Mode: `--compare approaches`
1. Define the benchmark task from user input.
2. Run with ORCH agent (full orchestration, references, guardrails).
3. Run with raw prompt (same task description, no ORCH context or references).
4. Score both: quality, adherence to standards, completeness, correctness.
5. Calculate the orchestration delta (ORCH score - raw score).

### Mode: `--compare both`
1. Cross-product: each model x each approach.
2. Produce a matrix report.

### Common
6. Save results to `.orch/audit/benchmarks/{date}-{task}.json`.
7. Produce the side-by-side report.

## Output

```markdown
## Benchmark Report — {task}

### Configuration
| Setting     | Value                |
|-------------|----------------------|
| Mode        | {models/approaches/both} |
| Models      | {list}               |
| Runs/config | {n}                  |
| Task        | {description}        |

### Model Comparison (if --compare models or both)
| Model           | Quality | Speed  | Tokens | Consistency | Score |
|-----------------|---------|--------|--------|-------------|-------|
| {model}         | {0-100} | {sec}  | {n}    | {std dev}   | {n}   |

### Approach Comparison (if --compare approaches or both)
| Approach     | Quality | Adherence | Completeness | Score | Delta |
|-------------|---------|-----------|--------------|-------|-------|
| ORCH agent  | {0-100} | {0-100}   | {0-100}      | {n}   | —     |
| Raw prompt  | {0-100} | {0-100}   | {0-100}      | {n}   | {diff}|

### Recommendation
| Dimension  | Winner       | Rationale            |
|------------|-------------|----------------------|
| Best model | {model}      | {why}                |
| ORCH value | +{delta}%    | {what orchestration added} |
```

## Validation

- Each configuration runs the specified number of times (no short-circuiting)
- Composite scoring weights sum to 100%
- Raw prompt approach uses no ORCH context (true baseline)
- Results saved to `.orch/audit/benchmarks/` for future comparison
- Statistical consistency reported (std dev across runs)
