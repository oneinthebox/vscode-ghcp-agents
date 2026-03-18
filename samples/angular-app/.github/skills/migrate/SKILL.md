---
name: migrate
description: "Upgrade and migrate code — Angular version upgrades (17→18→19), pattern migrations (NgModule→standalone, *ngIf→@if, Karma→Jest, Cypress→Playwright), library upgrades (PrimeNG, AG Grid), and dependency updates. Reads compatibility matrix to plan the full upgrade path including all dependent version changes. Use when upgrading, migrating patterns, or switching libraries."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(ng:*) Bash(nx:*) Bash(npx:*) Bash(git:*) Read Edit
---

## Domain Detection

Same as /generate — detect from active agent, project files, or file context.

## Steps

1. Detect domain and current project state.
2. Check for overrides: `.github/skill-overrides/migrate/overrides.yaml`
3. Read compatibility matrix: `.github/references/compatibility-matrix-guide.md`
4. Read project's `package.json` / `pom.xml` / `pyproject.toml` for current versions.
5. Determine migration scope:
   - **Version upgrade**: user wants Angular 17→19. Check matrix for all dependent changes.
   - **Pattern migration**: user wants standalone/signals/etc. Check which patterns apply.
   - **Library upgrade**: user wants PrimeNG 16→18. Check Angular compatibility.
6. Plan upgrade order (from [references/{domain}/version-upgrade.md](references/)).
7. Run detection script: [scripts/{domain}/detect-version.sh](scripts/) + [scripts/{domain}/count-patterns.sh](scripts/)
8. Execute migrations in order, after each step:
   - Run build to verify
   - Run tests to verify
   - Run [scripts/{domain}/verify-migration.sh](scripts/)
9. Report results.

## Migration types (Angular)

| Migration | Reference | Transform tool | Agent edits? |
|-----------|-----------|---------------|-------------|
| Version upgrade | [references/angular/version-upgrade.md](references/angular/version-upgrade.md) | `ng update` CLI | No — CLI handles it |
| Standalone | [references/angular/standalone.md](references/angular/standalone.md) | `ts-morph` via [scripts/semantic/adapters/typescript/transform.ts](../../../../scripts/semantic/adapters/typescript/transform.ts) `standalone` | No — ts-morph resolves imports precisely |
| Control flow | [references/angular/control-flow.md](references/angular/control-flow.md) | `ng generate @angular/core:control-flow-migration` | No — Angular CLI schematic |
| Signals | [references/angular/signals.md](references/angular/signals.md) | `ts-morph` via transform.ts `signals` | No — ts-morph handles decorator→signal conversion |
| inject() | [references/angular/inject.md](references/angular/inject.md) | `ts-morph` via transform.ts `inject` | No — ts-morph resolves types precisely |
| Jest | [references/angular/jest.md](references/angular/jest.md) | Agent + scripts | Partially — config is template-based, test conversion needs agent |
| Playwright | [references/angular/playwright.md](references/angular/playwright.md) | Agent + scripts | Yes — e2e tests need semantic understanding |
| RxJS | [references/angular/rxjs.md](references/angular/rxjs.md) | Agent | Yes — operator replacement needs context |

### How ts-morph transforms work

The agent PLANS. ts-morph EXECUTES.

```
Agent reads semantic summary (from /proof --semantic)
  → plans which files need which transforms
  → delegates to @migrate-worker
    → worker runs: npx ts-node scripts/semantic/adapters/typescript/transform.ts <type> <scope>
    → ts-morph: precise, type-aware, formatting-preserving transform
    → build + test to verify
    → returns summary to agent
```

Unlike agent-based file editing (which can miss imports, break formatting, or hallucinate types), ts-morph transforms are:
- **Type-resolved** — knows exactly which imports each component needs
- **Formatting-preserving** — output matches the project's code style
- **Complete** — handles edge cases (generics, decorators, cross-file refs)

Before/after examples: [examples/angular/](examples/angular/)

## Git strategy

### Pre-flight checks (MANDATORY before any migration)

```
1. Check for uncommitted changes:
   git status --porcelain
   → If dirty: STOP. "You have uncommitted changes. Commit or stash before migrating."

2. Check current branch:
   git branch --show-current
   → Record as return-branch (to come back to after migration)

3. Check for existing migration branch:
   git branch --list 'migrate/*'
   → If exists: "Found existing migration branch. Resume with --resume or delete it."
```

### Two modes: branch-only vs worktree

| Mode | When to use | Command |
|------|------------|---------|
| **Branch-only** (default) | Small migrations (1-3 phases), low risk | `@angular /migrate` |
| **Worktree** (isolated) | Large migrations (5+ phases), risky upgrades, want to keep working in main | `@angular /migrate --worktree` |

### Mode 1: Branch-only (default)

```
git checkout -b migrate/{target}-{date}

Phase 1 → execute → verify (build + test) →
  git add -A
  git commit -m "migrate: phase 1 — {description}"
  git tag migrate/checkpoint-{phase-name}

Phase 2 → execute → verify →
  git add -A
  git commit -m "migrate: phase 2 — {description}"
  git tag migrate/checkpoint-{phase-name}

... (repeat for each phase)

Done → "Migration complete. Push and create PR:
  git push -u origin migrate/{target}-{date}
  gh pr create --title 'Migrate to {target}'"
```

### Mode 2: Worktree (isolated)

Developer's main working copy stays untouched. Migration happens in a separate directory.

```
# Create isolated worktree
git worktree add ../migrate-{target} -b migrate/{target}-{date}
cd ../migrate-{target}

# All migration work happens here
Phase 1 → commit + tag (same as branch-only)
Phase 2 → commit + tag
...

# Developer can still work in original directory:
#   original/  → main branch, untouched
#   migrate-{target}/  → migration in progress

# On completion:
cd ../original
"Migration complete in ../migrate-{target}/
 Push and create PR:
   cd ../migrate-{target}
   git push -u origin migrate/{target}-{date}
   gh pr create

 After merge, clean up:
   git worktree remove ../migrate-{target}"

# On failure/abandonment:
"Migration abandoned.
 Clean up:
   git worktree remove --force ../migrate-{target}
   git branch -D migrate/{target}-{date}
 No impact on your main working copy."
```

### Checkpoint management

Each phase creates a checkpoint (commit + tag). This enables:

| Action | Command | When |
|--------|---------|------|
| **View checkpoints** | `git tag --list 'migrate/checkpoint-*'` | See progress |
| **Rollback to last good** | `git reset --hard migrate/checkpoint-{phase}` | Phase failed, want to retry |
| **Rollback everything** | `git checkout {return-branch}` + `git branch -D migrate/{target}` | Abandon migration |
| **Compare before/after** | `git diff migrate/checkpoint-{phase-1}..migrate/checkpoint-{phase-2}` | Review what a phase changed |
| **Cherry-pick a phase** | `git cherry-pick migrate/checkpoint-{phase}` | Apply one phase to another branch |

### Commit message convention

```
migrate: phase {N} — {description}

Type: {version-upgrade|standalone|control-flow|signals|inject|jest|playwright|rxjs|library-upgrade}
Scope: {files affected count}
Tool: {ng update|ts-morph|angular CLI schematic|agent}
Build: {pass|fail}
Tests: {pass count}/{total count}
```

Example:
```
migrate: phase 3 — standalone component migration

Type: standalone
Scope: 33 components across 4 modules
Tool: ts-morph transform.ts standalone
Build: pass
Tests: 247/247 pass
Modules removed: TradeModule, PortfolioModule, ReportingModule, SharedModule
```

### Failure handling

```
Phase N fails (build or tests fail):
│
├─ Auto-fixable? (e.g., import missing, test assertion needs update)
│   → @migrate-worker attempts fix
│   → Re-run build + tests
│   → If passes: continue
│   → If still fails: escalate to human
│
├─ Not auto-fixable?
│   → STOP phase execution
│   → Report failure details to user
│   → Options:
│     a) "Fix it for me" → agent attempts with full context
│     b) "Show me the errors" → agent shows build/test output
│     c) "Rollback this phase" → git reset --hard migrate/checkpoint-{previous}
│     d) "Abandon migration" → checkout return-branch, delete migration branch
│
└─ In worktree mode, failure is safe:
    → Original working copy untouched
    → Can inspect the broken state without risk
    → Delete worktree to start fresh
```

### Nx monorepo strategy

For Nx workspaces with multiple apps:

```
Option A: Migrate all apps together (default)
  → Single branch, phases apply to entire workspace
  → Best when apps share libs and must stay in sync

Option B: Migrate per app (--scope app-name)
  → Separate branch per app: migrate/{app}-{target}-{date}
  → Best when apps can be independent (no shared lib version conflicts)
  → Each app gets its own PR

Detection:
  Read nx.json → count apps
  If 1 app → Option A (no choice needed)
  If 2+ apps → Ask user: "Migrate all apps together or one at a time?"
```

### Final PR creation

After all phases complete:

```
"Migration complete! Summary:
  Branch: migrate/{target}-{date}
  Phases: {N} completed
  Files changed: {count}
  Tests: {pass}/{total} passing
  Checkpoints: {N} tags

  Next steps:
  1. Review changes: git log --oneline migrate/{target}-{date}
  2. Push: git push -u origin migrate/{target}-{date}
  3. Create PR: gh pr create --title 'Migrate to {target}' --body '...'

  The PR body will include:
  - Phase-by-phase summary
  - Before/after pattern counts
  - Compatibility matrix verification
  - Test results
  - Any manual fixes that were needed"
```

### Auto mode
Phases have confidence levels:
- **High** (mechanical transforms): standalone, control-flow, inject → can auto-run with `--auto=safe`
- **Medium** (CLI-driven): version upgrade via ng update → pause for approval by default
- **Low** (semantic changes): signals, library upgrades → always pause for approval

Auto mode + worktree is the safest combination for large migrations:
```
@angular /migrate upgrade to Angular 21 --worktree --auto=safe
→ Creates isolated worktree
→ Auto-runs high-confidence phases
→ Pauses for medium/low confidence
→ Original working copy untouched throughout
```

### Persisted plan
Migration plans are saved to `.orch/plans/` for reuse:
```
.orch/plans/migrate-angular-21/
├── plan.yaml          # phases, confidence, status, git info
├── status.yaml        # progress tracking
├── decisions.md       # human decisions during migration
└── learnings.md       # post-migration feedback
```

`plan.yaml` tracks git state:
```yaml
git:
  mode: worktree          # or branch-only
  branch: migrate/angular-21-20260318
  worktree_path: ../migrate-angular-21   # if worktree mode
  return_branch: develop
  checkpoints:
    - tag: migrate/checkpoint-typescript
      phase: 1
      commit: abc1234
    - tag: migrate/checkpoint-angular-19
      phase: 2
      commit: def5678
```

## Validation

- Build passes after every migration step
- Test count: same or higher after migration (no lost tests)
- Pattern count: old patterns decrease, new patterns increase
- Compatibility matrix: all versions are compatible after upgrade
- ts-morph transforms: exit code 0, formatting preserved
