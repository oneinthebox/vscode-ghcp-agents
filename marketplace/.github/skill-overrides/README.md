# Skill Overrides

Temporary team-specific overrides for ORCH central skills.

## Rules

1. **Every override must have an expiry** — 90 days maximum, renewable once
2. **Every override must have a tracking issue** — `central_issue` field linking to ORCH repo
3. **`replace` and `skip-rule` require central team approval**
4. **`add` does not require approval** — teams can freely add examples and references
5. **Overrides are temporary** — the goal is always to absorb into central or adapt to central

## Creating an override

1. Create a directory matching the skill name: `skill-overrides/{skill-name}/`
2. Create `overrides.yaml` declaring your overrides
3. Add override files in the same directory structure as the skill
4. Open an ORCH tracking issue for each `replace` or `skip-rule` override

## Example

```yaml
# skill-overrides/generate/overrides.yaml
skill: generate
team: trading-desk
owner: "@jane.doe"

overrides:
  - path: templates/angular/component.ts.tmpl
    action: replace
    reason: "Trading apps use BaseTradeComponent"
    approved_by: "@central-team-lead"
    approved_date: 2026-03-15
    expires: 2026-06-15
    central_issue: "ORCH-142"
    resolution: pending
```

## Override actions

| Action | Approval needed | What it does |
|--------|----------------|-------------|
| `replace` | Yes | Use override file instead of central |
| `add` | No | Load alongside central files |
| `append` | No | Append content to central file |
| `skip-rule` | Yes | Ignore a specific rule from central reference |

## Lifecycle

```
Team needs override → creates override.yaml + opens ORCH issue
→ Central approves (90-day expiry)
→ Team uses override, unblocked
→ Central evaluates: absorb / reject / renew
→ Override removed when resolved
```

## Expired overrides

When an override expires, the agent falls back to central and warns the user.
The `/orch-audit-compliance` report tracks all active and expired overrides.
