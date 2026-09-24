/**
 * Shell functions, [[ ]] tests, and process substitution helpers.
 */

/**
 * @typedef {object} ShellFunction
 * @property {string} name
 * @property {string[]} params  // $1..$n formals (unused names, positional only)
 * @property {string} body     // raw body source
 */

/**
 * Parse a function definition line/block.
 *
 * Args:
 *     text: source starting at name() { ... }  or name() { ...; }
 * Returns:
 *     { name, body, rest } or null
 */
export function parseFunctionDef(text) {
  const m = text.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{([\s\S]*)\}\s*$/);
  if (!m) return null;
  return { name: m[1], body: m[2] };
}

/**
 * Evaluate [[ ... ]] expression.
 *
 * Args:
 *     args: tokens inside [[ ]] (without the brackets)
 *     ctx: { fs, cwd, env, home }
 * Returns:
 *     boolean
 */
export function evalDoubleBracket(args, ctx) {
  // Handle ! negation
  if (args[0] === '!' && args.length > 1) {
    return !evalDoubleBracket(args.slice(1), ctx);
  }

  // && / || split at top level (no parentheses support)
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '||') {
      return (
        evalDoubleBracket(args.slice(0, i), ctx) ||
        evalDoubleBracket(args.slice(i + 1), ctx)
      );
    }
  }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '&&') {
      return (
        evalDoubleBracket(args.slice(0, i), ctx) &&
        evalDoubleBracket(args.slice(i + 1), ctx)
      );
    }
  }

  if (args.length === 1) return args[0] !== '' && args[0] !== '0';

  if (args.length === 2) {
    const [op, a] = args;
    const abs = resolvePathLocal(ctx, a);
    const node = ctx.fs.getNode(abs);
    switch (op) {
      case '-e':
        return !!node;
      case '-f':
        return !!node && node.type === 'file';
      case '-d':
        return !!node && node.type === 'dir';
      case '-s':
        return !!node && node.type === 'file' && node.content.length > 0;
      case '-z':
        return a === '';
      case '-n':
        return a !== '';
      default:
        return false;
    }
  }

  if (args.length === 3) {
    const [x, op, y] = args;
    switch (op) {
      case '=':
      case '==':
        return x === y;
      case '!=':
        return x !== y;
      case '=~': {
        try {
          return new RegExp(y).test(x);
        } catch {
          return false;
        }
      }
      case '-eq':
        return Number(x) === Number(y);
      case '-ne':
        return Number(x) !== Number(y);
      case '-lt':
        return Number(x) < Number(y);
      case '-le':
        return Number(x) <= Number(y);
      case '-gt':
        return Number(x) > Number(y);
      case '-ge':
        return Number(x) >= Number(y);
      default:
        return false;
    }
  }

  return false;
}

function resolvePathLocal(ctx, path) {
  // inline to avoid circular import weight
  const home = ctx.env.HOME ?? '/home/learner';
  if (!path || path === '.') return ctx.cwd;
  if (path === '~') path = home;
  if (path.startsWith('~/')) path = home + path.slice(1);
  const base = path.startsWith('/') ? [] : ctx.cwd.split('/').filter(Boolean);
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      base.pop();
      continue;
    }
    base.push(part);
  }
  return '/' + base.join('/');
}

/**
 * Detect and expand process substitution <(cmd) and >(cmd).
 *
 * For <(cmd): run cmd, write stdout to a temp virtual file, replace with path.
 * For >(cmd): create a sink file and record the consumer command (best-effort).
 *
 * Args:
 *     word: raw word possibly containing <( ) or >( )
 *     shell: Shell
 * Returns:
 *     string expanded word
 */
export function expandProcessSub(word, shell) {
  let out = '';
  for (let i = 0; i < word.length; i += 1) {
    if (word[i] === '<' && word[i + 1] === '(') {
      const end = findClose(word, i + 1, '(', ')');
      if (end === -1) {
        out += word[i];
        continue;
      }
      const inner = word.slice(i + 2, end);
      const t = shell._runPipelineLine(inner);
      const path = shell.writeTemp(t.stdout ?? '');
      out += path;
      i = end;
      continue;
    }
    if (word[i] === '>' && word[i + 1] === '(') {
      const end = findClose(word, i + 1, '(', ')');
      if (end === -1) {
        out += word[i];
        continue;
      }
      // >(cmd) — sink: provide a temp path; content is fed after the command.
      // Teaching approximation: capture to temp and run cmd on it later.
      const inner = word.slice(i + 2, end);
      const path = shell.writeTemp('');
      shell.pendingConsumers.push({ path, cmd: inner });
      out += path;
      i = end;
      continue;
    }
    out += word[i];
  }
  return out;
}

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
 * Strip matching [[ ]] wrappers from args.
 *
 * Args:
 *     args: full arg list possibly starting with [[ and ending with ]]
 * Returns:
 *     inner args
 */
export function unwrapDoubleBracket(args) {
  let a = args;
  if (a[0] === '[[') a = a.slice(1);
  if (a[a.length - 1] === ']]') a = a.slice(0, -1);
  return a;
}
