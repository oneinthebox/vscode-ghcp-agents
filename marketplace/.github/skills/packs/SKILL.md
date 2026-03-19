---
name: packs
description: "View the ORCH documentation registry status — shows all core-pack sources, their freshness, and conversion status. Core-pack docs are pre-converted and maintained centrally; run 'orch update' to get the latest."
metadata:
  author: orch-team
  version: "2.0"
allowed-tools: Read
---

## Context

This skill provides a **read-only dashboard** for the ORCH documentation registry. All reference docs are **core-packs** — maintained and pre-converted by the ORCH marketplace team, shipped to consumer projects via `orch init` and `orch update`.

Consumers cannot register, convert, or refresh core-pack docs. To request new docs or updates, contact the ORCH marketplace maintainer.

## Capabilities

| Action | Available | What it does |
|--------|-----------|-------------|
| **Status** | Yes | Produces dashboard table of all registry entries with freshness |
| **Register** | Maintainer only | "Core-pack sources are maintained centrally. Contact the ORCH team to request additions." |
| **Convert** | Maintainer only | "Core-pack docs are pre-converted by the maintainer. Run `orch update` to get the latest." |
| **Refresh** | Maintainer only | "Core-pack docs are refreshed by the maintainer. Run `orch update` to get the latest." |

## Inputs

The user describes what they need. The agent determines the response:
- "Show me doc status" → Status
- "Add the Angular signals guide" → Redirect to maintainer
- "Convert all draft sources" → Redirect to orch update
- "Refresh stale PrimeNG docs" → Redirect to orch update

## Steps

### Status
1. Read `docs-registry.yaml`.
2. Calculate age since `last_refreshed` for each entry.
3. Flag stale (>30 days), draft (not yet converted by maintainer), current.
4. Output formatted table grouped by `managed_by` pack domain.

### Register / Convert / Refresh (Redirect)
1. Detect that the user is requesting a maintainer-only action.
2. Respond with:
   - "Core-pack reference docs are maintained by the ORCH marketplace team."
   - "To get the latest docs: run `orch update`"
   - "To request new sources: open an issue or PR against the ORCH marketplace repository"

## Output

For Status:
```markdown
## ORCH Documentation Registry — {n} sources (core-pack)

| ID | Version | Status | Last Refreshed | Age |
|----|---------|--------|---------------|-----|
| angular-essentials-v21 | 21.x | current | 2026-03-15 | 4d |
| primeng-v19-install | 19.x | current | 2026-03-15 | 4d |
| ag-grid-quickstart | — | draft | — | — |

### Summary
- {current} current (pre-converted, ready to use)
- {draft} draft (not yet converted by maintainer)
- {stale} stale (>30 days — run orch update)
```

## Validation

- Registry is valid YAML
- All sources have `managed_by: "pack:{domain}"`
- No `managed_by: "user"` entries (addon-packs are not supported)
