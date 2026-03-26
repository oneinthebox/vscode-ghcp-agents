'use strict';

/**
 * Extract structural directives from Angular templates.
 * Covers both legacy (*ngIf, *ngFor, *ngSwitch) and modern (@if, @for, @switch) syntax.
 */
function extractDirectives(content) {
  const results = [];
  const lines = content.split('\n');

  const legacyRe = /\*(ngIf|ngFor|ngSwitch|ngSwitchCase|ngSwitchDefault)\s*=?\s*"?([^"]*)"?/g;
  const modernRe = /@(if|for|switch|case|default)\s*(\([^)]*\))?\s*\{?/g;

  for (let i = 0; i < lines.length; i++) {
    let m;
    legacyRe.lastIndex = 0;
    while ((m = legacyRe.exec(lines[i])) !== null) {
      results.push({ directive: `*${m[1]}`, expression: m[2].trim(), line: i + 1, style: 'legacy' });
    }
    modernRe.lastIndex = 0;
    while ((m = modernRe.exec(lines[i])) !== null) {
      results.push({ directive: `@${m[1]}`, expression: (m[2] || '').replace(/[()]/g, '').trim(), line: i + 1, style: 'modern' });
    }
  }
  return results;
}

/**
 * Extract custom component selectors (e.g. <app-header>, <my-widget>).
 * Ignores standard HTML elements and Angular structural tags.
 */
function extractSelectors(content) {
  const results = [];
  const re = /<([a-z][\w]+-[\w-]+)[\s/>]/g;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(lines[i])) !== null) {
      results.push({ selector: m[1], line: i + 1 });
    }
  }

  // deduplicate by selector, keep first occurrence
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.selector)) return false;
    seen.add(r.selector);
    return true;
  });
}

/**
 * Extract template bindings: property [prop], event (event), two-way [(ngModel)], interpolation {{ expr }}.
 */
function extractBindings(content) {
  const results = [];
  const lines = content.split('\n');

  const propRe = /\[(\w[\w.]*)\]\s*=/g;
  const eventRe = /\((\w[\w.]*)\)\s*=/g;
  const twoWayRe = /\[\((\w[\w.]*)\)\]/g;
  const interpRe = /\{\{\s*([^}]+?)\s*\}\}/g;

  for (let i = 0; i < lines.length; i++) {
    let m;
    twoWayRe.lastIndex = 0;
    while ((m = twoWayRe.exec(lines[i])) !== null) {
      results.push({ type: 'two-way', name: m[1], line: i + 1 });
    }
    propRe.lastIndex = 0;
    while ((m = propRe.exec(lines[i])) !== null) {
      results.push({ type: 'property', name: m[1], line: i + 1 });
    }
    eventRe.lastIndex = 0;
    while ((m = eventRe.exec(lines[i])) !== null) {
      results.push({ type: 'event', name: m[1], line: i + 1 });
    }
    interpRe.lastIndex = 0;
    while ((m = interpRe.exec(lines[i])) !== null) {
      results.push({ type: 'interpolation', expression: m[1], line: i + 1 });
    }
  }
  return results;
}

/**
 * Count legacy structural directive occurrences (*ngIf, *ngFor, *ngSwitch).
 */
function countLegacyDirectives(content) {
  const ngIf = (content.match(/\*ngIf/g) || []).length;
  const ngFor = (content.match(/\*ngFor/g) || []).length;
  const ngSwitch = (content.match(/\*ngSwitch/g) || []).length;
  return { '*ngIf': ngIf, '*ngFor': ngFor, '*ngSwitch': ngSwitch, total: ngIf + ngFor + ngSwitch };
}

/**
 * Count modern control-flow block occurrences (@if, @for, @switch).
 */
function countModernControlFlow(content) {
  const atIf = (content.match(/@if\s*[\s(]/g) || []).length;
  const atFor = (content.match(/@for\s*[\s(]/g) || []).length;
  const atSwitch = (content.match(/@switch\s*[\s(]/g) || []).length;
  return { '@if': atIf, '@for': atFor, '@switch': atSwitch, total: atIf + atFor + atSwitch };
}

module.exports = {
  extractDirectives,
  extractSelectors,
  extractBindings,
  countLegacyDirectives,
  countModernControlFlow
};
