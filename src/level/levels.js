/**
 * Level definitions, teaching copy, solution checklist, and win checks.
 *
 * Level shape:
 * {
 *   id, series, title, objective, brief, teach, hint, par,
 *   learning: string[],
 *   solution: [{ command, note }],
 *   seed: { cwd, home, tree },
 *   checks: [{ type, ... }],
 * }
 */

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

/** @type {Array<object>} */
export const LEVELS = [
  {
    id: 'b1-pwd',
    series: 'Basics',
    title: 'Where am I?',
    objective: 'Print the absolute path of the working directory.',
    brief: 'Print the full path of your current directory.',
    teach: `Every shell process has a **working directory** (cwd) — the folder commands treat as "here". Relative paths like \`notes/todo.txt\` are resolved against cwd; absolute paths like \`/home/learner\` always start at the filesystem root.

\`pwd\` (print working directory) does not change anything. It answers the only question that matters before you move: where am I? The prompt often shows a short form (\`~\` for home), but scripts and debugging need the real absolute path.`,
    learning: [
      'cwd is process state, not a global truth',
      'pwd prints the absolute path and exits 0',
      '~ in the prompt is home; pwd shows the real path',
    ],
    hint: 'pwd prints the working directory.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'pwd', note: 'Print the absolute working directory' }],
    checks: [
      { type: 'last_stdout_contains', value: '/home/learner' },
      { type: 'cmd_used', value: 'pwd' },
    ],
  },
  {
    id: 'b2-ls',
    series: 'Basics',
    title: 'What is here?',
    objective: 'List directory entries in the working directory.',
    brief: 'List the files in your home directory.',
    teach: `\`ls\` reads a directory and prints its entries. Directories hold **names** that point at files or other directories — \`ls\` shows those names, not full content.

Flags change the report: \`-a\` includes dotfiles (names starting with \`.\`, often config), \`-l\` adds mode, owner, size, and mtime. Order is not guaranteed to be "what you created last" — sort your mental model by name unless you sort on purpose.`,
    learning: [
      'A directory is a named map of children',
      'ls lists names; cat reads file bytes',
      '-a reveals hidden dotfiles; -l adds metadata',
    ],
    hint: 'ls lists directory contents.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'ls', note: 'List names in the current directory' }],
    checks: [
      { type: 'last_stdout_contains', value: 'README.md' },
      { type: 'cmd_used', value: 'ls' },
    ],
  },
  {
    id: 'b3-cd',
    series: 'Basics',
    title: 'Go to notes',
    objective: 'Change the shell working directory.',
    brief: 'Change into the `notes` directory.',
    teach: `\`cd\` mutates the shell process: after it returns, every relative path is reinterpreted from the new cwd. That is why the prompt usually updates — it is a window into process state, not decoration.

\`cd notes\` is relative (child of current). \`cd /home/learner/notes\` is absolute. \`cd ..\` climbs to the parent. \`cd\` with no argument (or \`cd ~\`) returns home. A failed \`cd\` leaves cwd untouched and exits non-zero — shell scripts rely on that.`,
    learning: [
      'cd changes process cwd for every later command',
      'Relative vs absolute paths resolve differently',
      'Failed cd is non-zero and leaves you where you were',
    ],
    hint: 'cd notes moves you into that folder.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cd notes', note: 'Move cwd into notes/' }],
    checks: [
      { type: 'cwd_is', value: '/home/learner/notes' },
      { type: 'cmd_used', value: 'cd' },
    ],
  },
  {
    id: 'b4-echo',
    series: 'Basics',
    title: 'Say something',
    objective: 'Write text to standard output.',
    brief: 'Print the text: hello bash',
    teach: `\`echo\` expands its arguments and writes them to **stdout**, joined by spaces, then a newline. stdout is the default channel for "the answer"; stderr is for diagnostics. Pipes and \`>\` capture stdout only — that split is the foundation of stream design.

Quoting matters: \`echo hello bash\` is three words after expansion (then rejoined). \`echo "hello bash"\` is one word that contains a space. When output looks wrong, check quoting before you check the command.`,
    learning: [
      'stdout is the data channel; stderr is the message channel',
      'echo joins expanded arguments with spaces + newline',
      'Quotes protect spaces and stop word splitting',
    ],
    hint: 'echo hello bash prints those words.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'echo hello bash', note: 'Print words to stdout' }],
    checks: [
      { type: 'last_stdout_contains', value: 'hello bash' },
      { type: 'cmd_used', value: 'echo' },
    ],
  },
  {
    id: 'f1-touch',
    series: 'Files',
    title: 'Create a file',
    objective: 'Create an empty file (or update mtime if it exists).',
    brief: 'Create an empty file named `report.txt` in your home directory.',
    teach: `\`touch\` is the cheapest way to materialize a name in the filesystem. If the file is missing, it is created empty (mode 644 by default). If it exists, only mtime is refreshed — content is untouched.

Creating a file does **not** create its parent directories. \`touch a/b.txt\` fails unless \`a/\` already exists. For trees, use \`mkdir -p\` first. Inode identity is separate from name; \`mv\` later can rename without rewriting bytes.`,
    learning: [
      'touch creates empty files or refreshes mtime',
      'It never creates missing parent directories',
      'Name, content, and mtime are different facts',
    ],
    hint: 'touch report.txt creates an empty file.',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'touch report.txt', note: 'Create empty report.txt in cwd' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/report.txt' },
      { type: 'cmd_used', value: 'touch' },
    ],
  },
  {
    id: 'f2-mkdir',
    series: 'Files',
    title: 'Make a folder',
    objective: 'Create a directory and change into it.',
    brief: 'Create a directory named `src` and move into it.',
    teach: `\`mkdir src\` adds a directory node named \`src\` under cwd. It fails if the name exists or if the parent is missing. \`mkdir -p a/b/c\` creates every missing component and succeeds when the path already exists — use it in scripts.

Then \`cd src\` rebinds cwd to that new directory. Notice the tree view: the mint highlight tracks the live cwd after the move. Creating structure and moving into it are two separate state changes.`,
    learning: [
      'mkdir adds a directory node under a parent',
      '-p creates parents and is idempotent in scripts',
      'Creating a dir does not change cwd — cd does',
    ],
    hint: 'mkdir src, then cd src.',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'mkdir src', note: 'Create directory src/' },
      { command: 'cd src', note: 'Move cwd into src/' },
    ],
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
    objective: 'Rename a file in place.',
    brief: 'Rename `draft.txt` to `final.txt`.',
    teach: `\`mv draft.txt final.txt\` is rename(2) when source and destination share a parent: the directory entry is rewritten; file bytes stay where they are. That is why rename is instant even for large files.

If the destination exists, it is **replaced** (no trash). \`mv dir/\` into an existing directory moves the entry under that directory instead of renaming. \`cp\` copies bytes; \`mv\` moves the name. Know which one you want before you destroy a target.`,
    learning: [
      'mv renames a directory entry without rewriting bytes',
      'Existing destination is replaced — no undo in real bash',
      'cp copies; mv relocates/renames',
    ],
    hint: 'mv draft.txt final.txt',
    par: 1,
    seed: {
      tree: withFile(defaultHome(), 'draft.txt', 'wip\n'),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'mv draft.txt final.txt', note: 'Rename the directory entry' }],
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
    objective: 'Write file contents to stdout.',
    brief: 'Print the contents of `notes/todo.txt`.',
    teach: `\`cat\` concatenates file bytes to stdout. With one file it is "print this file"; with many it glues them in order. It streams — it does not parse lines for you.

\`cat\` on a directory is an error. Missing paths are errors and exit non-zero. For large files prefer \`head\`/\`tail\`/\`less\` (real terminals). Here, \`cat\` is the raw material every pipe starts from: files become streams, streams become filters.`,
    learning: [
      'cat streams file bytes to stdout',
      'Directories are not readable as files',
      'Streams are the input shape pipes expect',
    ],
    hint: 'cat notes/todo.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cat notes/todo.txt', note: 'Stream file contents to stdout' }],
    checks: [
      { type: 'last_stdout_contains', value: 'learn pipes' },
      { type: 'cmd_used', value: 'cat' },
    ],
  },
  {
    id: 't2-redirect',
    series: 'Text',
    title: 'Write to a file',
    objective: 'Redirect stdout into a new file (truncate/create).',
    brief: 'Write `done` into `status.txt` (create the file).',
    teach: `\`echo done > status.txt\` does not "send email" to the file — the shell opens the file (create if missing, **truncate** if present) and dups that fd over the command's stdout. \`echo\` still writes to fd 1; it just points at the file now.

\`>\` truncates. \`>>\` appends. Order of redirections matters in real bash; here keep one. A common bug: \`echo "failed" > log\` after success silently erases the log. Prefer \`>>\` for logs, \`>\` when you mean replace.`,
    learning: [
      '> rebinds stdout to a file (create/truncate)',
      'The command still writes to fd 1; the fd target changed',
      'Use >> when you must not erase history',
    ],
    hint: 'echo done > status.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'echo done > status.txt', note: 'Create status.txt with stdout' }],
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
    objective: 'Append stdout to an existing file without truncating.',
    brief: 'Append `second` to `log.txt` without erasing `first`.',
    teach: `\`>>\` opens the file in append mode: every write goes to the end; prior bytes stay. That is how log files accumulate across processes and days.

If the file is missing, \`>>\` creates it — same as \`>\` on first use. After this, \`log.txt\` should hold two lines. Verify with \`cat log.txt\`. Losing the first line here means you used \`>\` by mistake: truncation is the default mental model of "write", but append is the safe default for logs.`,
    learning: [
      '>> appends; > truncates',
      'Append creates the file when missing',
      'Logs should almost always use >>',
    ],
    hint: 'echo second >> log.txt',
    par: 1,
    seed: {
      tree: withFile(defaultHome(), 'log.txt', 'first\n'),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'echo second >> log.txt', note: 'Append a line without truncating' }],
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
    objective: 'Connect stdout of one command to stdin of the next.',
    brief: 'Pipe `cat notes/todo.txt` into `wc -l` and show the line count.',
    teach: `The pipe operator \`|\` wires stdout of the left command to **stdin** of the right command — in memory, byte stream, no temp file. Both processes run; the pipeline's exit status is the **rightmost** command's status (this sandbox follows that).

\`wc -l\` counts newline bytes it receives. \`todo.txt\` has two lines, so you should see \`2\`. Order matters: \`wc -l | cat\` is nonsense because \`wc\` needs input first. Design pipelines as: produce → transform → measure/store.`,
    learning: [
      '| connects stdout → stdin as a live byte stream',
      'Pipeline exit status comes from the last stage',
      'Producers on the left, filters in the middle, sink on the right',
    ],
    hint: 'cat notes/todo.txt | wc -l',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cat notes/todo.txt | wc -l', note: 'Stream file into a line counter' }],
    checks: [
      { type: 'op_used', value: '|' },
      { type: 'last_stdout_matches', value: '^\\s*2\\s*$' },
    ],
  },
  {
    id: 's2-grep',
    series: 'Streams',
    title: 'Filter with grep',
    objective: 'Filter stream/file lines by a pattern.',
    brief: 'Show only the lines in `notes/todo.txt` that contain `pipes`.',
    teach: `\`grep pattern file\` scans a **line-oriented** stream and prints matches to stdout. Exit status is a contract: 0 = match, 1 = no match, 2 = error. Scripts use that: \`if grep -q ...\`.

As a filter, \`cat notes/todo.txt | grep pipes\` is idiomatic. The file form is shorter when the source is a file. After this, \`learn pipes\` is visible and \`learn redirects\` is not — you separated signal from noise without loading the whole world into your head.`,
    learning: [
      'grep is line-oriented pattern filter',
      'Exit 0/1/2 is a scriptable contract',
      'Either file args or stdin — both are normal',
    ],
    hint: 'grep pipes notes/todo.txt  or  cat notes/todo.txt | grep pipes',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'grep pipes notes/todo.txt', note: 'Print only matching lines' }],
    checks: [
      { type: 'cmd_used', value: 'grep' },
      { type: 'last_stdout_contains', value: 'learn pipes' },
      { type: 'last_stdout_not_contains', value: 'learn redirects' },
    ],
  },
];

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

function lastOut(traces) {
  for (let i = traces.length - 1; i >= 0; i -= 1) {
    if (traces[i].stdout) return traces[i].stdout;
  }
  return traces.length ? traces[traces.length - 1].stdout : '';
}

function commandNamesInTrace(trace) {
  return trace.stages.map((s) => s.args[0]).filter(Boolean);
}

/**
 * Count user commands for golf.
 *
 * Args:
 *     traces: ExecTrace[]
 * Returns:
 *     number
 */
export function golfScore(traces) {
  return traces.filter((t) => t.line.trim()).length;
}

/**
 * Mark solution checklist steps sticky-done when a successful command matches.
 *
 * Args:
 *     level: Level
 *     doneSet: Set of already-done step indices (mutated)
 *     traces: all ExecTrace this attempt
 * Returns:
 *     array of step statuses { command, note, done, index }
 */
export function solutionProgress(level, doneSet, traces) {
  const steps = level.solution ?? [];
  steps.forEach((step, i) => {
    if (doneSet.has(i)) return;
    const pattern = step.command.trim();
    const hit = traces.some((t) => {
      if (t.code !== 0) return false;
      const line = t.line.trim();
      if (line === pattern) return true;
      // allow "does the solution command appear as a pipeline stage"
      return t.stages.some((s) => s.args.join(' ') === pattern);
    });
    if (hit) doneSet.add(i);
  });

  const currentId = steps.findIndex((_, i) => !doneSet.has(i));
  return steps.map((step, i) => ({
    command: step.command,
    note: step.note,
    done: doneSet.has(i),
    isCurrent: i === currentId,
  }));
}
