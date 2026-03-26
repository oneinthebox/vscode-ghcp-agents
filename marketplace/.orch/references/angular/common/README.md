# Angular Common References

This directory holds **version-universal** Angular reference docs that apply to ALL supported Angular versions (v16+).

## Purpose

Not every reference doc is version-specific. Patterns around project structure, naming conventions, general testing philosophy, and cross-cutting concerns remain stable across Angular releases. Those docs belong here rather than in a `v{N}/` directory.

## How it works

- **Common docs** (this directory) are loaded for every session regardless of the detected Angular version.
- **Version-specific docs** live in `v16/`, `v17/`, `v18/`, `v19/`, `v20/`, `v21/` directories and are loaded only when the resolver determines the project uses that version or newer.
- The `resolver.yaml` file at `.orch/references/angular/resolver.yaml` controls which docs are loaded and when, based on the detected `angular_version`.

## Guidelines for contributors

1. Place a doc here only if it is **truly version-agnostic** (applies to v16 through latest).
2. If a doc references APIs introduced in a specific version (e.g., `signal()` from v16, `@if` from v17), it belongs in the appropriate `v{N}/` directory instead.
3. Keep file sizes small. Each doc's estimated token count is tracked in `resolver.yaml` to stay within context budgets.
4. Use the `common_docs` section of `resolver.yaml` to register any new file added here.
