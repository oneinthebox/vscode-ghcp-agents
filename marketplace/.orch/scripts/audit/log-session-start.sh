#!/bin/bash
# ORCH Audit — Session Start Logger
# Triggered by: sessionStart hook event
# Purpose: Creates initial audit record for the session

set -uo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // empty' 2>/dev/null || echo "")
AGENT_NAME=$(echo "$INPUT" | jq -r '.agentName // "unknown"' 2>/dev/null || echo "unknown")

# If session ID is empty or "unknown", generate one from timestamp
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "unknown" ] || [ "$SESSION_ID" = "null" ]; then
  SESSION_ID="session-$(date -u +%Y%m%d-%H%M%S)-$$"
fi
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_DIR=$(date -u +"%Y-%m-%d")
USER_NAME=$(git config user.name 2>/dev/null || echo "unknown")
USER_EMAIL=$(git config user.email 2>/dev/null || echo "unknown")
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
HOSTNAME_VAL=$(hostname 2>/dev/null || echo "unknown")

# Create session directory
AUDIT_DIR=".orch/runs/${DATE_DIR}"
mkdir -p "$AUDIT_DIR"

# Write initial session record
SESSION_FILE="${AUDIT_DIR}/${SESSION_ID}.json"
cat > "$SESSION_FILE" << EOF
{
  "session_id": "${SESSION_ID}",
  "identity": {
    "user": "${USER_NAME}",
    "email": "${USER_EMAIL}",
    "machine": "${HOSTNAME_VAL}",
    "repo": "${REPO_URL}",
    "branch": "${BRANCH}"
  },
  "agent": {
    "name": "${AGENT_NAME}"
  },
  "timing": {
    "started": "${TIMESTAMP}",
    "ended": null,
    "duration_sec": null
  },
  "prompts": [],
  "tools_used": [],
  "files": {
    "read": [],
    "modified": [],
    "created": [],
    "deleted": [],
    "outside_scope": []
  },
  "tokens": {
    "input_estimated": 0,
    "output_estimated": 0,
    "total_estimated": 0
  },
  "boundaries": {
    "tool_violations": [],
    "scope_violations": []
  },
  "adherence": {
    "score": null,
    "rules_checked": 0,
    "rules_passed": 0,
    "rules_failed": []
  },
  "validation": {
    "build": null,
    "test": null,
    "lint": null,
    "overall_score": null
  }
}
EOF

echo "Audit session started: ${SESSION_ID}" >&2
