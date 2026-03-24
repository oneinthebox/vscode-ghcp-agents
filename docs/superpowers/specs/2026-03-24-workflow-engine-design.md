# ORCH Workflow Engine — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Depends on:** 2026-03-23-orch-architecture-redesign.md

---

## 1. Problem

The migration report (`deck/examples/migrate-report.html`) shows an 8-phase coordinated workflow with pre/post checks, checkpoints, verification gates, and a stitched report. But the current skills are independent — no orchestration layer chains them, tracks timing, collects outputs, or produces the unified report.

The same problem applies to recap (8 scan skills → stitched report) and new-app creation (scaffold → configure → test → document).

---

## 2. Solution: Workflow YAML Engine

Define workflows as declarative YAML files. The `@angular` coordinator reads the workflow definition and executes phases sequentially, collecting outputs for the final report.

```
.orch/
  workflows/
    angular-migration.yaml
    angular-recap.yaml
    angular-new-app.yaml
```

---

## 3. How It Works End-to-End

```
User: "@angular upgrade to Angular 19"

1. @angular coordinator triages → workflow mode
2. Coordinator reads .orch/workflows/angular-migration.yaml
3. Phase by phase:
   - Pre-check (if defined) → capture before state
   - Invoke skill on the declared agent (planner/engineer)
   - Post-check (if defined) → capture after state, compute delta
   - Checkpoint (if true) → git commit
   - Verify (if true) → invoke @angular-verifier
   - Approval gate (if not auto=all) → show progress, wait
   - Collect outputs → store in .orch/runs/<run-id>/
4. On failure: stop/pause/rollback/continue per phase config
5. Post-workflow: stitch report from collected data, git tag, notify
6. Output: PROJECT-MIGRATE-REPORT.md + optional .html via /present-report
```

---

## 4. Workflow YAML Schema

### 4.1 Top-Level Fields

```yaml
name: angular-migration                    # unique identifier
description: "Upgrade Angular across major versions with pattern migrations"
trigger: "upgrade|migrate|update angular"  # coordinator triage keywords
report:
  template: migrate-report                 # which report template to use
  title: "Angular {{from}} → {{to}} Upgrade"
  attribution: "@angular → @angular-planner → @angular-engineer → @angular-verifier"
```

### 4.2 Phase Fields

```yaml
phases:
  - name: "Standalone migration"           # human-readable name
    id: standalone                         # unique phase id
    agent: engineer                        # planner | engineer | verifier
    skill: /angular-migrate-standalone     # single skill
    # OR
    skills:                                # multiple skills in one phase
      - /angular-test-unit
      - /angular-test-lint
    args: "--scope src/app"                # optional args passed to skill

    pre-check:                             # optional: run before the skill
      skill: /angular-scan-arch
      args: --counts-only
      capture: before-patterns             # stored in run data

    post-check:                            # optional: run after the skill
      skill: /angular-scan-arch
      args: --counts-only
      capture: after-patterns              # stored in run data

    checkpoint: true                       # git commit after phase
    verify: true                           # invoke @angular-verifier after phase
    approval: auto=safe                    # none | auto=safe | auto=all

    collect:                               # what data to capture for report
      - files-changed
      - duration
      - pattern-delta                      # auto-diffed from pre vs post captures
      - build-status
      - test-status

    report-section: "Phase Details"        # which report section this feeds
    on-failure: rollback-to-checkpoint     # stop | pause | rollback-to-checkpoint | continue | report-as-partial
```

### 4.3 Post-Workflow Fields

```yaml
post-workflow:
  report:
    sections:                              # report sections (some auto-generated)
      - "Before vs After"                  # from first scan vs last scan
      - "Phase Timeline"                   # auto: generated from phase durations
      - "Phase Details"                    # from each engineer phase
      - "Verification Results"             # from final verification phase
      - "Compatibility Changes"            # from pre/post dependency scans
      - "Risk Items"                       # auto: from verifier review findings
      - "Git History"                      # auto: list all checkpoint commits
      - "Recommendations"                  # auto: based on risks + verification
  git:
    message: "migrate: Angular {{from}} → {{to}} complete"
    tag: "migrate/angular-{{to}}-{{date}}"
  notify:
    status-bar: "Migration complete — {{phases-passed}}/{{phases-total}} phases"
```

### 4.4 Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Human-readable phase name |
| `id` | string | yes | Unique identifier for cross-references |
| `agent` | enum | yes | `planner`, `engineer`, `verifier` |
| `skill` / `skills` | string/array | yes | Skill(s) to invoke |
| `args` | string | no | Arguments passed to the skill |
| `pre-check` | object | no | Skill to run before, with `capture` key |
| `post-check` | object | no | Skill to run after, with `capture` key |
| `checkpoint` | boolean | no | Git commit after phase (default: false) |
| `verify` | boolean | no | Run verifier after phase (default: false) |
| `approval` | enum | no | `none`, `auto=safe`, `auto=all` (default: reads from config.yaml) |
| `collect` | array | no | Data to capture for report |
| `report-section` | string | no | Which report section this phase feeds |
| `on-failure` | enum | no | `stop`, `pause`, `rollback-to-checkpoint`, `continue`, `report-as-partial` |

### 4.5 Template Variables

Available in `report.title`, `git.message`, `git.tag`, `notify.status-bar`:

| Variable | Source |
|----------|--------|
| `{{from}}` | Detected current version |
| `{{to}}` | Target version from user input |
| `{{date}}` | Current date (YYYY-MM-DD) |
| `{{phases-passed}}` | Count of phases with status PASS |
| `{{phases-total}}` | Total phase count |
| `{{files-changed}}` | Sum of files changed across all phases |
| `{{duration}}` | Total workflow duration |

---

## 5. Migration Workflow Definition

```yaml
name: angular-migration
description: "Upgrade Angular across major versions with pattern migrations"
trigger: "upgrade|migrate|update angular"
report:
  template: migrate-report
  title: "Angular {{from}} → {{to}} Upgrade"
  attribution: "@angular → @angular-planner → @angular-engineer → @angular-verifier"

phases:
  - name: Scan dependencies
    id: scan-deps
    agent: planner
    skill: /angular-scan-deps
    checkpoint: false
    verify: false
    approval: none
    collect:
      - before-versions
    report-section: "Before vs After"
    on-failure: stop

  - name: Compatibility check
    id: compat
    agent: planner
    skill: /angular-compatibility
    checkpoint: false
    verify: false
    approval: auto=safe
    collect:
      - upgrade-path
      - phase-plan
    report-section: "Phase Timeline"
    on-failure: stop

  - name: Upgrade TypeScript
    id: upgrade-ts
    agent: engineer
    skill: /angular-migrate-version
    args: --scope typescript-only
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
      - build-status
      - test-status
    report-section: "Phase Details"
    on-failure: pause

  - name: Upgrade Angular core
    id: upgrade-angular
    agent: engineer
    skill: /angular-migrate-version
    args: --scope angular-core
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
      - build-status
      - test-status
    report-section: "Phase Details"
    on-failure: rollback-to-checkpoint

  - name: Standalone migration
    id: standalone
    agent: engineer
    skill: /angular-migrate-standalone
    pre-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: before-patterns
    post-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: after-patterns
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
      - pattern-delta
    report-section: "Phase Details"
    on-failure: rollback-to-checkpoint

  - name: Control flow migration
    id: control-flow
    agent: engineer
    skill: /angular-migrate-control-flow
    pre-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: before-patterns
    post-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: after-patterns
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
      - pattern-delta
    report-section: "Phase Details"
    on-failure: rollback-to-checkpoint

  - name: Signals migration
    id: signals
    agent: engineer
    skill: /angular-migrate-signals
    pre-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: before-patterns
    post-check:
      skill: /angular-scan-arch
      args: --counts-only
      capture: after-patterns
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
      - pattern-delta
    report-section: "Phase Details"
    on-failure: rollback-to-checkpoint

  - name: Third-party compatibility
    id: third-party
    agent: engineer
    skill: /angular-migrate-version
    args: --scope third-party
    checkpoint: true
    verify: true
    approval: auto=safe
    collect:
      - files-changed
      - duration
    report-section: "Phase Details"
    on-failure: pause

  - name: Final verification
    id: final-verify
    agent: verifier
    skills:
      - /angular-test-unit
      - /angular-test-e2e
      - /angular-test-lint
      - /angular-review
    checkpoint: false
    verify: false
    approval: none
    collect:
      - build-status
      - test-results
      - lint-results
      - adherence-score
      - review-findings
    report-section: "Verification Results"
    on-failure: report-as-partial

  - name: Post-scan
    id: post-scan
    agent: planner
    skill: /angular-scan-deps
    checkpoint: false
    verify: false
    approval: none
    collect:
      - after-versions
      - pattern-counts
    report-section: "Compatibility Changes"
    on-failure: continue

post-workflow:
  report:
    sections:
      - "Before vs After"
      - "Phase Timeline"
      - "Phase Details"
      - "Verification Results"
      - "Compatibility Changes"
      - "Risk Items"
      - "Git History"
      - "Recommendations"
  git:
    message: "migrate: Angular {{from}} → {{to}} complete"
    tag: "migrate/angular-{{to}}-{{date}}"
  notify:
    status-bar: "Migration complete — {{phases-passed}}/{{phases-total}} phases"
```

---

## 6. Coordinator Behavior

### 6.1 Workflow Detection

When `@angular` coordinator receives a request:
1. Triage mode: check if it matches a workflow `trigger` pattern
2. If match: load the workflow YAML from `.orch/workflows/`
3. If no match: fall through to query/quick-fix triage

### 6.2 Phase Execution Loop

```
for each phase in workflow.phases:
  1. Run pre-check (if defined) → store captured data
  2. Determine agent → delegate to planner/engineer/verifier
  3. Invoke skill(s) with args
  4. Run post-check (if defined) → store captured data, compute delta
  5. If checkpoint: git commit with message "migrate: {phase.name}"
  6. If verify: delegate to @angular-verifier → get verification report
     - If FAIL and on-failure = rollback: git revert to last checkpoint
     - If FAIL and on-failure = pause: show failure, ask human
     - If FAIL and on-failure = stop: abort workflow
  7. If approval != none and auto_mode != all: show phase result, wait
  8. Collect outputs → write to .orch/runs/<run-id>/<phase.id>/
  9. Update status bar: "Phase {n}/{total}: {phase.name} ✓"
```

### 6.3 Report Stitching

After all phases complete:
1. Read all collected data from `.orch/runs/<run-id>/`
2. For each `report.sections` entry:
   - Named sections: pull from phases with matching `report-section`
   - Auto sections ("Risk Items", "Git History", "Recommendations"): generated by coordinator
3. Produce `PROJECT-MIGRATE-REPORT.md`
4. Optionally invoke `/present-report` for HTML version
5. Git tag and notify per `post-workflow` config

### 6.4 Failure Modes

| `on-failure` | Behavior |
|--------------|----------|
| `stop` | Abort workflow. Report what completed. |
| `pause` | Show failure to human. Wait for decision (retry/skip/abort). |
| `rollback-to-checkpoint` | `git revert` to last checkpoint commit. Report as failed phase. Ask human. |
| `continue` | Log failure, skip phase, continue to next. |
| `report-as-partial` | Complete workflow but mark report as partial. |

---

## 7. Files to Create/Modify

### New files
1. `.orch/workflows/angular-migration.yaml` — migration workflow (defined in Section 5)
2. `.orch/workflows/angular-new-feature.yaml` — create feature workflow (created)
3. `.orch/workflows/angular-recap.yaml` — recap workflow (to be designed)

### Modified files
4. `angular.agent.md` — workflow detection + execution loop + status file writing (done)
5. `/angular-review` SKILL.md — expand review checklist for risk detection
6. `/angular-generate-component` SKILL.md — added Architecture Decisions table, C4 Level 3 position diagram, component data flow diagram, user interaction sequence diagram (done)
7. `/angular-generate-service` SKILL.md — added Architecture Decisions table, service dependency graph (done)
8. `/angular-generate-route` SKILL.md — added Architecture Decisions table, route navigation flow sequence diagram (done)
9. `/angular-scan-arch` SKILL.md — added C4 Level 1 System Context diagram, C4 Level 2 Container diagram (done)

### No changes needed
- Individual migrate skills — they stay focused on one task
- Verifier agent — already produces structured reports
- `.orch/config.yaml` — `auto_mode` already controls approval gates

---

## 8. Report Attribution

All workflow reports attribute the full agent chain:

```
Generated by ORCH • @angular → @angular-planner → @angular-engineer → @angular-verifier • 2026-03-24
```

The coordinator (`@angular`) is always first — it owns the workflow. Sub-agents appear in the order they were invoked.

---

## 9. Extensibility

### Adding a new workflow
1. Create `.orch/workflows/<domain>-<name>.yaml`
2. Define phases referencing existing skills
3. The coordinator auto-discovers it via trigger matching

### Adding a new phase to existing workflow
1. Add a phase entry to the YAML
2. No code changes — the coordinator reads the YAML dynamically

### Adding a new domain
Same pattern. `@springboot` coordinator reads `.orch/workflows/springboot-migration.yaml` with Spring Boot-specific skills.

---

## 10. Relationship to Existing Architecture

| Component | Role in workflows |
|-----------|------------------|
| `@orch` | Routes to domain coordinator. Not involved in workflow execution. |
| `@orch-preflight` | Runs BEFORE workflow starts (reference freshness, build baseline). |
| `@angular` coordinator | Reads workflow YAML, drives phase loop, stitches report. |
| `@angular-planner` | Executes planner phases (scan, compatibility). |
| `@angular-engineer` | Executes engineer phases (migrate, generate). |
| `@angular-verifier` | Executes verification phases + inter-phase verification. |
| `.orch/runs/<run-id>/` | Stores all collected phase outputs. |
| `/present-report` | Renders final HTML report from collected data. |
| `.orch/config.yaml` | `auto_mode` controls default approval behavior. |
