#!/bin/bash
# ORCH Audit — Prompt Logger
# Triggered by: userPromptSubmitted hook event
# Purpose: Logs prompt text and estimates input tokens

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // ""')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

AUDIT_DIR=".orch/runs/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"

if [ ! -f "$SESSION_FILE" ]; then
  echo "Warning: No session file found for ${SESSION_ID}" >&2
  exit 0
fi

# Estimate tokens (~4 chars per token)
CHAR_COUNT=${#PROMPT_TEXT}
TOKEN_EST=$(( CHAR_COUNT / 4 ))

# Append prompt to session record
UPDATED=$(jq \
  --arg text "$PROMPT_TEXT" \
  --arg ts "$TIMESTAMP" \
  --argjson tokens "$TOKEN_EST" \
  '.prompts += [{"text": $text, "timestamp": $ts, "estimated_tokens": $tokens}] |
   .tokens.input_estimated += $tokens |
   .tokens.total_estimated += $tokens' \
  "$SESSION_FILE")

echo "$UPDATED" > "$SESSION_FILE"
