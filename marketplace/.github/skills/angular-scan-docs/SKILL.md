---
name: angular-scan-docs
description: "Scan README completeness, TSDoc coverage, code comment quality, and documentation format audit"
---

## Context

Scans the project's documentation at every level: README, inline code comments, TSDoc/JSDoc annotations, and any generated docs. Produces a documentation health report with coverage metrics and quality assessment. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan documentation" — full documentation audit
- "Check TSDoc coverage" — TSDoc/JSDoc annotation coverage for public APIs
- "Rate our README" — README completeness assessment
- "Find undocumented code" — list public APIs missing documentation

## Steps

1. Assess README completeness:
   - Check for: project description, installation, usage, configuration, contributing, license
   - Score each section: present/partial/missing
   - Check for stale info (e.g., outdated Angular version references)
2. Scan TSDoc/JSDoc coverage:
   - Identify all exported classes, interfaces, functions, and public methods
   - Check which have TSDoc/JSDoc annotations
   - Calculate coverage percentage by file and by module
3. Assess comment quality:
   - Params documented? Return types documented? Examples provided?
   - Detect low-quality comments: `// TODO`, `// FIXME`, `// HACK`, single-word comments
   - Identify commented-out code blocks
4. Check for documentation tooling:
   - Compodoc config (`tsconfig.doc.json`, `.compodocrc`)
   - Storybook config (`.storybook/`)
   - Typedoc config (`typedoc.json`)
5. Scan for supplementary docs:
   - `docs/` directory contents
   - Architecture Decision Records (`adr/`, `docs/decisions/`)
   - API documentation files
6. Detect doc format consistency:
   - Are all doc comments in the same format (TSDoc vs JSDoc)?
   - Are param types included or redundant with TypeScript types?
7. Produce the output report.

## Output

```markdown
## Documentation Scan — {project_name}

### Summary
| Metric | Value | Status |
|--------|-------|--------|
| README completeness | {n}% | {pass/warn/fail} |
| TSDoc coverage | {n}% | {pass/warn/fail} |
| Comment quality | {score} | {pass/warn/fail} |
| Doc tooling | {present/absent} | — |

### README Assessment
| Section | Status | Notes |

### TSDoc Coverage by Module
| Module | Exported Symbols | Documented | Coverage % |

### Undocumented Public APIs
| File | Symbol | Type |

### Comment Quality Issues
| Issue | Count | Examples |
|-------|-------|---------|
| TODO/FIXME | {n} | {files} |
| Commented-out code | {n} | {files} |
| Empty doc blocks | {n} | {files} |

### Documentation Tooling
| Tool | Configured? | Config File |
```

## Validation

- Coverage percentages are based on actual file scanning, not estimation
- All listed undocumented symbols exist in the codebase
- README section assessment reflects actual README content
- Comment counts match actual occurrences in source files
- No files are modified during the scan
