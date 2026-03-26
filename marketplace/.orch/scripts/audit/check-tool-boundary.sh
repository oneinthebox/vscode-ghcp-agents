#!/bin/bash
# ORCH Audit — Tool Boundary Enforcement
# Triggered by: preToolUse hook event
# Purpose: Blocks tool calls not in agent's declared tools list
# Exit 0 = allow, Exit 1 = block

set -uo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

AUDIT_DIR=".orch/runs/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"
BOUNDARIES_FILE=".orch/audit/config/boundaries.yaml"

# If no boundaries config, allow everything (log warning)
if [ ! -f "$BOUNDARIES_FILE" ]; then
  echo "Warning: No boundaries.yaml found — allowing all tools" >&2
  exit 0
fi

# Get agent name from session file
if [ -f "$SESSION_FILE" ]; then
  AGENT_NAME=$(jq -r '.agent.name // "unknown"' "$SESSION_FILE")
else
  echo "Warning: No session file found — allowing tool" >&2
  exit 0
fi

# Check if agent exists in boundaries
if ! command -v python3 &>/dev/null; then
  echo "Warning: python3 not available — skipping boundary check" >&2
  exit 0
fi

ALLOWED=$(python3 -c "
import yaml, sys
try:
    with open('${BOUNDARIES_FILE}') as f:
        config = yaml.safe_load(f)
    agent_config = config.get('agents', {}).get('${AGENT_NAME}', {})
    allowed_tools = agent_config.get('allowed_tools', [])
    if not allowed_tools:
        print('allow')  # no restrictions configured
    elif '${TOOL_NAME}' in allowed_tools:
        print('allow')
    else:
        print('block')
except Exception as e:
    print('allow')  # fail open on config errors
    print(f'Warning: {e}', file=sys.stderr)
" 2>/dev/null || echo "allow")

if [ "$ALLOWED" = "block" ]; then
  # Log violation
  VIOLATION="{\"type\":\"tool_boundary\",\"session\":\"${SESSION_ID}\",\"agent\":\"${AGENT_NAME}\",\"tool\":\"${TOOL_NAME}\",\"timestamp\":\"${TIMESTAMP}\",\"action\":\"blocked\"}"

  # Append to violations log
  mkdir -p ".orch/audit"
  echo "$VIOLATION" >> ".orch/audit/violations.jsonl"

  # Update session file
  if [ -f "$SESSION_FILE" ]; then
    UPDATED=$(jq \
      --arg tool "$TOOL_NAME" \
      --arg ts "$TIMESTAMP" \
      '.boundaries.tool_violations += [{"tool": $tool, "timestamp": $ts, "blocked": true}]' \
      "$SESSION_FILE")
    echo "$UPDATED" > "$SESSION_FILE"
  fi

  echo "BLOCKED: Agent '${AGENT_NAME}' attempted unauthorized tool '${TOOL_NAME}'" >&2
  exit 1
fi

exit 0
