---
name: angular-docs-comment
description: "Add inline code comments to complex logic — explains WHY, not WHAT. Targets: complex conditionals, non-obvious algorithms, workarounds, business rules, regex patterns, and performance-critical sections. Never comments obvious code."
references: []
allowed-tools:
  - codebase
  - edit
---

## Context

Adds inline `//` comments to complex code sections that need explanation. Unlike `/angular-docs-generate` (which adds TSDoc to public APIs), this skill targets the internals — the complex logic, workarounds, and business rules that a new developer would struggle to understand.

**Key principle:** Comment the WHY, not the WHAT. `// increment counter` is useless. `// retry with exponential backoff — API rate-limits at 100 req/min` is valuable.

## Inputs

- `@angular /angular-docs-comment src/app/trading/` — comment complex logic in a directory
- `@angular /angular-docs-comment src/app/trading/order.service.ts` — comment a specific file
- `@angular /angular-docs-comment --threshold high` — only comment highly complex sections (cyclomatic complexity > 10)

## Steps

1. Scan target files for complexity indicators:
   - **Complex conditionals:** nested if/else > 3 levels, switch with > 5 cases
   - **Non-obvious algorithms:** sorting, filtering, transformation chains with > 3 operators
   - **Workarounds:** `// TODO`, `// HACK`, `// WORKAROUND` that lack explanation
   - **Business rules:** numeric constants, date calculations, pricing formulas
   - **Regex patterns:** any regex longer than 20 characters
   - **Performance-critical:** `trackBy`, custom change detection, memoization, caching
   - **RxJS chains:** pipes with > 3 operators, custom operators, error recovery
2. Read the surrounding context (function purpose, service role, component behavior).
3. Write inline comments that explain:
   - **WHY** this approach was chosen (not what the code does)
   - **WHAT** the business rule means in domain terms
   - **WHEN** this workaround can be removed (if applicable)
   - **WHERE** this pattern is documented (link to reference if known)
4. Format: single-line `//` for brief explanations, block `/* */` for multi-line context only when necessary.
5. Run `ng lint` to verify no formatting issues introduced.

## Output

```markdown
## Code Comments Added

| File | Comments added | Complexity areas |
|------|---------------|-----------------|
| order.service.ts | 7 | RxJS chain, retry logic, price calculation |
| trade.guard.ts | 3 | Role-based access rules, session timeout |
| blotter.component.ts | 5 | AG Grid custom renderer, WebSocket reconnect |

Total: {n} comments across {n} files
Lint: pass (no formatting issues)

### Examples of comments added
- `order.service.ts:47` — `// Exponential backoff: API rate-limits at 100 req/min. Retry 3x with 1s, 2s, 4s delays.`
- `trade.guard.ts:23` — `// Traders can only modify orders in 'pending' status. Compliance requirement CR-2024-017.`
```

## Validation

- Comments explain WHY, not WHAT (no "increment counter" style comments)
- No comments on obvious code (variable assignments, simple returns)
- Lint passes after adding comments
- No functional code changes — only comments added
- Each comment is contextually accurate (matches what the code actually does)
