#!/usr/bin/env python3
"""
ORCH Audit — Token Estimation Utility
Estimates token usage for a session by analyzing the audit record.
Called by log-session-end.sh after session completes.

Token estimation approach:
- For OpenAI models: ~4 chars per token
- For Claude models: ~3.5 chars per token
- We use 3.75 as a reasonable middle ground

This is an estimate, not exact. Actual token counts are not exposed
by VS Code Copilot. This gives directional data for cost modeling
and usage tracking.
"""

import json
import sys
import os
from datetime import datetime

CHARS_PER_TOKEN = 3.75


def estimate_tokens(text: str) -> int:
    """Estimate token count from text length."""
    if not text:
        return 0
    return max(1, int(len(text) / CHARS_PER_TOKEN))


def process_session(session_file: str) -> None:
    """Read session file, compute token estimates, write back."""
    with open(session_file, 'r') as f:
        session = json.load(f)

    # Estimate input tokens from prompts
    prompt_tokens = sum(
        estimate_tokens(p.get('text', ''))
        for p in session.get('prompts', [])
    )

    # Estimate output tokens from tool results already tracked
    output_tokens = session.get('tokens', {}).get('output_estimated', 0)

    # Estimate context tokens (instructions + references)
    # This is a rough estimate based on typical instruction file sizes
    context_tokens = 2800  # average instruction context

    total = prompt_tokens + output_tokens + context_tokens

    # Update session record
    session['tokens'] = {
        'input_estimated': prompt_tokens + context_tokens,
        'output_estimated': output_tokens,
        'total_estimated': total,
        'breakdown': {
            'prompts': prompt_tokens,
            'instructions_context': context_tokens,
            'generated_output': output_tokens
        }
    }

    with open(session_file, 'w') as f:
        json.dump(session, f, indent=2)

    # Also write to daily token summary
    date_str = datetime.utcnow().strftime('%Y-%m-%d')
    tokens_dir = os.path.join('.orch', 'audit', 'tokens', date_str)
    os.makedirs(tokens_dir, exist_ok=True)

    agent_name = session.get('agent', {}).get('name', 'unknown')
    agent_file = os.path.join(tokens_dir, 'by-agent.json')

    # Read existing or create new
    if os.path.exists(agent_file):
        with open(agent_file, 'r') as f:
            agent_data = json.load(f)
    else:
        agent_data = {}

    if agent_name not in agent_data:
        agent_data[agent_name] = {
            'sessions': 0,
            'total_tokens': 0,
            'input_tokens': 0,
            'output_tokens': 0
        }

    agent_data[agent_name]['sessions'] += 1
    agent_data[agent_name]['total_tokens'] += total
    agent_data[agent_name]['input_tokens'] += prompt_tokens + context_tokens
    agent_data[agent_name]['output_tokens'] += output_tokens

    with open(agent_file, 'w') as f:
        json.dump(agent_data, f, indent=2)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: estimate-tokens.py <session-file>", file=sys.stderr)
        sys.exit(1)

    session_file = sys.argv[1]
    if not os.path.exists(session_file):
        print(f"Session file not found: {session_file}", file=sys.stderr)
        sys.exit(1)

    process_session(session_file)
