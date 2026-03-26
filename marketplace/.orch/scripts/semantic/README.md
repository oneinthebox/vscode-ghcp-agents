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

## Dependencies

Semantic adapters depend on packages installed in `.orch/node_modules/` (isolated from your project's dependencies). The `ts-morph` and `ts-node` packages are listed in `.orch/package.json` and installed automatically by `orch init`.

To reinstall manually:
```bash
cd .orch && npm install
```

Do **not** add `ts-morph` or `ts-node` to your project's `package.json` — ORCH manages its own copies.

## Usage

```bash
# Generate semantic summary for agent consumption
npx --prefix .orch ts-node .orch/scripts/semantic/adapters/typescript/generate-summary.ts src/

# Execute a specific transform
npx --prefix .orch ts-node .orch/scripts/semantic/adapters/typescript/transform.ts standalone src/app/trade/

# Analyze what migration steps are needed
npx --prefix .orch ts-node .orch/scripts/semantic/adapters/typescript/analyze-migrations.ts src/ --target angular-19
```

## Adding a new language adapter

1. Create `adapters/{language}/` directory
2. Implement the 4 operations (generate-summary, analyze-imports, analyze-migrations, transform)
3. Register in `adapters/registry.yaml`
4. The `/angular-scan-arch` and `/angular-migrate-*` skills auto-detect the language and use the right adapter
