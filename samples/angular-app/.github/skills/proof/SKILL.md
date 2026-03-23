---
name: proof
description: "Deep-scan a codebase to produce architecture documentation — module dependencies, component trees, pattern inventories, inline doc coverage, and git history enrichment. Auto-detects available scan depth (grep, Nx graph, ts-morph semantic) and runs everything in one pass. Use before migrations, upgrades, or when you need to understand a codebase."
metadata:
  author: orch-team
  version: "2.0"
allowed-tools: Bash(git:*) Read
---

## Context

This is the unified codebase scanning skill. It runs a full scan in one pass — no flags, no confirmation, no intermediate pauses. It auto-detects what's available and uses everything.

## Scan Depth (Auto-Detected)

The scan automatically runs every level that the project supports. No flags needed.

| Level | Auto-detect condition | What it adds |
|-------|----------------------|-------------|
| **L1: Grep** | Always (source files exist) | Pattern counts, file inventory, basic architecture |
| **L2: Nx Graph** | `nx.json` exists in project root | Project dependencies, build order, affected projects |
| **L3: Semantic** | `scripts/semantic/adapters/typescript/` exists | Full type resolution, import chains, decorator metadata, migration impact |

If L2 or L3 prerequisites are missing, the scan skips them silently and notes it in the report. No errors, no prompts.

L3 runs `scripts/semantic/adapters/typescript/generate-summary.ts` which produces a semantic summary (~2-4K tokens) from the full LST. The raw LST is never loaded into agent context. If the adapter script is present, **run it** — do not synthesize or approximate L3 output from source reading. The whole point of L3 is that ts-morph resolves types that grep cannot see.

## Capabilities

| Action | When to use |
|--------|------------|
| **Scan** | First time analyzing a codebase, or periodic re-scan |
| **Compare** | After a migration phase, compare before vs after snapshots |

## Inputs

- "Scan the trade-app" → full scan (all available levels, one pass)
- "Compare trade-app pre-migration vs mid-migration" → snapshot comparison
- "Re-scan trade-app, tag as post-migration" → new snapshot

## Steps

### Scan (One Pass — No Pauses)

Run all steps sequentially. Do not pause between levels. Do not ask for confirmation. Produce one consolidated report at the end.

#### L1: Static Analysis
1. Scan file structure: count files by type, identify feature modules, shared code.
2. Detect framework/library versions from `package.json`, `pom.xml`, `pyproject.toml`.
3. Analyze dependencies: module imports, service injection, route structure.
4. Count pattern usage (e.g., standalone vs NgModule, async pipe vs subscribe, signals vs BehaviorSubject).

#### L1: Inline Documentation Inventory
5. Detect which doc formats are present (JSDoc, TSDoc, Compodoc, PyDoc, Javadoc).
6. Count documentation coverage: files with docs vs files without.
7. Assess doc quality: are params documented? Return types? Examples?

#### L1: Git History Analysis
8. Extract per-file/folder: last modified, commit frequency (6mo), contributors, churn.
9. Identify hotspots (high-commit) and dead zones (0 commits in 12+ months).
10. Pattern adoption timeline (when did new patterns start appearing?).

#### L2: Nx Graph (if `nx.json` exists)
11. Run `nx graph --json` to extract project dependency graph.
12. Identify build order, affected projects, shared library dependencies.
13. Map migration ordering: which projects must migrate first.

#### L3: Semantic (if adapter exists)
14. Run `scripts/semantic/adapters/typescript/generate-summary.ts`.
15. Incorporate the output directly — symbol tables, import graphs, exported API surfaces, exact counts.
16. Do NOT approximate or synthesize L3 data. If the script fails, report the error and continue with L1+L2 results.

#### Compile Output
17. Generate module dependency graph (mermaid).
18. Generate pattern inventory table with migration readiness.
19. Generate inline doc coverage table.
20. Generate git insights section.
21. Estimate migration effort per pattern.
22. Write snapshot to `.github/references/scans/{app}/{date}-{tag}/`.

### Compare (scan-diff)
1. Read both snapshot directories.
2. Parse pattern inventories from each.
3. Calculate deltas per pattern.
4. Calculate migration velocity (changes per day).
5. Estimate remaining work and completion date.
6. Output comparison table.

## Output

### Scan — One Consolidated Report
```markdown
## Architecture — {app_name}

### Scan Summary
- Levels completed: L1, L2, L3 (or L1, L2 if no semantic adapter)
- Files scanned: {n}
- Patterns detected: {n}

### Technology Inventory
### Module Dependencies (mermaid)
### Pattern Inventory
### Inline Documentation Coverage
### Nx Project Graph (if L2 ran)
### Semantic Analysis (if L3 ran)
### Git Insights
### Estimated Migration Effort
```

### Compare
```markdown
## Scan Diff — {app_name}
| Metric | Before | After | Delta |
### Remaining Work
### Velocity & Estimated Completion
```

## Drift inclusion

When invoked as `/proof --with-drift {app}`:
1. Run the full scan (all available levels, one pass).
2. Immediately run `/drift` against the scan output and reference docs.
3. Combine both outputs into a single report: architecture + drift analysis.

## Workflow Integration

### Prerequisites
None. `/proof` is typically the first skill in any workflow.

## Behavior

- **No pauses.** This is a read-only scan — there is no risk. Run everything, report everything.
- **No confirmation prompts.** The user asked for a scan, do the scan.
- **No level selection flags.** Auto-detect and run all available levels.
- **No synthesized L3.** If the ts-morph adapter exists, run it. If it doesn't, skip L3 and say so. Never approximate semantic analysis from source reading — that defeats the purpose.
- **One report.** All levels combined into a single consolidated output. No intermediate reports.
- **STOP after the report.** Once the report is written, stop. Do not offer follow-up actions. Do not ask "Would you like me to..." Do not list "Next steps" as questions. The report itself may include a "Related: /drift, /version-matrix" line — that is informational text in the report, not a conversation prompt.

## Validation

- File counts match actual filesystem
- Pattern counts match grep results
- Git data is from actual repository (not hallucinated)
- Mermaid diagrams are syntactically valid
- L3 output comes from actual ts-morph execution (not synthesized)
- Both snapshots exist (for compare)
