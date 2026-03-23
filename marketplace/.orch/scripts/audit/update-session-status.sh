#!/bin/bash
# ORCH Audit — Session Status Tracker
# Called by: postToolUse hook after every tool call
# Purpose: Maintain user-facing session status with work progress
# Output: .orch/audit/session-status.json

set -euo pipefail

SESSION_FILE="${1:-}"
if [ -z "$SESSION_FILE" ] || [ ! -f "$SESSION_FILE" ]; then
  exit 0
fi

STATUS_FILE=".orch/audit/session-status.json"
REGISTRY_FILE=".orch/registry.yaml"

SESSION_ID=$(jq -r '.session_id // "unknown"' "$SESSION_FILE")
AGENT_NAME=$(jq -r '.agent.name // "unknown"' "$SESSION_FILE")
STARTED=$(jq -r '.timing.started // ""' "$SESSION_FILE")
TOOL_COUNT=$(jq '.tools_used | length // 0' "$SESSION_FILE")
MODIFIED_COUNT=$(jq '.files.modified | length // 0' "$SESSION_FILE")
CREATED_COUNT=$(jq '.files.created | length // 0' "$SESSION_FILE")

# Calculate elapsed time
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if command -v python3 &>/dev/null && [ -n "$STARTED" ]; then
  ELAPSED=$(python3 -c "
from datetime import datetime
try:
    s = datetime.fromisoformat('${STARTED}'.replace('Z','+00:00'))
    e = datetime.fromisoformat('${NOW}'.replace('Z','+00:00'))
    print(int((e-s).total_seconds()))
except: print(0)
" 2>/dev/null || echo "0")
else
  ELAPSED=0
fi

# Detect last action from most recent tool use
LAST_TOOL=$(jq -r '.tools_used[-1].tool // ""' "$SESSION_FILE")
LAST_ACTION=""
case "$LAST_TOOL" in
  edit)   LAST_ACTION="edited file" ;;
  terminal) LAST_ACTION="ran command" ;;
  codebase) LAST_ACTION="searched codebase" ;;
  fetch)  LAST_ACTION="fetched URL" ;;
  *)      LAST_ACTION="working" ;;
esac

# Detect bounded task progress
BOUNDED=false
TOTAL=0
COMPLETED=0
UNIT="items"
PCT=0

if command -v python3 &>/dev/null; then
  PROGRESS=$(python3 -c "
import json, os, glob, yaml

session_file = '${SESSION_FILE}'
registry_file = '${REGISTRY_FILE}'
agent = '${AGENT_NAME}'

with open(session_file) as f:
    session = json.load(f)

modified = session.get('files', {}).get('modified', [])
tools = session.get('tools_used', [])
tool_names = [t.get('tool','') for t in tools]

result = {'bounded': False, 'total': 0, 'completed': 0, 'unit': 'items', 'pct': 0}

# Check 1: Migration from scan — look for scan snapshots
scan_dirs = glob.glob('.github/references/scans/*/')
for scan_dir in scan_dirs:
    inventory_files = glob.glob(os.path.join(scan_dir, '**', '*.md'), recursive=True)
    for inv in inventory_files:
        try:
            with open(inv) as f:
                content = f.read()
            # Look for pattern inventory tables with counts
            if 'NgModule' in content or 'components' in content.lower():
                # Try to extract total from pattern inventory
                import re
                matches = re.findall(r'(\d+)\s*(?:NgModule|components)', content)
                if matches:
                    total = max(int(m) for m in matches)
                    # Count modified component files
                    comp_files = [f for f in modified if '.component.ts' in f]
                    result = {
                        'bounded': True,
                        'total': total,
                        'completed': len(comp_files),
                        'unit': 'components',
                        'pct': int((len(comp_files) / total * 100)) if total > 0 else 0
                    }
                    break
        except: pass

# Check 2: Doc conversion from registry
if not result['bounded'] and os.path.exists(registry_file):
    try:
        with open(registry_file) as f:
            registry = yaml.safe_load(f)
        sources = registry.get('sources', []) or []
        if sources:
            draft_stale = [s for s in sources if s.get('status') in ('draft', 'stale')]
            current = [s for s in sources if s.get('status') == 'current']
            total = len(sources)
            if total > 0 and agent == 'docs':
                result = {
                    'bounded': True,
                    'total': total,
                    'completed': len(current),
                    'unit': 'sources',
                    'pct': int((len(current) / total * 100))
                }
    except: pass

import json as j
print(j.dumps(result))
" 2>/dev/null || echo '{"bounded":false,"total":0,"completed":0,"unit":"items","pct":0}')

  BOUNDED=$(echo "$PROGRESS" | jq -r '.bounded')
  TOTAL=$(echo "$PROGRESS" | jq -r '.total')
  COMPLETED=$(echo "$PROGRESS" | jq -r '.completed')
  UNIT=$(echo "$PROGRESS" | jq -r '.unit')
  PCT=$(echo "$PROGRESS" | jq -r '.pct')
fi

# Build or update session-status.json
if [ -f "$STATUS_FILE" ]; then
  # Update existing — preserve quality and _internal sections
  UPDATED=$(jq \
    --arg sid "$SESSION_ID" \
    --arg agent "$AGENT_NAME" \
    --arg started "$STARTED" \
    --argjson elapsed "$ELAPSED" \
    --argjson bounded "$BOUNDED" \
    --argjson total "$TOTAL" \
    --argjson completed "$COMPLETED" \
    --arg unit "$UNIT" \
    --argjson pct "$PCT" \
    --arg last_action "$LAST_ACTION" \
    --argjson files_modified "$MODIFIED_COUNT" \
    --argjson files_created "$CREATED_COUNT" \
    --arg updated "$NOW" \
    '.session_id = $sid |
     .agent = $agent |
     .started = $started |
     .elapsed_sec = $elapsed |
     .work.status = "in_progress" |
     .work.bounded = $bounded |
     (if $bounded then
       .work.progress.completed = $completed |
       .work.progress.total = $total |
       .work.progress.unit = $unit |
       .work.progress.pct = $pct
     else
       .work.progress = null
     end) |
     .work.last_action = $last_action |
     .work.files_modified = $files_modified |
     .work.files_created = $files_created |
     .updated = $updated' \
    "$STATUS_FILE")
  echo "$UPDATED" > "$STATUS_FILE"
else
  # Create new
  cat > "$STATUS_FILE" << STATUSEOF
{
  "session_id": "${SESSION_ID}",
  "agent": "${AGENT_NAME}",
  "started": "${STARTED}",
  "elapsed_sec": ${ELAPSED},
  "work": {
    "status": "in_progress",
    "bounded": ${BOUNDED},
    "progress": $(if [ "$BOUNDED" = "true" ]; then echo "{\"completed\":${COMPLETED},\"total\":${TOTAL},\"unit\":\"${UNIT}\",\"pct\":${PCT}}"; else echo "null"; fi),
    "last_action": "${LAST_ACTION}",
    "files_modified": ${MODIFIED_COUNT},
    "files_created": ${CREATED_COUNT}
  },
  "quality": {
    "status": "good",
    "adherence_score": 100,
    "build": null,
    "test": null,
    "message": ""
  },
  "alerts": [],
  "_internal": {
    "token_pct": 0,
    "context_status": "GREEN",
    "adherence_baseline": 100,
    "adherence_drop": 0
  },
  "updated": "${NOW}"
}
STATUSEOF
fi

# Run context health check
if [ -x "./.orch/scripts/audit/check-context-health.sh" ]; then
  ./.orch/scripts/audit/check-context-health.sh "$SESSION_FILE"
fi
