#!/bin/bash
# ORCH Audit — Error Logger
# Triggered by: errorOccurred hook event
# Purpose: Logs error details to session record

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
ERROR_MSG=$(echo "$INPUT" | jq -r '.error // "unknown error"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

AUDIT_DIR=".orch/audit/sessions/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"

# Log to session file if it exists
if [ -f "$SESSION_FILE" ]; then
  UPDATED=$(jq \
    --arg error "$ERROR_MSG" \
    --arg ts "$TIMESTAMP" \
    '.errors = (.errors // []) + [{"message": $error, "timestamp": $ts}]' \
    "$SESSION_FILE")
  echo "$UPDATED" > "$SESSION_FILE"
fi

# Also log to violations as an error event
VIOLATION="{\"type\":\"error\",\"session\":\"${SESSION_ID}\",\"error\":\"${ERROR_MSG}\",\"timestamp\":\"${TIMESTAMP}\"}"
mkdir -p ".orch/audit"
echo "$VIOLATION" >> ".orch/audit/violations.jsonl"

echo "Error logged for session ${SESSION_ID}: ${ERROR_MSG}" >&2
