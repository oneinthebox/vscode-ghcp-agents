'use strict';

/**
 * Find hardcoded color values not wrapped in var().
 * Matches hex (#fff, #ffffff, #ffffffff), rgb(), rgba(), hsl(), hsla().
 */
function findHardcodedColors(content) {
  const results = [];
  const lines = content.split('\n');

  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  const funcRe = /\b(rgba?|hsla?)\s*\([^)]+\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // skip comment lines
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

    let m;
    hexRe.lastIndex = 0;
    while ((m = hexRe.exec(line)) !== null) {
      // check if inside var()
      const before = line.slice(0, m.index);
      if (/var\s*\([^)]*$/.test(before)) continue;
      results.push({ type: 'color', value: m[0], line: i + 1, column: m.index + 1 });
    }

    funcRe.lastIndex = 0;
    while ((m = funcRe.exec(line)) !== null) {
      const before = line.slice(0, m.index);
      if (/var\s*\([^)]*$/.test(before)) continue;
      results.push({ type: 'color', value: m[0], line: i + 1, column: m.index + 1 });
    }
  }
  return results;
}

/**
 * Find raw pixel values not inside var() or calc().
 */
function findRawPixels(content) {
  const results = [];
  const lines = content.split('\n');
  const pxRe = /(\d+(?:\.\d+)?)\s*px/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

    let m;
    pxRe.lastIndex = 0;
    while ((m = pxRe.exec(line)) !== null) {
      const before = line.slice(0, m.index);
      if (/var\s*\([^)]*$/.test(before)) continue;
      if (/calc\s*\([^)]*$/.test(before)) continue;
      // allow 0px and 1px in borders
      if (m[1] === '0') continue;
      results.push({ type: 'spacing', value: m[0].trim(), line: i + 1, column: m.index + 1 });
    }
  }
  return results;
}

/**
 * Find hardcoded font-family declarations not using CSS custom properties.
 */
function findHardcodedFonts(content) {
  const results = [];
  const lines = content.split('\n');
  const fontRe = /font-family\s*:\s*([^;]+)/g;

  for (let i = 0; i < lines.length; i++) {
    let m;
    fontRe.lastIndex = 0;
    while ((m = fontRe.exec(lines[i])) !== null) {
      const value = m[1].trim();
      if (/var\s*\(/.test(value)) continue;
      results.push({ type: 'font', value, line: i + 1, column: m.index + 1 });
    }
  }
  return results;
}

/**
 * Classify a design-token violation by type and severity.
 */
function classifyViolation(value, line) {
  let type = 'spacing';
  let severity = 'medium';

  if (/^#|rgba?|hsla?/i.test(value)) {
    type = 'color';
    severity = 'high';
  } else if (/font-family|font:|"[^"]+"|'[^']+'/.test(value)) {
    type = 'font';
    severity = 'medium';
  } else if (/px/.test(value)) {
    type = 'spacing';
    severity = 'low';
  }

  return { type, severity, value, line };
}

module.exports = {
  findHardcodedColors,
  findRawPixels,
  findHardcodedFonts,
  classifyViolation
};
