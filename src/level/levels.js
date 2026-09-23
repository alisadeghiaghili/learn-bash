/**
 * Level definitions and win-condition helpers.
 *
 * Level shape:
 * {
 *   id, series, title, hint, brief, par,
 *   seed: { cwd, home, tree },  // nested fs seed
 *   checks: [{ type, ... }],
 * }
 */

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} series
 * @property {string} title
 * @property {string} brief
 * @property {string} hint
 * @property {number} par
 * @property {object} seed
 * @property {object[]} checks
 */

/** @type {Level[]} */
export const LEVELS = [
  {
    id: 'b1-pwd',
    series: 'Basics',
    title: 'Where am I?',
    brief: 'Print the full path of your current directory.',
    hint: 'pwd prints the working directory.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'last_stdout_contains', value: '/home/learner' },
      { type: 'cmd_used', value: 'pwd' },
    ],
  },
  {
    id: 'b2-ls',
    series: 'Basics',
    title: 'What is here?',
    brief: 'List the files in your home directory.',
    hint: 'ls lists directory contents.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'last_stdout_contains', value: 'README.md' },
      { type: 'cmd_used', value: 'ls' },
    ],
  },
  {
    id: 'b3-cd',
    series: 'Basics',
    title: 'Go to notes',
    brief: 'Change into the `notes` directory.',
    hint: 'cd notes moves you into that folder.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'cwd_is', value: '/home/learner/notes' },
      { type: 'cmd_used', value: 'cd' },
    ],
  },
  {
    id: 'b4-echo',
    series: 'Basics',
    title: 'Say something',
    brief: 'Print the text: hello bash',
    hint: 'echo hello bash prints those words.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'last_stdout_contains', value: 'hello bash' },
      { type: 'cmd_used', value: 'echo' },
    ],
  },
  {
    id: 'f1-touch',
    series: 'Files',
    title: 'Create a file',
    brief: 'Create an empty file named `report.txt` in your home directory.',
    hint: 'touch report.txt creates an empty file.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'file_exists', value: '/home/learner/report.txt' },
      { type: 'cmd_used', value: 'touch' },
    ],
  },
  {
    id: 'f2-mkdir',
    series: 'Files',
    title: 'Make a folder',
    brief: 'Create a directory named `src` and move into it.',
    hint: 'mkdir src, then cd src.',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'dir_exists', value: '/home/learner/src' },
      { type: 'cwd_is', value: '/home/learner/src' },
      { type: 'cmd_used', value: 'mkdir' },
    ],
  },
  {
    id: 'f3-mv',
    series: 'Files',
    title: 'Rename',
    brief: 'Rename `draft.txt` to `final.txt`.',
    hint: 'mv draft.txt final.txt',
    par: 1,
    seed: {
      tree: withFile(defaultHome(), 'draft.txt', 'wip\n'),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    checks: [
      { type: 'file_exists', value: '/home/learner/final.txt' },
      { type: 'file_missing', value: '/home/learner/draft.txt' },
      { type: 'cmd_used', value: 'mv' },
    ],
  },
  {
    id: 't1-cat',
    series: 'Text',
    title: 'Read a file',
    brief: 'Print the contents of `notes/todo.txt`.',
    hint: 'cat notes/todo.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'last_stdout_contains', value: 'learn pipes' },
      { type: 'cmd_used', value: 'cat' },
    ],
  },
  {
    id: 't2-redirect',
    series: 'Text',
    title: 'Write to a file',
    brief: 'Write `done` into `status.txt` (create the file).',
    hint: 'echo done > status.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'file_exists', value: '/home/learner/status.txt' },
      { type: 'file_contains', path: '/home/learner/status.txt', value: 'done' },
      { type: 'op_used', value: '>' },
    ],
  },
  {
    id: 't3-append',
    series: 'Text',
    title: 'Append a line',
    brief: 'Append `second` to `log.txt` without erasing `first`.',
    hint: 'echo second >> log.txt',
    par: 1,
    seed: {
      tree: withFile(defaultHome(), 'log.txt', 'first\n'),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    checks: [
      { type: 'file_contains', path: '/home/learner/log.txt', value: 'first' },
      { type: 'file_contains', path: '/home/learner/log.txt', value: 'second' },
      { type: 'op_used', value: '>>' },
    ],
  },
  {
    id: 's1-pipe',
    series: 'Streams',
    title: 'First pipe',
    brief: 'Pipe `cat notes/todo.txt` into `wc -l` and show the line count.',
    hint: 'cat notes/todo.txt | wc -l',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'op_used', value: '|' },
      { type: 'last_stdout_matches', value: '^\\s*2\\s*$' },
    ],
  },
  {
    id: 's2-grep',
    series: 'Streams',
    title: 'Filter with grep',
    brief: 'Show only the lines in `notes/todo.txt` that contain `pipes`.',
    hint: 'grep pipes notes/todo.txt  or  cat notes/todo.txt | grep pipes',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    checks: [
      { type: 'cmd_used', value: 'grep' },
      { type: 'last_stdout_contains', value: 'learn pipes' },
      { type: 'last_stdout_not_contains', value: 'learn redirects' },
    ],
  },
];

/**
 * Default home tree used by several levels.
 *
 * Returns:
 *     nested seed object
 */
function defaultHome() {
  return {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          learner: {
            type: 'dir',
            children: {
              'README.md': {
                type: 'file',
                content: '# Welcome to LearnBash\n\nType `help` anytime.\n',
              },
              notes: {
                type: 'dir',
                children: {
                  'todo.txt': { type: 'file', content: 'learn pipes\nlearn redirects\n' },
                },
              },
              'hello.sh': {
                type: 'file',
                content: '#!/bin/bash\necho hello\n',
                mode: '755',
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Attach an extra file at learner home.
 *
 * Args:
 *     tree: seed tree
 *     name: file name
 *     content: file text
 * Returns:
 *     new tree
 */
function withFile(tree, name, content) {
  const clone = structuredClone(tree);
  clone.children.home.children.learner.children[name] = { type: 'file', content };
  return clone;
}

/**
 * Group levels by series for the picker.
 *
 * Returns:
 *     array of { series, levels }
 */
export function levelSeries() {
  const map = new Map();
  for (const level of LEVELS) {
    if (!map.has(level.series)) map.set(level.series, []);
    map.get(level.series).push(level);
  }
  return [...map.entries()].map(([series, levels]) => ({ series, levels }));
}

/**
 * Evaluate win checks against shell state and traces.
 *
 * Args:
 *     level: Level
 *     shell: Shell
 *     traces: ExecTrace[] for this attempt
 * Returns:
 *     { ok: boolean, failures: string[] }
 */
export function checkLevel(level, shell, traces) {
  const failures = [];
  for (const check of level.checks) {
    const ok = runCheck(check, shell, traces);
    if (!ok) failures.push(describeCheck(check));
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Run a single check.
 *
 * Args:
 *     check: check descriptor
 *     shell: Shell
 *     traces: ExecTrace[]
 * Returns:
 *     boolean
 */
function runCheck(check, shell, traces) {
  switch (check.type) {
    case 'cwd_is':
      return shell.cwd === check.value;
    case 'file_exists': {
      const n = shell.fs.getNode(check.value);
      return !!n && n.type === 'file';
    }
    case 'dir_exists': {
      const n = shell.fs.getNode(check.value);
      return !!n && n.type === 'dir';
    }
    case 'file_missing':
      return !shell.fs.getNode(check.value);
    case 'file_contains': {
      const n = shell.fs.getNode(check.path);
      return !!n && n.type === 'file' && n.content.includes(check.value);
    }
    case 'last_stdout_contains':
      return lastOut(traces).includes(check.value);
    case 'last_stdout_not_contains':
      return !lastOut(traces).includes(check.value);
    case 'last_stdout_matches':
      return new RegExp(check.value).test(lastOut(traces));
    case 'cmd_used':
      return traces.some((t) => commandNamesInTrace(t).includes(check.value));
    case 'op_used':
      return traces.some((t) => t.line.includes(check.value));
    default:
      return false;
  }
}

/**
 * Human label for a failed check.
 *
 * Args:
 *     check: check descriptor
 * Returns:
 *     description string
 */
function describeCheck(check) {
  switch (check.type) {
    case 'cwd_is':
      return `current directory must be ${check.value}`;
    case 'file_exists':
      return `file ${check.value} must exist`;
    case 'dir_exists':
      return `directory ${check.value} must exist`;
    case 'file_missing':
      return `${check.value} must not exist`;
    case 'file_contains':
      return `${check.path} must contain "${check.value}"`;
    case 'last_stdout_contains':
      return `output must contain "${check.value}"`;
    case 'last_stdout_not_contains':
      return `output must not contain "${check.value}"`;
    case 'last_stdout_matches':
      return `output must match /${check.value}/`;
    case 'cmd_used':
      return `you must use ${check.value}`;
    case 'op_used':
      return `you must use \`${check.value}\``;
    default:
      return 'unmet check';
  }
}

/**
 * Last non-empty stdout from traces (or last stdout).
 *
 * Args:
 *     traces: ExecTrace[]
 * Returns:
 *     string
 */
function lastOut(traces) {
  for (let i = traces.length - 1; i >= 0; i -= 1) {
    if (traces[i].stdout) return traces[i].stdout;
  }
  return traces.length ? traces[traces.length - 1].stdout : '';
}

/**
 * Command names invoked in a trace.
 *
 * Args:
 *     trace: ExecTrace
 * Returns:
 *     string[]
 */
function commandNamesInTrace(trace) {
  return trace.stages.map((s) => s.args[0]).filter(Boolean);
}

/**
 * Count user commands for golf (ignore empty lines).
 *
 * Args:
 *     traces: ExecTrace[]
 * Returns:
 *     number
 */
export function golfScore(traces) {
  return traces.filter((t) => t.line.trim()).length;
}
