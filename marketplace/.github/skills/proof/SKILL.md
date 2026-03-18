---
name: proof
description: "Deep-scan a codebase to produce architecture documentation — module dependencies, component trees, pattern inventories, inline doc coverage, and git history enrichment. Supports three scan levels: L1 (grep-based, fast), L2 (Nx graph, monorepo-aware), L3 (semantic via ts-morph, full type resolution). Use before migrations, upgrades, or when you need to understand a codebase."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(git:*) Read
---

## Context

This is the unified codebase scanning skill. It combines architecture scanning with snapshot comparison (scan-diff). Use it to understand a codebase before migrating, or to track migration progress by comparing snapshots.

## Scan Levels

| Level | Tool | What it reveals | When to use |
|-------|------|----------------|------------|
| **L1: Grep** (default) | `grep -r` | Pattern counts, file lists, basic inventory | Quick overview, first scan |
| **L2: Nx Graph** | `nx graph --json` | Project dependencies, build order, affected projects | Monorepo analysis, migration ordering |
| **L3: Semantic** | ts-morph / adapter | Full type resolution, import chains, decorator metadata, migration impact analysis | Pre-migration deep analysis, precise planning |

L3 runs `scripts/semantic/adapters/typescript/generate-summary.ts` which produces a semantic summary (~2-4K tokens) from the full LST (millions of nodes). The raw LST is never loaded into agent context.

## Capabilities

| Action | When to use |
|--------|------------|
| **Scan** | First time analyzing a codebase, or periodic re-scan |
| **Scan --deep** | Add Nx graph analysis (L2) |
| **Scan --semantic** | Add full semantic analysis via ts-morph (L3) |
| **Compare** | After a migration phase, compare before vs after snapshots |

## Inputs

- "Scan the trade-app" → full scan
- "Compare trade-app pre-migration vs mid-migration" → snapshot comparison
- "Re-scan trade-app, tag as post-migration" → new snapshot

## Steps

### Scan

#### Static Analysis
1. Scan file structure: count files by type, identify feature modules, shared code.
2. Detect framework/library versions from `package.json`, `pom.xml`, `pyproject.toml`.
3. Analyze dependencies: module imports, service injection, route structure.
4. Count pattern usage (e.g., standalone vs NgModule, async pipe vs subscribe).

#### Inline Documentation Inventory
5. Detect which doc formats are present (JSDoc, TSDoc, Compodoc, PyDoc, Javadoc).
6. Count documentation coverage: files with docs vs files without.
7. Assess doc quality: are params documented? Return types? Examples?
8. Record which format to use for `/packs` conversion.

#### Git History Analysis
9. Extract per-file/folder: last modified, commit frequency (6mo), contributors, churn.
10. Identify hotspots (high-commit) and dead zones (0 commits in 12+ months).
11. Pattern adoption timeline (when did new patterns start appearing?).

#### Compile Output
12. Generate module dependency graph (mermaid).
13. Generate pattern inventory table with migration readiness.
14. Generate inline doc coverage table.
15. Generate git insights section.
16. Estimate migration effort per pattern.
17. Write snapshot to `.github/references/scans/{app}/{date}-{tag}/`.
18. Update `docs-registry.yaml` with snapshot entry.

### Compare (scan-diff)
1. Read both snapshot directories.
2. Parse pattern inventories from each.
3. Calculate deltas per pattern.
4. Calculate migration velocity (changes per day).
5. Estimate remaining work and completion date.
6. Output comparison table.

## Output

### Scan
```markdown
## Architecture — {app_name}
### Technology Inventory
### Module Dependencies (mermaid)
### Pattern Inventory
### Inline Documentation Coverage
### Git Insights
### Estimated Effort
```

### Compare
```markdown
## Scan Diff — {app_name}
| Metric | Before | After | Delta |
### Remaining Work
### Velocity & Estimated Completion
```

## Validation

- File counts match actual filesystem
- Pattern counts match grep results
- Git data is from actual repository (not hallucinated)
- Mermaid diagrams are syntactically valid
- Both snapshots exist (for compare)
