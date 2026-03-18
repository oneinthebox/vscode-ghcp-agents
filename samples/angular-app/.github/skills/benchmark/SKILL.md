---
name: benchmark
description: "Validate agent output quality and benchmark models. Runs deterministic checks (build, test, lint) and heuristic checks (adherence, hallucination). Compares models (Claude Sonnet 4, GPT-4.1, o4-mini) across skills to recommend the best model per task. Use after agent operations to verify quality, or periodically to optimize model selection."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

Two capabilities in one skill: validation (is the output good?) and benchmarking (which model is best?).

## Capabilities

| Action | When to use |
|--------|------------|
| **Validate** | After any agent operation — check if output is correct |
| **Benchmark** | Periodically — compare models across skills |

## Inputs

- "Validate the last session" → validate latest session
- "Benchmark models for /migrate" → compare models on migration tasks
- "Which model is best for code review?" → benchmark /review skill
- Optional: session ID for specific validation
- Optional: `--models` to specify which models to compare

## Steps

### Validate
1. Read the session audit record from `.orch/audit/sessions/`.
2. Run deterministic checks:
   - Build passes (appropriate build command for detected domain)
   - Tests pass
   - Lint passes
   - Output files exist
   - Token budget met (for doc conversions)
3. Run heuristic checks:
   - Adherence score from session record
   - Hallucination scan (for doc conversions: terms in output not in source)
   - Information loss (for doc conversions: key sections missing)
   - Test count delta (for migrations: no tests lost)
4. Produce validation report with overall score and recommendation.

### Benchmark
1. Load test suite for the specified skill.
2. For each model:
   - Run the test cases
   - Run validation on each result
   - Record: quality score, wall-clock duration, output length
3. Aggregate per model.
4. Rank by composite score (quality 60%, speed 20%, conciseness 20%).
5. Produce comparison matrix with recommendation.
6. Save results to `.orch/audit/benchmarks/`.

## Output

### Validate
```markdown
## Validation Report — {session_id}

### Deterministic Checks
| Check | Result |
|-------|--------|

### Heuristic Checks
| Check | Result | Details |
|-------|--------|---------|

### Summary
| Overall confidence | {score}% |
| Recommendation | ACCEPT / NEEDS REVIEW / REJECT |
```

### Benchmark
```markdown
## Model Benchmark — {skill}

| Model | Quality | Speed | Adherence | Score |
|-------|---------|-------|-----------|-------|

### Recommendation
| Task type | Best model | Rationale |
|-----------|-----------|-----------|
```

## Validation

- Deterministic checks produce binary results
- Heuristic scores are 0-100
- Benchmark runs each model on identical test cases
