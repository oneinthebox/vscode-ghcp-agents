#!/bin/bash
# ORCH Audit — Notification Dispatcher
# Purpose: Send OS-native notifications for interrupt-worthy events ONLY
# Called by: other audit scripts when they detect critical conditions
#
# NOTIFICATION POLICY:
# Only 3 things earn a notification:
# 1. Agent needs user's decision/input
# 2. Something broke (security alert, build failure, boundary violation)
# 3. Quality too low to continue (context rot severe)
#
# Everything else: status bar + chat. Never interrupt for progress/milestones.

set -uo pipefail

LEVEL="${1:-info}"    # critical, warning, info
TITLE="${2:-ORCH}"
BODY="${3:-}"

# Only send OS notifications for critical and warning levels
# Info level is status-bar-only, no OS notification
if [ "$LEVEL" = "info" ]; then
  exit 0
fi

send_notification() {
  local title="$1"
  local body="$2"

  case "$(uname)" in
    Darwin)
      osascript -e "display notification \"${body}\" with title \"${title}\"" 2>/dev/null || true
      ;;
    Linux)
      if command -v notify-send &>/dev/null; then
        notify-send "${title}" "${body}" 2>/dev/null || true
      fi
      ;;
  esac
}

# Deduplicate: don't send the same notification twice in 5 minutes
DEDUP_DIR=".orch/audit/.notify-dedup"
mkdir -p "$DEDUP_DIR"
DEDUP_KEY=$(echo "${LEVEL}-${TITLE}-${BODY}" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "${LEVEL}")
DEDUP_FILE="${DEDUP_DIR}/${DEDUP_KEY}"

if [ -f "$DEDUP_FILE" ]; then
  LAST_SENT=$(cat "$DEDUP_FILE")
  NOW=$(date +%s)
  DIFF=$(( NOW - LAST_SENT ))
  if [ "$DIFF" -lt 300 ]; then
    # Same notification sent less than 5 minutes ago — skip
    exit 0
  fi
fi

# Send it
send_notification "$TITLE" "$BODY"

# Record send time for dedup
date +%s > "$DEDUP_FILE"
