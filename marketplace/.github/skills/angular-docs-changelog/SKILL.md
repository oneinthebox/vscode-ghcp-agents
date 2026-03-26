---
name: angular-docs-changelog
description: "Generate or update CHANGELOG.md from git history. Groups commits by type (feat, fix, refactor, chore), links PRs and issues, detects breaking changes. Follows Keep a Changelog format."
references:
  - references/angular/v19/best-practices.md
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

1. **Read git log** with full commit body to capture breaking change footers:
   ```
   git log --format="%H|%s|%an|%ai|%b" {since}..HEAD
   ```
   If `{since}` is a tag, resolve it first: `git tag -l "v*" --sort=-v:refname | head -1`.

2. **Parse conventional commit messages** using these matching rules:
   - Pattern: `^(feat|fix|refactor|chore|docs|test|perf|ci|build)(\(.+\))?(!)?:\s+(.+)$`
   - The optional `(scope)` captures the affected area (e.g., `feat(trading): add blotter`).
   - The optional `!` before `:` indicates a breaking change (e.g., `refactor!: remove TradeModule`).
   - Classification map:
     - `feat:` -> **Features**
     - `fix:` -> **Bug Fixes**
     - `refactor:` -> **Refactoring**
     - `chore:` -> **Maintenance**
     - `docs:` -> **Documentation**
     - `test:` -> **Tests**
     - `perf:` -> **Performance**
     - `ci:`, `build:` -> **Build & CI**
   - Commits that do not match the conventional format are grouped under **Other Changes**.

3. **Detect breaking changes** from two sources:
   - The `!` marker in the subject line: `refactor!: remove deprecated TradeModule`.
   - The `BREAKING CHANGE:` footer in the commit body (multi-line body parsed from `%b`). Example:
     ```
     refactor(trade): simplify order model

     BREAKING CHANGE: TradeOrder.legacyId field has been removed.
     Consumers must use TradeOrder.id instead.
     ```

4. **Determine SemVer bump suggestion** based on parsed commits:
   - Any `BREAKING CHANGE` or `!:` present -> **MAJOR** bump
   - Any `feat:` present (no breaking) -> **MINOR** bump
   - Only `fix:`, `refactor:`, `chore:`, etc. -> **PATCH** bump

5. **Extract PR numbers** from commit messages: pattern `\(#(\d+)\)` at end of subject line. Generate links: `[#142](https://github.com/{owner}/{repo}/pull/142)`.

6. **Extract issue references**: patterns `(fixes|closes|resolves)\s+#(\d+)` from subject or body. Generate links: `[#456](https://github.com/{owner}/{repo}/issues/456)`.

7. **Group by version tag or date range.** If git tags exist in the range, create a section per tag. Otherwise, group under `[Unreleased]`.

8. **Format as [Keep a Changelog](https://keepachangelog.com/) standard.**

9. If `--update`: read existing CHANGELOG.md, prepend new section, preserve history.

10. Write CHANGELOG.md.

### Parsing Example

Given these raw commits:
```
a1b2c3d|feat(trading): add real-time price streaming (#142)|jane|2026-03-20|
d4e5f6a|fix(portfolio): correct rounding error in NAV calculation (#141)|mike|2026-03-19|
b7c8d9e|feat(dashboard): add allocation pie chart (#138)|sarah|2026-03-18|
e0f1a2b|refactor!: remove deprecated TradeModule (#139)|alex|2026-03-17|BREAKING CHANGE: TradeModule removed. Use standalone components.
f3a4b5c|chore: update eslint config|ci-bot|2026-03-16|
```

Produced CHANGELOG section:
```markdown
## [Unreleased] — 2026-03-24

### Breaking Changes
- **trading**: Remove deprecated TradeModule — use standalone components ([#139](https://github.com/org/repo/pull/139)) — @alex

### Features
- **trading**: Add real-time price streaming ([#142](https://github.com/org/repo/pull/142)) — @jane
- **dashboard**: Add allocation pie chart ([#138](https://github.com/org/repo/pull/138)) — @sarah

### Bug Fixes
- **portfolio**: Correct rounding error in NAV calculation ([#141](https://github.com/org/repo/pull/141)) — @mike

### Maintenance
- Update eslint config — @ci-bot
```

Suggested SemVer bump: **MAJOR** (breaking change detected).

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
