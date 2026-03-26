# HDS Deprecated Tokens — Migration Map — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual deprecated-to-new token mappings. Keep under 500 lines.

## How to Use This Map

When auditing or migrating code, replace all deprecated tokens with their
current equivalents. Use find-and-replace or the `/angular-hds-audit` skill.

## Color Token Migrations

| Deprecated Token | Replacement Token | Notes |
|-----------------|-------------------|-------|
| `--hds-blue-500` | `--hds-color-primary` | Semantic naming adopted in HDS v3 |
| `--hds-gray-100` | `--hds-color-surface` | Now theme-aware |
<!-- ADD-HERE: add remaining color token migrations -->

## Spacing Token Migrations

| Deprecated Token | Replacement Token | Notes |
|-----------------|-------------------|-------|
| `--hds-padding-sm` | `--hds-space-sm` | Unified spacing scale in HDS v3 |
| `--hds-margin-md` | `--hds-space-md` | Unified spacing scale in HDS v3 |
<!-- ADD-HERE: add remaining spacing token migrations -->

## Typography Token Migrations

| Deprecated Token | Replacement Token | Notes |
|-----------------|-------------------|-------|
| `--hds-text-lg` | `--hds-font-heading-lg` | Combined font shorthand in v3 |
<!-- ADD-HERE: add remaining typography token migrations -->

## Component Selector Migrations

| Deprecated Selector | Replacement Selector | Notes |
|--------------------|---------------------|-------|
| `<hds-grid>` | `<hds-data-grid>` | Renamed for clarity in HDS v3 |
<!-- ADD-HERE: add remaining selector migrations -->

## Automated Migration

```bash
# The /angular-hds-audit skill detects these automatically:
@angular /angular-hds-audit src/app/
```
