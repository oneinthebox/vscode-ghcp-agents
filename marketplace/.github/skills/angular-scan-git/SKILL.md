---
name: angular-scan-git
description: "Scan git history: changelog, release notes, commit patterns, contributors, and branch strategy"
references: []
allowed-tools:
  - codebase
  - terminal
---

## Context

Reads git history to produce a comprehensive project evolution report. Covers commit patterns, contributor activity, release cadence, hotspots, and branching strategy. This is a read-only planner skill — it reads git data but never modifies the repository.

## Inputs

- "Scan git history" — full git analysis
- "Who are the active contributors?" — contributor activity report
- "Show release history" — tags, releases, and cadence analysis
- "Find hotspots" — high-churn files and areas of frequent change

### Helper Script

Run the analytics script before executing steps manually:
```bash
node scripts/git-analytics.js [project-root]
```
The script outputs JSON to stdout with totalCommits, contributors, hotspots, busFactor, and commitTypes. Use this data to inform the steps below.

## Steps

1. **Extract commit history summary** — run the following git commands:
   - Total commits: `git rev-list --count HEAD`
   - Date range: `git log --reverse --format='%ai' | head -1` (first commit) and `git log -1 --format='%ai'` (latest commit).
   - Commit frequency: `git log --format='%aI' --since='6 months ago' | cut -c1-7 | sort | uniq -c` to get commits per month.
   - Commit message convention analysis: `git log --format='%s' -100` — check if messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`). Calculate the percentage that match the pattern `^(feat|fix|chore|docs|refactor|test|ci|style|perf|build)(\(.+\))?!?:`.

2. **Analyze contributor activity** — run:
   - All-time: `git shortlog -sn --no-merges` — lists contributors by commit count.
   - Recent (6 months): `git shortlog -sn --no-merges --since='6 months ago'`
   - **Bus factor calculation**: from the recent shortlog, accumulate commit percentages from top contributors until reaching 80% of total recent commits. The number of contributors needed is the bus factor.
     ```
     Example: 3 contributors did 120 of 150 recent commits (80%) → bus factor = 3
     ```
   - Per-contributor areas: for each top contributor, run `git log --author="Name" --name-only --since='6 months ago' --format=''` and group by directory to identify their primary areas.

3. **Map release history** — run:
   - `git tag --list --sort=-version:refname` to get all tags sorted by version.
   - For each tag, get date: `git log -1 --format='%ai' <tag>`
   - Commits between tags: `git rev-list --count <prev-tag>..<tag>` to calculate release size.
   - If `CHANGELOG.md` exists, read the last 5 release sections to summarize what changed.
   - Calculate release cadence: average days between consecutive tags over the last 10 releases.

4. **Identify hotspots and dead zones** using a weighted scoring algorithm:
   - Get file change frequency (last 6 months): `git log --name-only --format='' --since='6 months ago' | sort | uniq -c | sort -rn | head -20`
   - **Hotspot score formula** (per file):
     ```
     hotspot_score = frequency * recency_weight * complexity_weight

     where:
       frequency       = number of commits touching this file in 6 months
       recency_weight  = 1.0 if changed in last 30 days, 0.7 if 30-90 days, 0.4 if 90-180 days
       complexity_weight = lines_in_file / 100 (capped at 3.0)
     ```
   - Recency of last change: `git log -1 --format='%ar' -- <file>` for each top file.
   - File size: `wc -l <file>` for complexity weight.
   - **Dead zones**: `git log --name-only --format='' --diff-filter=M --until='12 months ago'` — then subtract files that were changed more recently. Files only appearing in the old set are dead zones.
   - Directory-level aggregation: group file-level hotspot scores by parent directory to identify the hottest feature areas.

5. **Analyze branch strategy** — run:
   - `git branch -a --format='%(refname:short) %(committerdate:relative)'` — list all branches with last commit age.
   - Count branches by naming pattern:
     - `feature/*` or `feat/*` — feature branches
     - `bugfix/*` or `fix/*` — bug fix branches
     - `release/*` — release branches
     - `hotfix/*` — hotfix branches
     - `develop` / `main` / `master` — integration branches
   - **Merge style detection**: `git log --merges --oneline -20` — check merge commit messages:
     - "Merge pull request" → merge commits (GitHub default)
     - "Squash" or single-line messages with PR number → squash merges
     - Absence of merge commits → rebase workflow
   - Stale branch detection: branches with no commits in 3+ months.

6. **Extract recent activity** — run:
   - Last 10 commits: `git log --oneline --stat -10` — for each commit, show files changed, insertions, deletions.
   - Recent merge activity: `git log --merges --oneline -5` — show recent PR merges.
   - Active work: `git log --since='7 days ago' --format='%h %s (%an, %ar)'` — commits from the last week.

7. **Generate commit frequency visualization data** — produce a text-based chart:
   ```
   Commits per month (last 12 months):
   2025-03  ████████████████████  42
   2025-02  ████████████████      35
   2025-01  ██████████████████    38
   2024-12  ████████              18
   2024-11  ██████████████        30
   2024-10  ████████████████████  41
   ...
   ```

8. **Produce the output report** with all tables, charts, and metrics.

## Output

```markdown
## Git Scan — {project_name}

### Summary
| Metric | Value |
|--------|-------|
| Total commits | 1,247 |
| Date range | 2023-06-15 to 2026-03-24 (2 years, 9 months) |
| Contributors (all-time) | 12 |
| Contributors (6 months) | 5 |
| Releases/tags | 23 (v1.0.0 — v2.4.1) |
| Bus factor | 2 (top 2 contributors own 82% of recent commits) |
| Commit convention adherence | 87% Conventional Commits |
| Average release cadence | 18 days |

### Commit Frequency (last 12 months)
```
2026-03  ████████████████████  42
2026-02  ████████████████      35
2026-01  ██████████████████    38
2025-12  ████████              18  (holiday period)
2025-11  ██████████████        30
2025-10  ████████████████████  41
2025-09  ██████████████████    37
2025-08  ████████████          26
2025-07  ████████              17  (holiday period)
2025-06  ██████████████████    36
2025-05  ████████████████████  40
2025-04  ██████████████████    38
```

### Commit Patterns
| Convention | Example | Count (last 100) | % |
|-----------|---------|-------------------|---|
| `feat:` | `feat(dashboard): add export button` | 34 | 34% |
| `fix:` | `fix(auth): handle token refresh race condition` | 28 | 28% |
| `chore:` | `chore(deps): update Angular to 19.1` | 15 | 15% |
| `refactor:` | `refactor(orders): migrate to signals` | 10 | 10% |
| `test:` | `test(reports): add integration tests` | 5 | 5% |
| `docs:` | `docs: update README setup instructions` | 3 | 3% |
| `ci:` | `ci: add Nx affected to PR workflow` | 2 | 2% |
| Non-conventional | `Update dependencies` | 3 | 3% |

### Active Contributors (last 6 months)
| Contributor | Commits | % of Total | Primary Areas |
|------------|---------|-----------|---------------|
| Alice Chen | 68 | 45% | `feature-dashboard/`, `core/services/`, `shared-ui/` |
| Bob Martinez | 55 | 37% | `feature-reports/`, `feature-admin/`, `core/models/` |
| Carol Kim | 15 | 10% | `feature-settings/`, `shared-ui/` |
| Dave Wilson | 8 | 5% | `e2e/`, CI/CD configs |
| Eve Johnson | 4 | 3% | `docs/`, `README.md` |

### Release History (last 10 releases)
| Version | Date | Days Since Previous | Commits | Highlights |
|---------|------|--------------------|---------|-----------|
| v2.4.1 | 2026-03-18 | 12 | 8 | Hotfix: auth token refresh |
| v2.4.0 | 2026-03-06 | 20 | 24 | Feature: report export |
| v2.3.0 | 2026-02-14 | 15 | 18 | Feature: dashboard charts |
| v2.2.1 | 2026-01-30 | 8 | 5 | Fix: settings save issue |
| v2.2.0 | 2026-01-22 | 22 | 28 | Feature: admin panel |
| v2.1.0 | 2025-12-31 | 25 | 14 | Feature: dark mode |
| v2.0.0 | 2025-12-06 | 30 | 42 | Breaking: Angular 19 migration |
| v1.9.0 | 2025-11-06 | 18 | 20 | Feature: advanced filters |
| v1.8.0 | 2025-10-19 | 14 | 16 | Feature: notifications |
| v1.7.0 | 2025-10-05 | 21 | 22 | Feature: user preferences |

### Hotspots (most changed files, last 6 months)
| Rank | File | Commits | Contributors | Last Changed | Hotspot Score |
|------|------|---------|-------------|-------------|---------------|
| 1 | `src/app/features/dashboard/dashboard.component.ts` | 28 | 3 | 2 days ago | 28.0 |
| 2 | `src/app/core/services/order.service.ts` | 22 | 2 | 5 days ago | 22.0 |
| 3 | `src/app/features/reports/report-builder.component.ts` | 19 | 2 | 1 week ago | 19.0 |
| 4 | `src/app/shared/ui/data-table/data-table.component.ts` | 16 | 3 | 3 days ago | 16.0 |
| 5 | `src/app/core/services/auth.service.ts` | 14 | 2 | 2 weeks ago | 9.8 |
| 6 | `src/app/features/admin/user-management.component.ts` | 12 | 2 | 1 month ago | 8.4 |
| 7 | `src/app/core/interceptors/auth.interceptor.ts` | 11 | 1 | 3 weeks ago | 7.7 |
| 8 | `src/app/features/settings/profile-form.component.ts` | 10 | 2 | 2 months ago | 4.0 |

### Hotspots by Directory
| Directory | Total Commits | Files Changed | Top Contributor |
|-----------|--------------|---------------|----------------|
| `features/dashboard/` | 52 | 8 | Alice Chen (60%) |
| `core/services/` | 41 | 6 | Alice Chen (55%) |
| `features/reports/` | 35 | 6 | Bob Martinez (70%) |
| `shared-ui/` | 28 | 7 | Carol Kim (40%) |
| `features/admin/` | 18 | 4 | Bob Martinez (65%) |

### Dead Zones (no changes in 12+ months)
| File/Directory | Last Commit | Age | Risk |
|---------------|-------------|-----|------|
| `src/app/legacy/legacy-adapter.service.ts` | 2024-08-12 | 19 months | Low (scheduled for removal) |
| `src/app/shared/pipes/legacy-date.pipe.ts` | 2024-10-01 | 17 months | Medium (still imported) |
| `src/app/shared/directives/tooltip.directive.ts` | 2024-11-15 | 16 months | Low (replaced by Material tooltip) |
| `src/assets/i18n/deprecated/` | 2024-06-20 | 21 months | Low (unused directory) |

### Branch Strategy
| Aspect | Observed Pattern | Evidence |
|--------|-----------------|---------|
| Naming convention | `feature/<ticket>-<description>` (e.g., `feature/PROJ-123-add-export`) | 85% of branches follow this pattern |
| Integration branches | `main` (production), `develop` (staging) | Both present in remote |
| Merge style | Squash merge | PR merge commits show squashed format |
| Active branches | 7 (3 feature, 2 bugfix, main, develop) | `git branch -a` |
| Stale branches (3+ months) | 4 | `feature/old-migration`, `bugfix/legacy-fix`, etc. |
| Branch protection | `main` requires PR reviews (inferred from merge pattern) | No direct pushes to main in history |
```

## Validation

- **Git command sourcing**: every metric must be derived from an actual `git` command. Document which command produced each metric (e.g., "Total commits from `git rev-list --count HEAD`"). Never estimate or hallucinate commit counts.
- **Contributor accuracy**: contributor names and commit counts must match `git shortlog -sn --no-merges` output exactly. Run the command and compare against the table.
- **Hotspot score reproducibility**: for the top 3 hotspots, re-run `git log --oneline --since='6 months ago' -- <file> | wc -l` and verify the commit count matches. Recalculate the hotspot score using the formula and confirm it matches.
- **Release date accuracy**: for each tag in the Release History table, verify the date by running `git log -1 --format='%ai' <tag>`. The reported date must match.
- **Bus factor calculation**: verify by summing commit percentages from the Active Contributors table — the number of contributors needed to reach 80% must match the stated bus factor.
- **Dead zone accuracy**: every file listed as a dead zone must have no commits in the last 12 months. Verify with `git log --since='12 months ago' -- <file>` — it should return empty.
- **Branch count accuracy**: the active branch count must match `git branch -a | wc -l` (minus HEAD pointer lines).
- **No repository modifications**: confirm that no commits, branches, tags, or other git objects were created during the scan. The git reflog should show no new entries from the scan.
