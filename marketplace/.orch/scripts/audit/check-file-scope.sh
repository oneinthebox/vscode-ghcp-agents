#!/bin/bash
# ORCH Audit — File Scope Check
# Triggered by: postToolUse hook event
# Purpose: Checks if file edits are within agent's declared scope

set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")

# Only check file-modifying tools
if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Extract file path from tool parameters
FILE_PATH=$(echo "$INPUT" | jq -r '.toolParameters.file // .toolParameters.filePath // ""')
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

AUDIT_DIR=".orch/runs/${DATE_DIR}"
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"
BOUNDARIES_FILE=".orch/audit/config/boundaries.yaml"

if [ ! -f "$SESSION_FILE" ] || [ ! -f "$BOUNDARIES_FILE" ]; then
  exit 0
fi

AGENT_NAME=$(jq -r '.agent.name // "unknown"' "$SESSION_FILE")

# Check if file is in scope
if ! command -v python3 &>/dev/null; then
  exit 0
fi

IN_SCOPE=$(python3 -c "
import yaml, fnmatch, sys
try:
    with open('${BOUNDARIES_FILE}') as f:
        config = yaml.safe_load(f)
    agent_config = config.get('agents', {}).get('${AGENT_NAME}', {})
    allowed_scope = agent_config.get('allowed_scope', [])
    if not allowed_scope:
        print('in_scope')  # no restrictions
    else:
        file_path = '${FILE_PATH}'
        for pattern in allowed_scope:
            if fnmatch.fnmatch(file_path, pattern):
                print('in_scope')
                sys.exit(0)
        print('out_of_scope')
except Exception as e:
    print('in_scope')  # fail open
    print(f'Warning: {e}', file=sys.stderr)
" 2>/dev/null || echo "in_scope")

if [ "$IN_SCOPE" = "out_of_scope" ]; then
  # Log scope violation (warn, don't block by default)
  VIOLATION="{\"type\":\"file_scope\",\"session\":\"${SESSION_ID}\",\"agent\":\"${AGENT_NAME}\",\"file\":\"${FILE_PATH}\",\"timestamp\":\"${TIMESTAMP}\",\"action\":\"warned\"}"

  mkdir -p ".orch/audit"
  echo "$VIOLATION" >> ".orch/audit/violations.jsonl"

  if [ -f "$SESSION_FILE" ]; then
    UPDATED=$(jq \
      --arg file "$FILE_PATH" \
      --arg ts "$TIMESTAMP" \
      '.boundaries.scope_violations += [{"file": $file, "timestamp": $ts}] |
       .files.outside_scope += [$file]' \
      "$SESSION_FILE")
    echo "$UPDATED" > "$SESSION_FILE"
  fi

  echo "WARNING: Agent '${AGENT_NAME}' edited file outside scope: '${FILE_PATH}'" >&2
fi

exit 0
