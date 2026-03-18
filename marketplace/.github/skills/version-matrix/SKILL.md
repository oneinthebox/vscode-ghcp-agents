---
name: version-matrix
description: "Generate and check the Angular ecosystem compatibility matrix — which versions of Angular, TypeScript, Node, PrimeNG, AG Grid, Plotly, Interop.io, Nx, Jest, Playwright, and custom internal libs work together. Used by agents for version decisions during migrations, and by teams for upgrade planning. Use when upgrading, adding dependencies, or checking version compatibility."
metadata:
  author: orch-team
  version: "1.0"
---

## Context

Produces and queries the compatibility matrix from `known-compatibility.yaml` (public libs) and `docs-registry.yaml` entries with `compatibility` field (custom libs). Both agents and humans consume the output.

## Capabilities

| Action | When to use |
|--------|------------|
| **Generate** | Produce the full matrix as a reference doc |
| **Check** | Verify a specific version combination |
| **Check package.json** | Validate all installed versions against the matrix |
| **Upgrade path** | Given current → target Angular version, list all required changes |

## Inputs

- "Generate the compatibility matrix" → Generate
- "Can I use PrimeNG 16 with Angular 19?" → Check
- "Check my package.json for compatibility" → Check package.json
- "What do I need to change to go from Angular 17 to 19?" → Upgrade path

## Steps

1. Read `known-compatibility.yaml` from `references/` directory.
2. Read `docs-registry.yaml` for custom lib compatibility entries.
3. Cross-reference versions per Angular release (LTS-2 to latest).
4. Execute the requested action.
5. Write/update `.github/references/compatibility-matrix-guide.md`.

## Output

### Generate
Full matrix tables: Core Platform, UI Libraries, Build & Test Tooling, Interop.io, Internal Libraries, Conflicts.

### Upgrade Path
```markdown
## Upgrade Path: Angular {from} → {to}
### Required Version Changes
| Library | Current | Target | Breaking Changes |
### Recommended Upgrade Order
### Unverified Internal Libraries
### Migration Skills to Run
```

### Check package.json
```markdown
## Compatibility Check — {project}
| Package | Installed | Compatible Angular | Status |
### Issues Found
```

## Validation

- Every public library has data in known-compatibility.yaml
- All registry entries with `compatibility` field are included
- All conflicts flagged
- Upgrade path includes ALL dependent changes
