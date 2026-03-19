---
description: "Default automation level for all ORCH skills. Controls how much human approval is required during multi-step operations like migrations, batch conversions, and scans."
applyTo: "**"
---

## Automation Mode

### Default: auto=safe

Unless the user explicitly specifies otherwise, use `auto=safe` mode:

1. **Plan**: Show the plan first and wait for approval — **only for write operations** (migrate, generate, refactor, code-comment generate).
2. **Execute**: After approval, run all steps without pausing for individual confirmations.
3. **Pause only for**:
   - Build or test failures
   - Low-confidence decisions (ambiguous API mappings, unknown compatibility)
   - Security-sensitive areas (auth, credentials, environment config)
4. **Never pause for**:
   - Read-only operations (scan, proof, drift, review, status, explain, version-matrix)
   - High-confidence mechanical transforms (standalone, control-flow, inject)
   - File creation (scaffolding, test generation, doc conversion)
   - Verification steps (build, test, lint — just run and report)

### Read-only skills — always run immediately

These skills are read-only and have no risk. **Never** show a plan or ask for approval. Just run and return results:
- `/proof` — codebase scan (all levels, one pass)
- `/drift` — doc-code mismatch detection
- `/review` — code review
- `/packs status` — registry dashboard
- `/version-matrix` — compatibility check
- `/explain` — project walkthrough

### Write skills — plan approval required (auto=safe)

These skills modify files. Show the plan, get one approval, then execute without pausing:
- `/migrate` — code migration
- `/generate` — scaffold new files
- `/refactor` — restructure code
- `/code-comment generate` — add/modify code docs
- `/test` — write test files

### Mode levels

| Level | What it does | Pauses for |
|-------|-------------|-----------|
| `step-by-step` | Pause before every action | Everything |
| `auto=safe` (default) | Plan approval for write ops, then run. Read ops run immediately | Plan approval (write ops only), failures, low-confidence steps |
| `auto=all` | Run everything, only stop on failures | Build/test failures, unresolvable errors |

### User overrides

The user can override per-invocation:
- `step by step` or `--step-by-step` → pause at every action
- `--auto` or `--auto=safe` → plan approval for writes only (default)
- `full auto` or `--auto=all` → only stop on unrecoverable failures

### Per-skill behavior

| Skill | `step-by-step` | `auto=safe` | `auto=all` |
|-------|---------------|-------------|-----------|
| `/proof` | Run full scan, report at end | **Run immediately, no approval** | Same |
| `/drift` | Run full analysis, report | **Run immediately, no approval** | Same |
| `/review` | Show each issue, ask to continue | **Run full review, show report** | Same |
| `/packs status` | Show status | **Run immediately** | Same |
| `/version-matrix` | Show matrix | **Run immediately** | Same |
| `/explain` | Show walkthrough | **Run immediately** | Same |
| `/migrate` | Pause per phase | Pause for plan + failures only | Only stop on build/test failures |
| `/generate` | Show template before creating | Show plan, then create files | Create files silently |
| `/refactor` | Show each change before applying | Show plan, apply all, verify build | Apply all, skip verification |
| `/code-comment generate` | Pause per file | Show plan, generate all | Generate all, best-effort |
| `/test` | Show each test before writing | Show plan, write all tests, run them | Write all, skip run |

### Post-execution summary

After any multi-step execution, always produce a summary:

```
## Execution Summary
- **Completed**: {phases/steps completed}
- **Files changed**: {count}
- **Skipped**: {items skipped, if any, with reasons}
- **Failed**: {items that failed, if any, with details}
- **Needs attention**: {items requiring human review}
```

### Safety mitigations

- **Worktree mode** — `auto` + `--worktree` = safe. If anything breaks, delete worktree. Zero risk to working copy.
- **Checkpoints** — every phase commits + tags. Rollback to any point.
- **Post-run report** — auto mode always produces a detailed execution summary.
