# HDS Design Tokens — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual HDS token values. Keep under 500 lines.

## Color Tokens

| Token Name | Light Value | Dark Value | Usage |
|------------|-------------|------------|-------|
| `--hds-color-primary` | `#0057B8` | `#4DA3FF` | Primary actions, links |
| `--hds-color-surface` | `#FFFFFF` | `#1E1E1E` | Card / panel backgrounds |
<!-- ADD-HERE: add remaining color tokens -->

## Spacing Tokens

| Token Name | Value | Usage |
|------------|-------|-------|
| `--hds-space-xs` | `4px` | Inline icon gaps |
| `--hds-space-sm` | `8px` | Compact padding |
<!-- ADD-HERE: add remaining spacing tokens -->

## Typography Tokens

| Token Name | Font | Size | Weight | Usage |
|------------|------|------|--------|-------|
| `--hds-font-heading-lg` | Inter | 24px | 700 | Page titles |
| `--hds-font-body` | Inter | 14px | 400 | Body text |
<!-- ADD-HERE: add remaining typography tokens -->

## Elevation / Shadow Tokens

| Token Name | Value | Usage |
|------------|-------|-------|
| `--hds-shadow-card` | `0 2px 4px rgba(0,0,0,0.1)` | Card surfaces |
<!-- ADD-HERE: add remaining shadow tokens -->

## Usage Example

```scss
.my-card {
  background: var(--hds-color-surface);
  padding: var(--hds-space-sm);
  box-shadow: var(--hds-shadow-card);
  font: var(--hds-font-body);
}
```
