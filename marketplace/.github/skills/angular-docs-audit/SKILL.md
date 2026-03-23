---
name: angular-docs-audit
description: "Audit TSDoc coverage across Angular source files. Finds undocumented public APIs, detects wrong-format docs, and produces a coverage report with gaps and fix suggestions."
references: []
---

## Context

Scans Angular TypeScript source files for TSDoc (JSDoc-style) comment coverage. Identifies undocumented public classes, methods, properties, and interfaces. Detects malformed doc comments (missing @param, @returns, wrong tag format). Produces a coverage report with specific gaps and suggested doc stubs.

## Inputs

- Optional: `--scope {path}` — audit specific directory or library instead of full project
- Optional: `--public-only` — only audit exported/public members (default: true)
- Optional: `--generate-stubs` — output TSDoc stubs for undocumented members
- Optional: `--min-coverage {N}` — set pass/fail threshold (default: 80%)

## Steps

1. Scan the target directory for `.ts` files (exclude `.spec.ts`, `test/`, `node_modules/`).
2. For each file, parse exported declarations: classes, interfaces, functions, enums, type aliases.
3. For each public member (methods, properties, inputs, outputs), check:
   a. **Has doc comment**: `/** ... */` block immediately preceding the declaration.
   b. **Format correct**: uses `@param` for parameters, `@returns` for return values, `@example` recommended for complex methods.
   c. **Complete**: all parameters documented, return type described.
4. Classify each gap:
   a. **Missing**: no doc comment at all.
   b. **Incomplete**: doc exists but missing @param or @returns.
   c. **Malformed**: wrong tag syntax, mismatched param names, empty descriptions.
5. Calculate coverage: (documented members / total public members) * 100.
6. If `--generate-stubs`, produce TSDoc comment stubs for each undocumented member.
7. Compare against `--min-coverage` threshold for pass/fail.

## Output

```markdown
## TSDoc Coverage Report — {scope}

### Summary
| Metric              | Value         |
|---------------------|---------------|
| Files scanned       | {n}           |
| Public members      | {n}           |
| Documented          | {n} ({pct}%)  |
| Incomplete          | {n}           |
| Malformed           | {n}           |
| Threshold           | {min}%        |
| Status              | PASS / FAIL   |

### Gaps by File
| File                    | Missing | Incomplete | Malformed |
|-------------------------|---------|------------|-----------|
| `{file.ts}`             | {n}     | {n}        | {n}       |

### Top Gaps (detail)
#### {file.ts}
- **Missing**: `{methodName}()` — public method, no doc comment
- **Incomplete**: `{className}.{prop}` — missing @param for `{paramName}`
- **Malformed**: `{methodName}()` — @returns tag empty

### Suggested Stubs (if --generate-stubs)
{TSDoc comment blocks ready to paste}
```

## Validation

- Coverage percentage is accurate (manually verifiable on small sample)
- Only public/exported members counted (private/protected excluded unless opted in)
- Malformed detection catches real syntax issues (not false positives)
- Generated stubs compile without errors when inserted
- .spec.ts and test files excluded from audit
