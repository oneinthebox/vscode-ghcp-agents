# Workflow YAML Reference
Source: ORCH internal
Last refreshed: 2026-03-24

Complete schema for workflow definitions in `.orch/workflows/`. Workflows define multi-phase agent orchestration sequences. Read by coordinator agents.

## File Location

```
.orch/workflows/
  angular-migration.yaml
  angular-new-feature.yaml
  audit/
  semantic/
```

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Workflow identifier (kebab-case) |
| `description` | string | yes | Human-readable summary |
| `trigger` | string | no | Regex matched against user prompt to auto-select this workflow |
| `report` | object | no | Report generation configuration |
| `phases` | array | yes | Ordered list of execution phases |
| `post-workflow` | object | no | Actions after all phases complete |

## Report Object

| Field | Type | Description |
|-------|------|-------------|
| `report.template` | string | Report template name |
| `report.title` | string | Report title (supports template variables) |
| `report.attribution` | string | Agent chain shown in report footer |

## Phase Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | required | Human-readable phase name |
| `id` | string | required | Unique phase identifier (kebab-case) |
| `agent` | string | required | Agent role: `planner`, `engineer`, `verifier`, `coordinator` |
| `skill` | string | -- | Single skill to invoke (e.g., `/angular-scan-deps`) |
| `skills` | string[] | -- | Multiple skills to invoke sequentially |
| `args` | string | -- | Arguments passed to the skill |
| `pre-check` | object | -- | Skill to run BEFORE the main skill |
| `post-check` | object | -- | Skill to run AFTER the main skill |
| `checkpoint` | boolean | `false` | Create a git checkpoint (stash/tag) before this phase |
| `verify` | boolean | `false` | Run build + test after this phase |
| `approval` | string | `none` | Approval gate: `none`, `auto=safe`, `always` |
| `collect` | string[] | `[]` | Data keys to collect from phase output |
| `report-section` | string | -- | Which report section this phase contributes to |
| `on-failure` | string | `stop` | Failure behavior |

### Pre-Check / Post-Check Object

| Field | Type | Description |
|-------|------|-------------|
| `skill` | string | Skill to invoke as check |
| `args` | string | Arguments for the check skill |
| `capture` | string | Variable name to store check output |

### skill vs skills

Use `skill` (singular) when a phase invokes one skill. Use `skills` (plural) when a phase runs multiple skills sequentially. Do not use both on the same phase.

```yaml
# Single skill
- name: Scan dependencies
  skill: /angular-scan-deps

# Multiple skills
- name: Final verification
  skills:
    - /angular-test-unit
    - /angular-test-e2e
    - /angular-test-lint
```

## Template Variable Reference

| Variable | Resolves To | Example |
|----------|------------|---------|
| `{{from}}` | Source version (user-provided or detected) | `18` |
| `{{to}}` | Target version (user-provided or detected) | `21` |
| `{{date}}` | Current date (YYYY-MM-DD) | `2026-03-24` |
| `{{timestamp}}` | Current ISO timestamp | `2026-03-24T14:30:00Z` |
| `{{branch}}` | Current git branch | `feature/angular-21` |
| `{{repo}}` | Repository name | `trading-app` |
| `{{phases-passed}}` | Count of completed phases | `8` |
| `{{phases-total}}` | Total phase count | `10` |
| `{{duration}}` | Total workflow duration | `12m 34s` |

Variables are resolved at runtime by the coordinator before rendering reports or git messages.

## Approval Modes

| Mode | Behavior |
|------|----------|
| `none` | Phase runs immediately, no user interaction |
| `auto=safe` | Runs if `config.yaml` `auto_mode` is `safe` or `all`; prompts if `step-by-step` |
| `always` | Always prompts user for explicit approval before running |

Interaction with `config.yaml`:

| `approval` | `auto_mode: step-by-step` | `auto_mode: safe` | `auto_mode: all` |
|------------|---------------------------|--------------------|--------------------|
| `none` | Runs immediately | Runs immediately | Runs immediately |
| `auto=safe` | Prompts user | Runs if read-only skill; prompts if write | Runs immediately |
| `always` | Prompts user | Prompts user | Prompts user |

## Phase Execution Loop (Pseudocode)

```python
for phase in workflow.phases:
    # 1. Approval gate
    if not check_approval(phase.approval, config.auto_mode):
        status = "skipped_by_user"
        continue

    # 2. Checkpoint
    if phase.checkpoint:
        git_stash_or_tag(f"orch/checkpoint/{phase.id}")

    # 3. Pre-check
    if phase.pre_check:
        pre_result = run_skill(phase.pre_check.skill, phase.pre_check.args)
        store(phase.pre_check.capture, pre_result)

    # 4. Execute skill(s)
    try:
        if phase.skill:
            result = run_skill(phase.skill, phase.args, agent=phase.agent)
        elif phase.skills:
            for skill in phase.skills:
                result = run_skill(skill, phase.args, agent=phase.agent)
    except SkillError as e:
        handle_failure(phase.on_failure, phase.id, e)
        continue

    # 5. Post-check
    if phase.post_check:
        post_result = run_skill(phase.post_check.skill, phase.post_check.args)
        store(phase.post_check.capture, post_result)

    # 6. Verify (build + test)
    if phase.verify:
        build_ok = run("ng build" or "nx build")
        test_ok = run("ng test" or "nx test")
        if not (build_ok and test_ok):
            handle_failure(phase.on_failure, phase.id, "verification failed")
            continue

    # 7. Collect data for report
    for key in phase.collect:
        report_data[phase.report_section][key] = extract(result, key)

    # 8. Update status
    update_status(phase.id, "completed")
```

## Failure Modes

| `on-failure` | Behavior | Use When |
|--------------|----------|----------|
| `stop` | Halt entire workflow, report partial results | Critical phases that block everything |
| `pause` | Halt, wait for user input, allow resume | Phases that may need manual intervention |
| `rollback-to-checkpoint` | `git stash pop` or reset to checkpoint tag, then pause | Write phases where rollback is safe |
| `continue` | Log failure, skip to next phase | Non-critical phases (scans, reports) |
| `report-as-partial` | Mark workflow as partial, include what completed | Final verification / reporting phases |

## Collect Keys

Standard keys that phases can collect:

| Key | Type | Description |
|-----|------|-------------|
| `before-versions` | object | Package versions before changes |
| `after-versions` | object | Package versions after changes |
| `upgrade-path` | string | Detected upgrade path (e.g., `18 -> 19 -> 20 -> 21`) |
| `phase-plan` | string | Generated plan text |
| `files-changed` | string[] | List of modified files |
| `duration` | number | Phase duration in seconds |
| `build-status` | string | `pass` or `fail` |
| `test-status` | string | `pass` or `fail` |
| `test-results` | object | Detailed test output |
| `lint-results` | object | Lint output |
| `pattern-delta` | object | Before/after pattern counts |
| `adherence-score` | number | 0-100 score |
| `review-findings` | string[] | Code review issues found |

## Report Stitching

After all phases complete, the coordinator assembles the final report.

| Section Type | Source |
|-------------|--------|
| **Auto-generated** | Title, attribution, date, duration, summary stats |
| **Collected** | Phase outputs mapped via `report-section` + `collect` keys |
| **Template** | Rendered from `report.template` |

Mapping: each phase's `report-section` value determines which section its `collect` data appears in. Multiple phases can contribute to the same section.

## Status File Format

During execution, workflow state is tracked in `.orch/workflow-state/{name}.yaml`:

```yaml
workflow: angular-migration
status: running          # pending | running | completed | failed | paused
started: "2026-03-24T14:30:00Z"
current_phase: upgrade-angular
phases:
  scan-deps:
    status: completed
    started: "2026-03-24T14:30:05Z"
    ended: "2026-03-24T14:31:20Z"
    duration_sec: 75
  compat:
    status: completed
    started: "2026-03-24T14:31:25Z"
    ended: "2026-03-24T14:33:00Z"
    duration_sec: 95
  upgrade-angular:
    status: running
    started: "2026-03-24T14:33:05Z"
    ended: null
    duration_sec: null
collected:
  before-versions: { "@angular/core": "18.2.0", "typescript": "5.4.5" }
  after-versions: null
  files-changed: ["package.json", "src/app/app.component.ts"]
checkpoints:
  - id: upgrade-ts
    tag: "orch/checkpoint/upgrade-ts"
    timestamp: "2026-03-24T14:33:00Z"
```

## Complete Example Workflow

```yaml
name: angular-new-feature
description: "Scaffold and implement a new Angular feature module"
trigger: "new feature|create feature|add feature"
report:
  template: feature-report
  title: "New Feature: {{feature-name}}"
  attribution: "@angular → @angular-planner → @angular-engineer → @angular-verifier"

phases:
  - name: Analyze requirements
    id: analyze
    agent: planner
    skill: /angular-explain
    checkpoint: false
    verify: false
    approval: none
    collect:
      - requirements
      - architecture
    report-section: "Requirements"
    on-failure: stop

  - name: Generate component
    id: gen-component
    agent: engineer
    skill: /angular-generate-component
    args: --standalone --signals
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
    report-section: "Implementation"
    on-failure: rollback-to-checkpoint

  - name: Generate service
    id: gen-service
    agent: engineer
    skill: /angular-generate-service
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
    report-section: "Implementation"
    on-failure: rollback-to-checkpoint

  - name: Generate route
    id: gen-route
    agent: engineer
    skill: /angular-generate-route
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
    report-section: "Implementation"
    on-failure: rollback-to-checkpoint

  - name: Final verification
    id: verify
    agent: verifier
    skills:
      - /angular-test-unit
      - /angular-test-lint
      - /angular-review
    checkpoint: false
    verify: false
    approval: none
    collect:
      - test-results
      - lint-results
      - adherence-score
    report-section: "Verification"
    on-failure: report-as-partial

post-workflow:
  report:
    sections:
      - "Requirements"
      - "Implementation"
      - "Verification"
      - "Recommendations"
  git:
    message: "feat: {{feature-name}} scaffolded and verified"
```
