/**
 * Level definitions: deep teaching, solution checklist, transfer tasks.
 *
 * Level shape:
 * {
 *   id, series, title, objective, brief, teach, hint, par,
 *   learning: string[],
 *   transfer?: string,          // one-line "now do something similar"
 *   solution: [{ command, note }],
 *   seed: { cwd, home, tree },
 *   checks: [{ type, ... }],
 * }
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
                  'book.txt': {
                    type: 'file',
                    content: 'the shell is a language\nstreams carry data\nfiles hold bytes\n',
                  },
                },
              },
              data: {
                type: 'dir',
                children: {
                  'a.txt': { type: 'file', content: 'apple\navocado\n' },
                  'b.txt': { type: 'file', content: 'banana\nblueberry\n' },
                  'nums.txt': { type: 'file', content: '3\n1\n2\n' },
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

function withFile(tree, name, content) {
  const clone = structuredClone(tree);
  clone.children.home.children.learner.children[name] = { type: 'file', content };
  return clone;
}

function withHomeFiles(files) {
  const tree = defaultHome();
  for (const [name, content] of Object.entries(files)) {
    tree.children.home.children.learner.children[name] = { type: 'file', content };
  }
  return tree;
}

export const LEVELS = [
  // ——— Basics ———
  {
    id: 'b1-pwd',
    series: 'Basics',
    title: 'Where am I?',
    objective: 'Print the absolute path of the working directory.',
    brief: 'Print the full path of your current directory.',
    teach: `Every shell process has a **working directory** (cwd) — the folder commands treat as "here". Relative paths like \`notes/todo.txt\` resolve against cwd; absolute paths like \`/home/learner\` start at the filesystem root.

\`pwd\` does not change anything. It answers the only question that matters before you move: *where am I?* The prompt often shows \`~\` for home; scripts and debugging need the real absolute path.`,
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
    teach: `\`ls\` reads a directory and prints its **entries**. A directory is a named map from names to files or other directories.

Flags change the report: \`-a\` includes dotfiles (names starting with \`.\`), \`-l\` adds mode, owner, size, mtime. \`ls\` lists names — \`cat\` reads bytes. Confusing those two is the first beginner trap.`,
    learning: [
      'A directory is a named map of children',
      'ls lists names; cat reads file bytes',
      '-a reveals dotfiles; -l adds metadata',
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
    teach: `\`cd\` mutates the shell process: later relative paths are reinterpreted from the new cwd. That is why the prompt updates — it is a window into process state.

\`cd notes\` is relative. \`cd /home/learner/notes\` is absolute. \`cd ..\` climbs. \`cd\` alone (or \`cd ~\`) returns home. A failed \`cd\` exits non-zero and leaves cwd untouched — scripts rely on that.`,
    learning: [
      'cd changes process cwd for every later command',
      'Relative vs absolute resolve differently',
      'Failed cd is non-zero and leaves you put',
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
    teach: `\`echo\` expands arguments and writes them to **stdout**, joined by spaces, plus a newline. stdout is the data channel; stderr is diagnostics. Pipes and \`>\` capture stdout only.

Quoting matters: \`echo hello bash\` is three words (then rejoined). \`echo "hello bash"\` is one word containing a space. When output looks wrong, check quoting first.`,
    learning: [
      'stdout is data; stderr is messages',
      'echo joins expanded args with spaces + newline',
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
    id: 'b5-vars',
    series: 'Basics',
    title: 'Variables',
    objective: 'Assign a shell variable and expand it.',
    brief: 'Set NAME=ada, then print a line containing ada.',
    teach: `Shell variables hold **strings**. \`NAME=ada\` assigns; \`$NAME\` or \`\${NAME}\` expands before the command runs. Assignments with spaces need quotes: \`MSG="hi there"\`.

There is no type system — everything is text until a command interprets it. \`export NAME=ada\` also publishes the variable to child processes; plain \`NAME=ada\` is enough for the current shell.`,
    learning: [
      'Variables are strings; expansion happens first',
      '$NAME and ${NAME} are the same value',
      'Quotes around values keep spaces intact',
    ],
    hint: 'NAME=ada then echo hello $NAME',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'NAME=ada', note: 'Assign the variable' },
      { command: 'echo hello $NAME', note: 'Expand $NAME into the line' },
    ],
    checks: [
      { type: 'var_is', name: 'NAME', value: 'ada' },
      { type: 'last_stdout_contains', value: 'ada' },
      { type: 'cmd_used', value: 'echo' },
    ],
  },

  // ——— Files ———
  {
    id: 'f1-touch',
    series: 'Files',
    title: 'Create a file',
    objective: 'Create an empty file (or update mtime if it exists).',
    brief: 'Create an empty file named `report.txt` in your home directory.',
    teach: `\`touch\` materializes a name. If missing, the file is created empty. If present, only mtime is refreshed — content is untouched.

It never creates parent directories. \`touch a/b.txt\` fails unless \`a/\` exists. Name, content, and mtime are three different facts about a file.`,
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
    teach: `\`mkdir src\` adds a directory node under cwd. It fails if the name exists or the parent is missing. \`mkdir -p a/b/c\` creates every missing piece and is idempotent — use it in scripts.

Then \`cd src\` rebinds cwd. Creating structure and moving into it are two separate state changes.`,
    learning: [
      'mkdir adds a directory node under a parent',
      '-p creates parents and is script-safe',
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
    teach: `\`mv draft.txt final.txt\` is rename when source and target share a parent: the directory entry is rewritten; bytes stay put. Instant even for huge files.

If the destination exists, it is **replaced**. \`cp\` copies bytes; \`mv\` moves the name. Know which one you want before destroying a target.`,
    learning: [
      'mv renames a directory entry without rewriting bytes',
      'Existing destination is replaced — no trash in real bash',
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
    id: 'f4-cp-rm',
    series: 'Files',
    title: 'Copy then clean',
    objective: 'Copy a file and delete the original tree safely.',
    brief: 'Copy `notes/todo.txt` to `todo.copy`, then remove `notes/` recursively.',
    teach: `\`cp src dst\` copies bytes to a new name. \`rm -r notes\` walks the tree and unlinks every entry — without \`-r\`, rm refuses directories.

Destructive commands have no undo in real bash. Here \`undo\` exists so you can experiment; in production you would use version control or backups first.`,
    learning: [
      'cp duplicates content under a new name',
      'rm -r is a tree walk — blast radius scales with depth',
      'Refuse to treat rm as casual in real systems',
    ],
    hint: 'cp notes/todo.txt todo.copy then rm -r notes',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'cp notes/todo.txt todo.copy', note: 'Duplicate the file to a new name' },
      { command: 'rm -r notes', note: 'Recursively remove the notes tree' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/todo.copy' },
      { type: 'file_missing', value: '/home/learner/notes' },
      { type: 'cmd_used', value: 'cp' },
      { type: 'cmd_used', value: 'rm' },
    ],
  },

  // ——— Text ———
  {
    id: 't1-cat',
    series: 'Text',
    title: 'Read a file',
    objective: 'Write file contents to stdout.',
    brief: 'Print the contents of `notes/todo.txt`.',
    teach: `\`cat\` streams file bytes to stdout. With one file it is "print this file". It does not parse lines for you.

\`cat\` on a directory errors. Missing paths exit non-zero. Files become streams here — that is the input shape every pipe expects.`,
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
    teach: `\`echo done > status.txt\` opens the file (create or **truncate**) and dups that fd over the command's stdout. \`echo\` still writes to fd 1; the target changed.

\`>\` truncates. \`>>\` appends. A classic bug: a status line with \`>\` erases the log. Prefer \`>>\` for logs.`,
    learning: [
      '> rebinds stdout to a file (create/truncate)',
      'The command still writes fd 1; the fd target changed',
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
    teach: `\`>>\` opens append mode: every write goes to the end; prior bytes stay. That is how logs accumulate.

If the file is missing, \`>>\` creates it. Verify with \`cat log.txt\`. Losing the first line means you used \`>\` — truncation is the default mental model of "write", but append is the safe default for logs.`,
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
    id: 't4-wc',
    series: 'Text',
    title: 'Measure a file',
    objective: 'Count lines in a file.',
    brief: 'Count how many lines `notes/book.txt` has and print only the number.',
    teach: `\`wc\` counts lines (newlines), words, and characters. \`wc -l\` is the line count — a newline count, so a missing final newline can surprise you in real bash.

Measurement tools are sinks or filters. Here the file is the source: \`wc -l notes/book.txt\` prints \`count filename\`. Piping strips the filename: \`cat notes/book.txt | wc -l\` prints just the number.`,
    learning: [
      'wc counts newlines / words / characters',
      '-l is the line count used in scripts',
      'Filename appears with args; pipes send just the number',
    ],
    hint: 'wc -l notes/book.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'wc -l notes/book.txt', note: 'Count lines in book.txt' }],
    checks: [
      { type: 'last_stdout_matches', value: '3' },
      { type: 'cmd_used', value: 'wc' },
    ],
  },
  {
    id: 't5-sort',
    series: 'Text',
    title: 'Sort lines',
    objective: 'Sort file lines and put them in a new file.',
    brief: 'Sort `data/nums.txt` into `sorted.txt`.',
    teach: `\`sort\` is a **filter**: lines in, sorted lines out. Redirect the result to keep it: \`sort data/nums.txt > sorted.txt\`.

Filters compose because they all speak "lines of text". Design a chain: produce → transform → measure or store. Sorting before \`uniq\` is required for adjacent-dedup — order is semantic.`,
    learning: [
      'sort is a line filter with no side effects',
      'Redirect to persist filter output',
      'Order is semantic for tools like uniq',
    ],
    hint: 'sort data/nums.txt > sorted.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'sort data/nums.txt > sorted.txt', note: 'Sort and store' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/sorted.txt' },
      { type: 'file_contains', path: '/home/learner/sorted.txt', value: '1' },
      { type: 'cmd_used', value: 'sort' },
      { type: 'op_used', value: '>' },
    ],
  },

  // ——— Streams ———
  {
    id: 's1-pipe',
    series: 'Streams',
    title: 'First pipe',
    objective: 'Connect stdout of one command to stdin of the next.',
    brief: 'Pipe `cat notes/todo.txt` into `wc -l` and show the line count.',
    teach: `\`|\` wires stdout of the left command to **stdin** of the right — a live byte stream, no temp file. The pipeline's exit status is the **rightmost** command.

\`wc -l\` counts newlines received. \`todo.txt\` has two lines → \`2\`. Order matters: producers left, filters middle, sinks right.`,
    learning: [
      '| connects stdout → stdin as a live stream',
      'Pipeline exit status comes from the last stage',
      'Producer → filter → sink is the design pattern',
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
    teach: `\`grep pattern file\` is **line-oriented**. Exit contract: 0 = match, 1 = no match, 2 = error. Scripts branch on that.

As a filter: \`cat notes/todo.txt | grep pipes\`. The file form is shorter when the source is a file. After this, signal is separated from noise without loading everything into your head.`,
    learning: [
      'grep is a line-oriented pattern filter',
      'Exit 0/1/2 is a scriptable contract',
      'File args or stdin — both are normal',
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
  {
    id: 's3-stderr',
    series: 'Streams',
    title: 'Catch errors',
    objective: 'Redirect stderr to a file while leaving stdout alone.',
    brief: 'Run `cat missing.txt 2> err.txt` so the error message lands in `err.txt`.',
    teach: `File descriptor 1 is stdout, 2 is stderr. \`2> err.txt\` binds errors to a file; stdout stays on the terminal.

\`2>&1\` merges errors into stdout (order matters: \`> file 2>&1\` captures both). Separating them is how production pipelines keep logs clean and alerts loud.`,
    learning: [
      'fd 1 = stdout, fd 2 = stderr',
      '2> captures only errors',
      '2>&1 merges error into the stdout stream',
    ],
    hint: 'cat missing.txt 2> err.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cat missing.txt 2> err.txt', note: 'Send stderr to err.txt' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/err.txt' },
      { type: 'file_contains', path: '/home/learner/err.txt', value: 'No such file' },
      { type: 'op_used', value: '2>' },
    ],
  },
  {
    id: 's4-chain',
    series: 'Streams',
    title: 'Build a chain',
    objective: 'Combine cat, grep, and wc in one pipeline.',
    brief: 'Count lines in `notes/book.txt` that contain `e` using one pipeline.',
    teach: `Long pipelines are the shell's superpower: each tool is tiny; composition is the skill.

\`cat notes/book.txt | grep e | wc -l\` — produce, filter, measure. Read pipelines right-to-left in terms of data: the last command tells you what you are measuring, the first tells you where bytes come from.

If an intermediate stage filters everything away, the sink prints 0 — not an error. Exit status is still the last stage.`,
    learning: [
      'Compose small tools instead of one big tool',
      'Read pipelines as data flow left → right',
      'Empty result is not the same as failure',
    ],
    hint: 'cat notes/book.txt | grep e | wc -l',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cat notes/book.txt | grep e | wc -l', note: 'Produce → filter → measure' }],
    checks: [
      { type: 'op_used', value: '|' },
      { type: 'cmd_used', value: 'grep' },
      { type: 'cmd_used', value: 'wc' },
      { type: 'last_stdout_matches', value: '\\d' },
    ],
  },

  // ——— Quoting & expansion ———
  {
    id: 'q1-glob',
    series: 'Quoting',
    title: 'Glob the data folder',
    objective: 'Expand * to matching filenames.',
    brief: 'Print the names of all files in `data/` using a glob (no hardcoding both names).',
    teach: `Pathname expansion (globbing) happens **before** the command runs. \`echo data/*.txt\` becomes \`echo data/a.txt data/b.txt\`.

\`*\` matches any string, \`?\` one character, \`[ab]\` a set. If nothing matches, bash leaves the pattern literal (unlike zsh). That is why scripts should handle "no match" carefully.

Globs are not regex. They are filename patterns expanded by the shell into argv.`,
    learning: [
      'Globs expand before the command runs',
      '* ? [set] are filename patterns, not regex',
      'No match → literal pattern (in this shell / bash)',
    ],
    hint: 'echo data/*.txt  or  ls data/*.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'ls data/*.txt', note: 'Expand the glob to matching names' }],
    checks: [
      { type: 'op_used', value: '*' },
      { type: 'last_stdout_contains', value: 'a.txt' },
      { type: 'last_stdout_contains', value: 'b.txt' },
    ],
  },
  {
    id: 'q2-quotes',
    series: 'Quoting',
    title: 'Literal vs expand',
    objective: 'Use single quotes to prevent expansion.',
    brief: 'Print the literal text: $USER is unknown  (the dollar-word must not expand).',
    teach: `**Single quotes** are literal: \`echo '$USER is unknown'\` prints the characters \`$USER\`. **Double quotes** expand parameters but keep spaces as one word: \`echo "hi $USER"\`.

Backslash escapes the next character in unquoted context. If output prints the wrong thing, ask: did expansion happen? Then ask: how many fields did word splitting create?`,
    learning: [
      'Single quotes: zero expansion',
      'Double quotes: expand $ and $( ), keep spaces',
      'Quote to control fields, not for decoration',
    ],
    hint: "echo '$USER is unknown'",
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: "echo '$USER is unknown'", note: 'Literal echo with single quotes' }],
    checks: [
      { type: 'last_stdout_contains', value: '$USER is unknown' },
      { type: 'cmd_used', value: 'echo' },
    ],
  },
  {
    id: 'q3-cmdsub',
    series: 'Quoting',
    title: 'Command substitution',
    objective: 'Capture command output with $(...).',
    brief: 'Create `count.txt` containing only the line count of `notes/todo.txt`.',
    teach: `\`$(command)\` runs the command and replaces the substitution with its **stdout** (trailing newlines stripped). \`count.txt\` should contain the number, not a live query.

\`echo $(wc -l < notes/todo.txt) > count.txt\` or \`wc -l < notes/todo.txt > count.txt\`. The second is pure redirection — simpler when you do not need the value elsewhere.

Command substitution is how shells glue tools into scripts. Prefer \`$(...)\` over backticks (nesting is readable).`,
    learning: [
      '$(cmd) becomes the cmd’s stdout text',
      'Prefer $( ) over backticks',
      'Sometimes redirection beats substitution',
    ],
    hint: 'wc -l < notes/todo.txt > count.txt  or  echo $(cat notes/todo.txt | wc -l) > count.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'wc -l < notes/todo.txt > count.txt', note: 'Count via stdin redirect into file' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/count.txt' },
      { type: 'file_contains', path: '/home/learner/count.txt', value: '2' },
      { type: 'cmd_used', value: 'wc' },
    ],
  },

  // ——— Control ———
  {
    id: 'c1-exit',
    series: 'Control',
    title: 'Exit status',
    objective: 'Use $? and && based on success.',
    brief: 'Create `ok.txt` only if `grep pipes notes/todo.txt` succeeds (same line or chained).',
    teach: `Every command returns an exit status: 0 success, non-zero failure. \`$?\` is the last status. \`a && b\` runs \`b\` only if \`a\` exited 0.

That is the entire control-flow core of shell scripts. If you master exit codes and \`&&\` / \`||\`, you can already write real automation.

Try one line: \`grep pipes notes/todo.txt && touch ok.txt\`. The file appears only because grep matched.`,
    learning: [
      '0 = success; non-zero = failure',
      '$? holds the last status',
      '&& chains "do B only if A worked"',
    ],
    hint: 'grep pipes notes/todo.txt && touch ok.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'grep pipes notes/todo.txt && touch ok.txt', note: 'Guard touch with grep success' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/ok.txt' },
      { type: 'op_used', value: '&&' },
      { type: 'cmd_used', value: 'grep' },
    ],
  },
  {
    id: 'c2-test',
    series: 'Control',
    title: 'test / [',
    objective: 'Use file tests in an if statement.',
    brief: 'If `notes/todo.txt` exists, create `present.txt`.',
    teach: `\`test -f path\` (or \`[ -f path ]\`) exits 0 when the test passes. \`if [ -f notes/todo.txt ]; then touch present.txt; fi\` is the canonical guard.

Common flags: \`-e\` exists, \`-f\` regular file, \`-d\` directory, \`-s\` non-empty, \`-z\` empty string, \`-n\` non-empty string. Integer: \`-eq -ne -lt -gt\`. Strings: \`=\` \`!=\`.

\`if\` runs the condition as a command and branches on its exit status — that is why \`[\` is a command with a required closing \`]\`.`,
    learning: [
      'test/[ is a command whose exit code is the boolean',
      'if branches on exit status, not on a special parser',
      'File tests: -e -f -d -s; string/int tests too',
    ],
    hint: 'if [ -f notes/todo.txt ]; then touch present.txt; fi',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      {
        command: 'if [ -f notes/todo.txt ]; then touch present.txt; fi',
        note: 'Branch on a file test',
      },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/present.txt' },
      { type: 'op_used', value: 'if' },
      { type: 'op_used', value: '-f' },
    ],
  },
  {
    id: 'c3-for',
    series: 'Control',
    title: 'for loop',
    objective: 'Iterate over words and write one file each.',
    brief: 'Create `p.txt`, `q.txt`, and `r.txt` with a single for loop.',
    teach: `\`for name in w1 w2 w3; do ...; done\` assigns each word to \`name\` and runs the body. Globs work in the word list: \`for f in data/*.txt; do echo $f; done\`.

Loops are how batch work stops being copy-paste. The body can call any pipeline. Variable \`$name\` expands each iteration — that is data-driven automation.

One line is enough here: \`for x in p q r; do touch $x.txt; done\`.`,
    learning: [
      'for iterates words (or glob matches) into a variable',
      'Body is ordinary shell — pipelines welcome',
      'One loop replaces N copy-pasted commands',
    ],
    hint: 'for x in p q r; do touch $x.txt; done',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'for x in p q r; do touch $x.txt; done', note: 'Batch create with a loop' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/p.txt' },
      { type: 'file_exists', value: '/home/learner/q.txt' },
      { type: 'file_exists', value: '/home/learner/r.txt' },
      { type: 'op_used', value: 'for' },
    ],
  },
  {
    id: 'c4-arith',
    series: 'Control',
    title: 'Arithmetic',
    objective: 'Use $((...)) and a variable.',
    brief: 'Set N=2, then print 8 via arithmetic (e.g. $((N*4))).',
    teach: `\`$(( expression ))\` evaluates integer arithmetic and expands to the number. Combine with variables: \`N=2\`, \`echo $((N * 4))\` → \`8\`.

Arithmetic is expansion, not a separate language. It happens in the same word-expansion pass as \`$N\`. In real bash you also get \`((...))\` as a command; here focus on substitution.

This is how scripts compute indexes, timeouts, and counters without spawning expr.`,
    learning: [
      '$((...)) is integer math during expansion',
      'Variables participate as numbers',
      'Keep math in the shell when it is tiny',
    ],
    hint: 'N=2 then echo $((N * 4))',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'N=2', note: 'Assign N' },
      { command: 'echo $((N * 4))', note: 'Arithmetic expansion to 8' },
    ],
    checks: [
      { type: 'last_stdout_matches', value: '8' },
      { type: 'op_used', value: '$((' },
      { type: 'cmd_used', value: 'echo' },
    ],
  },

  {
    id: 'c5-bracket',
    series: 'Control',
    title: 'Extended test',
    objective: 'Use [[ ]] with string equality.',
    brief: 'If $NAME equals ada, create `match.txt`.',
    teach: `\`[[ ... ]]\` is bash's extended test. Unlike \`[\`, it is a **keyword**, not a command: no word-splitting surprises, and it supports \`==\`, \`!=\`, \`=~\` (regex), and \`&&\`/\`||\` inside.

\`[[ $NAME == ada ]] && touch match.txt\` is the idiomatic one-liner. Prefer \`[[\` in bash scripts; \`[\` is the POSIX-compatible form.

The mental model is the same as \`if\`: the construct's exit status is 0 when the condition holds.`,
    learning: [
      '[[ is a keyword with safer expansion rules',
      '== != =~ are the string operators',
      'Same exit-status model as test/if',
    ],
    hint: 'NAME=ada then [[ $NAME == ada ]] && touch match.txt',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'NAME=ada', note: 'Set the value under test' },
      { command: '[[ $NAME == ada ]] && touch match.txt', note: 'Guard with [[ ]]' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/match.txt' },
      { type: 'op_used', value: '[[' },
      { type: 'cmd_used', value: 'touch' },
    ],
  },
  {
    id: 'c6-fn',
    series: 'Control',
    title: 'Write a function',
    objective: 'Define and call a shell function with a positional parameter.',
    brief: 'Define `greet` so `greet world` prints `hello world`, then call it.',
    teach: `A function is a named command written in shell itself: \`greet() { echo hello $1; }\`. Calling \`greet world\` sets \`$1\` to \`world\` for the body.

\`$1\`…\`$9\` are positional parameters; \`$0\` is the function name (here). \`$@\` is all args. Functions are how scripts stop being one long scroll of copy-paste.

Define once, call many times. That is the reuse unit of bash — not classes, not imports.`,
    learning: [
      'Functions are named shell snippets',
      '$1 $2 $@ are positional parameters inside the body',
      'Define once, call many — bash reuse',
    ],
    hint: "greet() { echo hello $1; } then greet world",
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'greet() { echo hello $1; }', note: 'Define the function' },
      { command: 'greet world', note: 'Call with a positional arg' },
    ],
    checks: [
      { type: 'fn_defined', name: 'greet' },
      { type: 'last_stdout_contains', value: 'hello world' },
      { type: 'op_used', value: '()' },
    ],
  },
  {
    id: 'c7-procsub',
    series: 'Control',
    title: 'Process substitution',
    objective: 'Feed command output as a file with <(...).',
    brief: 'Print the contents of `<(echo hi)` using cat (output should be hi).',
    teach: `\`<(command)\` runs the command and exposes its stdout as a **file path**. \`cat <(echo hi)\` prints \`hi\` because cat reads that temporary pipe/fd as if it were a file.

Why it exists: many tools (diff, wc, comm) want file arguments, not stdin. Process substitution adapts a stream into the file API without a real temp file dance.

\`>(command)\` is the mirror: the path is a sink that feeds a consumer. Focus on \`<(\` first — it is the common one.`,
    learning: [
      '<(cmd) turns stdout into a readable file path',
      'Tools that want filenames can consume streams',
      'Pipes handle stdin; process sub handles argv files',
    ],
    hint: 'cat <(echo hi)',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'cat <(echo hi)', note: 'Read a process as a file' }],
    checks: [
      { type: 'last_stdout_contains', value: 'hi' },
      { type: 'op_used', value: '<(' },
      { type: 'cmd_used', value: 'cat' },
    ],
  },

  // ——— Transfer capstones ———
  {
    id: 'x1-report',
    series: 'Transfer',
    title: 'Lab report',
    objective: 'Combine mkdir, echo, and redirect into a small report tree.',
    brief: 'Create `out/summary.txt` containing `ok` using mkdir and redirect (any order).',
    teach: `**Transfer:** nothing new in the tools — the skill is choosing them.

You need a directory that may not exist, then a file inside it with known content. \`mkdir -p out\` then \`echo ok > out/summary.txt\`. Split it across commands or chain with \`&&\`.

This is the shape of every "write results" script: ensure path → write bytes. If you invent a different valid command sequence that meets the checks, that counts — understanding beats rote.`,
    learning: [
      'Compose mkdir + redirect without being told the combo',
      'mkdir -p is the safe ensure-directory move',
      'Transfer = recombining known pieces',
    ],
    transfer: 'Try doing it in one line with && instead of two lines.',
    hint: 'mkdir -p out && echo ok > out/summary.txt',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'mkdir -p out', note: 'Ensure the directory exists' },
      { command: 'echo ok > out/summary.txt', note: 'Write the summary' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/out/summary.txt' },
      { type: 'file_contains', path: '/home/learner/out/summary.txt', value: 'ok' },
      { type: 'cmd_used', value: 'mkdir' },
    ],
  },
  {
    id: 'x2-pipeline-report',
    series: 'Transfer',
    title: 'Filter report',
    objective: 'Reuse pipe + grep + redirect as a report generator.',
    brief: 'Write lines from `notes/book.txt` that contain `e` into `hits.txt`.',
    teach: `**Transfer:** produce → filter → store. \`grep e notes/book.txt > hits.txt\` is the direct form; \`cat notes/book.txt | grep e > hits.txt\` is the pipeline form.

Both are correct. Prefer the direct form when the source is a file. Prefer pipes when you have more stages.

Check your work with \`cat hits.txt\` and \`wc -l hits.txt\`. Measurement is part of the craft.`,
    learning: [
      'Choose file-arg form vs pipe form on purpose',
      'Redirect after filters to persist results',
      'Always measure the output you claim to produce',
    ],
    transfer: 'Also produce `hits.count` with just the number of hits.',
    hint: 'grep e notes/book.txt > hits.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'grep e notes/book.txt > hits.txt', note: 'Filter and store matches' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/hits.txt' },
      { type: 'file_contains', path: '/home/learner/hits.txt', value: 'the shell' },
      { type: 'file_missing', value: '/home/learner/hits.txt.tmp' },
    ],
  },
  {
    id: 'x3-script',
    series: 'Transfer',
    title: 'Write and run a script',
    objective: 'Create a .sh file with multiple commands and run it.',
    brief: 'Create `build.sh` that runs `echo building` and `touch built.txt`, then execute it so `built.txt` exists.',
    teach: `**Transfer:** a script is a file of shell lines executed in order by one shell process — same language you have been typing.

Write \`build.sh\` (echo + touch), then run it with \`bash build.sh\` (or \`./build.sh\` if executable in real bash). Running a script shares the same cwd and variables unless you spawn a subshell.

This is how personal automation starts: stop retyping; save the sequence.`,
    learning: [
      'Scripts are shell text files, not a new language',
      'bash file.sh runs the lines in one process',
      'Automation = remember the sequence in a file',
    ],
    transfer: 'Make build.sh also mkdir out2.',
    hint: 'echo lines into build.sh with > or >> then bash build.sh',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'echo echo building > build.sh', note: 'Write first line of the script' },
      { command: 'echo touch built.txt >> build.sh', note: 'Append the second line' },
      { command: 'bash build.sh', note: 'Execute the script' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/build.sh' },
      { type: 'file_exists', value: '/home/learner/built.txt' },
      { type: 'cmd_used', value: 'bash' },
    ],
  },

  // ——— Series checkpoints (open-ended proof of understanding) ———
  {
    id: 'chk-basics',
    series: 'Checkpoints',
    title: 'Checkpoint: Basics',
    objective: 'Prove cwd, listing, and variables without a spoon-fed script.',
    brief: 'Create `who.txt` containing your username and the absolute home path (one line each is fine).',
    teach: `**Checkpoint.** No full solution is handed to you. Use what the Basics series taught: where you are (\`pwd\`), who you are (\`whoami\`), and how text gets into a file.

One valid shape: \`whoami > who.txt\` then \`pwd >> who.txt\`. Any sequence that leaves both facts in the file counts.

If you are stuck, reread the Basics teach panels — the point is transfer, not speed.`,
    learning: [
      'Combine identity + path + redirect without a recipe',
      'Transfer beats memorized one-liners',
    ],
    hints: [
      'whoami prints the user name to stdout.',
      'Redirect stdout into who.txt with >, then append pwd with >>.',
    ],
    transfer: 'Also add the output of `echo $HOME` as a third line.',
    hint: 'whoami > who.txt then pwd >> who.txt',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'whoami > who.txt', note: 'Capture the user name' },
      { command: 'pwd >> who.txt', note: 'Append the absolute path' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/who.txt' },
      { type: 'file_contains', path: '/home/learner/who.txt', value: 'learner' },
      { type: 'file_contains', path: '/home/learner/who.txt', value: '/home/learner' },
      { type: 'cmd_used', value: 'whoami' },
    ],
  },
  {
    id: 'chk-streams',
    series: 'Checkpoints',
    title: 'Checkpoint: Streams',
    objective: 'Prove pipes, filters, and redirects as a pipeline.',
    brief: 'Write to `e-lines.txt` every line of `notes/book.txt` that contains `e`, sorted.',
    teach: `**Checkpoint.** You need a producer, a filter, a transform, and a sink. Order matters: sort after grep (or the result is not "sorted matches").

One valid shape: \`grep e notes/book.txt | sort > e-lines.txt\`. The file must contain only matching lines and they must be sorted.

Measure with \`cat e-lines.txt\` and \`wc -l e-lines.txt\` before you call it done.`,
    learning: [
      'Chain produce → filter → transform → store',
      'Sort position is semantic',
      'Always verify the artifact you claim to produce',
    ],
    hints: [
      'grep e notes/book.txt prints only matching lines.',
      'Pipe into sort, then redirect with > into e-lines.txt.',
    ],
    transfer: 'Also write the match count to e-count.txt with wc.',
    hint: 'grep e notes/book.txt | sort > e-lines.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'grep e notes/book.txt | sort > e-lines.txt', note: 'Filter, sort, store' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/e-lines.txt' },
      { type: 'file_contains', path: '/home/learner/e-lines.txt', value: 'files hold bytes' },
      { type: 'file_contains', path: '/home/learner/e-lines.txt', value: 'streams carry data' },
      { type: 'op_used', value: '|' },
      { type: 'cmd_used', value: 'grep' },
      { type: 'cmd_used', value: 'sort' },
    ],
  },
];

export function levelSeries() {
  const map = new Map();
  for (const level of LEVELS) {
    const key = level.series === 'Checkpoints' ? 'Checkpoints' : level.series;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(level);
  }
  return [...map.entries()].map(([series, levels]) => ({ series, levels }));
}

/**
 * Whether a series has all non-checkpoint levels solved.
 *
 * Args:
 *     series: series name
 *     progress: solved map
 * Returns:
 *     boolean
 */
export function seriesReadyForCheckpoint(series, progress) {
  const levels = LEVELS.filter(
    (l) => l.series === series && l.series !== 'Checkpoints'
  );
  return levels.length > 0 && levels.every((l) => progress[l.id]?.solved);
}

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
    case 'fn_defined':
      return shell.functions?.has(check.name) ?? false;
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
    case 'var_is':
      return shell.env[check.name] === check.value;
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
    case 'fn_defined':
      return `function ${check.name} must be defined`;
    case 'file_exists':
      return `file ${check.value} must exist`;
    case 'dir_exists':
      return `directory ${check.value} must exist`;
    case 'file_missing':
      return `${check.value} must not exist`;
    case 'file_contains':
      return `${check.path} must contain "${check.value}"`;
    case 'var_is':
      return `$${check.name} must be ${check.value}`;
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

export function golfScore(traces) {
  return traces.filter((t) => t.line.trim()).length;
}

export function solutionProgress(level, doneSet, traces) {
  const steps = level.solution ?? [];
  steps.forEach((step, i) => {
    if (doneSet.has(i)) return;
    const pattern = step.command.trim();
    const hit = traces.some((t) => {
      if (t.code !== 0) return false;
      const line = t.line.trim();
      if (line === pattern) return true;
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
