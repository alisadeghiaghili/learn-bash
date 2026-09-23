/**
 * Word expansion: parameters, command substitution, pathname globbing.
 *
 * Order (bash-like for this teaching sandbox):
 *   tilde → parameters/$?/$$ → command substitution $(...) / `...` →
 *   field splitting is already done at tokenize for quotes → glob.
 */

import { resolvePath } from './fs.js';

/**
 * Expand $VARS, ${VAR}, $?, $((...)), ~.
 *
 * Args:
 *     word: raw word (quotes already stripped by tokenizer)
 *     env: environment map
 *     home: home directory
 *     shell: optional Shell for $() recursion
 * Returns:
 *     Promise<string> or string when no async ops — we use async for $()
 */
export async function expandWordAsync(word, env, home, shell) {
  let out = '';
  for (let i = 0; i < word.length; i += 1) {
    const ch = word[i];

    if (ch === '~' && i === 0) {
      out += home;
      continue;
    }

    if (ch === '$' && word[i + 1] === '(' && word[i + 2] === '(') {
      const end = findClose(word, i + 2, '(', ')');
      if (end === -1) {
        out += ch;
        continue;
      }
      const expr = word.slice(i + 3, end);
      out += String(evalArith(expr, env));
      i = end;
      continue;
    }

    if (ch === '$' && word[i + 1] === '(') {
      const end = findClose(word, i + 1, '(', ')');
      if (end === -1) {
        out += ch;
        continue;
      }
      const inner = word.slice(i + 2, end);
      if (shell) {
        const trace = shell.execute(inner, { nested: true, captureHistory: false });
        out += (trace.stdout ?? '').replace(/\n$/, '');
      }
      i = end;
      continue;
    }

    if (ch === '`') {
      const end = word.indexOf('`', i + 1);
      if (end === -1) {
        out += ch;
        continue;
      }
      const inner = word.slice(i + 1, end);
      if (shell) {
        const trace = shell.execute(inner, { nested: true, captureHistory: false });
        out += (trace.stdout ?? '').replace(/\n$/, '');
      }
      i = end;
      continue;
    }

    if (ch === '$') {
      if (word[i + 1] === '?' || word[i + 1] === '$') {
        out += env[word[i + 1]] ?? '';
        i += 1;
        continue;
      }
      if (word[i + 1] === '{') {
        const end = word.indexOf('}', i + 2);
        if (end === -1) {
          out += ch;
          continue;
        }
        const name = word.slice(i + 2, end);
        out += env[name] ?? '';
        i = end;
        continue;
      }
      let j = i + 1;
      while (j < word.length && /[A-Za-z0-9_]/.test(word[j])) j += 1;
      if (j === i + 1) {
        out += ch;
        continue;
      }
      const name = word.slice(i + 1, j);
      out += env[name] ?? '';
      i = j - 1;
      continue;
    }

    out += ch;
  }
  return out;
}

/**
 * Find matching close bracket starting at openIndex.
 */
function findClose(s, openIndex, open, close) {
  let depth = 0;
  for (let i = openIndex; i < s.length; i += 1) {
    if (s[i] === open) depth += 1;
    else if (s[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Tiny integer arithmetic for $((...)).
 *
 * Args:
 *     expr: arithmetic source
 *     env: variables (names resolve)
 * Returns:
 *     number
 */
export function evalArith(expr, env) {
  const replaced = expr.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
    const v = env[name];
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : '0';
  });
  if (!/^[-+*/%()\s0-9.]+$/.test(replaced)) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const n = Function(`"use strict"; return (${replaced});`)();
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Glob one token against the virtual filesystem.
 *
 * Args:
 *     word: expanded word
 *     fs: VirtualFS
 *     cwd: current directory
 * Returns:
 *     string[] — matched paths (or [word] if no glob / no match)
 */
export function expandGlob(word, fs, cwd) {
  if (!/[*?[]/.test(word)) return [word];

  const abs = word.startsWith('/')
    ? word
    : resolvePath(cwd, word.includes('/') ? word.slice(0, word.lastIndexOf('/')) || '/' : '.', '');
  // Split pattern into dir prefix + basename pattern
  const slash = word.lastIndexOf('/');
  const dirPart = slash === -1 ? '.' : word.slice(0, slash) || '/';
  const namePat = slash === -1 ? word : word.slice(slash + 1);
  const dirAbs = resolvePath(cwd, dirPart);
  const node = fs.getNode(dirAbs);
  if (!node || node.type !== 'dir') return [word];

  const re = globToRegExp(namePat);
  const matches = [...node.children.keys()]
    .filter((name) => re.test(name))
    .sort()
    .map((name) => {
      const joined = dirPart === '/' ? `/${name}` : `${dirPart.replace(/\/$/, '')}/${name}`;
      return word.startsWith('/') ? resolvePath(cwd, joined) : joined;
    });

  return matches.length ? matches : [word];
}

/**
 * Convert a glob pattern to RegExp.
 *
 * Args:
 *     pattern: glob with * ? [...]
 * Returns:
 *     RegExp
 */
export function globToRegExp(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '*') {
      out += '.*';
      continue;
    }
    if (c === '?') {
      out += '.';
      continue;
    }
    if (c === '[') {
      const end = pattern.indexOf(']', i + 1);
      if (end === -1) {
        out += '\\[';
        continue;
      }
      out += pattern.slice(i, end + 1);
      i = end;
      continue;
    }
    out += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

/**
 * Full expansion of one word: vars + $() + glob (glob may yield many fields).
 *
 * Args:
 *     word: raw word
 *     ctx: { env, home, fs, cwd, shell }
 * Returns:
 *     Promise<string[]>
 */
export async function expandFields(word, ctx) {
  // Quoted words: if original had no glob chars after expand, single field.
  // Tokenizer already stripped quotes; * inside quotes should not glob —
  // we approximate: glob only when the raw word contains unquoted-looking globs.
  const expanded = await expandWordAsync(word, ctx.env, ctx.home, ctx.shell);
  if (word.includes('*') || word.includes('?') || word.includes('[')) {
    // Only glob if the raw word (not expanded from quotes) had glob chars —
    // quoted ' * ' was one token without * if user quoted; tokens don't keep that flag.
    // Practical rule: glob when expanded still has glob metacharacters.
    if (/[*?[]/.test(expanded)) {
      return expandGlob(expanded, ctx.fs, ctx.cwd);
    }
  }
  return [expanded];
}

/**
 * Expand an arg list into fields (globs may expand to multiple).
 *
 * Args:
 *     args: raw args
 *     ctx: expansion context
 * Returns:
 *     Promise<string[]>
 */
export async function expandArgs(args, ctx) {
  const out = [];
  for (const a of args) {
    const fields = await expandFields(a, ctx);
    out.push(...fields);
  }
  return out;
}
