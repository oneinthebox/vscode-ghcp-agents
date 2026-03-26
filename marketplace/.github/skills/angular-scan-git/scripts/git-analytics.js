#!/usr/bin/env node
'use strict';

/**
 * Angular Git Analytics Scanner
 *
 * Analyzes git log to produce contributor stats, hotspots, bus factor,
 * and conventional commit type breakdown.
 *
 * Usage: node scripts/git-analytics.js [project-root]
 *
 * Output (stdout): JSON with totalCommits, contributors, hotspots, busFactor, commitTypes.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Configuration ───────────────────────────────────────────
const root = path.resolve(process.argv[2] || '.');
const log = (msg) => process.stderr.write(`[git-analytics] ${msg}\n`);
const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// ─── Main ────────────────────────────────────────────────────
function main() {
  log(`Scanning git history in: ${root}`);

  if (!fs.existsSync(path.join(root, '.git'))) {
    log('ERROR: Not a git repository');
    process.exit(1);
  }

  // 1. Total commit count
  const totalCommits = parseInt(git('rev-list --count HEAD'), 10) || 0;
  log(`Total commits: ${totalCommits}`);

  // 2. Date range
  const firstCommitDate = git("log --reverse --format='%aI' | head -1").replace(/'/g, '').trim();
  const lastCommitDate = git("log -1 --format='%aI'").replace(/'/g, '').trim();
  log(`Date range: ${firstCommitDate} to ${lastCommitDate}`);

  // 3. Commits per month (last 12 months)
  const commitsPerMonth = parseCommitsPerMonth();
  log(`Monthly data points: ${commitsPerMonth.length}`);

  // 4. Contributors
  const allTimeContributors = parseContributors('');
  const recentContributors = parseContributors(`--since='${SIX_MONTHS_AGO}'`);
  log(`Contributors all-time: ${allTimeContributors.length}, recent: ${recentContributors.length}`);

  // 5. Bus factor
  const busFactor = calculateBusFactor(recentContributors);
  log(`Bus factor: ${busFactor}`);

  // 6. Commit types (conventional commits analysis)
  const commitTypes = analyzeCommitTypes();
  log(`Commit types analyzed`);

  // 7. Hotspots
  const hotspots = calculateHotspots();
  log(`Hotspots: ${hotspots.length}`);

  // 8. Branch info
  const branches = analyzeBranches();
  log(`Branches: ${branches.total}`);

  // 9. Recent activity
  const recentCommits = parseRecentCommits();

  // 10. Tags / releases
  const releases = parseReleases();
  log(`Tags/releases: ${releases.length}`);

  const result = {
    totalCommits,
    dateRange: { first: firstCommitDate, last: lastCommitDate },
    commitsPerMonth,
    contributors: {
      allTime: allTimeContributors,
      recent: recentContributors,
    },
    busFactor,
    commitTypes,
    hotspots,
    branches,
    releases,
    recentCommits,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log('Done.');
}

// ─── Commits per month ───────────────────────────────────────
function parseCommitsPerMonth() {
  const raw = git("log --format='%aI' --since='12 months ago'");
  if (!raw.trim()) return [];

  const counts = {};
  const lines = raw.trim().split('\n');
  for (const line of lines) {
    const month = line.replace(/'/g, '').trim().slice(0, 7);
    if (month) counts[month] = (counts[month] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, count]) => ({ month, count }));
}

// ─── Contributors ────────────────────────────────────────────
function parseContributors(sinceFlag) {
  const raw = git(`shortlog -sn --no-merges ${sinceFlag}`);
  if (!raw.trim()) return [];

  const contributors = [];
  const lines = raw.trim().split('\n');
  const totalCommits = lines.reduce((sum, line) => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const commits = parseInt(match[1], 10);
    const name = match[2].trim();
    contributors.push({
      name,
      commits,
      percentage: totalCommits > 0 ? Math.round((commits / totalCommits) * 100) : 0,
    });
  }

  return contributors;
}

// ─── Bus factor ──────────────────────────────────────────────
function calculateBusFactor(recentContributors) {
  if (recentContributors.length === 0) return 0;

  const totalRecent = recentContributors.reduce((s, c) => s + c.commits, 0);
  const threshold = totalRecent * 0.8;
  let cumulative = 0;
  let count = 0;

  for (const contributor of recentContributors) {
    cumulative += contributor.commits;
    count++;
    if (cumulative >= threshold) break;
  }

  return count;
}

// ─── Commit type analysis ────────────────────────────────────
function analyzeCommitTypes() {
  const raw = git("log --format='%s' -100");
  if (!raw.trim()) return {};

  const types = {
    feat: 0, fix: 0, chore: 0, docs: 0, refactor: 0,
    test: 0, ci: 0, style: 0, perf: 0, build: 0,
    nonConventional: 0,
  };
  const conventionalPattern = /^(feat|fix|chore|docs|refactor|test|ci|style|perf|build)(\(.+\))?!?:/;

  const lines = raw.trim().split('\n');
  const total = lines.length;

  for (const line of lines) {
    const cleaned = line.replace(/'/g, '').trim();
    const match = cleaned.match(conventionalPattern);
    if (match) {
      const type = match[1];
      types[type] = (types[type] || 0) + 1;
    } else {
      types.nonConventional++;
    }
  }

  const conventionalPercent = total > 0
    ? Math.round(((total - types.nonConventional) / total) * 100)
    : 0;

  return {
    ...types,
    total,
    conventionalPercent,
  };
}

// ─── Hotspot calculation ─────────────────────────────────────
function calculateHotspots() {
  const raw = git(`log --name-only --format='' --since='${SIX_MONTHS_AGO}'`);
  if (!raw.trim()) return [];

  // Count file frequencies
  const freq = {};
  const lines = raw.trim().split('\n');
  for (const line of lines) {
    const file = line.trim();
    if (!file || file.includes('node_modules') || file.includes('dist/')) continue;
    freq[file] = (freq[file] || 0) + 1;
  }

  // Sort by frequency and take top 20
  const sorted = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  const hotspots = [];
  const now = Date.now();

  for (const [file, frequency] of sorted) {
    // Get last change date
    const lastChanged = git(`log -1 --format='%aI' -- '${file}'`).replace(/'/g, '').trim();
    const lastChangedDate = lastChanged ? new Date(lastChanged) : new Date();
    const daysAgo = Math.floor((now - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency weight
    let recencyWeight = 0.4;
    if (daysAgo <= 30) recencyWeight = 1.0;
    else if (daysAgo <= 90) recencyWeight = 0.7;

    // File size for complexity weight (capped at 3.0)
    let complexityWeight = 1.0;
    const filePath = path.join(root, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').length;
        complexityWeight = Math.min(3.0, lineCount / 100);
      } catch { /* ignore */ }
    }

    const score = Math.round(frequency * recencyWeight * complexityWeight * 10) / 10;

    // Get contributors for this file
    const contribRaw = git(`shortlog -sn --no-merges --since='${SIX_MONTHS_AGO}' -- '${file}'`);
    const contributors = contribRaw.trim()
      ? contribRaw.trim().split('\n').length
      : 0;

    hotspots.push({
      file,
      frequency,
      daysAgo,
      lastChanged,
      recencyWeight,
      complexityWeight: Math.round(complexityWeight * 10) / 10,
      score,
      contributors,
    });
  }

  return hotspots.sort((a, b) => b.score - a.score);
}

// ─── Branch analysis ─────────────────────────────────────────
function analyzeBranches() {
  const raw = git("branch -a --format='%(refname:short)'");
  if (!raw.trim()) return { total: 0, byType: {}, stale: [] };

  const branches = raw.trim().split('\n').map(b => b.replace(/'/g, '').trim()).filter(Boolean);
  const byType = { feature: 0, bugfix: 0, release: 0, hotfix: 0, integration: 0, other: 0 };

  for (const branch of branches) {
    if (/^(feature|feat)\//.test(branch)) byType.feature++;
    else if (/^(bugfix|fix)\//.test(branch)) byType.bugfix++;
    else if (/^release\//.test(branch)) byType.release++;
    else if (/^hotfix\//.test(branch)) byType.hotfix++;
    else if (/^(main|master|develop)$/.test(branch.replace(/^origin\//, ''))) byType.integration++;
    else byType.other++;
  }

  // Detect merge style from last 20 merge commits
  const mergeLog = git('log --merges --oneline -20');
  let mergeStyle = 'unknown';
  if (mergeLog.includes('Merge pull request')) mergeStyle = 'merge-commit';
  else if (mergeLog.includes('Squash') || !mergeLog.trim()) mergeStyle = 'squash-or-rebase';

  return {
    total: branches.length,
    byType,
    mergeStyle,
  };
}

// ─── Recent commits ──────────────────────────────────────────
function parseRecentCommits() {
  const raw = git("log --oneline -10 --format='%h|%s|%an|%ar'");
  if (!raw.trim()) return [];

  return raw.trim().split('\n').map(line => {
    const cleaned = line.replace(/'/g, '');
    const parts = cleaned.split('|');
    if (parts.length < 4) return null;
    return { hash: parts[0], message: parts[1], author: parts[2], when: parts[3] };
  }).filter(Boolean);
}

// ─── Release / tag parsing ───────────────────────────────────
function parseReleases() {
  const raw = git('tag --list --sort=-version:refname');
  if (!raw.trim()) return [];

  const tags = raw.trim().split('\n').filter(Boolean).slice(0, 10);
  const releases = [];

  for (const tag of tags) {
    const date = git(`log -1 --format='%aI' '${tag}'`).replace(/'/g, '').trim();
    releases.push({ tag, date });
  }

  return releases;
}

// ─── Helpers ─────────────────────────────────────────────────
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    return e.stdout || '';
  }
}

// ─── Run ─────────────────────────────────────────────────────
main();
