#!/bin/bash
# ORCH Audit — Tool Result Logger
# Triggered by: postToolUse hook event
# Purpose: Logs tool usage details and estimates output tokens

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // "unknown"')
TOOL_RESULT=$(echo "$INPUT" | jq -r '.toolResult // ""')
SUCCESS=$(echo "$INPUT" | jq -r '.success // true')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

AUDIT_DIR=".orch/audit/sessions/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"

if [ ! -f "$SESSION_FILE" ]; then
  exit 0
fi

# Estimate output tokens from result (~4 chars per token)
RESULT_LENGTH=${#TOOL_RESULT}
OUTPUT_TOKENS=$(( RESULT_LENGTH / 4 ))

# Append tool usage to session record
UPDATED=$(jq \
  --arg tool "$TOOL_NAME" \
  --arg ts "$TIMESTAMP" \
  --argjson success "$SUCCESS" \
  --argjson tokens "$OUTPUT_TOKENS" \
  '.tools_used += [{"tool": $tool, "timestamp": $ts, "success": $success, "output_tokens_est": $tokens}] |
   .tokens.output_estimated += $tokens |
   .tokens.total_estimated += $tokens' \
  "$SESSION_FILE")

echo "$UPDATED" > "$SESSION_FILE"
