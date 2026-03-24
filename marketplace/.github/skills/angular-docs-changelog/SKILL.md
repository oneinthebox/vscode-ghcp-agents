---
name: angular-docs-changelog
description: "Generate or update CHANGELOG.md from git history. Groups commits by type (feat, fix, refactor, chore), links PRs and issues, detects breaking changes. Follows Keep a Changelog format."
references: []
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates a CHANGELOG.md from actual git history. Parses conventional commits (feat:, fix:, refactor:, chore:, breaking:), groups by release/date, links to PRs and issues, and highlights breaking changes. Updates existing changelog by prepending new entries.

## Inputs

- `@angular /angular-docs-changelog` — generate full changelog from git history
- `@angular /angular-docs-changelog --since v2.1.0` — changes since a specific tag
- `@angular /angular-docs-changelog --since 2026-03-01` — changes since a date
- `@angular /angular-docs-changelog --update` — prepend new entries to existing CHANGELOG.md

## Steps

1. Read git log: `git log --oneline --format="%H|%s|%an|%ai" {since}..HEAD`.
2. Parse conventional commit messages:
   - `feat:` → Features
   - `fix:` → Bug Fixes
   - `refactor:` → Refactoring
   - `chore:` → Maintenance
   - `docs:` → Documentation
   - `test:` → Tests
   - `perf:` → Performance
   - `BREAKING CHANGE:` or `!:` → Breaking Changes
3. Extract PR numbers from commit messages (e.g., `(#123)`) and link to repository.
4. Extract issue references (e.g., `fixes #456`, `closes #789`).
5. Group by version tag or date range.
6. Detect breaking changes and highlight them prominently.
7. Format as [Keep a Changelog](https://keepachangelog.com/) standard.
8. If `--update`: read existing CHANGELOG.md, prepend new section, preserve history.
9. Write CHANGELOG.md.

## Output

```markdown
## CHANGELOG Generated/Updated

Period: {from} → {to}
Commits parsed: {n}
Features: {n}
Bug fixes: {n}
Breaking changes: {n}
PRs linked: {n}

### Sample entry
## [Unreleased] — 2026-03-24
### Features
- Add real-time price streaming to blotter (#142) — @jane
- Add allocation pie chart to dashboard (#138) — @sarah
### Bug Fixes
- Fix portfolio calculation rounding error (#141) — @mike
### Breaking Changes
- Remove deprecated TradeModule — use standalone components (#139)
```

## Validation

- All commits in the range are accounted for
- PR links resolve to valid URLs
- Breaking changes are prominently flagged
- Date ranges are accurate
- Conventional commit types are correctly classified
- No functional code changes — only CHANGELOG.md written
