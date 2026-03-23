---
name: angular-docs-repair
description: "Fix stale, incomplete, and wrong-format documentation in Angular code. Detects signature mismatches (stale @param/@returns), missing tags (incomplete docs), and JSDoc type syntax in TypeScript (wrong format). Reads implementations to write accurate corrections."
metadata:
  author: orch-team
  version: "1.0"
references: []
allowed-tools: Bash(ng:*) Bash(npx:*) Read Edit
---

## Context

Repairs broken documentation in Angular TypeScript files. Documentation drifts as code evolves — parameters get added or removed, return types change, JSDoc is used instead of TSDoc. This skill detects three categories of broken docs and fixes them by reading the current implementation.

## Inputs

- **Target** — File path, directory, component name, or service name to repair.
- **Fix type** (optional) — `stale`, `incomplete`, `format`, or `all` (default).
- **Dry run** (optional) — `--dry-run` to list issues without fixing them.

## Steps

1. **Identify target files.** Resolve the target to a list of TypeScript files.

2. **Scan for documentation issues.** For each file, detect three categories:

   ### Stale docs (signature mismatch)
   - `@param` tags for parameters that no longer exist.
   - Missing `@param` tags for parameters that were added.
   - `@param` names that do not match current parameter names.
   - `@returns` that describes a type/behavior that no longer matches the implementation.
   - Class/interface descriptions that reference removed or renamed members.

   ### Incomplete docs (missing tags)
   - Methods with TSDoc that lack `@param` for one or more parameters.
   - Methods with TSDoc that lack `@returns` for non-void return types.
   - Methods that throw errors but lack `@throws`.
   - Signal inputs/outputs that have TSDoc on the class but not on the signal declaration.

   ### Wrong-format docs (JSDoc in TypeScript)
   - `@param {string} name` — JSDoc type syntax in TypeScript (should be `@param name - description`).
   - `@returns {Promise<Trade[]>}` — redundant type in return tag.
   - `@type {number}` — JSDoc type annotation (TypeScript provides this).
   - `/** @constructor */` — unnecessary in TypeScript classes.

3. **Categorize and prioritize.** Group issues by severity:
   - **High:** Stale docs (actively misleading).
   - **Medium:** Incomplete docs (missing information).
   - **Low:** Wrong format (cosmetic, but causes tooling issues).

4. **Fix stale docs.** For each stale documentation:
   - Read the current method signature and implementation.
   - Add `@param` for new parameters with meaningful descriptions.
   - Remove `@param` for deleted parameters.
   - Rename `@param` to match current parameter names.
   - Update `@returns` to match current return behavior.
   - Update class/interface descriptions to reflect current structure.

5. **Fix incomplete docs.** For each incomplete documentation:
   - Read the function body to understand each parameter's purpose.
   - Add missing `@param` tags with descriptions derived from the implementation.
   - Add missing `@returns` tags by reading what the method returns and why.
   - Add missing `@throws` tags by identifying error conditions in the implementation.

6. **Fix wrong-format docs.** For each format issue:
   - Remove `{type}` annotations from `@param` and `@returns` tags.
   - Convert `@param {string} name - desc` to `@param name - desc`.
   - Convert `@returns {Type} desc` to `@returns desc`.
   - Remove `@type`, `@constructor`, and other JSDoc-only annotations.

7. **Write fixes to source files.**

8. **Run build verification.** Execute `ng build` to confirm compilation.

9. **Run linter.** Confirm no new issues introduced.

10. **Report results.**

## Output

```markdown
## Documentation Repaired — {target}

### Issues Fixed
| Category | Files | Issues | Examples |
|----------|-------|--------|----------|
| Stale (signature mismatch) | {n} | {n} | Removed @param for deleted `userId` |
| Incomplete (missing tags) | {n} | {n} | Added @returns for `getTradeById()` |
| Wrong format (JSDoc→TSDoc) | {n} | {n} | Removed {string} from @param |

Total: {n} issues fixed across {n} files.

Build: {pass|fail}
Linter: {pass|fail}
```

## Validation

- Every `@param` tag matches an actual parameter in the current signature.
- No `@param` tags reference parameters that do not exist.
- Every non-void public method with TSDoc has a `@returns` tag.
- No JSDoc `{type}` syntax remains in any TypeScript file in the target scope.
- No `@type`, `@constructor`, or other JSDoc-only annotations remain.
- `ng build` passes after all repairs.
- Linter passes with no new warnings.
- Descriptions remain meaningful after repair (not reduced to empty strings).
- Existing correct documentation is not modified.
