# Context Bloat Prevention for ORCH

## Problem

AI quality degrades as context window fills up. In ORCH workflows, context bloats at three layers:

1. **Reference docs loaded upfront** — SKILL.md + resolver-selected docs = 2,000+ tokens before any work starts
2. **Inherited data from dependency phases** — Phase 10 (explain) inherits collected data from 9 scan phases = 4,500+ tokens of JSON
3. **Within-phase tool call accumulation** — A migration phase editing 50 files accumulates file diffs, build output, and error messages. By file 40, the context is 30K+ tokens

The event-driven relay already gives each AI phase a fresh context via `code chat`. But even within a single phase, context can bloat to the point where the AI loses focus, skips steps, or applies wrong patterns.

## Design Decision

**Quality over token savings.** We never truncate or summarize content that the AI might need. Instead, we defer loading until the AI decides it needs the content, and we split heavy work into smaller batches.

## Solution: Three Layers

### Layer 1: Lazy Loading (Prompt Pointers, Not Content)

The prompt builder writes **file pointers** instead of inlining content.

**Before (current — bloated):**
```markdown
## Reference: Standalone Migration Guide
[2,500 tokens of full guide content inlined here]

## Inputs from Phase 001 (scan-deps)
[500 tokens of JSON dumped here]

## Inputs from Phase 002 (compatibility)
[400 tokens dumped here]
```
~3,400 tokens of static content before any work starts.

**After (lazy — lean):**
```markdown
## References (read when needed)
- Standalone guide: .orch/references/angular/v19/standalone-guide.md
- Best practices: .orch/references/angular/v19/best-practices.md

## Previous phase results (read what's relevant)
- Phase 001 (scan-deps): .orch/workflow-state/events/run-xxx/001.complete.json
- Phase 002 (compatibility): .orch/workflow-state/events/run-xxx/002.complete.json

## Context hints
- ~2K tokens in reference docs. ~1K tokens across dependency data.
- Read the detection output first to know which files to modify.
- You don't need to read all dependency results — focus on what's relevant.
```
~400 tokens. AI loads on demand via tool calls. **Zero quality loss** — the AI gets the full content when it reads the file.

### Layer 2: Phase Decomposition (Heavy Phase Batching)

When a detection script finds more than N files to modify, the publisher splits the phase into sub-phases.

**Flow:**

1. Publisher runs the detection script during event creation
   - e.g., `detect-ngmodules.js` → `{ files: [...], count: 47 }`
2. Reads `context.batch_size` from config (default: 10)
3. If `count > batch_size`: creates N sub-phase events
   - `005a.event.json` — files 1-10, depends_on: [004]
   - `005b.event.json` — files 11-20, depends_on: [005a]
   - `005c.event.json` — files 21-30, depends_on: [005b]
   - `005d.event.json` — files 31-40, depends_on: [005c]
   - `005e.event.json` — files 41-47, depends_on: [005d]
4. If `count <= batch_size`: single phase (no split)

**Sub-phases are sequential** because earlier edits may affect later files (e.g., removing a shared module impacts all components importing it).

**Sub-phase prompt:**
```markdown
## Task: Migrate components to standalone (batch 2 of 5, files 11-20)

Files for this batch:
- src/app/portfolio/portfolio.component.ts
- src/app/portfolio/portfolio.module.ts
... (8 more)

Previous batch: read 005a.complete.json for changes from batch 1.
Reference: read standalone-guide.md if needed.
```

**Quality impact: positive.** Each sub-phase gets the AI's full attention on 10 files, not divided attention across 50. The AI is more accurate on files 41-47 because they're files 1-7 of a fresh context, not files 41-47 of a bloated one.

### Layer 3: Soft Budget Hints (Non-Enforced Guidance)

Every AI phase prompt includes a standard footer with context management guidance:

```markdown
## Context Management
- Prefer targeted file reads (specific line ranges) over reading entire files.
- Read reference docs only when you need them for the current step.
- After completing a sub-task, note key findings rather than re-reading source files.
- Target: keep working context focused. If you notice quality degrading, you may be holding too much context.
```

These are **hints, not hard limits.** The AI can exceed them if needed. They nudge toward efficiency without sacrificing quality.

## Configuration

```yaml
# .orch/config.yaml
context:
  # Maximum files per sub-phase when decomposing heavy phases
  batch_size: 10

  # Prompt style: lazy (file pointers) or inline (current behavior)
  prompt_style: lazy

  # Soft budget hint included in every AI prompt (not enforced)
  soft_budget_tokens: 8000

  # Only show pointers for the last N dependency phases in prompts
  # (older phases rarely needed — AI can still read them via tool calls)
  max_inherited_phases: 5
```

## What Changes

| Component | Change | Effort |
|-----------|--------|--------|
| `prompt-builder.js` | Write file pointers instead of inlined content. Add soft budget footer. | Medium |
| `publish.js` | Run detection scripts during publish. Split phases into sub-events if file count > batch_size. | Medium |
| `config.yaml` | Add `context:` section | Trivial |
| `relay.js` | No changes — sub-phases are regular events | None |
| `event-store.js` | No changes | None |
| `monitor.js` | No changes — counts events regardless of sub-phases | None |
| Detection scripts | Already output file lists — no changes needed | None |

## What Does NOT Change

- Event store schema (events are events, sub-phases are just more events)
- Relay poll loop (dispatches ready events, same logic)
- Monitor (counts phases, doesn't care about batching)
- SKILL.md files (unchanged)
- Detection scripts (already produce the data needed for splitting)
- `code chat` dispatch (same mechanism)

## Why NOT Token Budgets (Approach A)

Token budgets truncate or summarize content to fit a limit. This loses information:

- **Truncation** cuts the end of docs, which often contains edge cases — the hardest and most important content
- **Summarization** removes examples, which are what teach the AI the correct pattern
- **Section selection** skips validation criteria, so the AI doesn't know when it's done correctly

Since our primary concern is **quality over cost**, we reject hard budgets. Lazy loading achieves similar token savings (AI only loads what it needs) without any information loss.

## Token Impact Estimate

**Per AI phase:**

| Layer | Before (inline) | After (lazy + decomposed) |
|-------|-----------------|--------------------------|
| Prompt static content | ~3,400 tokens | ~400 tokens |
| Reference docs loaded | ~2,000 tokens (always) | ~2,000 tokens (on demand, only when needed) |
| Inherited data | ~1,500 tokens (always) | ~500 tokens (only relevant phases read) |
| Tool call accumulation | ~20,000 tokens (50 files) | ~4,000 tokens (10 files per sub-phase) |
| **Total per phase** | **~27,000 tokens** | **~7,000 tokens** |

**Per 10-phase workflow:**

| Metric | Before | After |
|--------|--------|-------|
| Avg context per AI phase | ~27K tokens | ~7K tokens |
| Phases that exceed 15K tokens | 6 of 10 | 0 of 10 (decomposed) |
| Quality degradation risk | High (phases 5+) | Low (each sub-phase is fresh) |
| Total tokens consumed | ~200K | ~100K (50% reduction) |

## Implementation Sequence

1. Add `context:` section to config.yaml
2. Update prompt-builder.js: lazy loading mode (file pointers)
3. Add soft budget footer to prompt template
4. Update publish.js: detection script execution + batch splitting
5. Test with recap workflow (no decomposition needed — all phases are light)
6. Test with migration workflow (standalone phase should split into 5 sub-phases)
7. Test with new-feature workflow (generate phases may split based on feature complexity)
