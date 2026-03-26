#!/bin/bash
# ORCH Audit — Instruction Adherence Check
# Called by: log-session-end.sh after session completes
# Purpose: Grep generated/modified code against adherence rules

set -uo pipefail

SESSION_FILE="${1:-}"
if [ -z "$SESSION_FILE" ] || [ ! -f "$SESSION_FILE" ]; then
  echo "Usage: check-adherence.sh <session-file>" >&2
  exit 1
fi

RULES_FILE=".orch/audit/config/adherence-rules.yaml"
if [ ! -f "$RULES_FILE" ]; then
  echo "No adherence rules found — skipping" >&2
  exit 0
fi

AGENT_NAME=$(jq -r '.agent.name // "unknown"' "$SESSION_FILE")
MODIFIED_FILES=$(jq -r '.files.modified[]? // empty' "$SESSION_FILE" 2>/dev/null)

if [ -z "$MODIFIED_FILES" ]; then
  echo "No modified files — skipping adherence check" >&2
  exit 0
fi

if ! command -v python3 &>/dev/null; then
  echo "python3 not available — skipping adherence check" >&2
  exit 0
fi

# Run adherence checks via Python (handles YAML parsing + glob matching)
python3 -c "
import yaml, json, fnmatch, subprocess, sys, os

with open('${RULES_FILE}') as f:
    all_rules = yaml.safe_load(f)

with open('${SESSION_FILE}') as f:
    session = json.load(f)

agent = '${AGENT_NAME}'
rules = all_rules.get(agent, [])
modified = session.get('files', {}).get('modified', [])

if not rules or not modified:
    sys.exit(0)

results = {
    'rules_checked': 0,
    'rules_passed': 0,
    'rules_failed': [],
    'score': 100
}

for rule in rules:
    rule_id = rule.get('id', 'unknown')
    pattern = rule.get('pattern', '')
    file_glob = rule.get('file_glob', '**/*')
    check_type = rule.get('check_type', 'presence')
    severity = rule.get('severity', 'medium')
    message = rule.get('message', '')

    # Filter modified files matching the rule's glob
    matching_files = [f for f in modified if fnmatch.fnmatch(f, file_glob)]
    if not matching_files:
        continue

    results['rules_checked'] += 1
    violations = []

    for filepath in matching_files:
        if not os.path.exists(filepath):
            continue
        try:
            result = subprocess.run(
                ['grep', '-n', '-E', pattern, filepath],
                capture_output=True, text=True, timeout=5
            )
            found = result.returncode == 0

            if check_type == 'presence' and found:
                # Pattern should NOT be present (anti-pattern detected)
                for line in result.stdout.strip().split('\n'):
                    if line:
                        violations.append(f'{filepath}:{line.split(\":\")[0]}')
            elif check_type == 'absence' and not found:
                # Pattern SHOULD be present (required pattern missing)
                violations.append(filepath)
        except Exception:
            pass

    if violations:
        results['rules_failed'].append({
            'rule': rule_id,
            'severity': severity,
            'message': message,
            'violations': violations[:10]  # cap at 10
        })
    else:
        results['rules_passed'] += 1

# Calculate score
total = results['rules_checked']
if total > 0:
    results['score'] = int((results['rules_passed'] / total) * 100)

# Update session file
session['adherence'] = results
with open('${SESSION_FILE}', 'w') as f:
    json.dump(session, f, indent=2)

print(f'Adherence: {results[\"rules_passed\"]}/{total} rules passed ({results[\"score\"]}%)', file=sys.stderr)
" 2>/dev/null || true
