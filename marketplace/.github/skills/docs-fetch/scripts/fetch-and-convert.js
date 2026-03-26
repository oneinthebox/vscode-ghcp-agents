#!/usr/bin/env node
'use strict';

/**
 * Documentation Fetcher and Converter
 *
 * Fetches content from a URL and converts it to token-efficient markdown.
 * Uses only Node.js built-in modules (https/http) — no external dependencies.
 *
 * Conversion pipeline:
 *   1. Strip <script>, <style>, <nav>, <footer>, <header> tags
 *   2. Convert headings, paragraphs, links, code, lists, tables to markdown
 *   3. Strip remaining HTML tags
 *   4. Add frontmatter with source URL and fetch date
 *
 * Usage: node scripts/fetch-and-convert.js <url> <output-path>
 *
 * Output (stdout): JSON with outputPath, linesWritten, tokensEstimate.
 * Progress (stderr): human-readable status messages.
 * Exit: 0 on success, 1 on error.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Configuration ───────────────────────────────────────────
const url = process.argv[2];
const outputPath = process.argv[3];
const log = (msg) => process.stderr.write(`[fetch-convert] ${msg}\n`);
const MAX_REDIRECTS = 5;

// ─── Main ────────────────────────────────────────────────────
async function main() {
  if (!url || !outputPath) {
    log('Usage: node fetch-and-convert.js <url> <output-path>');
    process.exit(1);
  }

  log(`Fetching: ${url}`);
  log(`Output:   ${outputPath}`);

  // Fetch the raw HTML
  let html;
  try {
    html = await fetchUrl(url, MAX_REDIRECTS);
  } catch (err) {
    log(`ERROR: Failed to fetch URL: ${err.message}`);
    process.exit(1);
  }

  log(`Fetched ${html.length} characters of HTML`);

  // Convert HTML to markdown
  let markdown = convertHtmlToMarkdown(html);

  // Add frontmatter header
  const today = new Date().toISOString().split('T')[0];
  const frontmatter = [
    '---',
    `source: ${url}`,
    `fetched: ${today}`,
    `converter: fetch-and-convert.js`,
    '---',
    '',
  ].join('\n');

  markdown = frontmatter + markdown;

  // Ensure output directory exists
  const outDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Write the output file
  fs.writeFileSync(outputPath, markdown, 'utf8');

  const lines = markdown.split('\n').length;
  const tokensEstimate = Math.ceil(markdown.length / 4);

  const result = {
    outputPath: path.resolve(outputPath),
    linesWritten: lines,
    tokensEstimate,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`Wrote ${lines} lines (~${tokensEstimate} tokens) to ${outputPath}`);
  log('Done.');
}

// ─── HTTP Fetch with Redirect Following ─────────────────────
function fetchUrl(targetUrl, redirectsLeft) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft <= 0) {
      return reject(new Error('Too many redirects'));
    }

    const client = targetUrl.startsWith('https') ? https : http;

    const req = client.get(targetUrl, { headers: { 'User-Agent': 'DocFetcher/1.0' } }, (res) => {
      // Handle redirects (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectTo = new URL(res.headers.location, targetUrl).href;
        log(`Redirect ${res.statusCode} -> ${redirectTo}`);
        resolve(fetchUrl(redirectTo, redirectsLeft - 1));
        return;
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out after 30s'));
    });
  });
}

// ─── HTML to Markdown Conversion ─────────────────────────────
function convertHtmlToMarkdown(html) {
  let text = html;

  // Step 1: Strip unwanted block-level tags and their content
  text = stripTagWithContent(text, 'script');
  text = stripTagWithContent(text, 'style');
  text = stripTagWithContent(text, 'nav');
  text = stripTagWithContent(text, 'footer');
  text = stripTagWithContent(text, 'header');
  text = stripTagWithContent(text, 'noscript');
  text = stripTagWithContent(text, 'svg');
  text = stripTagWithContent(text, 'iframe');

  // Step 2: Convert headings <h1>-<h6>
  for (let level = 1; level <= 6; level++) {
    const hashes = '#'.repeat(level);
    const regex = new RegExp(`<h${level}[^>]*>(.*?)<\\/h${level}>`, 'gis');
    text = text.replace(regex, (_, content) => `\n${hashes} ${stripTags(content).trim()}\n`);
  }

  // Step 3: Convert <pre><code> to fenced code blocks
  text = text.replace(/<pre[^>]*>\s*<code[^>]*(?:class="[^"]*language-(\w+)"[^>]*)?>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, lang, content) => {
      const language = lang || '';
      return `\n\`\`\`${language}\n${decodeHtmlEntities(stripTags(content)).trim()}\n\`\`\`\n`;
    }
  );

  // Step 4: Convert remaining <pre> blocks
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, content) => `\n\`\`\`\n${decodeHtmlEntities(stripTags(content)).trim()}\n\`\`\`\n`
  );

  // Step 5: Convert inline <code> to backticks
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi,
    (_, content) => `\`${decodeHtmlEntities(stripTags(content))}\``
  );

  // Step 6: Convert <a href="X">text</a> to [text](X)
  text = text.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
    (_, href, content) => `[${stripTags(content).trim()}](${href})`
  );

  // Step 7: Convert <table> to markdown tables
  text = convertTables(text);

  // Step 8: Convert <ul>/<ol> lists to markdown
  text = convertLists(text);

  // Step 9: Convert <p> to paragraphs with blank lines
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, content) => `\n${stripTags(content).trim()}\n`
  );

  // Step 10: Convert <br> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Step 11: Convert <strong>/<b> and <em>/<i>
  text = text.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*');

  // Step 12: Convert <blockquote>
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => {
      const lines = stripTags(content).trim().split('\n');
      return '\n' + lines.map(l => `> ${l.trim()}`).join('\n') + '\n';
    }
  );

  // Step 13: Convert <hr> to horizontal rule
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Step 14: Strip all remaining HTML tags
  text = stripTags(text);

  // Step 15: Decode HTML entities
  text = decodeHtmlEntities(text);

  // Step 16: Clean up excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+$/gm, '');
  text = text.trim() + '\n';

  return text;
}

// ─── Helper: Strip a specific tag and its content ────────────
function stripTagWithContent(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return html.replace(regex, '');
}

// ─── Helper: Strip all HTML tags ─────────────────────────────
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

// ─── Helper: Decode common HTML entities ─────────────────────
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&#x2F;': '/',
    '&mdash;': '\u2014', '&ndash;': '\u2013', '&hellip;': '\u2026',
    '&laquo;': '\u00AB', '&raquo;': '\u00BB', '&copy;': '\u00A9',
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  // Numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}

// ─── Helper: Convert HTML tables to markdown tables ──────────
function convertTables(html) {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]).trim());
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return '';

    // Build markdown table
    const colCount = Math.max(...rows.map(r => r.length));
    const mdLines = [];

    // Header row
    const header = rows[0].map(c => c || '').concat(Array(colCount - rows[0].length).fill(''));
    mdLines.push('| ' + header.join(' | ') + ' |');
    mdLines.push('| ' + header.map(() => '---').join(' | ') + ' |');

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].map(c => c || '').concat(Array(colCount - rows[i].length).fill(''));
      mdLines.push('| ' + row.join(' | ') + ' |');
    }

    return '\n' + mdLines.join('\n') + '\n';
  });
}

// ─── Helper: Convert HTML lists to markdown lists ────────────
function convertLists(html) {
  // Ordered lists
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let index = 1;
    const items = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      items.push(`${index}. ${stripTags(liMatch[1]).trim()}`);
      index++;
    }
    return '\n' + items.join('\n') + '\n';
  });

  // Unordered lists
  html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    const items = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      items.push(`- ${stripTags(liMatch[1]).trim()}`);
    }
    return '\n' + items.join('\n') + '\n';
  });

  return html;
}

// ─── Run ─────────────────────────────────────────────────────
main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
