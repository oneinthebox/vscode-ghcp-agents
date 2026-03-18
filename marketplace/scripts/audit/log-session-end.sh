#!/bin/bash
# ORCH Audit — Session End Logger
# Triggered by: sessionEnd hook event
# Purpose: Finalizes audit record with timing, file changes, adherence checks

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

AUDIT_DIR=".orch/audit/sessions/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"

if [ ! -f "$SESSION_FILE" ]; then
  echo "Warning: No session file found for ${SESSION_ID}" >&2
  exit 0
fi

# Calculate duration
START_TIME=$(jq -r '.timing.started' "$SESSION_FILE")
if command -v python3 &>/dev/null; then
  DURATION=$(python3 -c "
from datetime import datetime
start = datetime.fromisoformat('${START_TIME}'.replace('Z', '+00:00'))
end = datetime.fromisoformat('${TIMESTAMP}'.replace('Z', '+00:00'))
print(int((end - start).total_seconds()))
" 2>/dev/null || echo "0")
else
  DURATION=0
fi

# Capture file changes from git
MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo "[]")
NEW_FILES=$(git ls-files --others --exclude-standard 2>/dev/null | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo "[]")

# Update session file with end data
UPDATED=$(jq \
  --arg ended "$TIMESTAMP" \
  --argjson duration "$DURATION" \
  --argjson modified "$MODIFIED_FILES" \
  --argjson created "$NEW_FILES" \
  '.timing.ended = $ended |
   .timing.duration_sec = $duration |
   .files.modified = $modified |
   .files.created = $created' \
  "$SESSION_FILE")

echo "$UPDATED" > "$SESSION_FILE"

# Run adherence checks if script exists
if [ -x "./scripts/audit/check-adherence.sh" ]; then
  ./scripts/audit/check-adherence.sh "$SESSION_FILE" 2>/dev/null || true
fi

# Estimate tokens for the session
if [ -x "./scripts/audit/estimate-tokens.py" ] && command -v python3 &>/dev/null; then
  python3 ./scripts/audit/estimate-tokens.py "$SESSION_FILE" 2>/dev/null || true
fi

echo "Audit session ended: ${SESSION_ID} (${DURATION}s)" >&2
