/**
 * orch maintain — Maintainer commands for doc-pack conversion pipeline.
 *
 * Subcommands:
 *   convert   Convert doc-pack sources to markdown
 *   refresh   Re-convert stale sources (>30 days)
 *   publish   Show what reference docs changed since last commit
 *
 * All subcommands require doc-packs/ in cwd (marketplace context).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as childProcess from 'child_process';
import chalk = require('chalk');
import { banner, section, info, success, warn, fail, statusRow, divider, withSpinner } from '../utils/ui';

// ── Types ──

interface DocSource {
  id: string;
  name: string;
  type: string;
  origin: string;
  format: string;
  output: string;
  scope?: string;
  version?: string;
  managed_by?: string;
  last_refreshed: string | null;
  status: string;
  [key: string]: any;
}

interface DocPackManifest {
  pack: string;
  description: string;
  sources: DocSource[];
}

interface RegistryFile {
  version: number;
  sources: DocSource[];
}

// ── Guard ──

function requireMarketplace(): string {
  const cwd = process.cwd();
  if (!fs.existsSync(path.join(cwd, 'doc-packs'))) {
    console.error(chalk.red('Maintainer commands run from the marketplace repo only.'));
    console.error(chalk.red('No doc-packs/ directory found in current directory.'));
    process.exit(1);
  }
  return cwd;
}

// ── HTML → Markdown conversion ──

const STRIP_TAGS = ['nav', 'footer', 'header', 'script', 'style', 'aside', 'noscript', 'svg', 'iframe'];
const STRIP_SELECTORS = [
  /class="[^"]*cookie[^"]*"/gi,
  /class="[^"]*banner[^"]*"/gi,
  /class="[^"]*sidebar[^"]*"/gi,
  /class="[^"]*ad[s]?[^"]*"/gi,
];

/**
 * Extract main content from HTML — prefer <main>, <article>, [role="main"], fallback to <body>.
 */
function extractMainContent(html: string): string {
  // Try to find main content area
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of mainPatterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  // Fallback to <body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

/**
 * Strip unwanted HTML elements.
 */
function stripChrome(html: string): string {
  let result = html;

  // Remove unwanted tags and their contents
  for (const tag of STRIP_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(re, '');
  }

  // Remove elements matching ad/cookie/banner classes
  for (const sel of STRIP_SELECTORS) {
    result = result.replace(new RegExp(`<[^>]*${sel.source}[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi'), '');
  }

  // Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  return result;
}

/**
 * Convert cleaned HTML to markdown via simple tag mapping.
 */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) => `\n\`\`\`${lang || ''}\n${decodeEntities(code.trim())}\n\`\`\`\n`);
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, code) => `\n\`\`\`\n${decodeEntities(code.trim())}\n\`\`\`\n`);

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Bold and italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

  // Tables
  md = convertTables(md);

  // Paragraphs and line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    return content.trim().split('\n').map((line: string) => `> ${line.trim()}`).join('\n');
  });

  // Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = decodeEntities(md);

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

/**
 * Convert HTML tables to markdown tables.
 */
function convertTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rowMatches) {
      const cells: string[] = [];
      const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      for (const cell of cellMatches) {
        const content = cell.replace(/<\/?t[dh][^>]*>/gi, '').trim();
        cells.push(content.replace(/\|/g, '\\|'));
      }
      rows.push(cells);
    }

    if (rows.length === 0) return '';

    const lines: string[] = [];
    lines.push('| ' + rows[0].join(' | ') + ' |');
    lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
    for (let i = 1; i < rows.length; i++) {
      // Pad to match header column count
      while (rows[i].length < rows[0].length) rows[i].push('');
      lines.push('| ' + rows[i].join(' | ') + ' |');
    }
    return '\n' + lines.join('\n') + '\n';
  });
}

/**
 * Decode common HTML entities.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

const MAX_LINES = 500;

/**
 * Fetch a URL, extract content, convert to markdown.
 */
async function fetchAndConvert(source: DocSource, packName: string): Promise<string> {
  const response = await fetch(source.origin);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${source.origin}`);
  }

  const html = await response.text();
  const mainContent = extractMainContent(html);
  const cleaned = stripChrome(mainContent);
  let markdown = htmlToMarkdown(cleaned);

  // Truncate to MAX_LINES
  const lines = markdown.split('\n');
  if (lines.length > MAX_LINES) {
    markdown = lines.slice(0, MAX_LINES).join('\n') + '\n\n<!-- Truncated at 500 lines -->';
  }

  // Prepend metadata header
  const today = new Date().toISOString().split('T')[0];
  const header = `<!-- Source: ${source.origin} | Converted: ${today} | Pack: ${packName} -->`;
  return `${header}\n\n${markdown}`;
}

// ── Pack/Registry helpers ──

function loadAllPacks(marketplacePath: string): DocPackManifest[] {
  const packsDir = path.join(marketplacePath, 'doc-packs');
  const packs: DocPackManifest[] = [];
  for (const file of fs.readdirSync(packsDir)) {
    if (!file.endsWith('.yaml')) continue;
    try {
      const raw = fs.readFileSync(path.join(packsDir, file), 'utf8');
      const pack = yaml.parse(raw) as DocPackManifest;
      if (pack && pack.pack && Array.isArray(pack.sources)) {
        packs.push(pack);
      }
    } catch {
      // Skip malformed
    }
  }
  return packs;
}

function loadRegistry(marketplacePath: string): RegistryFile {
  const registryPath = path.join(marketplacePath, 'docs-registry.yaml');
  if (!fs.existsSync(registryPath)) {
    return { version: 1, sources: [] };
  }
  const raw = fs.readFileSync(registryPath, 'utf8');
  return yaml.parse(raw) as RegistryFile;
}

function saveRegistry(marketplacePath: string, registry: RegistryFile): void {
  const registryPath = path.join(marketplacePath, 'docs-registry.yaml');
  const content =
    `# ORCH Documentation Registry\n` +
    `# Central source of truth for all documentation sources.\n` +
    `# Managed by: orch maintain convert/refresh\n\n` +
    yaml.stringify(registry, { lineWidth: 0 });
  fs.writeFileSync(registryPath, content);
}

function findSourceInRegistry(registry: RegistryFile, id: string): DocSource | undefined {
  return registry.sources.find(s => s.id === id);
}

// ── Subcommands ──

/**
 * orch maintain convert
 */
export async function maintainConvertCommand(options: {
  pack?: string;
  id?: string;
  all?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const mp = requireMarketplace();

  banner('maintain convert');

  const packs = loadAllPacks(mp);
  if (packs.length === 0) {
    fail('No doc packs found in doc-packs/');
    return;
  }

  // Determine which sources to convert
  let sourcesToConvert: { source: DocSource; packName: string }[] = [];

  if (options.id) {
    // Find source by ID across all packs
    for (const pack of packs) {
      const source = pack.sources.find(s => s.id === options.id);
      if (source) {
        sourcesToConvert.push({ source, packName: pack.pack });
        break;
      }
    }
    if (sourcesToConvert.length === 0) {
      fail(`Source ID "${options.id}" not found in any pack`);
      return;
    }
  } else if (options.pack) {
    const pack = packs.find(p => p.pack === options.pack);
    if (!pack) {
      fail(`Pack "${options.pack}" not found`);
      return;
    }
    sourcesToConvert = pack.sources.map(s => ({ source: s, packName: pack.pack }));
  } else if (options.all) {
    for (const pack of packs) {
      for (const source of pack.sources) {
        sourcesToConvert.push({ source, packName: pack.pack });
      }
    }
  } else {
    info('Specify --pack <name>, --id <id>, or --all');
    return;
  }

  // Filter to URL-type sources only
  sourcesToConvert = sourcesToConvert.filter(s => s.source.type === 'url');

  await section(`Converting ${sourcesToConvert.length} sources`);
  console.log('');

  if (options.dryRun) {
    info('DRY RUN — no files will be written');
    console.log('');
    for (const { source, packName } of sourcesToConvert) {
      statusRow(source.id, 'info', `${source.origin} -> ${source.output}`);
    }
    divider();
    info(`Would convert ${sourcesToConvert.length} sources`);
    console.log('');
    return;
  }

  // Load registry for status updates
  const registry = loadRegistry(mp);

  let converted = 0;
  let failed = 0;

  for (const { source, packName } of sourcesToConvert) {
    try {
      const markdown = await withSpinner(
        `${source.id}`,
        () => fetchAndConvert(source, packName),
        { successText: `${source.id} -> ${source.output}` }
      );

      // Write markdown file
      const outputPath = path.join(mp, source.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, markdown);

      // Update registry
      const today = new Date().toISOString().split('T')[0];
      const regSource = findSourceInRegistry(registry, source.id);
      if (regSource) {
        regSource.status = 'current';
        regSource.last_refreshed = today;
      }

      converted++;
    } catch (err: any) {
      fail(`${source.id}: ${err.message}`);
      failed++;
    }
  }

  // Save updated registry
  saveRegistry(mp, registry);

  console.log('');
  divider();
  success(`Converted: ${converted}`);
  if (failed > 0) fail(`Failed: ${failed}`);
  console.log('');
}

/**
 * orch maintain refresh
 */
export async function maintainRefreshCommand(options: {
  stale?: boolean;
  all?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const mp = requireMarketplace();

  banner('maintain refresh');

  const registry = loadRegistry(mp);
  if (registry.sources.length === 0) {
    info('Registry is empty. Run "orch maintain convert --all" first.');
    return;
  }

  const STALE_DAYS = 30;
  const now = Date.now();

  // Determine which sources to refresh
  let sourcesToRefresh: DocSource[];

  if (options.all) {
    sourcesToRefresh = registry.sources.filter(s => s.type === 'url');
  } else {
    // Default: stale sources (>30 days since last_refreshed or status=stale/draft)
    sourcesToRefresh = registry.sources.filter(s => {
      if (s.type !== 'url') return false;
      if (s.status === 'draft' || s.status === 'stale') return true;
      if (!s.last_refreshed) return true;
      const refreshedAt = new Date(s.last_refreshed).getTime();
      const daysSince = (now - refreshedAt) / (1000 * 60 * 60 * 24);
      return daysSince > STALE_DAYS;
    });
  }

  if (sourcesToRefresh.length === 0) {
    success('All sources are current (refreshed within 30 days)');
    return;
  }

  await section(`Refreshing ${sourcesToRefresh.length} sources`);
  console.log('');

  if (options.dryRun) {
    info('DRY RUN — no files will be written');
    console.log('');
    for (const source of sourcesToRefresh) {
      const age = source.last_refreshed
        ? `${Math.floor((now - new Date(source.last_refreshed).getTime()) / (1000 * 60 * 60 * 24))}d old`
        : 'never converted';
      statusRow(source.id, source.status === 'stale' ? 'warn' : 'info', age);
    }
    divider();
    info(`Would refresh ${sourcesToRefresh.length} sources`);
    console.log('');
    return;
  }

  // Determine pack name from managed_by
  const packNameFor = (source: DocSource): string => {
    if (source.managed_by && source.managed_by.startsWith('pack:')) {
      return source.managed_by.replace('pack:', '');
    }
    return 'unknown';
  };

  let refreshed = 0;
  let failed = 0;

  for (const source of sourcesToRefresh) {
    try {
      // Back up existing file
      const outputPath = path.join(mp, source.output);
      if (fs.existsSync(outputPath)) {
        const backupPath = outputPath + '.bak';
        fs.copyFileSync(outputPath, backupPath);
      }

      const markdown = await withSpinner(
        `${source.id}`,
        () => fetchAndConvert(source, packNameFor(source)),
        { successText: `${source.id} (refreshed)` }
      );

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, markdown);

      // Update registry
      const today = new Date().toISOString().split('T')[0];
      source.status = 'current';
      source.last_refreshed = today;

      refreshed++;
    } catch (err: any) {
      fail(`${source.id}: ${err.message}`);
      failed++;
    }
  }

  // Save updated registry
  saveRegistry(mp, registry);

  console.log('');
  divider();
  success(`Refreshed: ${refreshed}`);
  if (failed > 0) fail(`Failed: ${failed}`);
  console.log('');
}

/**
 * orch maintain publish
 */
export async function maintainPublishCommand(options: {
  dryRun?: boolean;
}): Promise<void> {
  const mp = requireMarketplace();

  banner('maintain publish');

  const refsDir = path.join(mp, '.github', 'references');

  if (!fs.existsSync(refsDir)) {
    info('No .github/references/ directory found. Run "orch maintain convert" first.');
    return;
  }

  // Use git to find changes since last commit
  try {
    const diffOutput = childProcess.execSync(
      'git diff --name-status HEAD -- .github/references/',
      { cwd: mp, encoding: 'utf8' }
    ).trim();

    const untrackedOutput = childProcess.execSync(
      'git ls-files --others --exclude-standard .github/references/',
      { cwd: mp, encoding: 'utf8' }
    ).trim();

    await section('Reference docs — changes since last commit');
    console.log('');

    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    // Parse git diff output
    if (diffOutput) {
      for (const line of diffOutput.split('\n')) {
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        switch (status) {
          case 'A': newFiles.push(file); break;
          case 'M': modifiedFiles.push(file); break;
          case 'D': deletedFiles.push(file); break;
        }
      }
    }

    // Untracked files are new
    if (untrackedOutput) {
      for (const file of untrackedOutput.split('\n')) {
        if (file.trim()) newFiles.push(file.trim());
      }
    }

    if (newFiles.length === 0 && modifiedFiles.length === 0 && deletedFiles.length === 0) {
      success('No changes to reference docs since last commit');
      console.log('');
      return;
    }

    if (newFiles.length > 0) {
      info(`New (${newFiles.length}):`);
      for (const f of newFiles) statusRow(f, 'ok', 'new');
      console.log('');
    }

    if (modifiedFiles.length > 0) {
      info(`Updated (${modifiedFiles.length}):`);
      for (const f of modifiedFiles) statusRow(f, 'warn', 'modified');
      console.log('');
    }

    if (deletedFiles.length > 0) {
      info(`Deleted (${deletedFiles.length}):`);
      for (const f of deletedFiles) statusRow(f, 'fail', 'deleted');
      console.log('');
    }

    divider();
    info(`Total: ${newFiles.length} new, ${modifiedFiles.length} updated, ${deletedFiles.length} deleted`);
    info('Commit and push when ready: git add .github/references/ && git commit');
    console.log('');
  } catch (err: any) {
    fail(`Git error: ${err.message}`);
  }
}
