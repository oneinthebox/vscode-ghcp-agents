---
name: angular-docs-generate
description: "Add TSDoc comments to undocumented public APIs in Angular code. Reads function and method bodies to write meaningful documentation — describes purpose, parameters, return values, thrown errors, and side effects. Never produces boilerplate or name-repetition docs."
metadata:
  author: orch-team
  version: "1.0"
references: []
allowed-tools: Bash(ng:*) Bash(npx:*) Read Edit
---

## Context

Generates TSDoc documentation for undocumented public APIs in Angular components, services, directives, pipes, and utility files. Unlike boilerplate generators that repeat the function name, this skill reads the implementation to understand what the code does and produces meaningful documentation that helps future developers.

Critical rule: TypeScript provides types. TSDoc documents intent. Never use JSDoc `{type}` syntax in TypeScript.

## Inputs

- **Target** — File path, directory, component name, or service name to document.
- **Scope** (optional) — `public-only` (default) or `all` (includes private/protected members).
- **Dry run** (optional) — `--dry-run` to list undocumented APIs without generating docs.

## Steps

1. **Identify target files.** Resolve the target to a list of TypeScript files.

2. **Scan for undocumented public APIs.** For each file, find:
   - Classes, interfaces, and type aliases without TSDoc.
   - Public methods and properties without TSDoc.
   - Exported functions without TSDoc.
   - Signal inputs/outputs without TSDoc.
   - Enum members without descriptions (when non-obvious).

3. **Read each undocumented API's implementation.** For methods and functions:
   - Read the function body to understand purpose.
   - Identify parameters and what they control.
   - Identify return values and their meaning.
   - Identify thrown errors and when they occur.
   - Identify side effects (HTTP calls, state mutations, logging).
   - Identify edge cases handled in the implementation.

4. **Generate meaningful TSDoc.** For each undocumented API:
   - Write a description that explains WHAT and WHY, not just the name.
   - Add `@param` tags with descriptions of purpose, not just type repetition.
   - Add `@returns` tags describing the return value's meaning.
   - Add `@throws` tags for thrown errors.
   - Add `@example` tags for non-obvious usage.
   - Add `@see` tags for related APIs.

   **Quality rules:**
   - "Fetches trades from the API and returns them sorted by date" (good).
   - "Gets the trades" (bad — name repetition).
   - `@param tradeId - Unique identifier used to look up the trade in the backend` (good).
   - `@param tradeId - The trade ID` (bad — type repetition).

5. **Write TSDoc to source files.** Insert comments directly above each API declaration.

6. **Run build verification.** Execute `ng build` to confirm the documented code compiles.

7. **Run linter.** Confirm no formatting or doc-lint issues.

8. **Report results.**

## Output

```markdown
## TSDoc Generated — {target}

| File | APIs Documented | Classes | Methods | Functions |
|------|----------------|---------|---------|-----------|
| trade.service.ts | 8 | 1 | 6 | 1 |
| trade.component.ts | 5 | 1 | 3 | 1 |

Total: {n} doc comments across {n} files.
Previously documented: {n} (untouched)
Newly documented: {n}

Build: {pass|fail}
Linter: {pass|fail}
```

## Validation

- Every public API in the target has a TSDoc comment after generation.
- No JSDoc `{type}` syntax in any generated TSDoc (TypeScript provides types).
- `@param` count matches actual parameter count for every method/function.
- `@returns` is present on every non-void method/function.
- Descriptions are meaningful (not name or type repetition).
- `ng build` passes after adding documentation.
- Linter passes with no new warnings.
- Existing documentation is not modified (only gaps are filled).
