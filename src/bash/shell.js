/**
 * Virtual bash shell: state, execution, undo stack, snapshot model.
 */

import { VirtualFS, resolvePath, splitPath, createFile, createDir } from './fs.js';
import { parseLine, expandWord } from './parser.js';
import { getCommand, result as cmdResult } from './commands.js';

/**
 * @typedef {object} ExecTrace
 * @property {string} line
 * @property {Array<{args: string[], stdin: string, stdout: string, code: number}>} stages
 * @property {string} stdout
 * @property {string} stderr
 * @property {number} code
 * @property {boolean} clear
 */

/**
 * In-memory shell with filesystem, env, history, and undo.
 */
export class Shell {
  /**
   * Args:
   *     fs: VirtualFS instance
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
      ...(options.env ?? {}),
    };
    /** @type {string[]} */
    this.history = [];
    /** @type {{ fs: unknown, cwd: string, env: Record<string,string>, history: string[] }[]} */
    this.undoStack = [];
    this.lastTrace = null;
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
   *     ExecTrace-like result
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
    return {
      line: 'undo',
      stages: [],
      stdout: '',
      stderr: '',
      code: 0,
      clear: false,
    };
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
    return {
      line: 'reset',
      stages: [],
      stdout: 'reset\n',
      stderr: '',
      code: 0,
      clear: false,
    };
  }

  /**
   * Execute one raw input line.
   *
   * Args:
   *     line: user input
   * Returns:
   *     ExecTrace
   */
  execute(line) {
    const trimmed = line.trim();
    if (!trimmed) {
      return emptyTrace(line);
    }

    // App-level commands are not part of bash and are not undoable as FS ops
    // but we still snapshot so undo rolls them back for consistency.
    const app = this._appCommand(trimmed);
    if (app) {
      this.history.push(trimmed);
      return app;
    }

    this.undoStack.push(this.capture());
    this.history.push(trimmed);

    try {
      const trace = this._runPipelineLine(trimmed);
      this.env['?'] = String(trace.code);
      this.lastTrace = trace;
      return trace;
    } catch (err) {
      const message = err instanceof SyntaxError ? err.message : String(err.message ?? err);
      return {
        line: trimmed,
        stages: [],
        stdout: '',
        stderr: message + '\n',
        code: 2,
        clear: false,
      };
    }
  }

  /**
   * App meta-commands (levels/goal/undo/reset/help).
   *
   * Args:
   *     trimmed: input
   * Returns:
   *     ExecTrace or null
   */
  _appCommand(trimmed) {
    const [name] = trimmed.split(/\s+/);
    if (name === 'undo') {
      return this.undo();
    }
    if (name === 'reset' && !this._onReset) {
      return {
        line: trimmed,
        stages: [],
        stdout: '',
        stderr: '',
        code: 0,
        clear: false,
        app: 'reset',
      };
    }
    if (name === 'levels' || name === 'goal') {
      return {
        line: trimmed,
        stages: [],
        stdout: '',
        stderr: '',
        code: 0,
        clear: false,
        app: name,
      };
    }
    return null;
  }

  /**
   * Run one line that may contain ; && || and pipes.
   *
   * Args:
   *     line: trimmed input
   * Returns:
   *     ExecTrace
   */
  _runPipelineLine(line) {
    const { stages, connectors } = parseLine(line);
    let combinedOut = '';
    let combinedErr = '';
    let lastCode = 0;
    let clear = false;
    /** @type {ExecTrace['stages']} */
    const stageTraces = [];

    let i = 0;
    let pending = [stages[i]];
    let j = 1;

    // Group stages by sequencing connectors (not |)
    const groups = [];
    let group = [stages[0]];
    for (let c = 0; c < connectors.length; c += 1) {
      if (connectors[c] === '|') {
        group.push(stages[c + 1]);
      } else {
        groups.push({ group, conn: connectors[c] });
        group = [stages[c + 1]];
      }
    }
    groups.push({ group, conn: null });

    let prevCode = 0;
    let first = true;
    for (const { group: pipeStages, conn } of groups) {
      if (!first) {
        if (conn === '&&' && prevCode !== 0) {
          // skip
          continue;
        }
        if (conn === '||' && prevCode === 0) {
          continue;
        }
      }
      first = false;
      const pipeOut = this._runPipeline(pipeStages, stageTraces);
      combinedOut += pipeOut.stdout;
      combinedErr += pipeOut.stderr;
      prevCode = pipeOut.code;
      lastCode = pipeOut.code;
      if (pipeOut.clear) clear = true;
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
   *
   * Args:
   *     pipeStages: array of stage descriptors
   *     stageTraces: out array of stage traces
   * Returns:
   *     { stdout, stderr, code, clear }
   */
  _runPipeline(pipeStages, stageTraces) {
    let stdin = '';
    let last = cmdResult('', '', 0);

    for (const stage of pipeStages) {
      let input = stdin;

      if (stage.stdinFile) {
        const abs = resolvePath(this.cwd, stage.stdinFile, this.home);
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
        this._writeFile(stage.stdoutFile, last.stdout, stage.stdoutAppend);
        last = { ...last, stdout: '' };
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

  /**
   * Run a single command stage with word expansion.
   *
   * Args:
   *     args: raw args from parser
   *     stdin: stdin text
   * Returns:
   *     CmdResult & { clear?: boolean }
   */
  _runStage(args, stdin) {
    const expanded = args.map((a) => expandWord(a, this.env, this.home));
    const name = expanded[0];
    const rest = expanded.slice(1);
    const fn = getCommand(name);

    if (!fn) {
      return cmdResult('', `bash: ${name}: command not found`, 127);
    }

    const ctx = {
      shell: this,
      fs: this.fs,
      cwd: this.cwd,
      env: this.env,
    };

    const out = fn(ctx, rest, stdin, args);
    if (name === 'clear') {
      return { ...out, clear: true };
    }
    return out;
  }

  /**
   * Write/append stdout to a virtual file.
   *
   * Args:
   *     fileArg: path token
   *     text: content
   *     append: whether to append
   */
  _writeFile(fileArg, text, append) {
    const abs = resolvePath(this.cwd, fileArg, this.home);
    const existing = this.fs.getNode(abs);
    if (existing && existing.type === 'dir') {
      return;
    }
    if (existing && existing.type === 'file') {
      existing.content = append ? existing.content + text : text;
      existing.mtime = Date.now();
      return;
    }
    const { dir, base } = splitPath(abs);
    const parent = this.fs.getNode(dir);
    if (!parent || parent.type !== 'dir') return;
    this.fs.attach(dir, createFile(base, append ? text : text));
  }
}

/**
 * Empty trace helper.
 *
 * Args:
 *     line: original line
 * Returns:
 *     ExecTrace
 */
function emptyTrace(line) {
  return { line, stages: [], stdout: '', stderr: '', code: 0, clear: false };
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
  fs.attach('/home/learner', createFile('hello.sh', '#!/bin/bash\necho hello\n', '755'));

  return new Shell(fs, { cwd: '/home/learner', home: '/home/learner' });
}
