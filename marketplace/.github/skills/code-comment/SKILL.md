---
name: code-comment
description: "Audit, generate, and repair source code documentation — TSDoc, JSDoc, Compodoc, Javadoc, Python docstrings. Finds missing/stale/wrong-format docs, generates meaningful comments by reading function bodies, migrates JSDoc to TSDoc in TypeScript. Use when source code lacks proper documentation."
metadata:
  author: orch-team
  version: "1.0"
allowed-tools: Bash(npx:*) Bash(python3:*) Read Edit
---

## Context

Unified skill for source code documentation quality. Consolidates audit, generate, and repair into one workflow. The agent determines the right action based on the user's request.

## Capabilities

| Action | When to use |
|--------|------------|
| **Audit** | Assess doc coverage — find gaps before fixing |
| **Generate** | Add docs to undocumented code |
| **Repair** | Fix stale, incomplete, or wrong-format docs |

## Inputs

- "Check doc coverage for trade-app" → Audit
- "Add docs to TradeService" → Generate
- "Fix the stale docs in portfolio module" → Repair
- "Migrate JSDoc to TSDoc" → Repair with --fix-format

## Format Detection

| File type | Project type | Doc format | Extract with |
|-----------|-------------|-----------|-------------|
| `.ts` | Angular | TSDoc | Compodoc |
| `.ts` | Non-Angular | TSDoc | TypeDoc |
| `.js` | Any | JSDoc | JSDoc |
| `.java` | Any | Javadoc | Javadoc |
| `.py` | Any | Google-style docstrings | Sphinx |

**Critical rule for TypeScript:** Never use JSDoc `{type}` syntax. TypeScript provides types — TSDoc only documents intent.

## Steps

### Audit
1. Detect language and doc format per file.
2. For each public class/interface/method, check: exists? Complete? Current? Correct format?
3. Aggregate by file, module, severity.
4. Produce coverage report with priority fix list.

### Generate
1. Identify undocumented public APIs.
2. Read function body to understand purpose, params, returns, throws, side effects.
3. Generate meaningful docs (not boilerplate — describe WHAT and WHY, not just name repetition).
4. Write to source files.
5. Run compiler/linter to verify.

### Repair
1. Find stale docs (param count mismatch), incomplete (missing tags), wrong format (JSDoc in .ts).
2. For stale: add/remove/rename param docs to match actual signature.
3. For incomplete: add missing @param, @returns, @throws by reading implementation.
4. For wrong format: migrate JSDoc `{type}` → TSDoc (remove redundant types, add descriptions).
5. Write changes, verify compilation.

## Output

### Audit
```markdown
## Code Documentation Audit — {path}
### Coverage Summary
| Language | Files | Documented | Undocumented | Coverage |
### Issues by Severity
### Priority Fix List
### Format Decisions
```

### Generate / Repair
```markdown
## Code Documentation {Generated|Repaired} — {path}
| File | APIs documented | Format |
Total: {n} doc comments across {n} files.
```

## Validation

- Project compiles after changes
- Linter passes
- No JSDoc `{type}` annotations in TypeScript files
- Param counts in docs match actual signatures
- Descriptions are meaningful (not name repetition)
