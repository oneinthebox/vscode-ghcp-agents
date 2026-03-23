---
name: angular-review
description: "Review Angular code against an anti-pattern checklist. Produces structured feedback with severity levels (error/warning/info). Checks for Angular-specific pitfalls, org standards, and security issues."
references:
  - references/angular/v19/anti-patterns.md
---

## Context

Angular-specific code review skill. Loads the Angular anti-pattern checklist and reviews code changes (diffs or files) against it. Checks for common Angular pitfalls: improper change detection, memory leaks from unsubscribed observables, zone.js misuse, incorrect lifecycle hook usage, and org-standard violations. Produces structured, actionable feedback.

## Inputs

- **target**: Diff (PR or staged changes) or file paths to review
- Optional: `--strict` — promote warnings to errors, add HDS/Elevate compliance checks
- Optional: `--scope {module}` — limit review to a specific module or library

## Steps

1. Load the Angular anti-pattern checklist from `references/angular/v19/anti-patterns.md`.
2. Read the diff or target files.
3. Check each change against:
   a. **Angular anti-patterns**: unsubscribed observables, manual DOM manipulation, improper OnPush usage, lifecycle hook misuse, circular dependencies.
   b. **Org standards**: prefer `@yourorg` components, inject() function over constructor injection, signals over BehaviorSubject for new code.
   c. **Security**: unsafe innerHTML, bypassSecurityTrust usage, hardcoded secrets.
   d. **Performance**: unnecessary change detection triggers, large bundle imports, missing trackBy on ngFor.
4. Classify each finding by severity (error / warning / info).
5. For each finding, produce: file + line, what is wrong, why it matters, specific fix with code.
6. Include at least one positive observation.
7. If `--strict`, add HDS token compliance and Elevate compliance checks.

## Output

```markdown
## Angular Code Review — {scope}

### Summary
{1-2 sentence overview of findings}

### Issues

#### Error: {title}
**File:** `{file}:{line}`
**What:** {description of the issue}
**Why:** {impact — bug, memory leak, performance, security}
**Fix:** {specific code suggestion}

#### Warning: {title}
...

#### Info: {title}
...

### Positive Observations
- {at least one thing done well}
```

### Severity Levels

| Severity    | Meaning                              | Action                    |
|-------------|--------------------------------------|---------------------------|
| **Error**   | Will cause bugs, leaks, or security issues | Must fix before merge     |
| **Warning** | Violates org Angular standards       | Should fix                |
| **Info**    | Improvement opportunity              | Consider, not required    |

## Validation

- Every issue references a specific file and line
- Every issue includes a concrete fix suggestion with code
- Findings map to entries in the anti-patterns checklist or org standards
- At least one positive observation included
- Strict mode checks HDS tokens and Elevate compliance when enabled
