/**
 * Advanced shell constructs: brace expansion, case, arrays, subshells.
 */

/**
 * Expand brace lists: {a,b,c} and {1..3}.
 *
 * Args:
 *     word: possibly braced word
 * Returns:
 *     string[] fields (or [word] if no braces)
 */
export function expandBraces(word) {
  const m = word.match(/^(.*)\{([^{}]+)\}(.*)$/);
  if (!m) return [word];
  const [, pre, body, post] = m;
  const alts = [];
  if (/^(-?\d+)\.\.(-?\d+)$/.test(body)) {
    const [, a, b] = body.match(/^(-?\d+)\.\.(-?\d+)$/);
    let lo = Number(a);
    let hi = Number(b);
    const step = lo <= hi ? 1 : -1;
    for (let i = lo; step > 0 ? i <= hi : i >= hi; i += step) alts.push(String(i));
  } else {
    // split on commas at depth 0 (no nested braces in MVP)
    let cur = '';
    for (const ch of body) {
      if (ch === ',') {
        alts.push(cur);
        cur = '';
      } else cur += ch;
    }
    alts.push(cur);
  }
  const out = [];
  for (const alt of alts) {
    out.push(...expandBraces(`${pre}${alt}${post}`));
  }
  return out;
}

/**
 * Parse and match a case statement body.
 *
 * Args:
 *     word: value to match
 *     arms: [{ pattern, body }] patterns support * ? literals (glob-ish)
 * Returns:
 *     body string or null
 */
export function matchCase(word, arms) {
  for (const arm of arms) {
    for (const pat of arm.patterns) {
      if (globMatch(pat, word)) return arm.body;
    }
  }
  return null;
}

/**
 * Glob-like match for case patterns.
 *
 * Args:
 *     pattern: case pattern with * ? and | already split
 *     text: subject
 * Returns:
 *     boolean
 */
export function globMatch(pattern, text) {
  let re = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`).test(text);
}

/**
 * Parse `case $x in ... esac` source into arms.
 *
 * Args:
 *     text: full case statement including keywords
 * Returns:
 *     { word, arms: [{ patterns: string[], body: string }] }
 * Raises:
 *     SyntaxError
 */
export function parseCase(text) {
  const m = text.match(/^\s*case\s+([\s\S]+?)\s+in\s*([\s\S]*)\besac\s*$/);
  if (!m) throw new SyntaxError('syntax error: malformed case');
  const word = m[1].trim();
  const body = m[2];
  const arms = [];
  // Split on ) that close pattern lists — patterns end with )
  const parts = body.split(/\n|;;/);
  // Better scan: find `pat|pat) body` until ;;
  const re = /([^\n;]+?)\s*\)\s*([\s\S]*?);;/g;
  let match;
  while ((match = re.exec(body + ';;')) !== null) {
    const patList = match[1].trim();
    const armBody = match[2].trim();
    const patterns = patList.split('|').map((p) => p.trim()).filter(Boolean);
    if (patterns.length) arms.push({ patterns, body: armBody });
  }
  // default: *) at end without ;; sometimes
  const star = body.match(/\*\s*\)\s*([\s\S]*)$/);
  if (star && !arms.some((a) => a.patterns.includes('*'))) {
    arms.push({ patterns: ['*'], body: star[1].replace(/;;[\s\S]*$/, '').trim() });
  }
  return { word, arms };
}

/**
 * Expand array assignment: name=(a b c)
 *
 * Args:
 *     text: assignment source
 * Returns:
 *     { name, items } or null
 */
export function parseArrayAssign(text) {
  const m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)=\(([^)]*)\)$/);
  if (!m) return null;
  const items = m[2].split(/\s+/).filter(Boolean);
  return { name: m[1], items };
}
