/**
 * Virtual bash shell: state, expansion, control flow, undo, scripts.
 */

import { VirtualFS, resolvePath, splitPath, createFile, createDir } from './fs.js';
import { parseLine, expandWord } from './parser.js';
import { expandArgs, expandFields, globToRegExp } from './expand.js';
import { getCommand, result as cmdResult } from './commands.js';
import { parseScript, runStatements, needsControlFlow, simpleToLine } from './control.js';

/**
 * In-memory shell with filesystem, env, history, and undo.
 */
export class Shell {
  /**
   * Args:
   *     fs: VirtualFS
   *     options: { cwd, home, user, host, env }
   */
  constructor(fs, options = {}) {
    this.fs = fs;
    this.home = options.home ?? '/home/learner';
    this.cwd = options.cwd ?? this.home;
    this.user = options.user ?? 'learner';
    this.host = options.host ?? 'learnbox';
    this.env = {
      HOME: this.home,
      USER: this.user,
      HOSTNAME: this.host,
      PWD: this.cwd,
      PATH: '/usr/local/bin:/usr/bin:/bin',
      SHELL: '/bin/bash',
      '?': '0',
      '1': '0',
      '2': '0',
      ...(options.env ?? {}),
    };
    /** @type {string[]} */
    this.history = [];
    /** @type {any[]} */
    this.undoStack = [];
    this.lastTrace = null;
    this._depth = 0;
    this.globToRegExp = globToRegExp;
  }

  /**
   * Prompt string like a real shell.
   *
   * Returns:
   *     prompt text without trailing space
   */
  prompt() {
    const dir = this.cwd === this.home ? '~' : this.cwd.replace(this.home, '~');
    return `${this.user}@${this.host}:${dir}$`;
  }

  /**
   * Change cwd (internal).
   *
   * Args:
   *     absPath: absolute directory path
   */
  setCwd(absPath) {
    this.cwd = absPath;
    this.env.PWD = absPath;
  }

  /**
   * Synchronous-ish expand for control-flow loop words (* not async).
   *
   * Args:
   *     word: raw word
   * Returns:
   *     string[]
   */
  expandForControl(word) {
    // Best-effort sync expansion for for-loops (no $() nesting in list)
    const env = this.env;
    let expanded = expandWord(word, env, this.home);
    if (/[*?[]/.test(expanded)) {
      return this._globSync(expanded);
    }
    return [expanded];
  }

  _globSync(pattern) {
    const slash = pattern.lastIndexOf('/');
    const dirPart = slash === -1 ? '.' : pattern.slice(0, slash) || '/';
    const namePat = slash === -1 ? pattern : pattern.slice(slash + 1);
    const dirAbs = resolvePath(this.cwd, dirPart);
    const node = this.fs.getNode(dirAbs);
    if (!node || node.type !== 'dir') return [pattern];
    const re = globToRegExp(namePat);
    const matches = [...node.children.keys()].filter((n) => re.test(n)).sort().map((n) => {
      const joined = dirPart === '/' ? `/${n}` : `${dirPart.replace(/\/$/, '')}/${n}`;
      return pattern.startsWith('/') ? resolvePath(this.cwd, joined) : joined;
    });
    return matches.length ? matches : [pattern];
  }

  /**
   * Full deep snapshot for undo.
   *
   * Returns:
   *     snapshot object
   */
  capture() {
    return {
      fs: this.fs.snapshot(),
      cwd: this.cwd,
      env: { ...this.env },
      history: [...this.history],
    };
  }

  /**
   * Restore a snapshot.
   *
   * Args:
   *     snap: snapshot from capture()
   */
  restore(snap) {
    this.fs.restore(snap.fs);
    this.cwd = snap.cwd;
    this.env = { ...snap.env };
    this.history = [...snap.history];
    this.env.PWD = this.cwd;
  }

  /**
   * Undo the last executed user command (not undo itself).
   *
   * Returns:
   *     ExecTrace
   */
  undo() {
    if (this.undoStack.length === 0) {
      return {
        line: 'undo',
        stages: [],
        stdout: '',
        stderr: 'undo: nothing to undo\n',
        code: 1,
        clear: false,
      };
    }
    const snap = this.undoStack.pop();
    this.restore(snap);
    return { line: 'undo', stages: [], stdout: '', stderr: '', code: 0, clear: false };
  }

  /**
   * Reset FS/cwd/env to a seed snapshot (level reset).
   *
   * Args:
   *     seed: capture()-shaped snapshot
   * Returns:
   *     ExecTrace
   */
  resetTo(seed) {
    this.restore(seed);
    this.undoStack = [];
    return { line: 'reset', stages: [], stdout: 'reset\n', stderr: '', code: 0, clear: false };
  }

  /**
   * Execute a multi-line script body (if/for/while). Synchronous for REPL.
   *
   * Args:
   *     text: script source
   *     options: { nested, captureHistory }
   * Returns:
   *     ExecTrace
   */
  executeScript(text, options = {}) {
    try {
      if (needsControlFlow(text) || text.includes('\n')) {
        return this._runControlSync(text);
      }
      return this.execute(text, {
        nested: true,
        captureHistory: false,
        ...options,
      });
    } catch (err) {
      const message = err instanceof SyntaxError ? err.message : String(err.message ?? err);
      return {
        line: String(text).split('\n')[0] ?? '',
        stages: [],
        stdout: '',
        stderr: message + '\n',
        code: 2,
        clear: false,
      };
    }
  }

  /**
   * Execute one raw input line (may be control flow).
   *
   * Args:
   *     line: user input
   *     options: { nested, captureHistory }
   * Returns:
   *     ExecTrace
   */
  execute(line, options = {}) {
    const nested = Boolean(options.nested);
    const captureHistory = options.captureHistory !== false && !nested;
    const trimmed = line.trim();
    if (!trimmed) {
      return { line, stages: [], stdout: '', stderr: '', code: 0, clear: false };
    }

    if (!nested) {
      const app = this._appCommand(trimmed);
      if (app) {
        if (captureHistory) this.history.push(trimmed);
        return app;
      }
    }

    if (!nested && needsControlFlow(trimmed)) {
      this.undoStack.push(this.capture());
      if (captureHistory) this.history.push(trimmed);
      this._depth += 1;
      const result = this._runControlSync(trimmed);
      this._depth -= 1;
      this.env['?'] = String(result.code);
      this.lastTrace = result;
      return result;
    }

    if (!nested) {
      this.undoStack.push(this.capture());
      if (captureHistory) this.history.push(trimmed);
    }

    try {
      const trace = this._runPipelineLine(trimmed);
      this.env['?'] = String(trace.code);
      this.lastTrace = trace;
      return trace;
    } catch (err) {
      const message = err instanceof SyntaxError ? err.message : String(err.message ?? err);
      return { line: trimmed, stages: [], stdout: '', stderr: message + '\n', code: 2, clear: false };
    }
  }

  /**
   * Run control-flow line. Uses microtask-blocking recursive execute for
   * simple statements; async for-loops via expandForControl.
   *
   * Note: kept sync for REPL by using the async executor with deasync-less
   * pre-parse only for pure-simple scripts. For for/if we return a thenable
   * that the UI may await — Shell.executeSync wrapper below handles it.
   */
  _runControlSync(trimmed) {
    try {
      // Execute control flow using the async runner, but expose sync API by
      // running statements with a blocking pattern: expand for-loops without $().
      const statements = parseScript(trimmed);
      const result = { stdout: '', stderr: '', code: 0, clear: false };
      const runList = (list) => {
        for (const stmt of list) {
          const r = runOne(stmt);
          result.stdout += r.stdout;
          result.stderr += r.stderr;
          if (r.code !== 0) result.code = r.code;
          else if (result.code === 0) result.code = r.code;
          if (r.clear) {
            result.clear = true;
            return;
          }
        }
      };
      const runOne = (stmt) => {
        if (stmt.type === 'simple') {
          const line = simpleToLine(stmt);
          if (!line) return { stdout: '', stderr: '', code: 0, clear: false };
          return this._runPipelineLine(line);
        }
        if (stmt.type === 'if') {
          for (const br of stmt.branches) {
            if (br.cond === null) {
              const r = { stdout: '', stderr: '', code: 0, clear: false };
              for (const s of br.body) {
                const x = runOne(s);
                r.stdout += x.stdout;
                r.stderr += x.stderr;
                r.code = x.code;
                if (x.clear) {
                  r.clear = true;
                  break;
                }
              }
              return r;
            }
            const condLine = simpleToLine({
              tokens: br.cond.filter((t) => !(t.type === 'op' && t.value === ';')),
            });
            const c = this._runPipelineLine(condLine);
            if (c.code === 0) {
              const r = { stdout: '', stderr: '', code: 0, clear: false };
              for (const s of br.body) {
                const x = runOne(s);
                r.stdout += x.stdout;
                r.stderr += x.stderr;
                r.code = x.code;
                if (x.clear) {
                  r.clear = true;
                  break;
                }
              }
              return r;
            }
          }
          return { stdout: '', stderr: '', code: 0, clear: false };
        }
        if (stmt.type === 'for') {
          const items = [];
          for (const w of stmt.words) items.push(...this.expandForControl(w));
          let r = { stdout: '', stderr: '', code: 0, clear: false };
          for (const item of items) {
            this.env[stmt.name] = item;
            for (const s of stmt.body) {
              const x = runOne(s);
              r.stdout += x.stdout;
              r.stderr += x.stderr;
              r.code = x.code;
              if (x.clear) return r;
            }
          }
          return r;
        }
        if (stmt.type === 'while') {
          let r = { stdout: '', stderr: '', code: 0, clear: false };
          for (let guard = 0; guard < 1000; guard += 1) {
            const condLine = simpleToLine({
              tokens: stmt.cond.filter((t) => !(t.type === 'op' && t.value === ';')),
            });
            const c = this._runPipelineLine(condLine);
            if (c.code !== 0) break;
            for (const s of stmt.body) {
              const x = runOne(s);
              r.stdout += x.stdout;
              r.stderr += x.stderr;
              r.code = x.code;
              if (x.clear) return r;
            }
          }
          return r;
        }
        return { stdout: '', stderr: '', code: 0, clear: false };
      };
      runList(statements);
      return { line: String(trimmed).split('\n')[0] ?? '', stages: [], ...result };
    } catch (err) {
      const message = err instanceof SyntaxError ? err.message : String(err.message ?? err);
      return {
        line: String(trimmed).split('\n')[0] ?? '',
        stages: [],
        stdout: '',
        stderr: message + '\n',
        code: 2,
        clear: false,
      };
    }
  }

  /**
   * App meta-commands (levels/goal/undo/reset/help/quiz/review).
   */
  _appCommand(trimmed) {
    const [name] = trimmed.split(/\s+/);
    if (name === 'undo') return this.undo();
    if (name === 'reset') {
      return { line: trimmed, stages: [], stdout: '', stderr: '', code: 0, clear: false, app: 'reset' };
    }
    if (name === 'levels' || name === 'goal' || name === 'quiz' || name === 'review') {
      return { line: trimmed, stages: [], stdout: '', stderr: '', code: 0, clear: false, app: name };
    }
    return null;
  }

  /**
   * Run one line that may contain ; && || and pipes.
   */
  _runPipelineLine(line) {
    // Leading assignments: NAME=value (value may contain spaces inside $()).
    const assignRe = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
    const isAssignWord = (w) => {
      if (!assignRe.test(w)) return false;
      const rawVal = w.slice(w.indexOf('=') + 1);
      // spaces allowed only inside $( ) / $(( ))
      const stripped = rawVal.replace(/\$\(\(.*?\)\)/g, 'X').replace(/\$\(.*?\)/g, 'X');
      return !/\s/.test(stripped);
    };

    const { stages, connectors } = parseLine(line);
    if (stages.length === 1 && stages[0].args.length > 0 && stages[0].args.every(isAssignWord)) {
      for (const a of stages[0].args) {
        const m = a.match(assignRe);
        if (m) {
          this.env[m[1]] = this._expandWordFull(m[2], {
            shell: this,
            fs: this.fs,
            cwd: this.cwd,
            env: this.env,
          }).join('');
        }
      }
      return {
        line,
        stages: [{ args: stages[0].args, stdin: '', stdout: '', stderr: '', code: 0 }],
        stdout: '',
        stderr: '',
        code: 0,
        clear: false,
      };
    }
    // Peel leading assignments from a simple command (NAME=x cmd args)
    if (stages[0] && stages[0].args.length) {
      let k = 0;
      while (k < stages[0].args.length && isAssignWord(stages[0].args[k])) {
        const m = stages[0].args[k].match(assignRe);
        this.env[m[1]] = this._expandWordFull(m[2], {
          shell: this,
          fs: this.fs,
          cwd: this.cwd,
          env: this.env,
        }).join('');
        k += 1;
      }
      if (k > 0) stages[0].args = stages[0].args.slice(k);
      if (stages[0].args.length === 0 && stages.length === 1) {
        return {
          line,
          stages: [{ args: [], stdin: '', stdout: '', stderr: '', code: 0 }],
          stdout: '',
          stderr: '',
          code: 0,
          clear: false,
        };
      }
    }
    let combinedOut = '';
    let combinedErr = '';
    let lastCode = 0;
    let clear = false;
    const stageTraces = [];

    const groups = [];
    let group = [stages[0]];
    for (let c = 0; c < connectors.length; c += 1) {
      if (connectors[c] === '|') {
        group.push(stages[c + 1]);
      } else {
        // `gate` is the connector AFTER this group — it governs the next group.
        groups.push({ group, gate: connectors[c] });
        group = [stages[c + 1]];
      }
    }
    groups.push({ group, gate: null });

    let prevCode = 0;
    let pendingGate = null; // gate that applies to the group about to run
    for (const { group: pipeStages, gate } of groups) {
      if (pendingGate === '&&' && prevCode !== 0) {
        pendingGate = gate;
        continue;
      }
      if (pendingGate === '||' && prevCode === 0) {
        pendingGate = gate;
        continue;
      }
      const pipeOut = this._runPipeline(pipeStages, stageTraces);
      combinedOut += pipeOut.stdout;
      combinedErr += pipeOut.stderr;
      prevCode = pipeOut.code;
      lastCode = pipeOut.code;
      if (pipeOut.clear) clear = true;
      pendingGate = gate;
    }

    return {
      line,
      stages: stageTraces,
      stdout: combinedOut,
      stderr: combinedErr,
      code: lastCode,
      clear,
    };
  }

  /**
   * Execute a pipeline of stages connected by |.
   */
  _runPipeline(pipeStages, stageTraces) {
    let stdin = '';
    let last = cmdResult('', '', 0);

    for (const stage of pipeStages) {
      let input = stdin;

      if (stage.stdinFile) {
        const abs = resolvePath(this.cwd, this._expandOne(stage.stdinFile), this.home);
        const node = this.fs.getNode(abs);
        if (!node || node.type !== 'file') {
          last = cmdResult('', `bash: ${stage.stdinFile}: No such file or directory`, 1);
          stageTraces.push({
            args: [...stage.args],
            stdin: input,
            stdout: '',
            stderr: last.stderr,
            code: last.code,
          });
          return { stdout: '', stderr: last.stderr, code: last.code, clear: false };
        }
        input = node.content;
      }

      last = this._runStage(stage.args, input);
      stageTraces.push({
        args: [...stage.args],
        stdin: input,
        stdout: last.stdout,
        stderr: last.stderr,
        code: last.code,
      });

      if (stage.stdoutFile) {
        const fname = this._expandOne(stage.stdoutFile);
        this._writeFile(fname, last.stdout, stage.stdoutAppend);
        last = { ...last, stdout: '' };
      }
      if (stage.stderrFile) {
        const fname = this._expandOne(stage.stderrFile);
        this._writeFile(fname, last.stderr, stage.stderrAppend);
        last = { ...last, stderr: '' };
      }

      stdin = last.stdout;
    }

    return {
      stdout: last.stdout,
      stderr: last.stderr,
      code: last.code,
      clear: last.clear ?? false,
    };
  }

  _expandOne(word) {
    // sync expand without $() for paths in redirects
    return expandWord(word, this.env, this.home);
  }

  /**
   * Run a single command stage with word expansion (sync path for REPL).
   *
   * $() uses nested execute — sync because we don't await $() in sync REPL;
   * command substitution in sync mode uses _runPipelineLine recursively.
   */
  _runStage(args, stdin) {
    const ctx = {
      shell: this,
      fs: this.fs,
      cwd: this.cwd,
      env: this.env,
    };

    const expanded = args.map((a) => this._expandWordFull(a, ctx)).flat();
    const name = expanded[0];
    const rest = expanded.slice(1);
    const fn = getCommand(name);

    if (!fn) {
      return cmdResult('', `bash: ${name}: command not found`, 127);
    }

    const out = fn(ctx, rest, stdin, args);
    if (name === 'clear') return { ...out, clear: true };
    return out;
  }

  /**
   * Expand one raw word to zero+ fields (sync, recursive $()).
   */
  _expandWordFull(word, ctx) {
    // Split on single-quote markers; only expand outside them.
    const segments = [];
    let buf = '';
    for (let i = 0; i < word.length; i += 1) {
      if (word[i] === '\uE000') {
        if (buf) {
          segments.push({ lit: false, text: buf });
          buf = '';
        }
        let lit = '';
        i += 1;
        while (i < word.length && word[i] !== '\uE001') {
          lit += word[i];
          i += 1;
        }
        segments.push({ lit: true, text: lit });
        continue;
      }
      buf += word[i];
    }
    if (buf) segments.push({ lit: false, text: buf });

    let out = '';
    for (const seg of segments) {
      out += seg.lit ? seg.text : this._expandUnquoted(seg.text);
    }

    if (/[*?[]/.test(out) && !word.includes('\uE000')) {
      return this._globSync(out);
    }
    // Glob only unquoted metacharacters — skip if any literal segment had them.
    if (/[*?[]/.test(out)) {
      const onlyUnquotedGlobs = segments.every((s) => s.lit || /[*?[]/.test(s.text) === /[*?[]/.test(s.text));
      // Conservative: glob only when the raw unquoted parts contain metacharacters
      const unquoted = segments.filter((s) => !s.lit).map((s) => s.text).join('');
      if (/[*?[]/.test(unquoted)) return this._globSync(out);
      return [out];
    }
    return [out];
  }

  /**
   * Expand one unquoted segment (params, $(), arithmetic, tilde).
   */
  _expandUnquoted(word) {
    let out = '';
    for (let i = 0; i < word.length; i += 1) {
      const ch = word[i];
      if (ch === '~' && i === 0) {
        out += this.home;
        continue;
      }
      if (ch === '$' && word[i + 1] === '(' && word[i + 2] === '(') {
        const end = this._findClose(word, i + 1, '(', ')');
        if (end === -1) {
          out += ch;
          continue;
        }
        const expr = word.slice(i + 3, end - 1 > i + 3 ? end : end);
        // body between (( and ))
        const inner = word.slice(i + 3, end);
        // strip one trailing ) if findClose landed on outer
        const body = inner.endsWith(')') ? inner.slice(0, -1) : inner;
        out += String(evalArithLocal(body, this.env));
        i = end;
        continue;
      }
      if (ch === '$' && word[i + 1] === '(') {
        const end = this._findClose(word, i + 1, '(', ')');
        if (end === -1) {
          out += ch;
          continue;
        }
        const inner = word.slice(i + 2, end);
        const t = this._runPipelineLine(inner);
        out += (t.stdout ?? '').replace(/\n$/, '');
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
        const t = this._runPipelineLine(inner);
        out += (t.stdout ?? '').replace(/\n$/, '');
        i = end;
        continue;
      }
      if (ch === '$') {
        if (word[i + 1] === '?' || word[i + 1] === '$') {
          out += this.env[word[i + 1]] ?? '';
          i += 1;
          continue;
        }
        if (word[i + 1] === '{') {
          const end = word.indexOf('}', i + 2);
          if (end === -1) {
            out += ch;
            continue;
          }
          out += this.env[word.slice(i + 2, end)] ?? '';
          i = end;
          continue;
        }
        let j = i + 1;
        while (j < word.length && /[A-Za-z0-9_]/.test(word[j])) j += 1;
        if (j === i + 1) {
          out += ch;
          continue;
        }
        out += this.env[word.slice(i + 1, j)] ?? '';
        i = j - 1;
        continue;
      }
      out += ch;
    }
    return out;
  }

  _findClose(s, openIndex, open, close) {
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
   * Write/append stdout to a virtual file.
   */
  _writeFile(fileArg, text, append) {
    const abs = resolvePath(this.cwd, fileArg, this.home);
    const existing = this.fs.getNode(abs);
    if (existing && existing.type === 'dir') return;
    if (existing && existing.type === 'file') {
      existing.content = append ? existing.content + text : text;
      existing.mtime = Date.now();
      return;
    }
    const { dir, base } = splitPath(abs);
    const parent = this.fs.getNode(dir);
    if (!parent || parent.type !== 'dir') return;
    this.fs.attach(dir, createFile(base, text));
  }
}

function evalArithLocal(expr, env) {
  const replaced = expr.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
    const n = Number(env[name]);
    return Number.isFinite(n) ? String(n) : '0';
  });
  if (!/^[-+*/%()\s0-9.]+$/.test(replaced)) return 0;
  try {
    const n = Function(`"use strict"; return (${replaced});`)();
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Build a default sandbox shell.
 *
 * Returns:
 *     Shell with starter home
 */
export function createSandboxShell() {
  const fs = new VirtualFS(createDir(''));
  fs.attach('/', createDir('home'));
  fs.attach('/home', createDir('learner'));
  fs.attach('/home/learner', createDir('notes'));
  fs.attach('/home/learner', createDir('data'));
  fs.attach(
    '/home/learner',
    createFile(
      'README.md',
      '# Welcome to LearnBash\n\nExplore freely. Type `help` for commands.\n'
    )
  );
  fs.attach(
    '/home/learner/notes',
    createFile('todo.txt', 'learn pipes\nlearn redirects\n')
  );
  fs.attach(
    '/home/learner/data',
    createFile('a.txt', 'apple\navocado\n')
  );
  fs.attach(
    '/home/learner/data',
    createFile('b.txt', 'banana\nblueberry\n')
  );
  fs.attach('/home/learner', createFile('hello.sh', '#!/bin/bash\necho hello\n', '755'));

  return new Shell(fs, { cwd: '/home/learner', home: '/home/learner' });
}
