'use strict';

const { execSync } = require('child_process');

const EXEC_OPTS = { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 };

/**
 * Run a git command and return trimmed stdout. Returns empty string on error.
 */
function run(cmd, cwd) {
  try {
    return execSync(cmd, { ...EXEC_OPTS, cwd: cwd || process.cwd() }).trim();
  } catch {
    return '';
  }
}

/**
 * Get commit history since a date.
 * Returns [{hash, author, date, subject, body}].
 */
function getCommitHistory(since, format) {
  const sinceArg = since ? `--since="${since}"` : '';
  const sep = '__|__';
  const fmt = format || `%H${sep}%an${sep}%aI${sep}%s${sep}%b`;
  const raw = run(`git log ${sinceArg} --pretty=format:"${fmt}" --no-merges`);
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const parts = line.split(sep);
    return {
      hash: (parts[0] || '').trim(),
      author: (parts[1] || '').trim(),
      date: (parts[2] || '').trim(),
      subject: (parts[3] || '').trim(),
      body: (parts[4] || '').trim()
    };
  });
}

/**
 * Get contributor commit counts.
 * Returns [{name, commits}] sorted descending by commits.
 */
function getContributorStats() {
  const raw = run('git shortlog -sn --no-merges HEAD');
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (!match) return null;
    return { name: match[2].trim(), commits: parseInt(match[1], 10) };
  }).filter(Boolean);
}

/**
 * Find files most frequently modified in commits since a date.
 * Returns [{file, count, lastModified}] sorted descending by count.
 */
function getFileHotspots(since, limit) {
  const sinceArg = since ? `--since="${since}"` : '';
  const raw = run(`git log ${sinceArg} --name-only --pretty=format:"" --no-merges`);
  if (!raw) return [];

  const counts = {};
  const lastSeen = {};
  const lines = raw.split('\n').filter(Boolean);
  for (const file of lines) {
    const f = file.trim();
    if (!f) continue;
    counts[f] = (counts[f] || 0) + 1;
    if (!lastSeen[f]) lastSeen[f] = new Date().toISOString();
  }

  // get last modified dates
  const files = Object.keys(counts);
  for (const f of files) {
    const date = run(`git log -1 --format="%aI" -- "${f}"`);
    if (date) lastSeen[f] = date;
  }

  const sorted = files
    .map(file => ({ file, count: counts[file], lastModified: lastSeen[file] || '' }))
    .sort((a, b) => b.count - a.count);

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Calculate bus factor: number of top contributors covering 80% of commits.
 */
function getBusFactor() {
  const stats = getContributorStats();
  if (stats.length === 0) return { busFactor: 0, contributors: [], totalCommits: 0 };

  const totalCommits = stats.reduce((sum, s) => sum + s.commits, 0);
  const threshold = totalCommits * 0.8;
  let accumulated = 0;
  const contributors = [];

  for (const contributor of stats) {
    contributors.push(contributor);
    accumulated += contributor.commits;
    if (accumulated >= threshold) break;
  }

  return {
    busFactor: contributors.length,
    contributors,
    totalCommits,
    threshold: '80%'
  };
}

/**
 * Get recent tags sorted by creation date descending.
 * Returns [{tag, date}].
 */
function getRecentTags(limit) {
  const n = limit || 10;
  const raw = run(`git tag --sort=-creatordate --format="%(refname:short)|%(creatordate:iso-strict)" | head -n ${n}`);
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const [tag, date] = line.split('|');
    return { tag: (tag || '').trim(), date: (date || '').trim() };
  });
}

module.exports = {
  getCommitHistory,
  getContributorStats,
  getFileHotspots,
  getBusFactor,
  getRecentTags
};
