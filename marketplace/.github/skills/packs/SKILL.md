---
name: packs
description: "Manage the ORCH documentation registry — register new sources, convert them to token-efficient markdown, refresh stale sources, and check registry status. Handles URLs, local files, and source-embedded docs (JSDoc, TSDoc, Compodoc, PyDoc, Javadoc). Use when adding, updating, or checking reference documentation."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(git:*) Read Edit
---

## Context

This is the unified doc lifecycle skill. It replaces the individual doc-register, doc-convert, doc-refresh, and doc-status skills. It manages the full pipeline from source registration through conversion to freshness monitoring.

## Capabilities

| Action | When to use | What it does |
|--------|------------|-------------|
| **Register** | Adding a new doc source | Adds entry to `docs-registry.yaml` with status: draft |
| **Convert** | Source registered but not yet converted | Fetches/reads source, converts to token-efficient markdown, writes to `.github/references/` |
| **Refresh** | Source is stale (>30 days) | Re-fetches, re-converts, preserves backup of previous version |
| **Status** | Need overview of all sources | Produces dashboard table of all registry entries with staleness |

## Inputs

The user describes what they need. The agent determines the action:
- "Add the Angular signals guide" → Register
- "Convert all draft sources" → Convert
- "Refresh stale PrimeNG docs" → Refresh
- "Show me doc status" → Status

## Steps

### Register
1. Read current `docs-registry.yaml`.
2. Verify no duplicate origin exists.
3. Generate id (kebab-case from name).
4. Determine output path: `.github/references/{scope}/{version}/{name}-guide.md`
5. Add entry with `status: draft`, `last_refreshed: null`.
6. Write updated registry.

### Convert
1. Read source entry from registry.
2. Fetch/extract content based on type and format:
   - `type: url` → fetch tool
   - `type: local` → read from `docs/staging/`
   - `format: jsdoc|tsdoc|compodoc|pydoc|javadoc` → run generator tool first (see [references/source-embedded-extraction.md](references/source-embedded-extraction.md))
3. Convert following format rules:
   - HTML → extract main content, strip chrome, convert to markdown
   - OpenAPI → summarize endpoints as markdown tables
   - PDF → extract text, structure into sections
   - Storybook MDX → extract component examples, props tables
   - Source-embedded intermediate → extract public API as markdown tables
4. Apply token efficiency: max 500 lines, tables for APIs, mermaid for flows.
5. Write output to registered path.
6. Update registry: `status: current`, `last_refreshed: {today}`.

### Refresh
1. Read source entry (must be `current` or `stale`).
2. Backup current output: `{name}-guide.{date}.bak.md`.
3. Re-run conversion.
4. Report changes between old and new version.
5. Update registry.

### Status
1. Read `docs-registry.yaml`.
2. Calculate age since `last_refreshed` for each entry.
3. Flag stale (>30 days), draft (never converted), error.
4. Output formatted table grouped by type.

## Output

Depends on action. For Status:
```markdown
## ORCH Documentation Registry — {n} sources
| ID | Version | Status | Last Refreshed | Age |
|----|---------|--------|---------------|-----|
```

## Validation

- Registry is valid YAML after every write
- Converted docs are under 500 lines
- No duplicate origins in registry
- Source-embedded extraction: generator tool exits 0
