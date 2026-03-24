# ORCH Semantic Analysis Layer

Generates lossless semantic summaries from source code for agent consumption and executes precise, type-aware transformations for migrations.

## Architecture

```
Source code → Language Adapter → LST (on disk, massive) → Two outputs:
                                                          ├── Semantic Summary (small, for agent context)
                                                          └── Precise Transform (for migration execution)
```

The agent never sees the raw LST. It reads the semantic summary (~2K tokens) to plan, then delegates to adapter scripts that use the LST for precise, formatting-preserving transforms.

## Adapter Pattern

Each language has its own adapter that implements the same interface:

```
adapters/
├── typescript/     → ts-morph (TypeScript Compiler API wrapper)
├── java/           → TBD: JavaParser + JavaSymbolSolver, or Moderne/OpenRewrite
└── python/         → TBD: libcst (Meta's Concrete Syntax Tree)
```

All adapters implement these operations:

| Operation | Input | Output |
|-----------|-------|--------|
| `generate-summary` | source path | semantic-summary.md (for agent context) |
| `analyze-imports` | source path | import dependency graph |
| `analyze-migrations` | source path + target version | per-file migration plan |
| `transform` | source path + transform type | transformed source (formatting preserved) |

## Usage

```bash
# Generate semantic summary for agent consumption
npx ts-node scripts/semantic/adapters/typescript/generate-summary.ts src/

# Execute a specific transform
npx ts-node scripts/semantic/adapters/typescript/transform.ts standalone src/app/trade/

# Analyze what migration steps are needed
npx ts-node scripts/semantic/adapters/typescript/analyze-migrations.ts src/ --target angular-19
```

## Adding a new language adapter

1. Create `adapters/{language}/` directory
2. Implement the 4 operations (generate-summary, analyze-imports, analyze-migrations, transform)
3. Register in `adapters/registry.yaml`
4. The `/angular-scan-arch` and `/angular-migrate-*` skills auto-detect the language and use the right adapter
