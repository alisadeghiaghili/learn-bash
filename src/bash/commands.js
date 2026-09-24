/**
 * Built-in and core bash command implementations for the virtual shell.
 *
 * Each command is a pure-ish function of (ctx, args, stdin) → result.
 * ctx mutates through official shell methods so undo snapshots stay coherent.
 */

import {
  createDir,
  createFile,
  resolvePath,
  splitPath,
} from './fs.js';
import { evalDoubleBracket, unwrapDoubleBracket } from './features.js';

/**
 * @typedef {object} CmdResult
 * @property {string} stdout
 * @property {string} stderr
 * @property {number} code
 */

/**
 * @typedef {object} CmdContext
 * @property {import('./shell.js').Shell} shell
 * @property {import('./fs.js').VirtualFS} fs
 * @property {string} cwd
 * @property {Record<string, string>} env
 */

/**
 * Shared result helper.
 *
 * Args:
 *     stdout: standard output text
 *     stderr: standard error text
 *     code: exit status (default 0)
 * Returns:
 *     CmdResult
 */
export function result(stdout = '', stderr = '', code = 0) {
  return { stdout, stderr, code };
}

const COMMANDS = {
  pwd: cmdPwd,
  cd: cmdCd,
  ls: cmdLs,
  echo: cmdEcho,
  cat: cmdCat,
  touch: cmdTouch,
  mkdir: cmdMkdir,
  rm: cmdRm,
  cp: cmdCp,
  mv: cmdMv,
  whoami: cmdWhoami,
  hostname: cmdHostname,
  head: cmdHead,
  tail: cmdTail,
  wc: cmdWc,
  grep: cmdGrep,
  chmod: cmdChmod,
  find: cmdFind,
  sort: cmdSort,
  cut: cmdCut,
  tr: cmdTr,
  tee: cmdTee,
  export: cmdExport,
  unset: cmdUnset,
  env: cmdEnv,
  test: cmdTest,
  '[': cmdTest,
  '[[': cmdDoubleBracket,
  source: cmdSource,
  '.': cmdSource,
  bash: cmdBashScript,
  sh: cmdBashScript,
  exit: cmdExit,
  clear: cmdClear,
  true: () => result(),
  false: () => result('', '', 1),
  help: cmdHelp,
};

/**
 * Sort lines of stdin or a file.
 *
 * Args:
 *     ctx: command context
 *     args: CLI args
 *     stdin: pipeline stdin
 * Returns:
 *     CmdResult
 */
function cmdSort(ctx, args, stdin) {
  const reverse = args.includes('-r');
  const files = args.filter((a) => !a.startsWith('-'));
  let text = stdin ?? '';
  if (files.length) {
    const abs = resolvePath(ctx.cwd, files[0], ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node || node.type !== 'file') {
      return result('', `sort: cannot read: ${files[0]}: No such file or directory`, 2);
    }
    text = node.content;
  }
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  lines.sort();
  if (reverse) lines.reverse();
  return result(lines.map((l) => l + '\n').join(''));
}

/**
 * Cut fields from stdin or a file.
 *
 * Args:
 *     ctx: command context
 *     args: -d delim -f N / -c N
 *     stdin: pipeline stdin
 * Returns:
 *     CmdResult
 */
function cmdCut(ctx, args, stdin) {
  let delim = '\t';
  let fields = null;
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-d') {
      delim = args[i + 1] ?? '\t';
      i += 1;
      continue;
    }
    if (args[i] === '-f') {
      fields = (args[i + 1] ?? '1').split(',').map((n) => parseInt(n, 10));
      i += 1;
      continue;
    }
    if (!args[i].startsWith('-')) files.push(args[i]);
  }
  let text = stdin ?? '';
  if (files.length) {
    const abs = resolvePath(ctx.cwd, files[0], ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node || node.type !== 'file') {
      return result('', `cut: ${files[0]}: No such file or directory`, 1);
    }
    text = node.content;
  }
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const out = lines.map((line) => {
    if (!fields) return line;
    const parts = line.split(delim);
    return fields.map((n) => parts[n - 1] ?? '').join(delim);
  });
  return result(out.map((l) => l + '\n').join(''));
}

/**
 * Translate characters (basic tr SET1 SET2).
 *
 * Args:
 *     ctx: command context
 *     args: sets
 *     stdin: pipeline stdin
 * Returns:
 *     CmdResult
 */
function cmdTr(ctx, args, stdin) {
  const [a, b] = args.filter((x) => !x.startsWith('-'));
  if (!a || !b) return result('', 'tr: usage: tr SET1 SET2', 1);
  const src = stdin ?? '';
  const map = new Map();
  for (let i = 0; i < a.length; i += 1) map.set(a[i], b[Math.min(i, b.length - 1)]);
  let out = '';
  for (const ch of src) out += map.has(ch) ? map.get(ch) : ch;
  return result(out);
}

/**
 * Tee stdin to files and stdout.
 *
 * Args:
 *     ctx: command context
 *     args: files
 *     stdin: pipeline stdin
 * Returns:
 *     CmdResult
 */
function cmdTee(ctx, args, stdin) {
  const append = args.includes('-a');
  const files = args.filter((a) => !a.startsWith('-'));
  const text = stdin ?? '';
  for (const f of files) {
    const abs = resolvePath(ctx.cwd, f, ctx.env.HOME);
    const existing = ctx.fs.getNode(abs);
    if (existing && existing.type === 'file') {
      existing.content = append ? existing.content + text : text;
    } else if (!existing) {
      const { dir, base } = splitPath(abs);
      ctx.fs.attach(dir, createFile(base, text));
    }
  }
  return result(text);
}

/**
 * export NAME=value or export NAME
 */
function cmdExport(ctx, args) {
  for (const a of args) {
    const eq = a.indexOf('=');
    if (eq === -1) continue;
    const name = a.slice(0, eq);
    const value = a.slice(eq + 1);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      return result('', `export: \`${a}': not a valid identifier`, 1);
    }
    ctx.env[name] = value;
    ctx.shell.env[name] = value;
  }
  return result();
}

function cmdUnset(ctx, args) {
  for (const name of args) delete ctx.env[name];
  return result();
}

function cmdEnv(ctx) {
  const keys = Object.keys(ctx.env).filter((k) => k !== '?' && k !== '$').sort();
  return result(keys.map((k) => `${k}=${ctx.env[k]}\n`).join(''));
}

/**
 * test / [ — file tests, string tests, integer comparisons, ! -a -o.
 *
 * Args:
 *     ctx: command context
 *     args: expression words (trailing ] optional)
 * Returns:
 *     CmdResult code 0 true / 1 false
 */
function cmdTest(ctx, args) {
  let expr = args;
  if (expr[expr.length - 1] === ']') expr = expr.slice(0, -1);
  if (expr.length === 0) return result('', '', 1);
  const ok = evalTestExpr(expr, ctx);
  return result('', '', ok ? 0 : 1);
}

function evalTestExpr(expr, ctx) {
  // Handle ! and parentheses-less -a/-o with simple left-to-right for MVP depth
  if (expr[0] === '!' && expr.length > 1) return !evalTestExpr(expr.slice(1), ctx);

  if (expr.length === 1) return expr[0] !== '' && expr[0] !== '0';

  if (expr.length === 2) {
    const [op, a] = expr;
    const abs = resolvePath(ctx.cwd, a, ctx.env.HOME);
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

  if (expr.length === 3) {
    const [x, op, y] = expr;
    switch (op) {
      case '=':
      case '==':
        return x === y;
      case '!=':
        return x !== y;
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

  // a -a b / a -o b
  for (let i = 0; i < expr.length; i += 1) {
    if (expr[i] === '-o') {
      return evalTestExpr(expr.slice(0, i), ctx) || evalTestExpr(expr.slice(i + 1), ctx);
    }
  }
  for (let i = 0; i < expr.length; i += 1) {
    if (expr[i] === '-a') {
      return evalTestExpr(expr.slice(0, i), ctx) && evalTestExpr(expr.slice(i + 1), ctx);
    }
  }
  return false;
}

function cmdSource(ctx, args) {
  const path = args[0];
  if (!path) return result('', 'source: filename argument required', 2);
  const abs = resolvePath(ctx.cwd, path, ctx.env.HOME);
  const node = ctx.fs.getNode(abs);
  if (!node || node.type !== 'file') {
    return result('', `source: ${path}: No such file or directory`, 1);
  }
  return ctx.shell.executeScript(node.content, { nested: true, captureHistory: false });
}

function cmdBashScript(ctx, args) {
  const path = args.find((a) => !a.startsWith('-'));
  if (!path) return result('', 'bash: usage: bash file', 2);
  return cmdSource(ctx, [path]);
}

function cmdExit(ctx, args) {
  const code = args[0] !== undefined ? Number(args[0]) || 0 : Number(ctx.env['?'] || 0);
  return result('', '', code);
}

/**
 * [[ ... ]] extended test with == != =~ and && ||.
 *
 * Args:
 *     ctx: command context
 *     args: expression words (may include [[ ]] tokens)
 * Returns:
 *     CmdResult code 0/1
 */
function cmdDoubleBracket(ctx, args) {
  const inner = unwrapDoubleBracket(args);
  const ok = evalDoubleBracket(inner, ctx);
  return result('', '', ok ? 0 : 1);
}

/**
 * Look up a command function.
 *
 * Args:
 *     name: command name
 * Returns:
 *     command function or null
 */
export function getCommand(name) {
  return COMMANDS[name] ?? null;
}

/**
 * List all built-in command names.
 *
 * Returns:
 *     sorted string array
 */
export function commandNames() {
  return Object.keys(COMMANDS).sort();
}

// --- commands -----------------------------------------------------------

function cmdPwd(ctx) {
  return result(ctx.cwd + '\n');
}

function cmdCd(ctx, args) {
  const target = args[0] ?? '~';
  const abs = resolvePath(ctx.cwd, target, ctx.env.HOME);
  const node = ctx.fs.getNode(abs);
  if (!node) return result('', `cd: ${target}: No such file or directory`, 1);
  if (node.type !== 'dir') return result('', `cd: ${target}: Not a directory`, 1);
  ctx.shell.setCwd(abs);
  return result();
}

function cmdLs(ctx, args) {
  const flags = args.filter((a) => a.startsWith('-')).join('');
  const paths = args.filter((a) => !a.startsWith('-'));
  const showAll = flags.includes('a');
  const long = flags.includes('l');
  const targets = paths.length ? paths : ['.'];

  let out = '';
  for (const t of targets) {
    const abs = resolvePath(ctx.cwd, t, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) {
      return result(out, `ls: ${t}: No such file or directory`, 1);
    }
    if (node.type === 'file') {
      out += long ? formatLong(node, t) + '\n' : t + '\n';
      continue;
    }
    let entries = ctx.fs.list(abs);
    if (!showAll) entries = entries.filter((e) => !e.name.startsWith('.'));
    if (targets.length > 1) out += `${t}:\n`;
    for (const e of entries) {
      out += long ? formatLong(e, e.name) + '\n' : e.name + '\n';
    }
  }
  return result(out);
}

function formatLong(node, name) {
  const kind = node.type === 'dir' ? 'd' : '-';
  const mode = node.mode ?? '644';
  const perms = modeToRwx(mode);
  return `${kind}${perms}  1 ${node.owner} staff  0 ${name}`;
}

function modeToRwx(mode) {
  const n = parseInt(mode, 8);
  const bits = ['r', 'w', 'x'];
  let out = '';
  for (let shift = 6; shift >= 0; shift -= 3) {
    for (let b = 2; b >= 0; b -= 1) {
      out += n & (1 << (shift + b)) ? bits[2 - b] : '-';
    }
  }
  return out;
}

function cmdEcho(ctx, args, stdin, rawArgs) {
  const n = args[0] === '-n';
  const parts = n ? args.slice(1) : args;
  // Preserve original spacing between quoted words is already collapsed;
  // join with single space like bash does after expansion.
  const text = parts.join(' ');
  return result(n ? text : text + '\n');
}

function cmdCat(ctx, args, stdin) {
  if (args.length === 0) {
    return result(stdin ?? '');
  }
  let out = '';
  for (const a of args) {
    const abs = resolvePath(ctx.cwd, a, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) return result(out, `cat: ${a}: No such file or directory`, 1);
    if (node.type === 'dir') return result(out, `cat: ${a}: Is a directory`, 1);
    out += node.content;
  }
  return result(out);
}

function cmdTouch(ctx, args) {
  if (args.length === 0) return result('', 'touch: missing file operand', 1);
  for (const a of args) {
    const abs = resolvePath(ctx.cwd, a, ctx.env.HOME);
    const existing = ctx.fs.getNode(abs);
    if (existing) {
      existing.mtime = Date.now();
      continue;
    }
    const { dir, base } = splitPath(abs);
    const parent = ctx.fs.getNode(dir);
    if (!parent || parent.type !== 'dir') {
      return result('', `touch: ${a}: No such file or directory`, 1);
    }
    ctx.fs.attach(dir, createFile(base));
  }
  return result();
}

function cmdMkdir(ctx, args) {
  const paths = args.filter((a) => !a.startsWith('-'));
  const parents = args.includes('-p');
  if (paths.length === 0) return result('', 'mkdir: missing operand', 1);

  for (const p of paths) {
    const abs = resolvePath(ctx.cwd, p, ctx.env.HOME);
    if (ctx.fs.getNode(abs)) {
      if (parents) continue;
      return result('', `mkdir: cannot create directory '${p}': File exists`, 1);
    }
    if (parents) {
      if (!ensureParents(ctx, abs)) {
        return result('', `mkdir: cannot create directory '${p}': No such file or directory`, 1);
      }
      continue;
    }
    const { dir } = splitPath(abs);
    const parent = ctx.fs.getNode(dir);
    if (!parent || parent.type !== 'dir') {
      return result('', `mkdir: cannot create directory '${p}': No such file or directory`, 1);
    }
    ctx.fs.attach(dir, createDir(splitPath(abs).base));
  }
  return result();
}

function ensureParents(ctx, abs) {
  const parts = abs.split('/').filter(Boolean);
  let current = '/';
  for (const part of parts) {
    current = current === '/' ? `/${part}` : `${current}/${part}`;
    const node = ctx.fs.getNode(current);
    if (!node) {
      const { dir, base } = splitPath(current);
      if (!ctx.fs.attach(dir, createDir(base))) return false;
    } else if (node.type !== 'dir') {
      return false;
    }
  }
  return true;
}

function cmdRm(ctx, args) {
  const recursive = args.some((a) => a.startsWith('-') && a.includes('r'));
  const force = args.some((a) => a.startsWith('-') && a.includes('f'));
  const paths = args.filter((a) => !a.startsWith('-'));
  if (paths.length === 0) return result('', 'rm: missing operand', 1);

  for (const p of paths) {
    const abs = resolvePath(ctx.cwd, p, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) {
      if (force) continue;
      return result('', `rm: cannot remove '${p}': No such file or directory`, 1);
    }
    if (node.type === 'dir') {
      if (!recursive) {
        return result('', `rm: cannot remove '${p}': Is a directory`, 1);
      }
    }
    if (abs === ctx.cwd || ctx.cwd.startsWith(abs + '/')) {
      return result('', `rm: cannot remove '${p}': Device or resource busy`, 1);
    }
    ctx.fs.remove(abs);
  }
  return result();
}

function cmdCp(ctx, args) {
  const recursive = args.some((a) => a.startsWith('-') && a.includes('r'));
  const paths = args.filter((a) => !a.startsWith('-'));
  if (paths.length < 2) return result('', 'cp: missing destination file operand', 1);

  const dest = paths[paths.length - 1];
  const sources = paths.slice(0, -1);
  const destAbs = resolvePath(ctx.cwd, dest, ctx.env.HOME);
  const destNode = ctx.fs.getNode(destAbs);

  for (const s of sources) {
    const srcAbs = resolvePath(ctx.cwd, s, ctx.env.HOME);
    const srcNode = ctx.fs.getNode(srcAbs);
    if (!srcNode) return result('', `cp: cannot stat '${s}': No such file or directory`, 1);

    if (destNode && destNode.type === 'dir') {
      if (srcNode.type === 'dir' && !recursive) {
        return result('', `cp: -r not specified; omitting directory '${s}'`, 1);
      }
      const targetName = splitPath(srcAbs).base;
      const targetPath = resolvePath(destAbs, targetName, ctx.env.HOME);
      if (!copyInto(ctx, srcNode, destAbs, targetName, recursive)) {
        return result('', `cp: cannot copy '${s}'`, 1);
      }
    } else {
      if (srcNode.type === 'dir' && !recursive) {
        return result('', `cp: -r not specified; omitting directory '${s}'`, 1);
      }
      const { dir, base } = splitPath(destAbs);
      if (!ctx.fs.getNode(dir)) {
        return result('', `cp: cannot create '${dest}': No such file or directory`, 1);
      }
      if (destNode) ctx.fs.remove(destAbs);
      copyInto(ctx, srcNode, dir, base, recursive);
    }
  }
  return result();
}

function copyInto(ctx, srcNode, parentPath, name, recursive) {
  if (srcNode.type === 'file') {
    return ctx.fs.attach(parentPath, createFile(name, srcNode.content, srcNode.mode));
  }
  if (!recursive) return false;
  const dir = createDir(name, srcNode.mode);
  if (!ctx.fs.attach(parentPath, dir)) return false;
  for (const child of srcNode.children.values()) {
    if (!copyInto(ctx, child, resolvePath(parentPath, name), child.name, true)) return false;
  }
  return true;
}

function cmdMv(ctx, args) {
  const paths = args.filter((a) => !a.startsWith('-'));
  if (paths.length < 2) return result('', 'mv: missing destination file operand', 1);

  const dest = paths[paths.length - 1];
  const sources = paths.slice(0, -1);
  const destAbs = resolvePath(ctx.cwd, dest, ctx.env.HOME);
  const destNode = ctx.fs.getNode(destAbs);

  for (const s of sources) {
    const srcAbs = resolvePath(ctx.cwd, s, ctx.env.HOME);
    const srcNode = ctx.fs.getNode(srcAbs);
    if (!srcNode) return result('', `mv: cannot stat '${s}': No such file or directory`, 1);
    if (srcAbs === ctx.cwd || ctx.cwd.startsWith(srcAbs + '/')) {
      return result('', `mv: cannot move '${s}': Device or resource busy`, 1);
    }

    if (destNode && destNode.type === 'dir') {
      const targetName = splitPath(srcAbs).base;
      const targetPath = resolvePath(destAbs, targetName, ctx.env.HOME);
      if (ctx.fs.getNode(targetPath)) ctx.fs.remove(targetPath);
      if (!ctx.fs.remove(srcAbs)) return result('', `mv: cannot move '${s}'`, 1);
      srcNode.name = targetName;
      if (!ctx.fs.attach(destAbs, srcNode)) return result('', `mv: cannot move '${s}'`, 1);
    } else {
      const { dir, base } = splitPath(destAbs);
      if (!ctx.fs.getNode(dir)) {
        return result('', `mv: cannot move '${s}': No such file or directory`, 1);
      }
      if (destNode) ctx.fs.remove(destAbs);
      if (!ctx.fs.remove(srcAbs)) return result('', `mv: cannot move '${s}'`, 1);
      srcNode.name = base;
      if (!ctx.fs.attach(dir, srcNode)) return result('', `mv: cannot move '${s}'`, 1);
    }
  }
  return result();
}

function cmdWhoami(ctx) {
  return result('learner\n');
}

function cmdHostname(ctx) {
  return result('learnbox\n');
}

function cmdHead(ctx, args, stdin) {
  return headTail(ctx, args, stdin, 'head');
}

function cmdTail(ctx, args, stdin) {
  return headTail(ctx, args, stdin, 'tail');
}

function headTail(ctx, args, stdin, which) {
  let count = 10;
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-n') {
      count = parseInt(args[i + 1], 10);
      i += 1;
      continue;
    }
    if (/^-\d+$/.test(args[i])) {
      count = parseInt(args[i].slice(1), 10);
      continue;
    }
    if (args[i].startsWith('-')) continue;
    files.push(args[i]);
  }

  const pick = (text) => {
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const slice = which === 'head' ? lines.slice(0, count) : lines.slice(-count);
    return slice.join('\n') + (slice.length ? '\n' : '');
  };

  if (files.length === 0) return result(pick(stdin ?? ''));

  let out = '';
  for (const f of files) {
    const abs = resolvePath(ctx.cwd, f, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node || node.type !== 'file') {
      return result(out, `${which}: ${f}: No such file or directory`, 1);
    }
    out += pick(node.content);
  }
  return result(out);
}

function cmdWc(ctx, args, stdin) {
  const countLines = args.includes('-l');
  const countWords = args.includes('-w');
  const countChars = args.includes('-c');
  const files = args.filter((a) => !a.startsWith('-'));
  const none = !countLines && !countWords && !countChars;

  const measure = (text) => {
    const lines = text.length === 0 ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    // bash wc counts lines as newline count
    const nl = (text.match(/\n/g) || []).length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const parts = [];
    if (none || countLines) parts.push(String(nl));
    if (none || countWords) parts.push(String(words));
    if (none || countChars) parts.push(String(chars));
    return parts.join('  ');
  };

  if (files.length === 0) {
    return result(measure(stdin ?? '') + '\n');
  }
  let out = '';
  for (const f of files) {
    const abs = resolvePath(ctx.cwd, f, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) return result(out, `wc: ${f}: No such file or directory`, 1);
    const text = node.type === 'file' ? node.content : '';
    out += `${measure(text)}  ${f}\n`;
  }
  return result(out);
}

function cmdGrep(ctx, args, stdin) {
  const ignoreCase = args.includes('-i');
  const invert = args.includes('-v');
  const countOnly = args.includes('-c');
  const files = args.filter((a, idx) => {
    if (a.startsWith('-')) return false;
    // first non-flag is pattern unless it is after -e (not supported) — pattern first
    return true;
  });

  // bash: grep [options] pattern [file...]
  let pattern = null;
  const pathArgs = [];
  for (const a of args) {
    if (a.startsWith('-') && a.length > 1) continue;
    if (pattern === null) {
      pattern = a;
      continue;
    }
    pathArgs.push(a);
  }
  if (pattern === null) return result('', 'grep: missing pattern', 1);

  const flags = ignoreCase ? 'i' : '';
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    return result('', `grep: ${pattern}: invalid regular expression`, 1);
  }

  const filterText = (text) => {
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const hits = lines.filter((line) => {
      const m = re.test(line);
      return invert ? !m : m;
    });
    if (countOnly) return String(hits.length) + '\n';
    return hits.map((h) => h + '\n').join('');
  };

  if (pathArgs.length === 0) {
    const out = filterText(stdin ?? '');
    return result(out, '', out ? 0 : 1);
  }

  let out = '';
  let code = 1;
  for (const p of pathArgs) {
    const abs = resolvePath(ctx.cwd, p, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) return result(out, `grep: ${p}: No such file or directory`, 2);
    if (node.type === 'dir') return result(out, `grep: ${p}: Is a directory`, 2);
    const body = filterText(node.content);
    if (body) {
      code = 0;
      out += pathArgs.length > 1 ? body.split('\n').filter((l) => l !== '')
        .map((l) => `${p}:${l}\n`).join('') : body;
    }
  }
  return result(out, '', code);
}

function cmdChmod(ctx, args) {
  const paths = args.filter((a) => !a.startsWith('-'));
  const modeArg = args.find((a) => /^[0-7]{3,4}$/.test(a)) ?? args[0];
  const files = args.filter((a, i) => i > 0 && !a.startsWith('-'));

  if (!modeArg || files.length === 0) {
    return result('', 'chmod: usage: chmod MODE FILE', 1);
  }
  if (!/^[0-7]{3,4}$/.test(modeArg)) {
    return result('', `chmod: invalid mode: '${modeArg}'`, 1);
  }

  for (const f of files) {
    const abs = resolvePath(ctx.cwd, f, ctx.env.HOME);
    const node = ctx.fs.getNode(abs);
    if (!node) return result('', `chmod: cannot access '${f}': No such file or directory`, 1);
    node.mode = modeArg.slice(-3);
    node.mtime = Date.now();
  }
  return result();
}

/**
 * Find files under a path, optionally matching -name glob.
 *
 * Args:
 *     ctx: command context
 *     args: find arguments
 * Returns:
 *     CmdResult with matching paths
 */
function cmdFind(ctx, args) {
  let start = null;
  let namePattern = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-name') {
      namePattern = args[i + 1];
      i += 1;
      continue;
    }
    if (args[i].startsWith('-')) continue;
    if (start === null) start = args[i];
  }
  if (start === null) start = '.';

  const abs = resolvePath(ctx.cwd, start, ctx.env.HOME);
  const root = ctx.fs.getNode(abs);
  if (!root) return result('', `find: '${start}': No such file or directory`, 1);

  const re = namePattern
    ? new RegExp(
        '^' +
          namePattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') +
          '$'
      )
    : null;

  const out = [];
  const collect = (node, path) => {
    const isRoot = path === abs;
    if (!re || isRoot || re.test(node.name)) out.push(path);
    if (node.type === 'dir') {
      for (const child of node.children.values()) {
        const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
        collect(child, childPath);
      }
    }
  };
  collect(root, abs);
  return result(out.map((p) => p + '\n').join(''));
}

function cmdClear(ctx) {
  return result('', '', 0);
}

function cmdHelp() {
  const names = commandNames();
  return result(
    'LearnBash built-ins:\n' +
      names.map((n) => `  ${n}`).join('\n') +
      '\n\nApp commands:\n  levels  goal  quiz  review  undo  reset  help\n' +
      'Operators:  |  >  >>  <  2>  ;  &&  ||\n' +
      'Expansion:  $VAR  ${VAR}  $(cmd)  `cmd`  $((1+2))  * ? [a-z]  ~  <(cmd)\n' +
      'Control:  if [[ ... ]]; then ...; fi   for i in ...; do ...; done   while ...; do ...; done\n' +
      'Functions:  name() { echo hi $1; }   then call: name arg\n'
  );
}
