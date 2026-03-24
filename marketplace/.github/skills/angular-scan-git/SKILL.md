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

## Steps

1. Extract commit history summary:
   - Total commits, date range, commit frequency (commits per week/month)
   - Commit message convention analysis: conventional commits, prefixes, patterns
2. Analyze contributor activity:
   - `git shortlog -sn` for all-time contributors
   - `git shortlog -sn --since="6 months"` for recent activity
   - Identify bus factor (how many contributors own >80% of recent commits)
3. Map release history:
   - `git tag --list` with dates — identify release cadence
   - Changelog entries if `CHANGELOG.md` exists
   - Version progression timeline
4. Identify hotspots and dead zones:
   - Files with highest commit frequency in last 6 months (hotspots)
   - Files with zero commits in 12+ months (dead zones)
   - Directories ranked by change frequency
5. Analyze branch strategy:
   - `git branch -a` — list active branches
   - Branch naming conventions (feature/, bugfix/, release/, etc.)
   - Merge patterns: merge commits vs squash vs rebase
6. Extract recent activity:
   - Last 10 commits with stats
   - Recent merge/PR activity
7. Produce the output report.

## Output

```markdown
## Git Scan — {project_name}

### Summary
| Metric | Value |
|--------|-------|
| Total commits | {n} |
| Contributors (all-time) | {n} |
| Contributors (6 months) | {n} |
| Releases/tags | {n} |
| Bus factor | {n} |

### Commit Patterns
| Convention | Example | Frequency |

### Active Contributors (last 6 months)
| Contributor | Commits | Areas |

### Release History
| Version | Date | Commits Since Previous |

### Hotspots (most changed files, 6 months)
| File | Commits | Contributors | Last Changed |

### Dead Zones (no changes in 12+ months)
| File/Directory | Last Commit | Age |

### Branch Strategy
| Aspect | Observed Pattern |
|--------|-----------------|
| Naming | {convention} |
| Merge style | {merge/squash/rebase} |
| Active branches | {count} |
```

## Validation

- All git data comes from actual `git` commands, not hallucinated
- Contributor names and commit counts are accurate
- Hotspot analysis reflects real file change frequency
- Release dates match actual git tag dates
- No repository modifications are made during the scan
