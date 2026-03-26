#!/bin/bash
# ORCH Audit — Metrics Aggregation
# Purpose: Roll up daily session data into summary metrics
# Usage: ./aggregate-metrics.sh [date] (defaults to today)

set -uo pipefail

DATE="${1:-$(date -u +%Y-%m-%d)}"
SESSIONS_DIR=".orch/runs/${DATE}"
METRICS_DIR=".orch/audit/metrics/daily"

mkdir -p "$METRICS_DIR"

if [ ! -d "$SESSIONS_DIR" ]; then
  echo "No sessions found for ${DATE}" >&2
  exit 0
fi

if ! command -v python3 &>/dev/null; then
  echo "python3 required for metrics aggregation" >&2
  exit 1
fi

python3 -c "
import json, os, glob

sessions_dir = '${SESSIONS_DIR}'
metrics_file = '${METRICS_DIR}/${DATE}.json'

sessions = []
for f in glob.glob(os.path.join(sessions_dir, '*.json')):
    try:
        with open(f) as fh:
            sessions.append(json.load(fh))
    except Exception:
        pass

if not sessions:
    print('No valid sessions found')
    exit(0)

# Aggregate
metrics = {
    'date': '${DATE}',
    'total_sessions': len(sessions),
    'by_agent': {},
    'by_model': {},
    'tokens': {
        'total_input': 0,
        'total_output': 0,
        'total': 0
    },
    'violations': {
        'tool_boundary': 0,
        'file_scope': 0
    },
    'adherence': {
        'avg_score': 0,
        'sessions_checked': 0
    },
    'unique_users': set()
}

adherence_scores = []

for s in sessions:
    agent = s.get('agent', {}).get('name', 'unknown')
    user = s.get('identity', {}).get('user', 'unknown')
    metrics['unique_users'].add(user)

    # By agent
    if agent not in metrics['by_agent']:
        metrics['by_agent'][agent] = {'sessions': 0, 'tokens': 0, 'avg_duration': 0, 'durations': []}
    metrics['by_agent'][agent]['sessions'] += 1
    dur = s.get('timing', {}).get('duration_sec', 0) or 0
    metrics['by_agent'][agent]['durations'].append(dur)
    metrics['by_agent'][agent]['tokens'] += s.get('tokens', {}).get('total_estimated', 0)

    # Tokens
    tokens = s.get('tokens', {})
    metrics['tokens']['total_input'] += tokens.get('input_estimated', 0)
    metrics['tokens']['total_output'] += tokens.get('output_estimated', 0)
    metrics['tokens']['total'] += tokens.get('total_estimated', 0)

    # Violations
    boundaries = s.get('boundaries', {})
    metrics['violations']['tool_boundary'] += len(boundaries.get('tool_violations', []))
    metrics['violations']['file_scope'] += len(boundaries.get('scope_violations', []))

    # Adherence
    adherence = s.get('adherence', {})
    score = adherence.get('score')
    if score is not None:
        adherence_scores.append(score)

# Compute averages
for agent_data in metrics['by_agent'].values():
    durations = agent_data.pop('durations')
    agent_data['avg_duration'] = int(sum(durations) / len(durations)) if durations else 0

if adherence_scores:
    metrics['adherence']['avg_score'] = int(sum(adherence_scores) / len(adherence_scores))
    metrics['adherence']['sessions_checked'] = len(adherence_scores)

metrics['unique_users'] = len(metrics['unique_users'])

with open(metrics_file, 'w') as f:
    json.dump(metrics, f, indent=2)

print(f'Metrics aggregated: {len(sessions)} sessions, {metrics[\"unique_users\"]} users, {metrics[\"tokens\"][\"total\"]} tokens')
" 2>/dev/null
