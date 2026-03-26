# Adherence Rules Reference
Source: ORCH internal
Last refreshed: 2026-03-24

Defines how adherence rules work in ORCH. Rules are post-session grep-based checks that verify generated code follows project standards. Read by `/audit-compliance` and verifier agents.

## Rule YAML Format

Rules live in `.orch/audit/config/adherence-rules.yaml`, grouped by domain.

```yaml
angular:
  - id: rule_identifier           # unique snake_case ID
    description: "Human-readable rule description"
    check_type: presence | absence # what triggers a violation
    pattern: "regex pattern"       # grep -E compatible regex
    file_glob: "**/*.component.ts" # files to check
    severity: high                 # high | medium | low
    message: "Violation message shown in report"
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier, snake_case |
| `description` | string | yes | What the rule enforces |
| `check_type` | enum | yes | `presence` = pattern found is a violation; `absence` = pattern NOT found is a violation |
| `pattern` | string | yes | Extended regex (`grep -E` compatible) |
| `file_glob` | string | yes | Glob pattern for files to scan |
| `severity` | enum | yes | `critical`, `high`, `medium`, `low` |
| `message` | string | yes | Human-readable violation message |

## Severity Levels

| Severity | Behavior | Score Impact | Action Required |
|----------|----------|--------------|-----------------|
| `critical` | Blocks workflow continuation | Fails adherence entirely | Must fix before proceeding |
| `high` | Flagged as must-fix | -10 points per violation | Must fix in current session |
| `medium` | Flagged as should-fix | -5 points per violation | Should fix, can defer |
| `low` | Informational | -1 point per violation | Consider fixing |

## Built-In Angular Rules

### Component Architecture

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `onpush_change_detection` | OnPush on all components | `changeDetection.*OnPush` | absence | high |
| `standalone_components` | Standalone declaration | `standalone:\s*true` | absence | high |
| `no_component_inheritance` | Component class extends | `class\s+\w+Component\s+extends` | presence | medium |
| `trackby_required` | trackBy on ngFor | `\*ngFor.*trackBy` | absence | medium |

### TypeScript Strictness

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_any_type` | `any` type annotations | `:\s*any\b` | presence | medium |
| `no_enum` | TypeScript enums | `^\s*export\s+enum\s+` | presence | medium |
| `no_type_assertion` | Type assertions (`as`) | `\bas\s+\w+` | presence | low |
| `no_non_null_assertion` | Non-null assertions (`!.`) | `\w+!\.\w+` | presence | medium |
| `explicit_return_types` | Return types on public methods | `public\s+\w+\([^)]*\)\s*\{` | presence | low |

### RxJS

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_manual_subscribe` | `.subscribe()` in components | `\.subscribe\(` | presence | medium |
| `no_nested_subscribe` | Nested subscribes | `\.subscribe\([^)]*\{[\s\S]*\.subscribe\(` | presence | high |
| `no_toPromise` | Deprecated `.toPromise()` | `\.toPromise\(` | presence | medium |
| `unsubscribe_required` | Missing takeUntilDestroyed | `\.subscribe\(` without `takeUntilDestroyed` | presence | medium |

### Internal Library Usage

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_console_log` | Console statements | `console\.(log\|warn\|error\|info\|debug)` | presence | medium |
| `no_hardcoded_urls` | Hardcoded API URLs | `(https?://)[a-zA-Z0-9].*\.(com\|io\|net\|org)` | presence | medium |
| `no_localstorage` | Direct storage access | `(localStorage\|sessionStorage)\.` | presence | medium |
| `use_org_components` | Raw PrimeNG usage | `<p-(button\|table\|dialog\|input\|dropdown)` | presence | medium |
| `use_elevate_http` | Raw HttpClient usage | `HttpClient` | presence | low |

### HTML / Templates

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_inline_styles` | Inline style attributes | `\[style\]\|style="` | presence | medium |
| `img_alt_required` | Missing alt on images | `<img(?![^>]*alt=)` | presence | medium |
| `no_autofocus` | autofocus attribute | `autofocus` | presence | low |
| `aria_labels` | Missing aria-label on buttons | `<button(?![^>]*aria-label)` | presence | medium |
| `no_tabindex_positive` | Positive tabindex | `tabindex="[1-9]` | presence | medium |

### CSS / SCSS

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_important` | `!important` usage | `!important` | presence | medium |
| `no_hardcoded_colors` | Hardcoded hex colors | `(color\|background\|border-color):\s*#[0-9a-fA-F]` | presence | medium |
| `no_px_font_size` | px units for font-size | `font-size:\s*\d+px` | presence | low |
| `use_hds_spacing` | Hardcoded spacing values | `(margin\|padding):\s*\d+px` | presence | low |

### Testing

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `no_karma_config` | Karma files exist | `karma\.conf` | presence | low |
| `test_data_testid` | data-testid attributes | `data-testid` | absence | low |
| `no_fdescribe` | Focused Jasmine tests | `fdescribe\|fit\(` | presence | high |
| `no_xdescribe` | Skipped Jasmine tests | `xdescribe\|xit\(` | presence | medium |
| `spec_file_exists` | Spec file for each component | `.component.ts` without `.spec.ts` | absence | medium |

### Signals (Angular 18+)

| ID | Checks For | Pattern | check_type | Severity |
|----|-----------|---------|------------|----------|
| `prefer_signal_inputs` | Legacy @Input() usage | `@Input\(\)` | presence | low |
| `prefer_signal_queries` | Legacy @ViewChild usage | `@ViewChild\(\)\|@ContentChild\(\)` | presence | low |
| `prefer_model_signals` | Legacy @Output + @Input pairs | `@Output\(\)` | presence | low |

## How Rules Are Executed

```
Session ends
  --> log-session-end.sh
    --> check-adherence.sh
      1. Read modified files from session record (files.modified + files.created)
      2. Load rules from adherence-rules.yaml
      3. Filter rules by file_glob match against modified files
      4. For each matching rule:
         a. Run: grep -E "{pattern}" {file}
         b. If check_type=presence and grep matches --> VIOLATION
         c. If check_type=absence and grep does NOT match --> VIOLATION
         d. Record file path and line number from grep output
      5. Write results to session record (adherence object)
      6. Calculate adherence score
```

## Adherence Score Calculation

```
base_score = 100
for each violation:
    if severity == "critical":  base_score -= 100  (instant zero)
    if severity == "high":      base_score -= 10
    if severity == "medium":    base_score -= 5
    if severity == "low":       base_score -= 1

adherence_score = max(0, base_score)
```

Alternative simple calculation used by `/audit-compliance`:

```
adherence_score = (rules_passed / rules_checked) * 100
```

## Adding Custom Rules

1. Edit `.orch/audit/config/adherence-rules.yaml`
2. Add a new rule under the appropriate domain key (or create a new domain)
3. Test the pattern: `grep -rE "your_pattern" --include="glob" src/`

```yaml
angular:
  # ... existing rules ...

  - id: custom_no_moment_js
    description: "No moment.js imports — use date-fns"
    check_type: presence
    pattern: "from ['\"]moment['\"]"
    file_glob: "**/*.ts"
    severity: medium
    message: "moment.js import found — use date-fns for smaller bundle size"
```

Custom rules follow the same schema and execution flow as built-in rules. They are evaluated alongside built-in rules during post-session adherence checks.
