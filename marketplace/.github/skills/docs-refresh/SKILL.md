---
name: docs-refresh
description: "Re-fetch and re-convert stale documentation sources. Identifies sources past their freshness threshold and updates them from their original URLs. Keeps the registry current."
references:
  - references/orch/token-efficiency-guidelines.md
  - references/orch/registry-schema-reference.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Automates the re-fetching and re-conversion of stale documentation sources. Reads the ORCH registry to find sources where `last_refreshed` exceeds `max_stale_days`, re-fetches from the original source URL, re-converts to token-efficient markdown, and updates the registry entry. Can run unattended for scheduled freshness maintenance.

## Inputs

- "Refresh stale docs" — refresh all stale sources
- Optional: `--id {source-id}` — refresh a specific source regardless of staleness
- Optional: `--all` — refresh every source, not just stale ones
- Optional: `--max-stale-days {n}` — override staleness threshold (default: 30)
- Optional: `--dry-run` — show what would be refreshed without fetching

## Staleness Detection Algorithm

For each entry in `.orch/registry.yaml`, the skill calculates:

```
today            = current date (e.g., 2026-03-25)
last_refreshed   = entry.last_refreshed (e.g., 2026-02-10)
age_days         = (today - last_refreshed).days    # e.g., 43
max_stale_days   = entry.max_stale_days ?? --max-stale-days ?? 30

is_stale = age_days > max_stale_days
```

Per-source `max_stale_days` overrides allow different freshness policies:
- Rapidly changing API docs: `max_stale_days: 7`
- Stable specification references: `max_stale_days: 90`
- Default for sources without an explicit value: 30 days

## Change Detection Approach

After fetching the new version, the skill compares it against the existing converted markdown to avoid unnecessary re-conversion:

1. Fetch new raw content from the original source URL.
2. Run it through the same conversion pipeline used by `/docs-fetch`.
3. Compute a content hash (SHA-256) of the newly converted markdown.
4. Compare against the hash of the existing `.orch/references/{id}.md` file.
5. Decision:
   - **Hashes match**: content unchanged. Update only `last_refreshed` in registry. Leave the file untouched.
   - **Hashes differ**: content changed. Write the new converted markdown, update `last_refreshed`, `tokens`, and `content_hash` in registry.

This avoids rewriting files when the upstream source has not materially changed, which preserves git history cleanliness.

## Selective Refresh Logic

When a source has changed, the skill does not blindly replace the entire file. It uses a section-level diff:

1. Parse both old and new markdown into heading-delimited sections.
2. Compare sections by heading and content hash.
3. Only rewrite sections that actually differ.
4. Preserve any manually added annotations (lines starting with `<!-- orch:keep -->`) in the existing file.

This minimizes git diff noise and protects manual enrichments added by developers.

## Steps

1. Read `.orch/registry.yaml`.
2. Identify stale sources using the staleness detection algorithm above.
3. If `--id` specified, target that source only. If `--all`, target everything.
4. If `--dry-run`, list targets and exit.
5. For each stale source:
   a. Read the original source URL and type from the registry entry.
   b. Fetch the current content from the source (same logic as `/docs-fetch`).
   c. Compare against the existing converted markdown using change detection:
      - If unchanged: update `last_refreshed` only, skip re-conversion.
      - If changed: re-convert via `@doc-convert-worker`, apply selective refresh, write updated markdown.
   d. Update the registry entry: `last_refreshed`, `tokens`, `content_hash`, `status: current`.
6. Log the refresh results.
7. Produce the refresh report.

## Concrete Example: Refreshing Stale Docs

Given a registry with these entries:
```yaml
- id: angular-dev-guide-signals
  source: https://angular.dev/guide/signals
  last_refreshed: "2026-02-10"
  max_stale_days: 30
  tokens: 2860
  status: current

- id: primeng-org-autocomplete
  source: https://primeng.org/autocomplete
  last_refreshed: "2026-03-20"
  max_stale_days: 30
  tokens: 1950
  status: current

- id: rxjs-dev-guide-operators
  source: https://rxjs.dev/guide/operators
  last_refreshed: "2026-01-15"
  max_stale_days: 30
  tokens: 3400
  status: current
```

Running `/docs-refresh` on 2026-03-25:
- `angular-dev-guide-signals`: age = 43 days > 30 = **stale** (re-fetch)
- `primeng-org-autocomplete`: age = 5 days < 30 = **current** (skip)
- `rxjs-dev-guide-operators`: age = 69 days > 30 = **stale** (re-fetch)

After fetching:
- `angular-dev-guide-signals`: new hash differs from old — **content changed**, re-convert and write.
- `rxjs-dev-guide-operators`: new hash matches old — **unchanged**, update `last_refreshed` only.

Registry update for `angular-dev-guide-signals`:
```yaml
- id: angular-dev-guide-signals
  source: https://angular.dev/guide/signals
  last_refreshed: "2026-03-25"    # updated
  max_stale_days: 30
  tokens: 3020                     # updated (content grew)
  content_hash: "a1b2c3d4..."     # updated
  status: current
```

## Output

```markdown
## Docs Refresh Report

### Summary
| Metric                | Value  |
|-----------------------|--------|
| Sources checked       | 3      |
| Stale found           | 2      |
| Refreshed             | 2      |
| Content changed       | 1      |
| Unchanged (date only) | 1      |
| Failed                | 0      |

### Refresh Details
| ID                          | Previous Refresh | Age  | Status    | Content Changed | New Tokens |
|-----------------------------|------------------|------|-----------|-----------------|------------|
| angular-dev-guide-signals   | 2026-02-10       | 43d  | refreshed | Yes             | 3020       |
| rxjs-dev-guide-operators    | 2026-01-15       | 69d  | refreshed | No              | 3400       |

### Failures (if any)
| ID              | Error                         | Action               |
|-----------------|-------------------------------|-----------------------|
| (none)          |                               |                       |
```

## Validation

- All stale sources are attempted (none silently skipped)
- Unchanged sources have `last_refreshed` updated but content file untouched
- Changed sources are re-converted and token count recalculated
- Selective refresh preserves `<!-- orch:keep -->` annotations in existing files
- Registry file is valid YAML after updates (parseable by any YAML loader)
- Failed fetches are reported with actionable error messages, not swallowed
- Content hash in registry matches the SHA-256 of the written file
