'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Recursively scan a directory for files matching a glob-like pattern.
 * Supports patterns like `** /*.component.ts` (double-star + suffix).
 */
function scanDirectory(dir, pattern) {
  const results = [];
  const suffix = pattern.replace(/^\*\*\/?\*?/, '');

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith(suffix)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

/**
 * Extract exported class declarations from TypeScript source.
 * Returns [{name, line, isAbstract}].
 */
function extractClasses(content) {
  const results = [];
  const lines = content.split('\n');
  const re = /export\s+(abstract\s+)?class\s+(\w+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(re);
    if (match) {
      results.push({
        name: match[2],
        line: i + 1,
        isAbstract: !!match[1]
      });
    }
  }
  return results;
}

/**
 * Extract decorators by name (e.g. 'Component', 'Injectable') and their metadata.
 * Handles multiline decorator bodies.
 */
function extractDecorators(content, decoratorName) {
  const results = [];
  const re = new RegExp(`@${decoratorName}\\s*\\(`, 'g');
  let match;
  while ((match = re.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;
    let depth = 1;
    let i = startIndex;
    while (i < content.length && depth > 0) {
      if (content[i] === '(') depth++;
      else if (content[i] === ')') depth--;
      i++;
    }
    const metadata = content.slice(startIndex, i - 1).trim();
    const line = content.slice(0, match.index).split('\n').length;
    results.push({ decoratorName, metadata, line });
  }
  return results;
}

/**
 * Extract ES module import statements.
 * Returns [{symbols: string[], from: string}].
 */
function extractImports(content) {
  const results = [];
  const re = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const symbols = match[1].split(',').map(s => s.trim()).filter(Boolean);
    results.push({ symbols, from: match[2] });
  }
  return results;
}

/**
 * Extract public methods from a class body.
 * Skips lines marked private or protected. Returns [{name, params, returnType, line}].
 */
function extractMethods(content, className) {
  const results = [];
  const classRe = new RegExp(`class\\s+${className}[^{]*\\{`);
  const classMatch = classRe.exec(content);
  if (!classMatch) return results;

  const startIndex = classMatch.index + classMatch[0].length;
  let depth = 1;
  let i = startIndex;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const classBody = content.slice(startIndex, i - 1);
  const bodyStartLine = content.slice(0, startIndex).split('\n').length;

  const lines = classBody.split('\n');
  const methodRe = /^\s*(?:(?:public|async)\s+)*(\w+)\s*\(([^)]*)\)\s*(?::\s*([^\s{]+))?\s*\{?/;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (/^\s*(private|protected)\s+/.test(line)) continue;
    if (/^\s*(constructor)\s*\(/.test(line)) continue;
    const m = line.match(methodRe);
    if (m && !['if', 'for', 'while', 'switch', 'return', 'catch', 'get', 'set'].includes(m[1])) {
      results.push({
        name: m[1],
        params: m[2].trim(),
        returnType: m[3] || 'void',
        line: bodyStartLine + li
      });
    }
  }
  return results;
}

/**
 * Extract Angular signal-based APIs: input(), input.required(), output(), computed(), signal().
 */
function extractSignals(content) {
  const results = [];
  const lines = content.split('\n');
  const re = /(\w+)\s*=\s*(input|input\.required|output|computed|signal)\s*[<(]/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(re);
    if (match) {
      results.push({
        name: match[1],
        kind: match[2].replace('.required', 'Required'),
        line: i + 1
      });
    }
  }
  return results;
}

/**
 * Extract dependency injection via inject() calls or constructor parameter injection.
 */
function extractInjects(content) {
  const results = [];
  // inject(ServiceName)
  const injectRe = /(\w+)\s*=\s*inject\(\s*(\w+)\s*\)/g;
  let m;
  while ((m = injectRe.exec(content)) !== null) {
    const line = content.slice(0, m.index).split('\n').length;
    results.push({ name: m[1], service: m[2], style: 'inject', line });
  }
  // constructor injection: constructor(private someService: SomeService)
  const ctorRe = /constructor\s*\(([^)]*)\)/s;
  const ctorMatch = content.match(ctorRe);
  if (ctorMatch) {
    const ctorLine = content.slice(0, ctorMatch.index).split('\n').length;
    const paramRe = /(?:private|protected|public|readonly)\s+(\w+)\s*:\s*(\w+)/g;
    let pm;
    while ((pm = paramRe.exec(ctorMatch[1])) !== null) {
      results.push({ name: pm[1], service: pm[2], style: 'constructor', line: ctorLine });
    }
  }
  return results;
}

/**
 * Check whether the given line number has a JSDoc comment block (/** ... * /) above it.
 */
function hasDocComment(content, lineNumber) {
  const lines = content.split('\n');
  if (lineNumber < 2 || lineNumber > lines.length) return false;
  let i = lineNumber - 2; // zero-based index of line above
  while (i >= 0 && /^\s*$/.test(lines[i])) i--; // skip blank lines
  if (i >= 0 && /\*\/\s*$/.test(lines[i])) {
    // walk up to find opening /**
    while (i >= 0) {
      if (/\/\*\*/.test(lines[i])) return true;
      i--;
    }
  }
  return false;
}

module.exports = {
  scanDirectory,
  extractClasses,
  extractDecorators,
  extractImports,
  extractMethods,
  extractSignals,
  extractInjects,
  hasDocComment
};
