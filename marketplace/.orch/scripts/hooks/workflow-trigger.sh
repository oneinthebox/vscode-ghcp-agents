#!/bin/bash
# ORCH Hook — Workflow Trigger
# Triggered by: userPromptSubmitted (before LLM processes the message)
# Purpose: Detect workflow trigger keywords in the user's prompt.
#          If matched: publish events + start relay (BEFORE the LLM decides).
#          Inject additionalContext telling the LLM the workflow is running.
#
# This removes the LLM from the trigger decision. The hook is deterministic
# and script-based — it always triggers correctly, unlike instruction-based routing.

set -uo pipefail

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // ""' 2>/dev/null || echo "")

# If prompt is empty, let it through
if [ -z "$PROMPT" ]; then
  exit 0
fi

# ─── Extract flags ──────────────────────────────────────────────────────────

AUTO_FLAG=""
if echo "$PROMPT" | grep -qi "\-\-auto"; then
  AUTO_FLAG="--auto"
fi

# ─── Match workflow triggers ────────────────────────────────────────────────
# These patterns match the `trigger:` field in each workflow YAML.
# Only matches when the prompt contains workflow-like intent.

MATCHED_WORKFLOW=""
MATCHED_NAME=""
PHASE_COUNT=""

# Recap / overview / onboard
if echo "$PROMPT" | grep -qiE "recap|overview|onboard|walkthrough|(explain|describe|summarize).*(project|app|codebase|everything)"; then
  MATCHED_WORKFLOW=".orch/workflows/angular-project-recap.yaml"
  MATCHED_NAME="angular-project-recap"
  PHASE_COUNT="11"

# Migration / upgrade
elif echo "$PROMPT" | grep -qiE "(upgrade|migrate|update).*(angular|version|latest|v[0-9])"; then
  MATCHED_WORKFLOW=".orch/workflows/angular-migration.yaml"
  MATCHED_NAME="angular-migration"
  PHASE_COUNT="10"

# Create / scaffold / generate feature
elif echo "$PROMPT" | grep -qiE "(create|scaffold|generate|build|add).*(feature|module|app)"; then
  MATCHED_WORKFLOW=".orch/workflows/angular-new-feature.yaml"
  MATCHED_NAME="angular-new-feature"
  PHASE_COUNT="10"
fi

# ─── No match — exit silently, let the LLM handle it ───────────────────────

if [ -z "$MATCHED_WORKFLOW" ]; then
  exit 0
fi

# Verify workflow YAML exists on disk
if [ ! -f "$MATCHED_WORKFLOW" ]; then
  exit 0
fi

# Check if a workflow is already running (don't double-publish)
if [ -f ".orch/workflow-state/active-run.json" ]; then
  EXISTING_RUN=$(jq -r '.workflow_name // ""' .orch/workflow-state/active-run.json 2>/dev/null || echo "")
  if [ -n "$EXISTING_RUN" ]; then
    # Workflow already active — inject status instead of publishing
    cat <<EOFACTIVE
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "ORCH WORKFLOW ALREADY ACTIVE: ${EXISTING_RUN} is currently running. Check .orch/workflow-state/active-run.json for the run ID. Read the event files in .orch/workflow-state/events/ to report current progress to the user. Do NOT start a new workflow."
  }
}
EOFACTIVE
    exit 0
  fi
fi

# ─── PUNCH 1: Publish events + start relay ──────────────────────────────────

# Build context JSON from the prompt
CONTEXT="{}"

# For migrations: extract target version number
if [ "$MATCHED_NAME" = "angular-migration" ]; then
  TARGET_VERSION=$(echo "$PROMPT" | grep -oE "[0-9]+" | tail -1)
  if [ -n "$TARGET_VERSION" ]; then
    CONTEXT="{\"to\":\"${TARGET_VERSION}\"}"
  fi
fi

# For features: extract feature name (words after create/scaffold/generate/add)
if [ "$MATCHED_NAME" = "angular-new-feature" ]; then
  FEATURE_NAME=$(echo "$PROMPT" | sed -E 's/.*(create|scaffold|generate|build|add)\s+(a\s+)?//i' | sed -E 's/\s*(feature|module|--auto).*//i' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  if [ -n "$FEATURE_NAME" ]; then
    CONTEXT="{\"feature_name\":\"${FEATURE_NAME}\",\"target_path\":\"src/app/features/${FEATURE_NAME}\"}"
  fi
fi

# Publish the workflow events
PUBLISH_OUTPUT=$(node .orch/scripts/relay/publish.js "$MATCHED_WORKFLOW" "$CONTEXT" 2>/dev/null)
PUBLISH_EXIT=$?

if [ $PUBLISH_EXIT -ne 0 ]; then
  # Publish failed — let the LLM handle it normally
  exit 0
fi

# Extract run ID from publish output
RUN_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.run_id // ""' 2>/dev/null || echo "")

# Start the relay in background
nohup node .orch/scripts/relay/relay.js $AUTO_FLAG > /tmp/orch-relay-${SESSION_ID}.log 2>&1 &
RELAY_PID=$!

# ─── PUNCH 2: Inject context for the LLM ───────────────────────────────────

MODE_DESC="safe mode (script phases auto-run, AI phases pause for approval)"
if [ -n "$AUTO_FLAG" ]; then
  MODE_DESC="auto mode (all phases run automatically via code chat)"
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "ORCH WORKFLOW TRIGGERED: The ${MATCHED_NAME} workflow has been published with ${PHASE_COUNT} phases. Run ID: ${RUN_ID}. The relay is running in ${MODE_DESC} (PID: ${RELAY_PID}). DO NOT perform your own codebase analysis or scanning. DO NOT search the codebase for architecture, features, or patterns. The relay handles all of that through structured phases. Tell the user: 'Workflow **${MATCHED_NAME}** published. ${PHASE_COUNT} phases queued. Relay running ${MODE_DESC}. Script phases execute automatically. AI phases dispatched via code chat. Report will be generated at .orch/reports/${MATCHED_NAME}-report.html when complete. Relay log: /tmp/orch-relay-${SESSION_ID}.log'"
  }
}
EOF
