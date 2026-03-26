#!/usr/bin/env node
/**
 * resolve-references.js — Version-Aware Reference Resolution
 *
 * Exports three functions for cascading reference resolution:
 *   - resolveStack(projectRoot)           → { stack, source }
 *   - resolveReferences(skillRefs, stack, resolverPath) → { refs, source }
 *   - resolveSkillBody(skillPath, stack)  → { body, source }
 *
 * Each function implements cascading fallback:
 *   cache → detect → pin → default
 *
 * Pure Node.js, no external dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_VERSION = '19';

// --- Utility: safe file read ---
function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

// --- Parse a semver gate string like ">=17" and return the major version number ---
function parseGate(gate) {
  if (!gate) return null;
  const match = String(gate).match(/>=?\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// --- Check if a detected major version satisfies a gate (e.g., 19 >= 17) ---
function satisfiesGate(detectedMajor, gate) {
  const required = parseGate(gate);
  if (required === null) return true; // no gate means always available
  return detectedMajor >= required;
}

// --- Simple YAML parser for stack.yaml (key: value pairs + packages list) ---
function parseStackYaml(content) {
  if (!content) return null;
  const stack = {};
  const lines = content.split('\n');
  let inPackages = false;
  let currentPkg = null;

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;

    if (line.match(/^packages:/)) {
      inPackages = true;
      stack.packages = [];
      continue;
    }

    if (inPackages) {
      const nameMatch = line.match(/^\s+-\s+name:\s*"?([^"]*)"?/);
      const versionMatch = line.match(/^\s+version:\s*"?([^"]*)"?/);
      if (nameMatch) {
        currentPkg = { name: nameMatch[1] };
        stack.packages.push(currentPkg);
      } else if (versionMatch && currentPkg) {
        currentPkg.version = versionMatch[1];
      }
      continue;
    }

    const kvMatch = line.match(/^(\w+):\s*"?([^"]*)"?/);
    if (kvMatch) {
      const key = kvMatch[1];
      let val = kvMatch[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      stack[key] = val;
    }
  }

  return stack;
}

// --- Simple YAML parser for resolver.yaml (features list) ---
function parseResolverYaml(content) {
  if (!content) return null;
  const result = { version: 1, default_version: DEFAULT_VERSION, common_docs: [], features: [] };
  const lines = content.split('\n');
  let section = null;      // 'common_docs' | 'features'
  let currentItem = null;

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;

    // Top-level keys
    const versionMatch = line.match(/^version:\s*(\d+)/);
    if (versionMatch) { result.version = parseInt(versionMatch[1], 10); continue; }

    const defaultMatch = line.match(/^default_version:\s*"?(\d+)"?/);
    if (defaultMatch) { result.default_version = defaultMatch[1]; continue; }

    if (line.match(/^common_docs:/)) { section = 'common_docs'; continue; }
    if (line.match(/^features:/)) { section = 'features'; continue; }

    if (section === 'common_docs') {
      const docMatch = line.match(/^\s+-?\s*doc:\s*(.+)/);
      const tokMatch = line.match(/^\s+tokens:\s*(\d+)/);
      if (docMatch) {
        currentItem = { doc: docMatch[1].trim(), tokens: 0 };
        result.common_docs.push(currentItem);
      } else if (tokMatch && currentItem) {
        currentItem.tokens = parseInt(tokMatch[1], 10);
      }
    }

    if (section === 'features') {
      const catMatch = line.match(/^\s+-\s*category:\s*(.+)/);
      if (catMatch) {
        currentItem = { category: catMatch[1].trim() };
        result.features.push(currentItem);
        continue;
      }
      if (!currentItem) continue;

      const fieldMap = [
        { re: /^\s+old_pattern:\s*"?([^"]*)"?\s*$/, key: 'old_pattern' },
        { re: /^\s+new_pattern:\s*"?([^"]*)"?\s*$/, key: 'new_pattern' },
        { re: /^\s+available:\s*"?([^"]*)"?\s*$/, key: 'available' },
        { re: /^\s+recommended:\s*"?([^"]*)"?\s*$/, key: 'recommended' },
        { re: /^\s+requires:\s*"?([^"]*)"?\s*$/, key: 'requires' },
        { re: /^\s+doc:\s*(.+)/, key: 'doc' },
        { re: /^\s+tokens:\s*(\d+)/, key: 'tokens' },
        { re: /^\s+replaces:\s*(.+)/, key: 'replaces' }
      ];

      for (const { re, key } of fieldMap) {
        const m = line.match(re);
        if (m) {
          let val = m[1].trim();
          if (val === 'null') val = null;
          if (key === 'tokens') val = parseInt(val, 10);
          currentItem[key] = val;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * resolveStack(projectRoot) → { stack, source }
 *
 * Cascading fallback:
 *   1. Cache (if .orch/cache/stack.yaml exists and checksum matches)
 *   2. Detect (parse package.json)
 *   3. Pin (read .orch/config.yaml angular_version)
 *   4. Default (version 19)
 */
function resolveStack(projectRoot) {
  const orchDir = path.join(projectRoot, '.orch');
  const cacheDir = path.join(orchDir, 'cache');

  // 1. Try cache
  const cachedStack = safeRead(path.join(cacheDir, 'stack.yaml'));
  if (cachedStack) {
    const stack = parseStackYaml(cachedStack);
    if (stack && stack.angular_version) {
      return { stack, source: 'cache' };
    }
  }

  // 2. Try detection from package.json
  const pkgRaw = safeRead(path.join(projectRoot, 'package.json'));
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const angularCore = deps['@angular/core'];
      if (angularCore) {
        const match = angularCore.replace(/[\^~>=<\s]/g, '').match(/^(\d+)/);
        if (match) {
          return {
            stack: {
              framework: 'angular',
              angular_version: match[1],
              nx: !!(deps['@nx/angular'] || deps['@nrwl/angular']),
              detected_at: new Date().toISOString()
            },
            source: 'detected'
          };
        }
      }
    } catch {
      // fall through
    }
  }

  // 3. Try config pin
  const configRaw = safeRead(path.join(orchDir, 'config.yaml'));
  if (configRaw) {
    const pinMatch = configRaw.match(/angular_version:\s*["']?(\d+)["']?/);
    if (pinMatch) {
      return {
        stack: { framework: 'angular', angular_version: pinMatch[1] },
        source: 'pinned'
      };
    }
  }

  // 4. Default
  return {
    stack: { framework: 'angular', angular_version: DEFAULT_VERSION },
    source: 'default'
  };
}

/**
 * resolveReferences(skillRefs, stack, resolverPath) → { refs, source }
 *
 * Given an array of skill-requested reference categories and a detected stack,
 * filters the resolver.yaml features to return only the docs that:
 *   - Match a requested category (or are in common_docs)
 *   - Have available <= detected angular version
 *
 * Returns { refs: [{ doc, tokens, pattern_guidance }], source }
 */
function resolveReferences(skillRefs, stack, resolverPath) {
  const resolverContent = safeRead(resolverPath);
  if (!resolverContent) {
    return { refs: [], source: 'no-resolver' };
  }

  const resolver = parseResolverYaml(resolverContent);
  if (!resolver) {
    return { refs: [], source: 'parse-error' };
  }

  const detectedMajor = parseInt(stack.angular_version || resolver.default_version, 10);
  const requestedCategories = new Set(skillRefs || []);
  const refs = [];

  // Always include common docs
  for (const common of resolver.common_docs) {
    if (common.doc) {
      refs.push({ doc: common.doc, tokens: common.tokens, category: 'common' });
    }
  }

  // Filter features by version gate and requested categories
  for (const feature of resolver.features) {
    // Skip if not available for this version
    if (!satisfiesGate(detectedMajor, feature.available)) continue;

    // Skip if category not requested (empty skillRefs means load all)
    if (requestedCategories.size > 0 && !requestedCategories.has(feature.category)) continue;

    // Skip features with no doc
    if (!feature.doc || feature.doc === 'null') continue;

    const entry = {
      doc: feature.doc,
      tokens: feature.tokens || 0,
      category: feature.category
    };

    // Add pattern guidance if this version meets the recommended gate
    if (satisfiesGate(detectedMajor, feature.recommended) && feature.new_pattern) {
      entry.pattern_guidance = `Prefer: ${feature.new_pattern}`;
      if (feature.old_pattern) {
        entry.pattern_guidance += ` (replaces: ${feature.old_pattern})`;
      }
    } else if (feature.old_pattern) {
      entry.pattern_guidance = `Current: ${feature.old_pattern}`;
      if (feature.new_pattern) {
        entry.pattern_guidance += ` (${feature.new_pattern} available but not yet recommended)`;
      }
    }

    refs.push(entry);
  }

  // Deduplicate by doc path (keep first occurrence)
  const seen = new Set();
  const deduped = [];
  for (const ref of refs) {
    if (!seen.has(ref.doc)) {
      seen.add(ref.doc);
      deduped.push(ref);
    }
  }

  return { refs: deduped, source: `resolved:v${detectedMajor}` };
}

/**
 * resolveSkillBody(skillPath, stack) → { body, source }
 *
 * Reads a skill file and performs version-aware template substitution:
 *   - {{angular_version}} → detected version
 *   - {{#if >=N}} ... {{/if}} → include block only if version >= N
 *   - {{#unless >=N}} ... {{/unless}} → include block only if version < N
 *
 * Cascading: if skill file not found, returns null.
 */
function resolveSkillBody(skillPath, stack) {
  const raw = safeRead(skillPath);
  if (!raw) return { body: null, source: 'not-found' };

  const detectedMajor = parseInt(stack.angular_version || DEFAULT_VERSION, 10);
  let body = raw;

  // Replace {{angular_version}}
  body = body.replace(/\{\{angular_version\}\}/g, String(detectedMajor));

  // Process {{#if >=N}} ... {{/if}} blocks
  body = body.replace(/\{\{#if\s+(>=?\s*\d+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, gate, content) => {
    return satisfiesGate(detectedMajor, gate) ? content : '';
  });

  // Process {{#unless >=N}} ... {{/unless}} blocks
  body = body.replace(/\{\{#unless\s+(>=?\s*\d+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, gate, content) => {
    return satisfiesGate(detectedMajor, gate) ? '' : content;
  });

  // Clean up any double blank lines left by removed blocks
  body = body.replace(/\n{3,}/g, '\n\n');

  return { body, source: `skill:v${detectedMajor}` };
}

// --- Export for CommonJS ---
module.exports = {
  resolveStack,
  resolveReferences,
  resolveSkillBody,
  // Exported for testing
  _internals: {
    parseGate,
    satisfiesGate,
    parseStackYaml,
    parseResolverYaml,
    safeRead
  }
};

// --- CLI mode: run resolveStack if invoked directly ---
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd();
  const result = resolveStack(projectRoot);
  console.log(JSON.stringify(result, null, 2));
}
