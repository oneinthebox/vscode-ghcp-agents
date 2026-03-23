---
name: angular-scan-deps
description: "Scan project dependencies, versions, changelog matrix, and upgrade benefits"
references:
  - references/angular/v19/compatibility-matrix.md
---

## Context

Reads `package.json` (and `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` if present) to build a full dependency inventory. Cross-references versions against the compatibility matrix to flag outdated, incompatible, or end-of-life packages. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan dependencies" — full dependency inventory with version analysis
- "What can I upgrade?" — highlight packages with available upgrades and their benefits
- "Check compatibility for Angular 19" — verify all deps against a target Angular version

## Steps

1. Read `package.json` to extract all `dependencies` and `devDependencies` with current versions.
2. Read lock file (if present) to capture resolved versions and detect duplicates.
3. Read `references/angular/v19/compatibility-matrix.md` for known compatible version ranges.
4. For each dependency, determine:
   - Current version vs latest compatible version
   - Whether it has a known breaking change for the target Angular version
   - End-of-life or deprecation status
5. Group dependencies by category: Angular core, UI libraries, build tooling, test tooling, utilities, internal/custom.
6. Identify version conflicts (peer dependency mismatches, duplicate packages at different versions).
7. Compile upgrade benefit summary: performance gains, new APIs, security fixes.
8. Produce the output report.

## Output

```markdown
## Dependency Scan — {project_name}

### Summary
- Total dependencies: {n}
- Up to date: {n}
- Upgradable: {n}
- Incompatible with target: {n}
- Deprecated/EOL: {n}

### Dependency Inventory
| Package | Current | Latest Compatible | Category | Status |
|---------|---------|-------------------|----------|--------|

### Version Conflicts
| Package | Required By | Version A | Version B |

### Upgrade Benefits
| Package | From | To | Key Benefits |

### Compatibility Matrix Check
| Package | Current | Target Angular | Compatible? | Notes |
```

## Validation

- All entries in `package.json` are accounted for in the report
- Version ranges are parsed correctly (^, ~, exact)
- Compatibility data comes from the referenced matrix, not hallucinated
- No files are modified during the scan
