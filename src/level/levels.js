import { LEVEL_ELI, getEli } from './eli.js';
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
    fieldNotes: [
      "Never assume cwd in automation; use absolute paths or resolve via $(cd \"$(dirname \"$0\")\" && pwd)",
      "Cron jobs, systemd units, and Docker containers often start in unexpected root or / dirs",
      "pwd -P resolves physical symlinks; pwd -L reports the logical path",
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
    fieldNotes: [
      "Never parse ls in scripts; filenames with spaces/newlines break for i in $(ls)",
      "Use globs like for f in * or find -print0 | xargs -0 for robust automation",
      "ls -la is essential for terminal work, but scripts should use test or stat",
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
    fieldNotes: [
      "Always guard cd in scripts: cd /dir || exit 1 prevents disastrous subsequent rm commands",
      "cd - toggles to $OLDPWD; useful in quick terminal jumps and git operations",
      "Subshells (cd /dir && make) preserve parent cwd without side effects",
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
    fieldNotes: [
      "echo behavior varies across POSIX/Bash/dash with -e and -n flags",
      "Use printf \"%s\\n\" \"$text\" in production scripts for portable, predictable output",
      "Never echo unquoted secret variables; pass directly through pipes or files",
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
    fieldNotes: [
      "Always quote variables like \"$VAR\" to prevent word splitting and unexpected glob expansion",
      "Use ${VAR:-default} for fallbacks and ${VAR:?error} to fail fast if unset",
      "Export variables only when child processes need them; keep local scope tight",
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
    fieldNotes: [
      "touch updates mtime/atime without modifying content if the file already exists",
      "In build systems (Make), touching target files triggers or suppresses rebuilds",
      "Use touch -r ref_file target to synchronize timestamps across artifacts",
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
    fieldNotes: [
      "Always use mkdir -p in CI/CD and scripts: it creates parents and never fails if dir exists",
      "Set explicit directory permissions in security-sensitive paths with mkdir -m 750",
      "Missing parent directories are the leading cause of silent cron script failures",
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
    fieldNotes: [
      "mv within the same filesystem is an atomic inode rename — instant even for 100GB files",
      "mv across mount points or disks copies bytes then deletes; watch out for disk space exhaustion",
      "Use mv -n (no-clobber) or mv -b (backup) in automated pipelines to prevent accidental overwrites",
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
    fieldNotes: [
      "rm -rf in scripts requires strict variable validation; rm -rf \"$DIR/*\" with empty $DIR wipes root",
      "cp -a (archive) preserves permissions, timestamps, and symlinks — mandatory for backups",
      "In high-risk operations, move files to a staging/trash directory before permanent deletion",
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
    fieldNotes: [
      "Avoid \"Useless Use of Cat\" (UUOC): use grep pattern file instead of cat file | grep pattern",
      "cat -A or cat -v reveals invisible Windows carriage returns (\\r) and trailing tabs",
      "Use cat << \"EOF\" (heredoc) to generate multi-line config files without variable interpolation",
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
    fieldNotes: [
      "> truncates the target file immediately before the command runs (even if command fails)",
      "Running cmd < file > file wipes the file before reading it; use sponge (moreutils) instead",
      "Use set -o noclobber (set -C) in bash to prevent accidental truncation with >",
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
    fieldNotes: [
      ">> is atomic for append mode in POSIX if files are opened with O_APPEND",
      "Ideal for audit trails, application logs, and building incremental data pipelines",
      "Ensure log rotation (logrotate) handles files opened with append redirection",
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
    fieldNotes: [
      "wc -l counts newline characters (\\n), NOT lines of text (unterminated lines are missed)",
      "Combine wc -c with cut to inspect payload sizes in HTTP request body validations",
      "When piping into wc -l, no filename is printed, making it ready for variable capture",
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
    fieldNotes: [
      "Always set LC_ALL=C for deterministic, fast ASCII sorting in data pipelines",
      "Use sort -u instead of sort | uniq to save an entire process and pipe buffer",
      "sort -k2,2n -t, sorts by column 2 numerically on CSV data",
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
    fieldNotes: [
      "Pipes buffer up to 64KB in Linux kernel memory; upstream commands block on backpressure",
      "Exit status of a pipe by default is the LAST command; enable set -o pipefail in production",
      "SIGPIPE automatically kills upstream processes when downstream commands (like head) exit",
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
    fieldNotes: [
      "Use grep -F (fixed strings) when searching plain text for 5-10x performance gains",
      "grep -q exits 0 on first match silently; perfect for if grep -q \"pattern\" file conditions",
      "Use grep -E for extended regex; avoid raw grep with escaped \\( \\) groups",
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
    fieldNotes: [
      "Redirect both streams with &> file or cmd > file 2>&1 (order matters: > file 2>&1)",
      "Send diagnostics to stderr in scripts: echo \"Error occurred\" >&2",
      "Discard noisy output safely: cmd > /dev/null 2>&1",
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
    fieldNotes: [
      "cmd1 && cmd2 stops on first failure; cmd1 || cmd2 falls back on failure",
      "Combine: test -f file.txt && cat file.txt || echo \"Missing\" for concise guards",
      "Group complex chains with { cmd1; cmd2; } || cleanup to maintain precedence",
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
    fieldNotes: [
      "If no files match, bash by default leaves the literal pattern (*.txt) unexpanded",
      "Use shopt -s nullglob in scripts so unmatched patterns expand to empty lists",
      "Use shopt -s failglob to trigger an error when a glob fails to match any files",
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
    fieldNotes: [
      "Single quotes ('...') preserve literal bytes: no variable expansion, no escapes",
      "Double quotes (\"...\") expand variables and $() while protecting spaces and globs",
      "Never write $1 or $@ unquoted; always use \"$1\" and \"$@\"",
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
    fieldNotes: [
      "Always prefer $(cmd) over backticks `cmd`: supports clean nesting $(cat $(find .))",
      "Command substitution strips trailing newlines automatically; preserve with x=$(cmd; echo .); x=${x%.}",
      "Combine with double quotes: result=\"$(cmd)\" to prevent word splitting of stdout",
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
    fieldNotes: [
      "$? captures the exit code of the last foreground command (0 = success, 1-255 = error)",
      "Exit code 127 = command not found; 126 = permission denied; 130 = terminated by Ctrl+C",
      "set -e exits immediately if any command exits non-zero; mandatory for robust CI/CD",
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
    fieldNotes: [
      "Prefer [[ ... ]] over [ ... ] in Bash: prevents errors with unquoted empty strings",
      "Use [ -f file ] for regular files, [ -d dir ] for directories, [ -s file ] for non-empty files",
      "Use [ -z \"$var\" ] to test empty strings, [ -n \"$var\" ] for non-empty",
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
    fieldNotes: [
      "Loop over files with for f in *.log; do ... done — never for f in $(ls *.log)",
      "Loop over script arguments with for arg; do ... done (defaults to in \"$@\")",
      "Use break and continue to control loop execution",
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
    fieldNotes: [
      "$(( expression )) performs native 64-bit integer arithmetic without external dc/bc calls",
      "Supports standard operators: +, -, *, /, %, and bitwise &, |, ^, <<, >>",
      "For floating point math, pipe to awk or bc: echo \"scale=2; 10/3\" | bc",
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
    fieldNotes: [
      "[[ ]] supports regex matching with =~: [[ \"$str\" =~ ^[0-9]+$ ]]",
      "Captured regex groups are stored in BASH_REMATCH array: ${BASH_REMATCH[1]}",
      "Pattern matching on right side of == is glob-based; quote right side for literal comparison",
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
    fieldNotes: [
      "Always declare variables inside functions with local var=value to avoid polluting global state",
      "Functions return exit codes (0-255) via return; output data via stdout: echo \"$result\"",
      "Functions inherit positional arguments ($1, $2, \"$@\") from their invocation, not parent script",
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
    fieldNotes: [
      "<() passes output as a file descriptor (/dev/fd/N) without writing to temporary disk files",
      "diff <(sort file1) <(sort file2) avoids creating intermediate sorted files on disk",
      ">() lets commands write to asynchronous consumer pipelines: cmd | tee >(logger)",
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

  {
    id: 'c8-case',
    series: 'Control',
    title: 'case statement',
    objective: 'Branch on a string with case.',
    brief: 'Set X=yes, then use case so `yes` creates `flag.txt`.',
    teach: `\`case $X in ... esac\` is pattern matching on a word — the bash switch. Patterns use glob syntax (\`*\`, \`?\`), not regex. Arms end with \`;;\`.

\`case $X in yes) touch flag.txt ;; esac\` is the shape. Use \`*\` as the default arm. Prefer case when you match one value against many literals/flags; prefer if/\`[[\` when you compare two variables.

case is expansion-safe and is how most CLI argument dispatch is written.`,
    learning: [
      'case matches glob patterns on one word',
      ';; separates arms; * is default',
      'case for dispatch; [[ for comparisons',
    ],
    fieldNotes: [
      "case matches glob patterns: *.tar.gz|*.tgz) tar -xzf \"$f\" ;;",
      "Clean alternative to long if/elif chains when parsing CLI flags ($1 in -h|--help))",
      "Double semicolon ;; ends an arm; ;& falls through to next pattern in modern Bash",
    ],
    hint: 'X=yes then case $X in yes) touch flag.txt ;; esac',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'X=yes', note: 'Set the subject' },
      { command: 'case $X in yes) touch flag.txt ;; esac', note: 'Dispatch with case' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/flag.txt' },
      { type: 'op_used', value: 'case' },
    ],
  },
  {
    id: 'c9-brace',
    series: 'Control',
    title: 'Brace expansion',
    objective: 'Generate names with {a,b} braces.',
    brief: 'Create `a.txt` and `b.txt` in one command using braces.',
    teach: `Brace expansion runs **before** most other expansions: \`touch {a,b}.txt\` becomes \`touch a.txt b.txt\`.

\`{1..3}\` is a numeric range. Braces are not globs — they do not consult the filesystem. \`{a,b}\` always expands to two words even if those files already exist.

Use braces to avoid retyping shared prefixes/suffixes. It is pure text generation in the shell.`,
    learning: [
      'Braces generate words before globbing',
      '{a,b} and {1..3} are the common forms',
      'Braces are not filesystem globs',
    ],
    fieldNotes: [
      "Brace expansion happens BEFORE parameter expansion and globs: backup file.{txt,bak}",
      "Generate sequences: {1..100} or {01..10} (with zero-padding) without calling seq",
      "Never put spaces inside braces {a, b}: spaces prevent brace expansion from triggering",
    ],
    hint: 'touch {a,b}.txt',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'touch {a,b}.txt', note: 'Brace-expand two filenames' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/a.txt' },
      { type: 'file_exists', value: '/home/learner/b.txt' },
      { type: 'op_used', value: '{' },
    ],
  },
  {
    id: 'c10-read',
    series: 'Control',
    title: 'read a line',
    objective: 'Capture stdin into a variable with read.',
    brief: 'Put the first line of `notes/todo.txt` into variable `L`.',
    teach: `\`read L\` reads one line from stdin into \`L\`. Pipe or redirect to feed it: \`read L < notes/todo.txt\` or \`head -1 notes/todo.txt | read L\` (the pipe form runs read in a subshell in real bash — prefer redirect).

\`read\` is how shell scripts get input without being interactive. Multiple names split on IFS whitespace.

Mental model: read is the stdin→variable adapter, the counterpart of echo for output.`,
    learning: [
      'read copies one stdin line into a variable',
      'Redirect < file to feed read without a pipe',
      'read is the input adapter; echo is the output adapter',
    ],
    fieldNotes: [
      "Always use while IFS= read -r line; do ... done < file to read files line-by-line",
      "-r prevents backslashes from being treated as escape characters",
      "IFS= preserves leading and trailing whitespace on each line",
    ],
    hint: 'read L < notes/todo.txt then echo $L',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'read L < notes/todo.txt', note: 'Read first line into L' },
      { command: 'echo $L', note: 'Show the captured line' },
    ],
    checks: [
      { type: 'var_is', name: 'L', value: 'learn pipes' },
      { type: 'last_stdout_contains', value: 'learn pipes' },
      { type: 'cmd_used', value: 'read' },
    ],
  },

  {
    id: 'c11-jobs',
    series: 'Control',
    title: 'Background jobs',
    objective: 'Run a command with & and list jobs.',
    brief: 'Run `sleep` (or `true`) in the background and show the job list.',
    teach: `A trailing \`&\` runs the command in the **background**: the shell returns immediately and prints a job/PID line. \`jobs\` lists background jobs; \`wait\` blocks until they finish.

Job control is process control: you can start long work and keep typing. In this sandbox jobs complete instantly — the mental model is what matters: **async jobs vs foreground commands**.

\`$\` and \`$$\` are process identity; the job id in \`[1]\` is the shell's bookkeeping, not the OS PID.`,
    learning: [
      '& backgrounds a command and prints job/PID',
      'jobs lists; wait reaps',
      'Foreground vs background is process scheduling',
    ],
    fieldNotes: [
      "Append & to run commands asynchronously in the background",
      "Use wait to synchronize: wait $PID waits for specific process; wait waits for all background jobs",
      "In batch processing, limit concurrency by counting active jobs before launching more",
    ],
    hint: 'true & then jobs',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'true &', note: 'Background the command' },
      { command: 'jobs', note: 'List background jobs' },
    ],
    checks: [
      { type: 'op_used', value: '&' },
      { type: 'cmd_used', value: 'jobs' },
      { type: 'last_stdout_contains', value: 'done' },
    ],
  },
  {
    id: 'c12-arrays',
    series: 'Control',
    title: 'Arrays',
    objective: 'Create an array and print an element.',
    brief: 'Set arr=(a b c) and print the second element.',
    teach: `Bash arrays are lists of strings: \`arr=(a b c)\`. Index from 0: \`\${arr[1]}\` is \`b\`. \`\${arr[@]}\` is all elements; \`\${#arr[@]}\` is the count.

Arrays beat word-splitting hacks when a list can contain spaces or must be reused. This sandbox supports the common read patterns; full bash arrays also have sparse indices and \`\${!arr[@]}\`.

Mental model: a variable is one string; an array is a named list of strings.`,
    learning: [
      'arr=(a b c) builds a list',
      '${arr[1]} is the second element (0-based)',
      '${#arr[@]} is the length',
    ],
    fieldNotes: [
      "Declare arrays with arr=(one two \"three four\"); expand with \"${arr[@]}\" (always double quote)",
      "${#arr[@]} gives length; ${arr[0]} accesses index 0; arr+=(item) appends elements",
      "Arrays are the only reliable way in Bash to store argument lists containing spaces",
    ],
    hint: 'arr=(a b c) then echo ${arr[1]}',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'arr=(a b c)', note: 'Create the array' },
      { command: 'echo ${arr[1]}', note: 'Print element index 1' },
    ],
    checks: [
      { type: 'last_stdout_contains', value: 'b' },
      { type: 'op_used', value: '(' },
      { type: 'cmd_used', value: 'echo' },
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
    fieldNotes: [
      "Production pipelines combine tools: find | sort | head to generate automated health reports",
      "Always structure summary reports with consistent headers and timestamps: date -u +\"%Y-%m-%dT%H:%M:%SZ\"",
      "Redirect status reports to atomic target files or pass directly to notification webhooks",
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
    fieldNotes: [
      "In multi-stage pipelines, verify intermediate exit codes using PIPESTATUS array in Bash",
      "Combine tee to log full streaming output while downstream filters produce summaries",
      "Use gzip -c in pipelines to compress large stream reports on the fly",
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
    fieldNotes: [
      "Always start production bash scripts with shebang #!/usr/bin/env bash",
      "Use set -euo pipefail at the top of every script to catch unhandled errors and unset variables",
      "Use trap cleanup EXIT to guarantee temporary directory and file removal on exit or crash",
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
    fieldNotes: [
      "Comprehensive checkpoint: navigation, file inspection, and variables working together",
      "Real-world debugging starts with establishing cwd, checking permissions, and verifying inputs",
      "Verify assumptions with test -e before executing destructive operations in automation",
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
    fieldNotes: [
      "Comprehensive checkpoint: pipes, redirections, stderr isolation, and stream filtering",
      "Production monitoring and log aggregation rely fundamentally on unix stream composition",
      "Mastering streams separates command typers from true systems engineers",
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
  // ——— Text Wrangling & Data Engineering ———
  {
    id: 'txt-cut-sort',
    series: 'Text Wrangling',
    title: 'Tabular Extraction & Sorting',
    objective: 'Extract CSV columns with cut and sort lines numerically.',
    brief: 'Extract age from `users.csv` (column 2, comma delimiter) and sort numerically into `ages.txt`.',
    teach: `\`cut -d, -f2 file\` slices delimiter-separated fields (like CSV/TSV).\n\n\`sort -n\` orders numbers by arithmetic value rather than ASCII alphabet (preventing 10 coming before 2). Combining \`cut | sort -n > out\` is the standard Unix ETL primitive.`,
    learning: [
      'cut -d<delim> -f<field> extracts structured columns',
      'sort -n evaluates numeric value instead of ASCII lexicographical order',
      'Piping cut into sort forms a lightweight, zero-dependency streaming ETL pipeline',
    ],
    fieldNotes: [
      'For complex CSVs with quoted commas or newlines inside fields, standard cut breaks; use csvkit or awk in production',
      'sort -k2,2n sorts specifically by the second whitespace-delimited field without pre-cutting',
      'Use LC_ALL=C sort for maximum byte-level throughput when sorting gigabyte-scale datasets',
    ],
    transfer: 'Every big-data framework (MapReduce, Spark, DuckDB) is an evolution of Unix stream sorting and projection.',
    hint: 'cut -d, -f2 users.csv | sort -n > ages.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'users.csv': 'alice,30,engineer\nbob,25,designer\ncarol,35,manager\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'cut -d, -f2 users.csv | sort -n > ages.txt', note: 'Extract age column and sort numerically' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/ages.txt' },
      { type: 'file_contains', path: '/home/learner/ages.txt', value: '25\n30\n35' },
    ],
  },
  {
    id: 'txt-uniq',
    series: 'Text Wrangling',
    title: 'Frequency Counting with Uniq',
    objective: 'Aggregate and count duplicate occurrences in a stream.',
    brief: 'Sort `ips.log` and count unique IP addresses into `counts.txt` using `uniq -c`.',
    teach: `\`uniq\` collapses adjacent duplicate lines. **CRITICAL:** \`uniq\` only checks consecutive lines, so input MUST be sorted first (\`sort file | uniq\`).\n\n\`uniq -c\` prefixes each unique line with its frequency count—the fastest way to generate access log histograms.`,
    learning: [
      'uniq requires pre-sorted input to catch non-adjacent duplicates',
      'uniq -c outputs occurrence frequencies for histogram analytics',
      'sort | uniq -c | sort -nr is the canonical top-N frequency pipeline',
    ],
    fieldNotes: [
      'Always remember: uniq on unsorted input drops nothing unless identical lines happen to sit together',
      'Use sort -u instead of sort | uniq if you do not need count metadata (-c), saving a process fork',
      'uniq -d prints only duplicate entries; uniq -u prints only non-repeating entries',
    ],
    transfer: 'Building real-time security alerting for brute-force attacks starts with parsing auth.log via sort | uniq -c.',
    hint: 'sort ips.log | uniq -c > counts.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'ips.log': '192.168.1.1\n10.0.0.1\n192.168.1.1\n172.16.0.1\n10.0.0.1\n192.168.1.1\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'sort ips.log | uniq -c > counts.txt', note: 'Sort IPs and count frequencies' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/counts.txt' },
      { type: 'file_contains', path: '/home/learner/counts.txt', value: '192.168.1.1' },
      { type: 'cmd_used', value: 'uniq' },
    ],
  },
  {
    id: 'txt-tr',
    series: 'Text Wrangling',
    title: 'Character Normalization with Tr',
    objective: 'Translate character sets and normalize case.',
    brief: 'Convert all uppercase letters in `mixed.txt` to lowercase and save as `clean.txt`.',
    teach: `\`tr\` (translate) transforms or deletes single characters from stdin.\n\nSyntax: \`tr SET1 SET2\` maps every byte in SET1 to the corresponding byte in SET2. \`tr A-Z a-z\` lowercases ASCII text. \`tr -d "\\r"\` strips Windows carriage returns.`,
    learning: [
      'tr is a pure stream filter (stdin only, no filename arguments)',
      'tr A-Z a-z normalizes ASCII text case for uniform querying',
      'tr -d deletes unwanted characters like carriage returns or punctuation',
    ],
    fieldNotes: [
      'tr cannot take a file argument directly; always redirect input (tr ... < file) or pipe into it',
      'For multibyte UTF-8 characters (like Persian or accents), tr behaves as raw bytes; use awk or sed for unicode',
      'tr -s squeezes repeated characters into single occurrences (e.g. tr -s " " normalizes whitespace)',
    ],
    transfer: 'Cross-platform DevOps scripts constantly use tr -d "\\r" to neutralize Windows carriage-returns in Docker containers.',
    hint: 'cat mixed.txt | tr A-Z a-z > clean.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'mixed.txt': 'HELLO World FROM BASH\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'cat mixed.txt | tr A-Z a-z > clean.txt', note: 'Translate uppercase to lowercase' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/clean.txt' },
      { type: 'file_contains', path: '/home/learner/clean.txt', value: 'hello world from bash' },
    ],
  },
  {
    id: 'txt-sed',
    series: 'Text Wrangling',
    title: 'Stream Editing with Sed',
    objective: 'Perform regex-based stream replacement across text files.',
    brief: 'Replace all occurrences of `development` with `production` in `config.env` and save to `prod.env`.',
    teach: `\`sed\` (Stream Editor) modifies text line-by-line as it flows through a stream.\n\nThe substitution command \`s/pattern/replacement/flags\` is ubiquitous. Flag \`g\` replaces all occurrences on each line (global); without \`g\`, only the first match is replaced.`,
    learning: [
      'sed s/old/new/g searches and replaces patterns across lines',
      'The delimiter does not have to be /; s#http://#https://#g prevents backslash escaping',
      'sed operates non-destructively by default, streaming modified text to stdout',
    ],
    fieldNotes: [
      'In production, sed -i edits files in-place; warning: GNU sed (-i) and BSD/macOS sed (-i "") have incompatible syntax',
      'Use sed \'/^#/d; /^$/d\' to strip both comments and empty lines from configuration files',
      'sed buffers one line at a time in its pattern space, allowing processing of multi-terabyte files without RAM exhaustion',
    ],
    transfer: 'Continuous deployment pipelines (GitHub Actions, GitLab CI) use sed to inject dynamic build secrets into config files.',
    hint: 'sed s/development/production/g config.env > prod.env',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'config.env': 'ENV=development\nDEBUG=true\nAPI_URL=http://dev.internal\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'sed s/development/production/g config.env > prod.env', note: 'Replace environment with production' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/prod.env' },
      { type: 'file_contains', path: '/home/learner/prod.env', value: 'ENV=production' },
    ],
  },
  {
    id: 'txt-awk',
    series: 'Text Wrangling',
    title: 'Field Extraction with Awk',
    objective: 'Parse and format structured fields without writing custom code.',
    brief: 'Extract server name ($1) and status ($3) from `servers.txt` into `status.txt` using `awk`.',
    teach: `\`awk\` is a complete domain-specific programming language for table and text processing.\n\nFields are split by whitespace by default: \`$1\` is the first column, \`$2\` the second, \`$NF\` the last column, and \`$0\` the entire line. \`{print $1, $3}\` formats and emits the selected fields separated by space.`,
    learning: [
      'awk automatically parses delimited records into numbered positional fields ($1..$N)',
      '$0 represents the entire unmodified input record',
      'awk combines pattern matching with action blocks: pattern { action }',
    ],
    fieldNotes: [
      'Specify custom field delimiters using the -F flag: awk -F: \'{print $1, $6}\' /etc/passwd',
      'awk maintains internal variables: NR (current record/line number) and NF (number of fields in line)',
      'Column sums in one line: awk \'{sum += $1} END {print sum}\' numbers.txt',
    ],
    transfer: 'From server monitoring to parsing metrics and system logs, awk remains the most concise data summarizer on any Unix node.',
    hint: 'awk \'{print $1, $3}\' servers.txt > status.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'servers.txt': 'web01 10.0.1.10 online\nweb02 10.0.1.11 offline\ndb01 10.0.2.20 online\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'awk \'{print $1, $3}\' servers.txt > status.txt', note: 'Extract hostname and status fields' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/status.txt' },
      { type: 'file_contains', path: '/home/learner/status.txt', value: 'web01 online' },
      { type: 'file_contains', path: '/home/learner/status.txt', value: 'web02 offline' },
    ],
  },
  {
    id: 'txt-find-xargs',
    series: 'Text Wrangling',
    title: 'Batch Processing with Find & Xargs',
    objective: 'Search directory hierarchies and batch execute commands over matches.',
    brief: 'Find all `.log` files in `logs` and pass them to `wc -l` using `xargs` to create `audit.txt`.',
    teach: `\`find path -name pattern\` traverses directories recursively matching filesystem nodes.\n\n\`xargs\` collects streamed lines from stdin and converts them into command-line arguments for another utility (\`cmd arg1 arg2...\`). This avoids argument list length limits while enabling massive batch processing.`,
    learning: [
      'find navigates directory trees recursively using metadata and name filters',
      'xargs converts input lines into argument lists for downstream commands',
      'find ... | xargs ... is the foundation of Unix bulk operations',
    ],
    fieldNotes: [
      'Filenames with spaces break standard xargs; always use find -print0 | xargs -0 in production scripts',
      'Use xargs -P 4 to execute jobs across 4 parallel CPU worker processes for high-performance processing',
      'find -type f restricts matches to regular files, excluding directories and sockets',
    ],
    transfer: 'Container maintenance cronjobs clean old logs and stale artifacts using find /var/log -mtime +30 | xargs rm -f.',
    hint: 'find logs -name *.log | xargs wc -l > audit.txt',
    par: 1,
    seed: {
      tree: (() => {
        const t = defaultHome();
        t.children.home.children.learner.children.logs = {
          type: 'dir',
          children: {
            'app.log': { type: 'file', content: 'req1\nreq2\n' },
            'error.log': { type: 'file', content: 'err1\n' },
            'readme.txt': { type: 'file', content: 'docs\n' },
          },
        };
        return t;
      })(),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'find logs -name *.log | xargs wc -l > audit.txt', note: 'Find log files and count lines with xargs' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/audit.txt' },
      { type: 'cmd_used', value: 'find' },
      { type: 'cmd_used', value: 'xargs' },
    ],
  },

  // ——— Permissions & File Security ———
  {
    id: 'sec-chmod',
    series: 'Permissions & Security',
    title: 'Executable Permissions with Chmod',
    objective: 'Understand and apply executable permissions to scripts.',
    brief: 'Make `deploy.sh` executable by granting execute permission (`chmod +x deploy.sh`).',
    teach: `Linux controls file access using a 3x3 permission matrix: **User (u)**, **Group (g)**, and **Others (o)** across **Read (r=4)**, **Write (w=2)**, and **Execute (x=1)**.\n\nA bash script cannot be executed directly (\`./deploy.sh\`) without the execute bit (\`+x\`). \`chmod +x file\` adds execution permissions; \`chmod 755 file\` sets rwxr-xr-x explicitly.`,
    learning: [
      'The execute bit (+x) is required for kernel execve to execute scripts directly',
      'chmod modifies access permissions using symbolic (+x, u+w) or octal (755, 644) notation',
      'Standard executable script permissions are 755 (owner can edit/run, others can read/run)',
    ],
    fieldNotes: [
      'Octal math: r=4, w=2, x=1. 7=4+2+1 (rwx), 5=4+0+1 (r-x). 755 means owner rwx, group r-x, others r-x',
      'Never run chmod 777 in production; granting world-writable permissions introduces privilege escalation vectors',
      'umask defines the default permissions subtracted from newly created files (typically 022 → files 644, dirs 755)',
    ],
    transfer: 'CI/CD pipelines immediately fail with "Permission denied: ./build.sh" if git loses the file execute bit.',
    hint: 'chmod +x deploy.sh',
    par: 1,
    seed: {
      tree: (() => {
        const t = defaultHome();
        t.children.home.children.learner.children['deploy.sh'] = {
          type: 'file',
          content: '#!/bin/bash\necho "deploying..."\n',
          mode: '644',
        };
        return t;
      })(),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'chmod +x deploy.sh', note: 'Add execute permission to script' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/deploy.sh' },
      { type: 'file_mode_is', path: '/home/learner/deploy.sh', value: '755' },
    ],
  },
  {
    id: 'sec-links',
    series: 'Permissions & Security',
    title: 'Symbolic Links & Inode Pointers',
    objective: 'Create symbolic links to establish non-duplicative file references.',
    brief: 'Create a symbolic link `current.conf` pointing to `config-v2.json`.',
    teach: `\`ln -s TARGET LINK_NAME\` creates a **symbolic link** (symlink)—a special file containing a path reference to another filesystem node.\n\nSymlinks allow zero-downtime deployments: an application points to \`current.conf\`, and deployments atomically update the symlink (\`ln -sfn new current\`) without stopping the process.`,
    learning: [
      'ln -s creates a soft pointer rather than copying file bytes',
      'Symlinks can cross filesystem boundaries and point to directories',
      'Atomic symlink swapping enables zero-downtime blue/green server deployments',
    ],
    fieldNotes: [
      'Hard links (ln target link) share the same inode number; deleting the original keeps data intact until all links reach 0',
      'Symlinks store the target string; if the target file moves or is renamed, the symlink becomes dangling/broken',
      'Always use absolute paths or verify relative paths from the link destination, not the caller cwd',
    ],
    transfer: 'Nginx, systemd, and modern package managers (Homebrew, npm) manage active versions entirely via symlinks.',
    hint: 'ln -s config-v2.json current.conf',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'config-v2.json': '{"version": 2, "port": 8080}\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'ln -s config-v2.json current.conf', note: 'Create symbolic link to config-v2.json' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/current.conf' },
      { type: 'file_contains', path: '/home/learner/current.conf', value: 'version": 2' },
    ],
  },

  // ——— Production Hardening & Automation ———
  {
    id: 'prd-strict',
    series: 'Production Hardening',
    title: 'Unofficial Strict Mode (set -euo pipefail)',
    objective: 'Harden shell environments against silent errors and uninitialized variables.',
    brief: 'Enable production strict mode using `set -euo pipefail`.',
    teach: `By default, Bash fails silently: errors in early commands are ignored, undefined variables evaluate to empty strings, and failed pipes report exit code 0 if the last command succeeds.\n\n\`set -euo pipefail\` fixes this:\n- \`-e\`: Exit immediately on command failure.\n- \`-u\`: Treat unset variables as fatal errors.\n- \`-o pipefail\`: Return the exit status of the last failed command in a pipeline.`,
    learning: [
      'set -e aborts script execution on the first non-zero return code',
      'set -u prevents catastrophic bugs like rm -rf "$MY_DIR/*" when MY_DIR is empty',
      'set -o pipefail preserves error codes throughout piped commands',
    ],
    fieldNotes: [
      'Place \`set -euo pipefail\` at the very top of every production shell script after the shebang',
      'If a specific command is expected to fail legitimately, guard it: cmd || true',
      'In subshells or testing suites, check \`set -x\` to print execution traces for debugging',
    ],
    transfer: 'The catastrophic bug \`rm -rf "$PREFIX/$DIR"\` deleting the entire root filesystem happens exclusively when set -u is missing.',
    hint: 'set -euo pipefail',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [{ command: 'set -euo pipefail', note: 'Enable production strict mode' }],
    checks: [
      { type: 'opt_is', opt: 'optE', value: true },
      { type: 'opt_is', opt: 'optU', value: true },
      { type: 'opt_is', opt: 'optPipefail', value: true },
    ],
  },
  {
    id: 'prd-trap',
    series: 'Production Hardening',
    title: 'Resource Cleanup with Trap',
    objective: 'Guarantee resource deallocation and lock file removal on termination.',
    brief: 'Register an automatic cleanup handler with `trap` to delete `/tmp/lock.pid` on `EXIT`.',
    teach: `\`trap 'COMMAND' SIGNALS...\` intercepts system signals or script exits and triggers handler logic.\n\nEven if a script crashes, is killed with Ctrl+C (SIGINT), or exits early via \`set -e\`, a trap registered on \`EXIT\` is guaranteed to run. This ensures locks, temp files, and socket descriptors are cleaned up.`,
    learning: [
      'trap registers handler callbacks for process signals and termination events',
      'EXIT traps execute unconditionally when the shell terminates (success or failure)',
      'Traps prevent dangling lock files that block automated retry pipelines',
    ],
    fieldNotes: [
      'Common idiom: TMP=$(mktemp); trap \'rm -f "$TMP"\' EXIT INT TERM',
      'SIGKILL (kill -9) cannot be caught or trapped by any user process; the kernel terminates immediately',
      'To reset or unbind a trap to default behavior, pass a dash: trap - EXIT',
    ],
    transfer: 'Database migration runners create lockfiles to prevent concurrent mutations and clean them using EXIT traps.',
    hint: 'trap \'rm -f /tmp/lock.pid\' EXIT',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'app.sh': '#!/bin/bash\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [{ command: 'trap \'rm -f /tmp/lock.pid\' EXIT', note: 'Set cleanup trap on script exit' }],
    checks: [
      { type: 'trap_is', sig: 'EXIT', value: 'rm -f /tmp/lock.pid' },
    ],
  },
  {
    id: 'prd-params',
    series: 'Production Hardening',
    title: 'Defensive Parameter Expansions',
    objective: 'Apply fallback defaults and pattern stripping without calling external subprocesses.',
    brief: 'Emit default region `${REGION:-us-east-1}` and stripped image `${IMAGE#repo/}` into `deploy.txt`.',
    teach: `Bash has built-in string manipulation that avoids slow subprocess forks like \`sed\` or \`cut\`:\n- \`\${VAR:-default}\`: If VAR is unset or null, evaluate to \`default\`.\n- \`\${VAR#prefix}\`: Strip shortest matching prefix.\n- \`\${VAR%suffix}\`: Strip shortest matching suffix.\n- \`\${#VAR}\`: Return string character length.`,
    learning: [
      '${VAR:-default} enables defensive environment variable configuration',
      '${VAR#prefix} and ${VAR%suffix} strip path components in pure shell memory',
      'Native parameter expansion runs hundreds of times faster than forking sed or awk',
    ],
    fieldNotes: [
      '${VAR:=default} not only evaluates to default, but also mutates VAR by assigning the default value to it',
      '${VAR:?error message} aborts the script with an error if VAR is unset, serving as an inline assertion',
      '${VAR//search/replace} performs in-memory global search and replace without sed',
    ],
    transfer: 'Cloud configuration scripts (Kubernetes entrypoints, Terraform shims) configure defaults entirely via ${VAR:-default}.',
    hint: 'echo "${REGION:-us-east-1} ${IMAGE#repo/}" > deploy.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'readme.txt': 'params\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
      env: { IMAGE: 'repo/app:v1.2' },
    },
    solution: [{ command: 'echo "${REGION:-us-east-1} ${IMAGE#repo/}" > deploy.txt', note: 'Expand default region and strip repo prefix' }],
    checks: [
      { type: 'file_exists', value: '/home/learner/deploy.txt' },
      { type: 'file_contains', path: '/home/learner/deploy.txt', value: 'us-east-1 app:v1.2' },
    ],
  },
  {
    id: 'prd-cli',
    series: 'Production Hardening',
    title: 'CLI Positional Arguments ($1, $@, $#)',
    objective: 'Write modular scripts accepting dynamic arguments from users.',
    brief: 'Create an executable backup script `backup.sh` that copies its first argument `$1` to `$1.bak`.',
    teach: `Shell scripts accept command-line parameters as positional arguments:\n- \`$1\`, \`$2\` ... \`$9\`: Positional arguments passed to the script or function.\n- \`$#\`: Total count of positional arguments.\n- \`$@\`: All arguments as individual quoted words (\`"$@"\` preserves internal spaces).\n- \`shift\`: Shifts arguments left ($2 becomes $1), enabling loop-based flag parsing.`,
    learning: [
      '$1..$N access CLI arguments passed during script invocation',
      '$# tracks argument count for input validation (e.g. [ $# -lt 1 ] && exit 1)',
      'Always quote positional arguments ("$1") to avoid word-splitting bugs on filenames with spaces',
    ],
    fieldNotes: [
      'Use "$@" (with quotes) instead of $*; "$@" expands to ("$1" "$2" ...), preserving spaces inside arguments',
      'The shift command discards $1 and shifts remaining parameters down by one, the core mechanism of while loops',
      'getopts parses standard Unix single-letter flags (like -v, -f file) with automated error handling',
    ],
    transfer: 'Every reusable DevOps script is a CLI interface accepting arguments through positional parameters and getopts.',
    hint: 'echo \'cp "$1" "$1.bak"\' > backup.sh && chmod +x backup.sh',
    par: 2,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'echo \'cp "$1" "$1.bak"\' > backup.sh', note: 'Write backup logic using positional argument $1' },
      { command: 'chmod +x backup.sh', note: 'Make script executable' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/backup.sh' },
      { type: 'file_contains', path: '/home/learner/backup.sh', value: '$1' },
      { type: 'file_mode_is', path: '/home/learner/backup.sh', value: '755' },
    ],
  },
  {
    id: 'proc-ps-kill',
    series: 'Processes & Jobs',
    title: 'Process Table & Signal Termination',
    objective: 'Inspect running tasks with ps and terminate processes with kill.',
    brief: 'Launch sleep in the background, check the process list with `ps`, then terminate the job with `kill %1`.',
    teach: `In Unix, every running program is assigned a Process ID (PID).
- \`&\`: Spawns a command into the background without blocking the terminal.
- \`ps\`: Reports a snapshot of current active processes.
- \`kill PID\` or \`kill %JOB\`: Sends an OS signal (SIGTERM by default) requesting the process to terminate.`,
    learning: [
      'ps prints active PID, terminal, and command details',
      'kill %1 targets job IDs assigned by the current shell',
      'SIGTERM (kill) gracefully asks a process to shut down and exit',
    ],
    fieldNotes: [
      'kill -9 (SIGKILL) forcefully terminates uncooperative processes at the kernel level without cleanup',
      'killall or pkill matches processes by name rather than PID: pkill nginx',
      'ps aux displays all processes running across the entire operating system',
    ],
    transfer: 'Every Docker/Kubernetes container orchestrator relies on PID 1 signal propagation (SIGTERM then SIGKILL after grace period).',
    hint: 'sleep 100 & then ps then kill %1',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'sleep 100 &', note: 'Spawn background sleep process' },
      { command: 'ps', note: 'Inspect running process table' },
      { command: 'kill %1', note: 'Terminate background job' },
    ],
    checks: [
      { type: 'cmd_used', value: 'ps' },
      { type: 'cmd_used', value: 'kill' },
    ],
  },
  {
    id: 'proc-array-advanced',
    series: 'Processes & Jobs',
    title: 'Dynamic Array Mutation & Iteration',
    objective: 'Append elements to bash arrays and measure length with ${#arr[@]}.',
    brief: 'Create array arr=(frontend backend), append devops with arr+=(devops), and output its length ${#arr[@]} into len.txt.',
    teach: `Bash arrays can be mutated dynamically without reconstructing the whole list:
- \`arr+=(item)\`: Appends one or more items to an existing array.
- \`\${#arr[@]}\`: Expands to the total number of elements currently stored.
- \`"\${arr[@]}"\`: Safely expands each element as an individually quoted word.`,
    learning: [
      'arr+=(val) appends items dynamically in memory',
      '${#arr[@]} returns exact item count',
      'Iterate over arrays with: for item in "${arr[@]}"; do ...; done',
    ],
    fieldNotes: [
      'Always quote "${arr[@]}" to prevent word splitting when elements contain spaces',
      'Associative arrays (hash maps) are declared with declare -A dict in bash 4+',
      'Unset elements using unset arr[index] or delete entire array with unset arr',
    ],
    transfer: 'Deployment scripts store target clusters or hosts in arrays and iterate over them for zero-downtime rolling updates.',
    hint: 'arr=(frontend backend) then arr+=(devops) then echo ${#arr[@]} > len.txt',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'arr=(frontend backend)', note: 'Initialize array' },
      { command: 'arr+=(devops)', note: 'Append element' },
      { command: 'echo ${#arr[@]} > len.txt', note: 'Emit array length' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/len.txt' },
      { type: 'file_contains', path: '/home/learner/len.txt', value: '3' },
    ],
  },
  {
    id: 'fn-scope-local',
    series: 'Functions & Scope',
    title: 'Local Variable Isolation & Exit Codes',
    objective: 'Protect global scope using local and communicate status via return.',
    brief: 'Define a function calc() using local secret=42 that exits with return 42, invoke it, and write $? into status.txt.',
    teach: `By default, all variables in shell functions leak into the global environment:
- \`local var=value\`: Limits variable lifecycle strictly to the executing function frame.
- \`return N\`: Exits the function with a specific numeric exit code (0–255).
- \`$?\`: Captures the return code of the last executed command or function.`,
    learning: [
      'Variables without local are global and can cause accidental side-effects',
      'return code sets $? without terminating the parent script',
      'Functions communicate success with return 0 and errors with return 1..255',
    ],
    fieldNotes: [
      'local can only be used inside functions; executing it in top-level shell triggers an error',
      'Functions can return strings via stdout: result=$(my_func); return codes are strictly for status',
      'Capture function outputs and exit codes separately: out=$(f); code=$?',
    ],
    transfer: 'Standard shell libraries (shunit2, bats) rely on return codes and local variables to run hundreds of test suites without state pollution.',
    hint: 'calc() { local secret=42; return 42; }; calc; echo $? > status.txt',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'calc() { local secret=42; return 42; }', note: 'Define isolated function' },
      { command: 'calc', note: 'Execute function' },
      { command: 'echo $? > status.txt', note: 'Save exit code' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/status.txt' },
      { type: 'file_contains', path: '/home/learner/status.txt', value: '42' },
    ],
  },
  {
    id: 'sec-stat-chown',
    series: 'Permissions & Security',
    title: 'Inode Inspection & Ownership Assignment',
    objective: 'Inspect filesystem metadata with stat and reassign owner with chown.',
    brief: 'Reassign ownership of `server.log` to `root:staff` using chown, and save its stat output into `meta.txt`.',
    teach: `Files in Unix consist of metadata stored in Inodes and content stored in data blocks:
- \`stat file\`: Displays complete metadata: Inode number, octal permissions, file size, block count, UID, and GID.
- \`chown user:group file\`: Modifies user and group ownership of the target file.`,
    learning: [
      'stat reveals exact filesystem allocation, inode numbers, and access timestamps',
      'chown changes owning user and group',
      'Security auditing requires verifying UID/GID alongside permission bits',
    ],
    fieldNotes: [
      'In Linux, chown -R applies ownership changes recursively across entire directory trees',
      'stat -c %a file extracts only the numeric octal mode (e.g. 644 or 755) for scripting',
      'Regular users can chgrp to groups they belong to, but only superuser (root) can reassign file owner via chown',
    ],
    transfer: 'Cloud setup scripts (systemd service definitions, Nginx configs) chown app directories to unprivileged service users like www-data.',
    hint: 'chown root:staff server.log then stat server.log > meta.txt',
    par: 2,
    seed: {
      tree: withHomeFiles({
        'server.log': 'system started\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [
      { command: 'chown root:staff server.log', note: 'Reassign file owner' },
      { command: 'stat server.log > meta.txt', note: 'Capture file metadata' },
    ],
    checks: [
      { type: 'file_owner_is', path: '/home/learner/server.log', value: 'root' },
      { type: 'file_exists', value: '/home/learner/meta.txt' },
      { type: 'file_contains', path: '/home/learner/meta.txt', value: 'server.log' },
    ],
  },
  {
    id: 'txt-awk-filter',
    series: 'Text Wrangling',
    title: 'Stream Pattern Filtering with Awk',
    objective: 'Filter tabular streams using conditional threshold expressions in awk.',
    brief: 'Filter `metrics.csv` for records where CPU (column 2) is greater than 80, and output server names (column 1) into `alerts.txt`.',
    teach: `Awk combines pattern matching with action blocks:
- Syntax: \`awk 'pattern { action }'\`.
- Patterns can be numeric comparisons: \`awk -F, '$2 > 80 {print $1}'\`.
- If a line matches the pattern, the action block executes; otherwise, it is skipped.`,
    learning: [
      'awk pattern { action } evaluates conditions per line before processing',
      'Comparison operators (>, <, ==, !=) operate on extracted column variables',
      'awk filters and formats simultaneously without extra grep pipes',
    ],
    fieldNotes: [
      'Awk automatically handles numeric coercion: "$2 > 80" parses column 2 as a float/integer',
      'Multiple conditions can be joined using logical operators: $2 > 80 && $3 == "PROD"',
      'NR (Number of Records) can skip headers: NR > 1 && $2 > 80 {print $1}',
    ],
    transfer: 'Production monitoring agents (Prometheus node-exporter scripts, log parsers) use awk condition filters for threshold alerts.',
    hint: "awk -F, '$2 > 80 {print $1}' metrics.csv > alerts.txt",
    par: 1,
    seed: {
      tree: withHomeFiles({
        'metrics.csv': 'srv-alpha,45\nsrv-beta,88\nsrv-gamma,92\nsrv-delta,12\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [
      { command: "awk -F, '$2 > 80 {print $1}' metrics.csv > alerts.txt", note: 'Filter servers exceeding 80% CPU' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/alerts.txt' },
      { type: 'file_contains', path: '/home/learner/alerts.txt', value: 'srv-beta\nsrv-gamma' },
    ],
  },
  {
    id: 'prd-logging-stderr',
    series: 'Production Hardening',
    title: 'Standard Error Separation (stderr >&2)',
    objective: 'Direct diagnostic messages to stderr to keep stdout pipeline-friendly.',
    brief: 'Redirect an alert "[ERROR] disk full" to standard error with `>&2` and capture standard error in `err.log`.',
    teach: `In Unix philosophy, programs must separate actionable data from human diagnostic messages:
- \`stdout\` (file descriptor 1): Clean tabular or serialized payload meant for pipelines.
- \`stderr\` (file descriptor 2): Logs, errors, warnings, and debugging traces.
- \`echo "msg" >&2\`: Duplicates output to file descriptor 2 (stderr).
- \`2> file\`: Captures only standard error while leaving standard output clean.`,
    learning: [
      '>&2 redirects echo or printf output to standard error',
      'Mixing error messages into stdout breaks downstream pipelines (jq, cut, awk)',
      '2> captures stderr separately for audit and error tracking',
    ],
    fieldNotes: [
      'Production bash scripts often define helper functions: log_err() { echo "[$(date +%T)] ERROR: $*" >&2; }',
      '&> file or >file 2>&1 redirects both stdout and stderr together',
      'Silent commands on success is standard Unix convention (Rule of Silence)',
    ],
    transfer: 'CI/CD pipelines (GitHub Actions, GitLab CI) capture stderr streams to flag failing build steps in job summaries.',
    hint: 'echo "[ERROR] disk full" >&2 2> err.log',
    par: 1,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'echo "[ERROR] disk full" >&2 2> err.log', note: 'Direct message to stderr and capture in log' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/err.log' },
      { type: 'file_contains', path: '/home/learner/err.log', value: '[ERROR] disk full' },
    ],
  },
  {
    id: 'cap-1-scaffold',
    series: 'Capstone Project',
    title: 'Capstone: Production Script Scaffold',
    objective: 'Scaffold a defensive enterprise script with strict mode, signal trap, and execution permissions.',
    brief: 'Create an executable script `sys-audit.sh` that enables `set -euo pipefail`, captures a temporary file with `mktemp`, cleans it up with a `trap` on EXIT, and mark it executable.',
    teach: `Production Bash scripts must be engineered for predictability and zero accidental side-effects:
- \`set -euo pipefail\`: Aborts immediately on unhandled command failures, undefined variables, or failing pipeline stages.
- \`TMP=$(mktemp)\`: Allocates an isolated temporary scratchpad file under \`/tmp\`.
- \`trap 'rm -f $TMP' EXIT\`: Guarantees cleanup even if the script crashes or is terminated early.
- \`chmod +x sys-audit.sh\`: Enables binary execution bit for operating system invocation.`,
    learning: [
      'Strict mode prevents silent errors from propagating across production workloads',
      'Trapping EXIT provides deterministic resource disposal identical to try-finally',
      'Production CLI utilities require the executable bit (chmod +x)',
    ],
    fieldNotes: [
      'In enterprise DevOps, scripts without set -euo pipefail fail code review in modern CI pipelines',
      'Always quote the variable in traps: trap \'rm -f "$TMP"\' EXIT to prevent whitespace path errors',
      'Use shellcheck in automated linters to catch common syntax and quoting oversights',
    ],
    transfer: 'Kubernetes container entrypoints (entrypoint.sh) and Terraform provisioners strictly follow this scaffolding pattern.',
    hint: 'echo "set -euo pipefail" > sys-audit.sh then add trap and chmod +x sys-audit.sh',
    par: 4,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'echo "set -euo pipefail" > sys-audit.sh', note: 'Enable strict safety flags' },
      { command: 'echo "TMP=$(mktemp)" >> sys-audit.sh', note: 'Allocate scratchpad' },
      { command: 'echo \'trap "rm -f $TMP" EXIT\' >> sys-audit.sh', note: 'Register disposal trap' },
      { command: 'chmod +x sys-audit.sh', note: 'Mark script executable' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/sys-audit.sh' },
      { type: 'file_contains', path: '/home/learner/sys-audit.sh', value: 'set -euo pipefail' },
      { type: 'file_contains', path: '/home/learner/sys-audit.sh', value: 'trap' },
      { type: 'file_mode_is', path: '/home/learner/sys-audit.sh', value: '755' },
    ],
  },
  {
    id: 'cap-2-pipeline',
    series: 'Capstone Project',
    title: 'Capstone: Log Stream Analytics',
    objective: 'Parse high-volume access logs to isolate HTTP 5xx errors and rank failing endpoints.',
    brief: 'Inspect `nginx.log`, filter lines containing HTTP 500 or 502, extract the endpoint path (column 6), rank incidents with `sort | uniq -c`, and save to `incidents.txt`.',
    teach: `Log analysis in Unix chains specialized stream filters together:
- \`grep 50 nginx.log\`: Rapidly filters only lines representing server errors.
- \`awk '{print $6}'\`: Projects the target URI endpoint from standard combined access log formats.
- \`sort | uniq -c\`: Aggregates duplicate endpoints and computes occurrence frequencies.
- \`sort -n > incidents.txt\`: Emits a sorted frequency distribution for incident triage.`,
    learning: [
      'Piping grep into awk isolates columns from matching error lines',
      'sort | uniq -c is the canonical Unix idiom for frequency histograms',
      'Numeric sort (sort -n) surfaces the highest incident culprits at the end of the report',
    ],
    fieldNotes: [
      'In high-throughput logs (gigabytes per minute), avoid reading files into RAM: pipelines process line-by-line in stream buffers',
      'Combine awk pattern filtering directly: awk \'$9 ~ /^50/ {print $6}\' for even faster execution',
      'Production SRE incident responses rely on this exact one-liner to identify failing microservice endpoints',
    ],
    transfer: 'Real-time observability agents and log scrapers (Datadog, Grafana Loki, Fluentd) use this exact tokenization logic.',
    hint: 'grep 50 nginx.log | awk \'{print $6}\' | sort | uniq -c | sort -n > incidents.txt',
    par: 1,
    seed: {
      tree: withHomeFiles({
        'nginx.log': '192.168.1.10 - - [10/Oct/2026:10:00:01] "GET /api/v1/users HTTP/1.1" 200 1204\n10.0.0.45 - - [10/Oct/2026:10:00:02] "POST /api/v1/checkout HTTP/1.1" 500 452\n172.16.0.8 - - [10/Oct/2026:10:00:03] "POST /api/v1/checkout HTTP/1.1" 500 452\n10.0.0.45 - - [10/Oct/2026:10:00:04] "GET /health HTTP/1.1" 200 45\n192.168.1.10 - - [10/Oct/2026:10:00:05] "POST /api/v1/checkout HTTP/1.1" 500 452\n10.0.0.99 - - [10/Oct/2026:10:00:06] "GET /api/v1/items HTTP/1.1" 502 312\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [
      { command: 'grep 50 nginx.log | awk \'{print $6}\' | sort | uniq -c | sort -n > incidents.txt', note: 'Extract and rank failing endpoints' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/incidents.txt' },
      { type: 'file_contains', path: '/home/learner/incidents.txt', value: '/api/v1/checkout' },
      { type: 'file_contains', path: '/home/learner/incidents.txt', value: '3' },
    ],
  },
  {
    id: 'cap-3-hardening',
    series: 'Capstone Project',
    title: 'Capstone: Diagnostic Channels & Stderr',
    objective: 'Separate diagnostic telemetry from output data and configure directory fallbacks.',
    brief: 'Configure target directory using `${OUTPUT_DIR:-reports}`, create it with `mkdir -p`, and redirect diagnostic status `"[INFO] Starting incident scan"` to stderr capturing into `audit.err`.',
    teach: `Enterprise CLI tools maintain clean pipeline interfaces by strictly segregating stdout and stderr:
- \`DIR="\${OUTPUT_DIR:-reports}"\`: Employs in-memory parameter fallback to prevent unset variable crashes under \`set -u\`.
- \`mkdir -p "$DIR"\`: Idempotently creates parent paths without error if they already exist.
- \`echo "[INFO] ..." >&2\`: Routes status messages to standard error so downstream consumers only receive parseable data.
- \`2> audit.err\`: Persists operational diagnostic logs independently from business payloads.`,
    learning: [
      'Parameter fallback ${VAR:-default} enables dynamic environment override',
      'mkdir -p guarantees idempotent directory provisioning',
      'Diagnostic logging to stderr prevents data corruption in automated pipelines',
    ],
    fieldNotes: [
      'In automated Jenkins/GitHub Actions runners, stdout is often piped to JSON analyzers (jq); unescaped echo logs will break the pipeline',
      'Standard log prefixes: [INFO], [WARN], [ERROR] allow log collectors to categorize severity levels',
      'Always quote paths "$DIR" to handle paths containing spaces or special characters',
    ],
    transfer: 'Cloud deployment agents and container builders direct progress bars to stderr to keep container image IDs clean on stdout.',
    hint: 'DIR="${OUTPUT_DIR:-reports}"; mkdir -p $DIR; echo "[INFO] Starting incident scan" >&2 2> audit.err',
    par: 3,
    seed: { tree: defaultHome(), cwd: '/home/learner', home: '/home/learner' },
    solution: [
      { command: 'DIR="${OUTPUT_DIR:-reports}"', note: 'Evaluate fallback directory' },
      { command: 'mkdir -p $DIR', note: 'Create destination folder' },
      { command: 'echo "[INFO] Starting incident scan" >&2 2> audit.err', note: 'Emit diagnostic trace to stderr' },
    ],
    checks: [
      { type: 'dir_exists', value: '/home/learner/reports' },
      { type: 'file_exists', value: '/home/learner/audit.err' },
      { type: 'file_contains', path: '/home/learner/audit.err', value: '[INFO] Starting incident scan' },
    ],
  },
  {
    id: 'cap-4-delivery',
    series: 'Capstone Project',
    title: 'Capstone: Production Delivery & Audit Signoff',
    objective: 'Synthesize all skills into a final audit report signed with executive status and file permissions.',
    brief: 'Compile findings into `reports/summary.txt`, seal the report with status `AUDIT_COMPLETE: 3 incidents resolved`, and restrict permissions to `chmod 644`.',
    teach: `The final stage of production automation is artifact delivery and signoff:
- Synthesize error metrics, incident counts, and system status into an executive summary.
- Apply production permissions (\`chmod 644\`) to ensure reports are read-only for general users and writeable only by the owner.
- Deliver an immutable audit trail suitable for SOC2, compliance, and engineering post-mortems.`,
    learning: [
      'Executive summaries aggregate operational data into human-actionable deliverables',
      'chmod 644 enforces standard security compliance on generated audit reports',
      'You have mastered end-to-end production Linux/Bash engineering from navigation to enterprise automation',
    ],
    fieldNotes: [
      'In production, automated reports are uploaded to S3/GCS buckets and notified via Slack/PagerDuty webhooks',
      'Include machine-readable exit codes (0 for healthy, 1 for critical incidents) so monitoring systems can trigger alerts',
      'Maintaining clean, tested, documented shell scripts is a high-value skill across DevOps, SRE, and backend roles',
    ],
    transfer: 'Real-world compliance audits and security scans (CIS benchmarks, PCI-DSS compliance) generate and sign reports following this exact workflow.',
    hint: 'mkdir -p reports then write AUDIT_COMPLETE to reports/summary.txt then chmod 644 reports/summary.txt',
    par: 3,
    seed: {
      tree: withHomeFiles({
        'nginx.log': '10.0.0.1 500 /checkout\n10.0.0.2 500 /checkout\n10.0.0.3 500 /checkout\n',
      }),
      cwd: '/home/learner',
      home: '/home/learner',
    },
    solution: [
      { command: 'mkdir -p reports', note: 'Ensure reports directory exists' },
      { command: 'echo "AUDIT_COMPLETE: 3 incidents resolved" > reports/summary.txt', note: 'Generate signed audit summary' },
      { command: 'chmod 644 reports/summary.txt', note: 'Lock file permissions' },
    ],
    checks: [
      { type: 'file_exists', value: '/home/learner/reports/summary.txt' },
      { type: 'file_contains', path: '/home/learner/reports/summary.txt', value: 'AUDIT_COMPLETE' },
      { type: 'file_mode_is', path: '/home/learner/reports/summary.txt', value: '644' },
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
    case 'file_mode_is': {
      const n = shell.fs.getNode(check.path);
      return !!n && n.mode === check.value;
    }
    case 'file_owner_is': {
      const n = shell.fs.getNode(check.path);
      return !!n && n.owner === check.value;
    }
    case 'opt_is':
      return shell[check.opt] === check.value;
    case 'trap_is':
      return Boolean(shell._traps?.[check.sig]?.includes(check.value));
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
    case 'file_owner_is':
      return `${check.path} owner must be ${check.value}`;
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
    case 'file_mode_is':
      return `permissions of ${check.path} must be ${check.value}`;
    case 'opt_is':
      return `shell option ${check.opt} must be enabled`;
    case 'trap_is':
      return `trap for ${check.sig} must be configured`;
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

// Attach ELI tiers to all levels
LEVELS.forEach((level) => {
  if (LEVEL_ELI[level.id]) {
    level.eli = LEVEL_ELI[level.id];
  }
});

export { getEli };
