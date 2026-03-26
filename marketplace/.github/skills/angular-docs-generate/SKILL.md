---
name: angular-docs-generate
description: "Add TSDoc comments to undocumented public APIs and optionally set up Compodoc for browsable HTML documentation. Supports three modes: tsdoc (inline comments), compodoc (setup + generate), and full (both). Reads implementations to write meaningful docs — never produces boilerplate."
metadata:
  author: orch-team
  version: "1.1"
references:
  - references/angular/v19/best-practices.md
  - references/angular/v19/documentation-conventions.md
allowed-tools:
  - codebase
  - terminal
  - edit
---

## Context

Generates documentation for Angular apps and libraries at two levels:

1. **TSDoc** — Inline `/** */` comments on public APIs (classes, methods, inputs, outputs, signals). Reads the implementation to produce meaningful docs, not boilerplate.
2. **Compodoc** — Browsable HTML documentation with module graph, component catalog, route map, and coverage report. Sets up the tool if not already configured.

Critical rule: TypeScript provides types. TSDoc documents intent. Never use JSDoc `{type}` syntax in TypeScript.

## Inputs

- **Target** — File path, directory, or `--project` (entire app/lib).
- **Mode** — `tsdoc` (default), `compodoc`, or `full` (both).
- **Scope** (optional) — `public-only` (default) or `all` (includes private/protected).
- **Coverage threshold** (optional) — `--min-coverage 80` for Compodoc coverage gate.
- **Dry run** (optional) — `--dry-run` to list gaps without writing.

## Steps

### Phase 1: TSDoc Generation (mode: `tsdoc` or `full`)

1. **Load reference.** Read [references/angular/v19/documentation-conventions.md](references/angular/v19/documentation-conventions.md) for TSDoc tag rules, quality standards, and examples.

2. **Identify target files.** Resolve the target to TypeScript files (exclude `.spec.ts`, `test/`, `node_modules/`).

3. **Scan for undocumented public APIs.** For each file, find:
   - Classes, interfaces, and type aliases without TSDoc.
   - Public methods and properties without TSDoc.
   - Exported functions without TSDoc.
   - Signal inputs (`input()`, `input.required()`) without TSDoc.
   - Signal outputs (`output()`) without TSDoc.
   - Computed signals (`computed()`) without TSDoc.
   - Enum members without descriptions (when non-obvious).

4. **Read each undocumented API's implementation.** For methods and functions:
   - Read the function body to understand purpose.
   - Identify parameters and what they control.
   - Identify return values and their meaning.
   - Identify thrown errors and when they occur.
   - Identify side effects (HTTP calls, state mutations, logging).
   - Identify edge cases handled in the implementation.

5. **Generate meaningful TSDoc.** For each undocumented API:

   **Required tags:**
   - Description that explains WHAT and WHY, not just the name.
   - `@param` tags with descriptions of purpose, not type repetition.
   - `@returns` tags describing the return value's meaning.
   - `@throws` tags for thrown errors.

   **Recommended tags (when applicable):**
   - `@example` for methods with > 3 params or non-obvious usage.
   - `@see` for related APIs.
   - `@deprecated` with sunset path (`Use X instead. Removal: vN`).
   - `@remarks` for extended explanation (caveats, performance).

   **Quality rules:**
   | Quality | Good | Bad |
   |---------|------|-----|
   | Description | "Fetches trades from the API and returns them sorted by date" | "Gets the trades" |
   | @param | `@param tradeId - Unique identifier used to look up the trade in the backend` | `@param tradeId - The trade ID` |
   | @returns | `@returns The confirmed trade with status 'pending' and server-assigned id` | `@returns Trade object` |

   **Angular-specific patterns:**
   ```typescript
   // Signal input
   /** Fund identifier used to load details. Triggers re-fetch on change. */
   fundId = input.required<number>();

   // Signal output
   /** Emits when user confirms trade execution. Parent handles routing. */
   tradeConfirmed = output<Trade>();

   // Computed signal
   /** Whether the form is valid and the user has sufficient balance. */
   canSubmit = computed(() => this.form.valid() && this.hasBalance());

   // NgRx Signal Store method
   /** Loads funds from /api/funds. Sets loading state during fetch. */
   loadFunds: rxMethod<void>( ... )
   ```

6. **Write TSDoc to source files.** Insert comments directly above each API declaration.

7. **Run build verification.** Execute `ng build` (or `nx build`) to confirm compilation.

8. **Run linter.** Confirm no formatting or doc-lint issues.

### Phase 2: Compodoc Setup & Generation (mode: `compodoc` or `full`)

9. **Check existing Compodoc config.** Look for:
   - `.compodocrc.json` or `.compodocrc` in project root
   - `compodoc` target in `project.json` (Nx) or script in `package.json`
   - `@compodoc/compodoc` in `devDependencies`

10. **Install if missing.**
    ```bash
    npm install --save-dev @compodoc/compodoc
    # For Nx workspaces, also consider:
    npm install --save-dev @twittwer/compodoc
    ```

11. **Create configuration** (if no `.compodocrc.json` exists):
    ```json
    {
      "tsconfig": "./tsconfig.json",
      "output": "./docs/compodoc",
      "theme": "material",
      "name": "{project-name}",
      "hideGenerator": true,
      "disablePrivate": true,
      "disableInternal": true,
      "coverageTest": 80,
      "coverageMinimumPerFile": 60
    }
    ```
    For Nx: use per-project tsconfig and output to `dist/compodoc/{project-name}`.

12. **Add npm scripts** (if missing):
    ```json
    {
      "docs:generate": "compodoc -p tsconfig.json -c .compodocrc.json",
      "docs:serve": "compodoc -p tsconfig.json -c .compodocrc.json -s --port 8080",
      "docs:coverage": "compodoc -p tsconfig.json -c .compodocrc.json --coverageTest 80"
    }
    ```
    For Nx: add a `compodoc` target to `project.json` instead.

13. **Generate documentation.** Run `npm run docs:generate` (or `nx run {project}:compodoc`).

14. **Check coverage.** Run `npm run docs:coverage` with the configured threshold.

## Output

```markdown
## Documentation Generated — {target}

### Mode: {tsdoc | compodoc | full}

### TSDoc (if applicable)
| File | APIs Documented | Classes | Methods | Signals |
|------|----------------|---------|---------|---------|
| trade.service.ts | 8 | 1 | 6 | 1 |
| trade.component.ts | 5 | 1 | 3 | 1 |

Total: {n} doc comments across {n} files.
Previously documented: {n} (untouched)
Newly documented: {n}

### Compodoc (if applicable)
| Metric | Value |
|--------|-------|
| Setup | {already configured | newly configured} |
| Output | {docs/compodoc | dist/compodoc/{project}} |
| Coverage | {n}% ({pass|fail} against {threshold}% threshold) |
| Serve command | `npm run docs:serve` |

Build: {pass|fail}
Linter: {pass|fail}

### Recommended next steps
- Run `npm run docs:serve` to browse documentation at http://localhost:8080
- Run `/angular-docs-audit` to verify remaining coverage gaps
- Run `/angular-docs-repair` to fix any stale or incomplete docs detected
- Add `npm run docs:coverage` to CI pipeline for ongoing enforcement
```

## Validation

- Every public API in the target has a TSDoc comment after generation.
- No JSDoc `{type}` syntax in any generated TSDoc (TypeScript provides types).
- `@param` count matches actual parameter count for every method/function.
- `@returns` is present on every non-void method/function.
- Signal inputs, outputs, and computed signals are documented.
- Descriptions are meaningful (not name or type repetition).
- `ng build` passes after adding documentation.
- Linter passes with no new warnings.
- Existing documentation is not modified (only gaps are filled).
- Compodoc generates without errors (if applicable).
- Compodoc coverage meets configured threshold (if applicable).
- `.compodocrc.json` is valid JSON (if created).
- npm scripts or Nx targets work correctly (if created).
