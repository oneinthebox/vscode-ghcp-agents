#!/bin/bash
# ORCH Audit — Context Health Check
# Called by: postToolUse hook (via audit-scope.json) periodically
# Purpose: Detect context rot by tracking token accumulation and adherence drops
# Output: Updates session-status.json with quality status

set -uo pipefail

SESSION_FILE="${1:-}"
if [ -z "$SESSION_FILE" ] || [ ! -f "$SESSION_FILE" ]; then
  exit 0
fi

STATUS_FILE=".orch/audit/session-status.json"

# Get current metrics
TOTAL_TOKENS=$(jq '.tokens.total_estimated // 0' "$SESSION_FILE")
TOOL_COUNT=$(jq '.tools_used | length // 0' "$SESSION_FILE")
ADHERENCE_CURRENT=$(jq '.adherence.score // 100' "$SESSION_FILE")

# Determine model context limit from agent config
AGENT_NAME=$(jq -r '.agent.name // "unknown"' "$SESSION_FILE")
# Default limits by model family — conservative estimates
CONTEXT_LIMIT=200000

# Calculate token percentage
if [ "$CONTEXT_LIMIT" -gt 0 ]; then
  TOKEN_PCT=$(( (TOTAL_TOKENS * 100) / CONTEXT_LIMIT ))
else
  TOKEN_PCT=0
fi

# Get adherence baseline from status file (set on first check)
if [ -f "$STATUS_FILE" ]; then
  ADHERENCE_BASELINE=$(jq '._internal.adherence_baseline // 100' "$STATUS_FILE")
else
  ADHERENCE_BASELINE="$ADHERENCE_CURRENT"
fi

# If this is the first check, set baseline
if [ "$TOOL_COUNT" -le 1 ]; then
  ADHERENCE_BASELINE="$ADHERENCE_CURRENT"
fi

ADHERENCE_DROP=$(( ADHERENCE_BASELINE - ADHERENCE_CURRENT ))
if [ "$ADHERENCE_DROP" -lt 0 ]; then
  ADHERENCE_DROP=0
fi

# Determine quality status (user-facing language, no token talk)
if [ "$TOKEN_PCT" -ge 85 ] || [ "$ADHERENCE_DROP" -ge 20 ]; then
  QUALITY_STATUS="poor"
  QUALITY_MSG="Quality too low to continue reliably. Start a fresh session."
elif [ "$TOKEN_PCT" -ge 75 ] || [ "$ADHERENCE_DROP" -ge 10 ]; then
  QUALITY_STATUS="declining"
  QUALITY_MSG="Quality is declining. Consider starting a fresh session for remaining work."
elif [ "$TOKEN_PCT" -ge 60 ] || [ "$ADHERENCE_DROP" -ge 5 ]; then
  QUALITY_STATUS="fair"
  QUALITY_MSG="Quality is fair. Wrap up current task soon."
else
  QUALITY_STATUS="good"
  QUALITY_MSG=""
fi

# Update internal section of session-status.json
if [ -f "$STATUS_FILE" ]; then
  UPDATED=$(jq \
    --arg qs "$QUALITY_STATUS" \
    --arg qm "$QUALITY_MSG" \
    --argjson tp "$TOKEN_PCT" \
    --argjson tu "$TOTAL_TOKENS" \
    --argjson cl "$CONTEXT_LIMIT" \
    --argjson ab "$ADHERENCE_BASELINE" \
    --argjson ac "$ADHERENCE_CURRENT" \
    --argjson ad "$ADHERENCE_DROP" \
    --argjson tc "$TOOL_COUNT" \
    '.quality.status = $qs |
     .quality.adherence_score = $ac |
     (if $qm != "" then .quality.message = $qm else . end) |
     ._internal.token_pct = $tp |
     ._internal.tokens_used = $tu |
     ._internal.context_limit = $cl |
     ._internal.adherence_baseline = $ab |
     ._internal.adherence_drop = $ad |
     ._internal.context_status = (
       if $tp >= 85 then "RED"
       elif $tp >= 75 then "ORANGE"
       elif $tp >= 60 then "YELLOW"
       else "GREEN"
       end
     ) |
     ._internal.tool_count = $tc' \
    "$STATUS_FILE")
  echo "$UPDATED" > "$STATUS_FILE"
fi

# Emit to stderr only for declining/poor (agent and Copilot panel see this)
if [ "$QUALITY_STATUS" = "poor" ]; then
  echo "ORCH: Quality too low to continue reliably. Start a fresh session. Run /orch-context-compact for a handoff summary." >&2
elif [ "$QUALITY_STATUS" = "declining" ]; then
  echo "ORCH: Quality declining. Consider starting a fresh session for remaining work." >&2
fi
