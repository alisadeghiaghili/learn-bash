/**
 * Multi-Tier Pedagogical Explanations (ELI5, ELI10, ELI15, ELI20, ELIPHD)
 *
 * Tier definitions:
 * - ELI5: Physical world metaphor, tangible analogies, zero technical jargon.
 * - ELI10: Everyday computing mental model, cause-and-effect, simple apps.
 * - ELI15: Practical developer mechanics: commands, flags, streams, exit codes.
 * - ELI20: Systems engineering: POSIX specs, fork/exec, file descriptors, race conditions, signals.
 * - ELIPHD: OS & kernel internals: VFS, inodes, ring buffers, syscalls, buffering, exploit vectors.
 */

export const ELI_TIERS = ['eli5', 'eli10', 'eli15', 'eli20', 'eliphd'];

export const ELI_METADATA = {
  eli5: {
    id: 'eli5',
    name: 'ELI5',
    title: 'Explain Like I\'m 5',
    subtitle: 'Physical Metaphors & Intuition',
    badge: 'Intuition',
    color: '#ff8c1a',
    perspective: 'Everyday physical analogies, tangible objects, zero acronyms or tech jargon.',
  },
  eli10: {
    id: 'eli10',
    name: 'ELI10',
    title: 'Explain Like I\'m 10',
    subtitle: 'Everyday Computer Mental Model',
    badge: 'Basic',
    color: '#5ee0a0',
    perspective: 'Familiar software concepts, folders, screens, cause-and-effect rules.',
  },
  eli15: {
    id: 'eli15',
    name: 'ELI15',
    title: 'Explain Like I\'m 15',
    subtitle: 'Practical Developer Mechanics',
    badge: 'Developer',
    color: '#7aa2ff',
    perspective: 'Command syntax, flags, standard streams, exit codes, path hierarchies.',
  },
  eli20: {
    id: 'eli20',
    name: 'ELI20',
    title: 'Explain Like I\'m 20',
    subtitle: 'Systems Engineering & POSIX',
    badge: 'Systems',
    color: '#b794f6',
    perspective: 'Process lifecycle, fork/exec, file descriptors, signals, race conditions, defensive scripting.',
  },
  eliphd: {
    id: 'eliphd',
    name: 'ELIPHD',
    title: 'Explain Like a PhD',
    subtitle: 'Linux Kernel & Systems Architecture',
    badge: 'Kernel',
    color: '#ffd166',
    perspective: 'VFS dentry caches, kernel ring buffers, glibc buffering, atomic guarantees, security attack vectors.',
  },
};

export const SANDBOX_ELI = {
  eli5: `### The Computer Castle
Imagine your computer is a magical castle with millions of rooms (folders) and treasure chests (files).
You are holding a magical walkie-talkie (the terminal). Whenever you say words into it, invisible helpers run through the castle to find rooms, build boxes, and read notes back to you!

Type \`levels\` to pick a challenge, or try \`pwd\`, \`ls\`, or \`echo hello\`.`,

  eli10: `### The Text-Based Cockpit
Instead of clicking icons with a mouse, the shell is a direct command cockpit.
Every command you type is a tiny program that accepts inputs, does one specific job, and outputs the result as text. When you string them together, you can do things in two seconds that would take minutes of mouse clicks.

Type \`levels\` to see the curriculum, or explore freely in this sandbox.`,

  eli15: `### The UNIX Shell Environment
The shell is a command language interpreter (REPL: Read-Eval-Print Loop).
It maintains a current working directory (cwd), environment variables (\`$PATH\`, \`$HOME\`), and connects standard streams:
- **stdin (0)**: where inputs flow in
- **stdout (1)**: where clean data flows out
- **stderr (2)**: where diagnostic error messages appear

Type \`levels\` to begin structured challenges, or run commands here to watch the directory tree and pipeline visualizers react in real-time.`,

  eli20: `### POSIX Process Execution Model
Under POSIX, the shell coordinates child processes using the \`fork(2)\` and \`execve(2)\` primitives.
Commands either execute as shell builtins (like \`cd\`, \`pwd\`, \`export\`) directly within the current process memory space, or as external executables requiring process duplication, file descriptor redirection (\`dup2(2)\`), and argument vector marshaling.

Defensive scripting principles:
- Always quote expansions (\`"$VAR"\`) to prevent word splitting and globbing.
- Guard commands against failure with \`set -euo pipefail\`.
- Treat environment variables as untrusted input boundaries.`,

  eliphd: `### Operating System Architecture & VFS Abstraction
The shell is an interface atop the kernel Virtual File System (VFS) and process scheduler.
Filesystem hierarchies are directed trees of inodes linked through directory entries (\`dentry\` cache). Inter-process communication across pipelines operates through circular kernel ring buffers (\`fs/pipe.c\`, capacity typically 64 KiB) with atomic write boundaries governed by \`PIPE_BUF\` (4096 bytes on Linux).

Syscall execution paths (\`read\`, \`write\`, \`clone\`, \`pipe\`, \`execve\`) dictate CPU context switches and page table copy-on-write overhead. High-throughput pipelines bypass userspace memory copies via zero-copy primitives like \`splice(2)\`.`,
};

export const LEVEL_ELI = {
  'b1-pwd': {
    eli5: `Imagine walking through a giant castle with hundreds of rooms. You shout: "What room am I standing in right now?"
The castle whispers back: "You are in the learner room inside the tower!" That is \`pwd\` (Print Working Directory). It never moves you; it only answers where you are standing.`,
    eli10: `In File Explorer or Finder, there is an address bar at the top showing which folder is open right now.
Because the terminal does not have graphical windows, \`pwd\` prints that exact folder path onto your screen so you never get lost.`,
    eli15: `\`pwd\` prints the shell process's current working directory (cwd).
All relative paths (like \`notes/todo.txt\`) resolve relative to this path.
- \`pwd -L\` prints the logical path including symlink names (default).
- \`pwd -P\` resolves all symlinks to their physical filesystem path.`,
    eli20: `In POSIX systems, working directory is per-process state stored in the kernel process table.
\`pwd\` is implemented as a shell builtin that reads the internal \`$PWD\` variable, avoiding process fork overhead.
Production note: automated scripts (cron, systemd, Docker entrypoints) start in arbitrary root directories; always resolve root paths via \`SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd -P)"\`.`,
    eliphd: `The working directory is anchored to a specific VFS inode via \`current->fs->pwd\` (a \`struct path\` binding \`vfsmount\` and \`dentry\`).
The \`getcwd(2)\` syscall performs upward dentry traversal through parent pointers (\`d_parent\`) until reaching the mount point root inode.
Edge cases: if an ancestor directory is unlinked or moved outside a mount namespace, \`getcwd\` returns \`ENOENT\` or prepends \`(unreachable)\`.`,
  },

  'b2-ls': {
    eli5: `You open a toy box and peek inside. You name every single toy sitting on top: "There is a bear, a block, and a car!"
\`ls\` lists the names of everything inside your current folder so you know what is there.`,
    eli10: `When you open a folder on your desktop, you see a bunch of icons.
\`ls\` is the text version: it reads the folder and lists the names of all the files and subfolders inside.`,
    eli15: `\`ls\` reads a directory stream and formats its entries to stdout.
- \`-a\`: includes dotfiles (hidden files whose names begin with \`.\`).
- \`-l\`: long format displaying permissions, hard link count, owner, group, byte size, and mtime.
- Crucial distinction: \`ls\` lists names; \`cat\` reads file contents.`,
    eli20: `Internally calls \`opendir(3)\` and \`readdir(3)\`, which issue the \`getdents64(2)\` system call.
CRITICAL production rule: NEVER parse the output of \`ls\` in scripts (e.g. \`for f in $(ls)\`). File names in POSIX can contain spaces, newlines, tabs, and leading hyphens, which cause word splitting vulnerabilities. Use globs (\`for f in *\`) or \`find -print0 | xargs -0\`.`,
    eliphd: `Directory entries are stored on disk as variable-length structures mapping names to inode numbers (e.g., ext4 \`ext4_dir_entry_2\` or indexed via \`htree\` B-trees).
\`ls\` buffers all entries in userspace memory to perform alphanumeric sorting before printing. On directories with millions of entries, this causes huge memory allocations and latency; streaming tools using raw \`getdents64\` or parallel walk algorithms avoid this bottleneck.`,
  },

  'b3-cd': {
    eli5: `You take a step forward through an open doorway into another room.
When you say \`cd notes\`, you walk right into the "notes" room. Your next actions will happen in that new room!`,
    eli10: `Like double-clicking a folder to enter it.
\`cd notes\` takes you into the notes folder. \`cd ..\` moves you back up one level. \`cd ~\` takes you straight back to your home folder.`,
    eli15: `\`cd\` (Change Directory) updates the shell's current working directory.
- Relative paths: \`cd notes\` (resolves from cwd).
- Absolute paths: \`cd /home/learner/notes\` (starts from root \`/\`).
- Special targets: \`cd ..\` (parent directory), \`cd -\` (previous directory via \`$OLDPWD\`), \`cd\` without args (jumps to \`$HOME\`).`,
    eli20: `\`cd\` MUST be a shell builtin; an external executable running in a child process cannot alter the parent shell process's cwd.
It invokes the \`chdir(2)\` syscall.
Defensive scripting rule: ALWAYS guard directory changes: \`cd /target/dir || exit 1\`. If \`cd\` fails and execution continues, subsequent commands like \`rm -rf *\` would wipe the wrong directory.`,
    eliphd: `\`chdir(2)\` checks execute (\`+x\`) permission bits on every path component inode during path resolution (\`link_path_walk\`).
Upon success, it decrements the reference count on the old dentry and increments it on the new target dentry in \`current->fs->pwd\`.
Subshell isolation: invoking \`(cd /path && command)\` forks a child task where \`chdir\` only alters the child's \`fs_struct\`, leaving the parent environment completely untouched.`,
  },

  'b4-echo': {
    eli5: `Imagine you have a friendly parrot sitting on your shoulder.
Whatever words you say out loud, the parrot repeats right back to you! \`echo hello\` makes the parrot say "hello".`,
    eli10: `\`echo\` prints text onto your screen.
If you type \`echo hello bash\`, the computer displays \`hello bash\` right below your command.`,
    eli15: `\`echo\` writes its arguments to standard output (stdout), separated by single spaces and terminated by a newline.
Quoting matters:
- \`echo hello bash\` passes two arguments: \`hello\` and \`bash\`.
- \`echo "hello    bash"\` passes one argument, preserving the spaces.
In POSIX scripts, \`printf "%s\\n" "$text"\` is preferred over \`echo\` due to conflicting flag implementations (\`-e\`, \`-n\`) across shells.`,
    eli20: `Outputs directly to file descriptor 1 (stdout).
Unquoted variable expansions like \`echo $VAR\` trigger word splitting and pathname expansion (globbing) before \`echo\` ever sees the arguments.
Security warning: never use \`echo $SECRET\` in logs; pass sensitive tokens through file descriptors or environment variables directly.`,
    eliphd: `\`echo\` issues a \`write(2)\` syscall against file descriptor 1.
When connected to an interactive tty, stdout is line-buffered by glibc/musl; when redirected to a block device or pipe, it becomes block-buffered (typically 4096 or 8192 bytes).
Escape sequence injection: printing unsanitized user strings with \`echo\` can inject ANSI terminal escape codes (CSI sequences) that rewrite terminal titles, hide output, or hijack terminal paste buffers.`,
  },

  'b5-vars': {
    eli5: `You take a yellow sticky note and write "ada" on it, then label the top "NAME".
Whenever you ask for \`$NAME\`, your friend reads what is written on that sticky note: "ada"!`,
    eli10: `A variable is like a named box that stores a piece of text.
You store a name with \`NAME=ada\`. You retrieve it by putting a dollar sign in front: \`$NAME\`.`,
    eli15: `Shell variables store string values.
- Assignment: \`VAR=value\` (no spaces around \`=\`!).
- Expansion: \`$VAR\` or \`\${VAR}\` is replaced with the stored value before command execution.
- Quoting values: \`MSG="hello world"\` preserves spaces.
- Shell vs Environment: \`VAR=val\` is local to the current shell; \`export VAR=val\` exports it to child subprocesses.`,
    eli20: `Variable expansion occurs early in the shell parsing pipeline.
Defensive rules:
- Always quote expansions: \`"$VAR"\` prevents word splitting if the value contains spaces, and prevents globbing if it contains \`*\`.
- Default fallbacks: \`\${VAR:-default}\` uses fallback if unset or null.
- Required validation: \`\${VAR:?variable required}\` halts script execution with an error if unset.`,
    eliphd: `Environment variables reside in the process address space as a null-terminated array of \`KEY=VALUE\` strings pointed to by \`environ\` (accessible via \`/proc/self/environ\`).
During \`execve(2)\`, the kernel copies this environment block into the top of the new process stack frame (bounded by \`ARG_MAX\`).
Security implications: Bash parameter expansion does not perform type checking; unquoted expansions passed to arithmetic or \`eval\` contexts can trigger arbitrary code execution.`,
  },

  'f1-touch': {
    eli5: `You tap an empty spot on your desk with a pencil. A clean, brand new blank sheet of paper appears!
If the paper is already there, you just tap it with your pencil to show you touched it today.`,
    eli10: `\`touch report.txt\` creates a new empty text file if it doesn't exist yet.
If the file already exists, it doesn't erase anything; it just updates the file's "Last Modified" clock.`,
    eli15: `\`touch\` updates file access and modification timestamps (\`atime\` and \`mtime\`).
- If the file does not exist, an empty 0-byte file is created.
- It will NOT create missing parent directories (e.g., \`touch a/b.txt\` errors if \`a/\` does not exist).
- Useful flags: \`-c\` (do not create if missing), \`-r ref_file\` (copy timestamps from another file).`,
    eli20: `Issues the \`utimensat(2)\` syscall with \`AT_FDCWD\` and nanosecond timestamp precision.
Build systems (GNU Make) rely on \`mtime\` timestamps to determine whether build artifacts are up-to-date relative to source files.
Defensive scripting: to create files safely without race conditions, use \`set -o noclobber\` or \`mktemp\` rather than assuming \`touch\` is atomic across concurrent workers.`,
    eliphd: `File creation invokes the VFS \`vfs_create\` inode operation.
The filesystem driver allocates an unused inode from the inode bitmap, writes metadata (mode, uid, gid, timestamps), and inserts a new dentry into the parent directory's block/extent tree.
Filesystem mount options such as \`noatime\` or \`relatime\` influence whether \`touch\` causes immediate disk journal metadata commits.`,
  },

  'f2-mkdir': {
    eli5: `You take a brand new empty cardboard box, write a label on the front, and set it on the floor.
Now you have a new box ready to hold your toys!`,
    eli10: `Like right-clicking on your desktop and choosing "New Folder".
\`mkdir notes\` creates a new folder named notes.`,
    eli15: `\`mkdir\` (Make Directory) creates one or more new directories.
- Default: \`mkdir dir_name\` creates a directory in the cwd.
- Nested paths: \`mkdir -p a/b/c\` creates all missing parent directories without throwing errors if they already exist (essential for idempotent scripts).`,
    eli20: `Invokes the \`mkdir(2)\` syscall.
When a directory is created, its hard link count is initialized to 2 (one for its name in the parent directory, and one for the internal \`.\` entry).
Each new subdirectory created inside increments the parent directory's link count by 1 (due to the child's \`..\` entry).`,
    eliphd: `VFS calls \`vfs_mkdir\`, which locks the parent directory inode.
The underlying filesystem driver assigns an inode, formats the directory data block with default \`.\` and \`..\` entries pointing to self and parent inode numbers, and sets directory permissions according to the process \`umask\` (\`mode & ~umask\`).
Concurrency: concurrent \`mkdir\` calls without \`-p\` fail with \`EEXIST\`, making \`mkdir\` a reliable lock primitive in shell scripts.`,
  },

  'f3-mv': {
    eli5: `You slide a toy box across the room into a new corner, or cross out the name on the box and write a new name on top!`,
    eli10: `Moving a file from one folder to another, or renaming it.
\`mv old.txt new.txt\` renames it. \`mv file.txt notes/\` moves it into the notes folder.`,
    eli15: `\`mv\` moves or renames files and directories.
- Renaming: \`mv source target\` changes the filename.
- Moving: \`mv file1 file2 dir/\` moves files into the destination directory.
- Caution: by default, \`mv\` overwrites existing target files silently. Use \`-i\` for interactive prompt or \`-n\` for no-clobber.`,
    eli20: `Invokes the \`renameat2(2)\` syscall.
If source and destination reside on the SAME filesystem, \`mv\` is an atomic metadata operation: only directory entries and inode pointers change; file data blocks are never copied.
If crossing filesystem boundaries (different mount points), \`mv\` copies data bytes to the target, sets permissions, and unlinks the original.`,
    eliphd: `Within a single filesystem, \`renameat2\` guarantees atomic file replacement: readers opening the file descriptor will see either the old file or the new file, never a partial state.
Linux supports atomic exchange flags: \`RENAME_EXCHANGE\` swaps two files atomically without temporary files, and \`RENAME_NOREPLACE\` guarantees failure if destination exists without TOCTOU race conditions.`,
  },

  'f4-cp-rm': {
    eli5: `Making a photocopy of a drawing so you have two identical sheets, and throwing an old crumpled drawing into the trash can.`,
    eli10: `\`cp\` makes an exact duplicate of a file. \`rm\` deletes a file permanently.
There is no Recycle Bin in the terminal, so deleted files are gone!`,
    eli15: `\`cp\` copies files and directories; \`rm\` removes them.
- Copying directories requires recursive flag: \`cp -r src/ dst/\`.
- Deleting directories requires recursive flag: \`rm -r dir/\`.
- Force flag: \`rm -f\` suppresses prompts and ignores non-existent files.
- Permanent deletion: shell deletion bypasses desktop trash bins.`,
    eli20: `\`rm\` invokes the \`unlink(2)\` syscall, decrementing the inode's hard link counter.
Data blocks are ONLY freed by the kernel when the hard link count reaches 0 AND all processes that have open file descriptors to that inode have closed them.
If a running process holds an open fd to a deleted file, disk space remains allocated until that process terminates (diagnosed via \`lsof +L1\`).`,
    eliphd: `Modern filesystems (Btrfs, XFS, ZFS) support \`reflink\` copy-on-write cloning: \`cp --reflink=always\` creates a new inode sharing identical extents, consuming zero additional disk space until modified.
\`cp\` optimizes userspace buffers via \`copy_file_range(2)\` to perform in-kernel page transfers without round-tripping through userspace memory buffers.`,
  },

  't1-cat': {
    eli5: `You open a storybook and read every single word out loud from page one to the end without stopping!`,
    eli10: `Opens a text file and prints everything inside it right onto your terminal screen.`,
    eli15: `\`cat\` (concatenate) reads files sequentially and writes their content to stdout.
- Single file: \`cat file.txt\` displays its content.
- Multiple files: \`cat a.txt b.txt\` merges them in order.
- Flags: \`-n\` numbers lines, \`-A\` shows non-printing characters and line endings.
- Beginner trap: do not use \`cat file | grep text\`; use \`grep text file\` directly.`,
    eli20: `Allocates userspace I/O buffers (typically 64 KiB or 128 KiB aligned to page size) and loops \`read(2)\` and \`write(2)\` syscalls until EOF.
"Useless Use of Cat" (UUOC) antipattern introduces unnecessary subprocess forks, context switches, and pipe buffer overhead. Pass filenames directly as command arguments or use shell redirection \`< file\`.`,
    eliphd: `Page cache behavior: streaming large multi-gigabyte files through \`cat\` evicts active working sets from the Linux page cache.
High-performance utilities employ \`posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL | POSIX_FADV_DONTNEED)\` to advise the kernel readahead engine and discard cached pages immediately after transmission.
When writing to pipes, zero-copy \`splice(2)\` transfers pages directly between page cache and pipe buffers without CPU memory copying.`,
  },

  't2-redirect': {
    eli5: `You take a clean eraser, wipe your chalkboard completely clean, and write your brand new drawing on it.`,
    eli10: `Instead of printing text to the screen, \`>\` saves that text inside a file, replacing whatever was in that file before.`,
    eli15: `\`>\` redirects standard output (stdout, fd 1) to a file.
- Overwrite behavior: if the target file exists, its contents are wiped and replaced.
- If the file does not exist, it is created.
- Command stdout is captured; stderr (errors) still prints to the terminal unless redirected.`,
    eli20: `The shell opens the file with \`open(path, O_WRONLY | O_CREAT | O_TRUNC, 0666)\` BEFORE executing the command.
Catastrophic trap: \`cat file.txt | tr a-z A-Z > file.txt\` truncates \`file.txt\` to 0 bytes before \`cat\` even reads the first byte!
Protection: enable \`set -o noclobber\` (or \`set -C\`) to prevent accidental overwriting with \`>\` (override with \`>|\`).`,
    eliphd: `Redirection occurs in the forked child process before \`execve\`.
The shell calls \`open(2)\`, returns a new file descriptor (e.g. fd 3), duplicates it over fd 1 via \`dup2(3, 1)\`, and closes fd 3.
The inode truncation (\`O_TRUNC\`) commits immediately to filesystem journal metadata. Concurrent readers holding open fds will see file length drop to zero in memory mappings.`,
  },

  't3-append': {
    eli5: `You have a notebook page with notes on it. Instead of erasing anything, you write your new sentence on the very next empty line!`,
    eli10: `\`>>\` adds new lines to the bottom of a file without deleting what was already there. Great for keeping logs.`,
    eli15: `\`>>\` redirects standard output to a file in append mode.
- Preserves existing content: new data is written at the end of the file.
- If the file does not exist, it is created empty first.
- Ideal for appending logs, history, and multi-step pipeline results.`,
    eli20: `Opens the target file with \`open(path, O_WRONLY | O_CREAT | O_APPEND, 0666)\`.
Crucial concurrency guarantee: \`O_APPEND\` enforces atomic seeking to the end of the file inside the kernel for every \`write(2)\` call.
Multiple processes writing to the same log file with \`O_APPEND\` will never overwrite each other's data, provided individual write buffers do not exceed filesystem atomic payload boundaries.`,
    eliphd: `In the kernel VFS layer, \`O_APPEND\` ensures the file offset pointer (\`f_pos\`) is updated under the inode mutex lock (\`inode_lock(inode)\`) directly before extents are allocated.
Even if a concurrent writer extends the file size between writes, the append offset is recalculated atomically inside the kernel, preventing interleaved byte corruption.`,
  },

  't4-wc': {
    eli5: `Counting your building blocks one by one to see how tall your tower is!`,
    eli10: `Like the word count tool in Google Docs: it counts how many lines, words, and characters are in your text file.`,
    eli15: `\`wc\` (Word Count) counts lines, words, and byte/character counts.
- \`wc -l\`: counts newline characters (\`\\n\`).
- \`wc -w\`: counts whitespace-delimited words.
- \`wc -c\`: counts raw bytes.
- \`wc -m\`: counts UTF-8 characters.`,
    eli20: `POSIX definition caveat: \`wc -l\` strictly counts NEWLINE characters (\`\\n\`), NOT lines of text!
If a file has text on the last line without a trailing newline, \`wc -l\` will undercount by 1.
In pipeline data validation, combine with \`awk\` or shell tests if files may lack POSIX trailing newlines.`,
    eliphd: `GNU coreutils \`wc\` utilizes AVX-512 / AVX2 SIMD vector instructions to scan 64 bytes per CPU cycle for newline byte values (\`0x0A\`), achieving memory-bandwidth-saturated throughput (>10 GB/s on modern NVMe/RAM).
Multibyte character counting (\`wc -m\`) incurs significant CPU decoding overhead due to UTF-8 variable-length state validation compared to raw byte counting (\`wc -c\`).`,
  },

  't5-sort': {
    eli5: `Sorting alphabet cards from A to Z so everything is in perfect order!`,
    eli10: `Like sorting a column in Excel alphabetically or from smallest to largest number.`,
    eli15: `\`sort\` sorts lines of text files or standard input.
- Default: alphanumeric sorting.
- \`-n\`: numeric sorting (\`2\` comes before \`10\`).
- \`-r\`: reverse order.
- \`-u\`: unique (removes duplicate lines).
- \`-k N\`: sort by specific field/column N.`,
    eli20: `Locale collation pitfall: standard \`sort\` behavior depends on \`LC_COLLATE\`.
In UTF-8 locales (e.g. \`en_US.UTF-8\`), case and punctuation may be folded or ignored, yielding unexpected ordering in scripts.
Production rule: always set \`LC_ALL=C sort\` in automation for deterministic, high-speed ASCII byte-value sorting.`,
    eliphd: `When sorting inputs larger than available memory (\`-S / --buffer-size\`), \`sort\` performs an external polyphase merge sort.
It divides data into chunks, sorts each in RAM, writes temporary sorted spill files to \`/tmp\`, and merges them using a k-way tournament tree.
Deterministic sorting is foundational in reproducible builds, cryptographic hash verification, and diff pipelines.`,
  },

  's1-pipe': {
    eli5: `A water slide connecting two workers: the first worker makes a paper boat and slides it down the tube directly into the second worker's hands!`,
    eli10: `The vertical bar \`|\` takes the output of the first command and feeds it straight into the input of the second command without creating temporary files.`,
    eli15: `The pipeline operator \`|\` connects stdout (fd 1) of the command on the left to stdin (fd 0) of the command on the right.
- Commands run concurrently in parallel.
- Data streams in memory without writing to disk.
- Pipeline exit code: by default, only the exit code of the LAST command in the pipe is returned (enable \`set -o pipefail\` to catch upstream errors).`,
    eli20: `Created via the \`pipe(2)\` system call, returning two file descriptors: \`fd[0]\` (read end) and \`fd[1]\` (write end).
The shell forks both child processes, uses \`dup2\` to redirect stdout and stdin, and closes unused pipe ends.
Backpressure: if the reader is slow, the writer blocks when the kernel pipe buffer is full. If the reader closes its read end, the writer receives \`SIGPIPE\` (signal 13).`,
    eliphd: `In the Linux kernel (\`fs/pipe.c\`), a pipe is an unseekable circular ring buffer allocated in page chunks (default 16 pages = 64 KiB, configurable up to \`/proc/sys/fs/pipe-max-size\` via \`fcntl(F_SETPIPE_SZ)\`).
Writes up to \`PIPE_BUF\` (4096 bytes on Linux) are guaranteed atomic; writes exceeding this may interleave if multiple writers exist.
Zero-copy I/O: high-performance stream tools avoid userspace memory copies using \`splice(2)\` and \`vmsplice(2)\` to transfer page references directly between page cache and pipe buffers.`,
  },

  's2-grep': {
    eli5: `A detective's magnifying glass that only glows when it spots the exact secret word or letter you are searching for!`,
    eli10: `Like pressing Ctrl+F in a web browser, but instead of highlighting words, it prints only the lines that match your search.`,
    eli15: `\`grep\` (Global Regular Expression Print) searches text for matching patterns.
- Exit codes: \`0\` = match found, \`1\` = no match, \`2\` = error.
- Common flags:
  - \`-i\`: case-insensitive.
  - \`-v\`: invert match (print lines that DO NOT match).
  - \`-c\`: print count of matching lines.
  - \`-E\`: extended regular expressions (ERE).`,
    eli20: `Pipeline buffering trap: when \`grep\` writes to a pipe instead of a terminal, glibc switches from line-buffering to 4 KiB block-buffering.
In live log monitoring (\`tail -f log | grep error | awk ...\`), output appears frozen until 4096 bytes accumulate.
Fix: pass \`--line-buffered\` to force immediate line flushing across pipeline stages.`,
    eliphd: `GNU grep performance stems from hybrid search algorithms: Boyer-Moore and Commentz-Walter for fixed string literals, and deterministic finite automata (DFA) combined with GNU regex backends.
It avoids reading text byte-by-byte; instead, it scans raw buffers with SIMD instructions (AVX-512 \`_mm512_cmpeq_epi8\`) for newline boundaries and literal match candidates, achieving multiple gigabytes per second scan rates.`,
  },

  's3-stderr': {
    eli5: `Two megaphones: a green megaphone for normal stories, and a red megaphone for emergency sirens.
Even if you send the green megaphone's voice into a box, the red siren can still shout to you!`,
    eli10: `Computers separate regular data from error warnings.
Normal data goes to stdout (screen); errors go to stderr. That way, errors don't corrupt your clean data files.`,
    eli15: `Standard file descriptors:
- **0**: \`stdin\` (standard input)
- **1**: \`stdout\` (standard output)
- **2**: \`stderr\` (standard error)
Redirections:
- \`2> err.txt\`: redirects errors to a file.
- \`> out.txt 2>&1\`: merges stderr into stdout.
- \`&> file.txt\` or \`|&\`: modern bash shorthand for redirecting both streams.`,
    eli20: `Order of redirection evaluation is strictly left-to-right!
- \`cmd > file 2>&1\`: stdout points to file; then fd 2 is duplicated from fd 1 (both write to file). Correct!
- \`cmd 2>&1 > file\`: fd 2 duplicates current stdout (terminal); then fd 1 points to file (errors still print to terminal!). Bug!
In cron and background services, always redirect both: \`cron_cmd > /var/log/cron.log 2>&1\`.`,
    eliphd: `File descriptors are indices into the process kernel file descriptor table (\`current->files->fdt\`).
\`2>&1\` invokes \`dup2(1, 2)\`, making descriptor 2 point to the exact same underlying \`struct file\` description as descriptor 1, sharing file offset pointers and status flags.
Terminal emulators: stderr is typically unbuffered (\`_IONBF\`) by glibc to ensure panic and crash diagnostics reach disk or display before process abort.`,
  },

  's4-chain': {
    eli5: `An assembly line of toy helpers: the first worker finds the blue blocks, the second worker stacks them in order, and the third worker counts them!`,
    eli10: `Stringing multiple tools together into an automated pipeline: filter data, sort it, remove duplicates, and count the final total.`,
    eli15: `Chaining multiple commands with pipes: \`cmd1 | cmd2 | cmd3 > output.txt\`.
- Each pipe connects one command's stdout to the next command's stdin.
- The pipeline processes streams incrementally; data flows as soon as the first command produces bytes.`,
    eli20: `Subshell variable scope trap in pipelines:
In Bash, every stage of a pipeline executes in a separate forked subshell.
Variables modified inside a pipeline do NOT persist in the parent shell:
\`total=0; cat nums.txt | while read n; do ((total+=n)); done; echo $total\` prints \`0\`!
Fix: use process substitution \`while read n; do ...; done < <(cat nums.txt)\` or Bash 4.2+ \`shopt -s lastpipe\`.`,
    eliphd: `Job control and process groups:
The shell assigns all processes in a pipeline to a single new process group ID (PGRP), designating it as the foreground process group via \`tcsetpgrp(3)\`.
Signal handling: sending \`Ctrl+C\` (\`SIGINT\`) delivers the signal to the entire process group simultaneously.
If any upstream process crashes with non-zero exit, only \`set -o pipefail\` guarantees the pipeline exit status captures the failure rather than masking it.`,
  },

  'q1-glob': {
    eli5: `A wild card in a card game that can transform into any card in your hand!
\`*.txt\` matches every single toy or note whose name ends with \`.txt\`.`,
    eli10: `Using asterisks to find files by pattern.
\`*.txt\` matches all text files. \`data/*\` matches everything inside the data folder.`,
    eli15: `Pathname expansion (globbing) matches filenames using wildcards:
- \`*\`: matches zero or more characters.
- \`?\`: matches exactly one character.
- \`[abc]\`: matches any single character in the set.
- \`[!abc]\`: matches any character NOT in the set.
Crucial rule: the SHELL expands globs before the command runs! The command receives the resulting list of matching filenames as separate arguments.`,
    eli20: `If no files match a glob, standard POSIX behavior is to pass the literal pattern string (e.g. \`*.xyz\`) to the command!
This causes confusing bugs in scripts.
Bash options:
- \`shopt -s nullglob\`: expands unmatched globs to nothing (empty list).
- \`shopt -s failglob\`: throws a syntax error if no match is found.`,
    eliphd: `Glob expansion invokes \`opendir\`, \`readdir\`, and the POSIX \`fnmatch(3)\` pattern matcher against filesystem directory dentries.
Security vulnerability: if an attacker creates a file named \`-rf\` in a directory, an unquoted \`rm *\` expands to \`rm -rf ...\`, where the filename is parsed as command-line flags!
Mitigation: prefix globs with \`--\` (e.g. \`rm -- *\`) or path anchors (\`rm ./*\`).`,
  },

  'q2-quotes': {
    eli5: `Quotation marks are magic glue that holds words together so the computer doesn't break them into little pieces!`,
    eli10: `Single quotes freeze words completely (what you see is what you get).
Double quotes let variables like \`$NAME\` expand into their values while keeping spaces together.`,
    eli15: `Shell quoting rules:
- **Single quotes (\`\'...\'\`)**: preserve the literal value of every character inside. No expansions occur. You cannot include a single quote inside single quotes.
- **Double quotes (\`\"...\"\`)**: preserve literal spaces and tabs, but permit parameter expansion (\`$VAR\`), command substitution (\`$(cmd)\`), and arithmetic (\`$((...))\`).
- **Unquoted**: spaces split words, wildcards trigger globbing.`,
    eli20: `The Golden Rule of Bash: **ALWAYS double-quote your variables** (\`"$VAR"\`).
When a variable contains spaces or newlines (e.g. \`FILE="my cool doc.txt"\`), unquoted \`rm $FILE\` executes \`rm my cool doc.txt\` (deleting three non-existent files!).
Quoting \`rm "$FILE"\` passes the entire filename as one single argument.`,
    eliphd: `Shell grammar IEEE Std 1003.1 section 2.6 dictates evaluation passes:
1. Parameter Expansion
2. Command Substitution
3. Arithmetic Expansion
4. Word Splitting (governed by \`$IFS\`)
5. Pathname Expansion (globbing)
Double quotes disable Word Splitting and Pathname Expansion while keeping passes 1-3 active.
ANSI-C quoting (\`$'\\n\\t'\`) allows C-style escape sequences; locale translation strings use \`$"..."\`.`,
  },

  'q3-cmdsub': {
    eli5: `Whispering a question into a walkie-talkie, and writing the answer directly into your homework sentence!`,
    eli10: `Running a command inside another command and using its answer right away, like \`echo "Today is $(date)"\`.`,
    eli15: `Command substitution runs a command in a subshell and replaces the syntax with its standard output:
- Modern syntax: \`$(command)\` (nestable and clean).
- Legacy syntax: \`\`\`command\`\`\` (backticks, difficult to nest).
- Trailing newlines are automatically stripped by the shell.`,
    eli20: `Command substitution buffers the entire output in shell memory before executing the outer command.
Never stream massive multi-gigabyte files into \`$(cat huge.log)\`; use process substitution \`< <(cmd)\` or pipes instead.
Workaround for trailing newline preservation: \`result=$(cmd; echo x); result=\${result%x}\`.`,
    eliphd: `Under the hood, \`$()\` forks a child process and establishes a unidirectional pipe.
The subshell inherits environment variables under copy-on-write page table semantics and executes the command while the parent shell reads from the pipe into a dynamically resized buffer until EOF.
The parent calls \`waitpid(2)\` to reap the subshell and capture its exit status in \`$?\`.`,
  },

  'c1-exit': {
    eli5: `A green thumbs-up (0) or a red thumbs-down (not 0) report card after finishing a game!`,
    eli10: `When a computer program finishes, it returns a score number.
0 means everything worked perfectly. Any number other than 0 means something went wrong.`,
    eli15: `Every executed command exits with an exit status code between 0 and 255.
- \`0\`: success.
- \`1-255\`: failure / error codes.
- \`$?\`: special variable containing the exit status of the most recently executed foreground command.
- Control operators:
  - \`cmd1 && cmd2\`: run cmd2 only if cmd1 succeeds (exit 0).
  - \`cmd1 || cmd2\`: run cmd2 only if cmd1 fails (exit != 0).`,
    eli20: `POSIX exit codes are masked to 8 bits (\`exit_code & 0xFF\`).
Standard exit conventions:
- \`126\`: command found but not executable (permission denied).
- \`127\`: command not found.
- \`128 + N\`: fatal error signal N (e.g. exit 130 = killed by SIGINT/Ctrl+C [128 + 2]; exit 137 = killed by SIGKILL [128 + 9]).
- Defensive scripting: use \`set -e\` to terminate on non-zero exits, but be aware of subshell and \`if\` condition masking.`,
    eliphd: `When a process terminates via \`exit_group(2)\`, the kernel stores the exit reason in the process task struct \`exit_code\`.
Parent processes retrieve this value using the \`waitpid(2)\` system call family and decode it using macros:
\`WIFEXITED(status)\` checks normal termination; \`WEXITSTATUS(status)\` extracts bits 8-15; \`WIFSIGNALED(status)\` detects signal termination.
Zombies: terminated processes whose parent has not called \`waitpid\` retain their PID in kernel memory until reaped.`,
  },

  'c2-test': {
    eli5: `Asking a yes-or-no question before opening a door: "Is the toy inside the box?"`,
    eli10: `Testing if a file exists or if a text is empty before taking action in a script.`,
    eli15: `\`test\` and \`[\` evaluate conditions and return exit code 0 (true) or 1 (false).
- File tests: \`-f file\` (regular file exists), \`-d dir\` (directory exists), \`-e path\` (path exists).
- String tests: \`-z "$str"\` (string is empty), \`-n "$str"\` (string is non-empty), \`"$a" = "$b"\` (equality).
- Integer tests: \`-eq\`, \`-ne\`, \`-lt\`, \`-gt\`, \`-le\`, \`-ge\`.
- \`[\` requires a closing \`]\` as its final argument.`,
    eli20: `\`[\` is an actual command (and shell builtin), NOT special syntax!
Every argument inside \`[ ... ]\` undergoes word splitting.
If a variable is unquoted: \`[ $VAR = "foo" ]\` breaks with \`[: too many arguments\` if \`$VAR\` has spaces, or \`[: =: unary operator expected\` if \`$VAR\` is empty!
Always quote arguments: \`[ "$VAR" = "foo" ]\`.`,
    eliphd: `POSIX IEEE Std 1003.1 specifies algorithmic evaluation rules for \`test\` based strictly on argument count (0 to 4 arguments) to eliminate grammatical ambiguity in early Unix shells.
For modern Bash scripts, the keyword \`[[ ... ]]\` supersedes \`[\` because it parses expressions as an integrated AST, eliminating argument splitting errors and supporting regex matching (\`=~\`).`,
  },

  'c3-for': {
    eli5: `Doing the exact same dance move for every single toy in your toy box, one by one, until the box is empty!`,
    eli10: `A loop that repeats commands for every item in a list or every file in a folder.`,
    eli15: `The \`for\` loop iterates over a list of words or file patterns:
\`\`\`bash
for item in apple banana orange; do
  echo "Fruit: $item"
done
\`\`\`
Iterating over files:
\`\`\`bash
for f in *.txt; do
  echo "Processing: $f"
done
\`\`\``,
    eli20: `Safe iteration in production:
Always iterate over globs directly: \`for f in *.txt; do ...; done\`.
NEVER iterate over command substitution: \`for f in $(ls *.txt)\` splits filenames with spaces into separate iterations and breaks!
C-style arithmetic loops: \`for ((i=0; i<10; i++)); do echo "$i"; done\`.`,
    eliphd: `The shell parses the word list into an AST node before execution.
If a glob matches zero files, standard POSIX behavior expands to the unexpanded string literal \`*.txt\`.
To handle empty directories safely in production, enable \`shopt -s nullglob\` so the loop receives zero iterations rather than failing on a non-existent literal filename.`,
  },

  'c4-arith': {
    eli5: `A pocket calculator that adds, subtracts, and multiplies your numbers instantly!`,
    eli10: `Doing math in your computer scripts, like \`$(( 5 + 3 ))\` giving \`8\`.`,
    eli15: `Arithmetic expansion \`$(( expression ))\` evaluates mathematical calculations:
- Operators: \`+\`, \`-\`, \`*\`, \`/\`, \`%\` (modulo), \`**\` (exponentiation).
- Increment/decrement: \`$(( i++ ))\`, \`$(( ++i ))\`.
- Assignment inside: \`$(( count += 5 ))\`.
- Variables do not require the \`$\` prefix inside: \`$(( a + b ))\`.`,
    eli20: `Evaluates 64-bit signed integer arithmetic (equivalent to C \`int64_t\`).
Division by zero aborts the script with a fatal error.
OCTAL TRAP: numbers with a leading zero are interpreted as octal (base 8)!
\`$(( 08 + 1 ))\` throws a syntax error because \`8\` is invalid in octal!
Fix: force decimal base when parsing zero-padded inputs (like dates): \`$(( 10#$var ))\`.`,
    eliphd: `Shell arithmetic is handled by an internal recursive-descent expression evaluator in the Bash source (\`expr.c\`).
POSIX shells do not support native floating-point math; scripts requiring floating-point calculations must spawn external engines like \`bc\`, \`awk\`, or \`python3\`.
Arithmetic expansion occurs in-process with zero syscall or fork overhead.`,
  },

  'c5-bracket': {
    eli5: `A super-smart magic shield that tests your questions and never gets tricked by tricky spaces!`,
    eli10: `An upgraded condition check that doesn't crash when text contains spaces, and can match wildcards and patterns.`,
    eli15: `\`[[ ... ]]\` is a Bash compound command keyword for advanced conditional testing:
- Eliminates quoting errors: \`[[ $VAR == "foo" ]]\` works safely even if \`$VAR\` is empty or contains spaces.
- Logical operators: \`&&\` (AND), \`||\` (OR), \`!\` (NOT) natively supported inside.
- Pattern matching: \`[[ $file == *.txt ]]\`.
- Regex matching: \`[[ $email =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$ ]]\`.`,
    eli20: `Regex matching trap in Bash:
When using the regex match operator \`=~\`, NEVER quote the regular expression on the right-hand side!
- \`[[ $val =~ ^[0-9]+$ ]]\`: regex evaluation. Correct!
- \`[[ $val =~ "^[0-9]+$" ]]\`: treated as a literal string match for the characters \`^\` and \`$\`! Bug!
Regex capture groups are automatically populated into the \`BASH_REMATCH\` array (\`\${BASH_REMATCH[1]}\`).`,
    eliphd: `Because \`[[\` is a shell grammar keyword rather than a standard builtin command, the Bash lexer enters a specialized conditional parsing state.
It disables word splitting and pathname expansion on operands, evaluating expressions directly into an internal condition tree.
Regex execution compiles via the host glibc POSIX regex library (\`regcomp\`, \`regexec\`). Non-portable: supported in Bash, Zsh, and Ksh, but absent in pure POSIX shells (like Debian's \`/bin/sh\` dash).`,
  },

  'c6-fn': {
    eli5: `Teaching your robot a brand new trick and giving it a name. Whenever you shout that name, the robot does all the steps in order!`,
    eli10: `Creating your own custom command by bundling several commands together inside curly brackets.`,
    eli15: `Functions encapsulate reusable blocks of shell code:
\`\`\`bash
greet() {
  local name="$1"
  echo "Hello, $name!"
}
greet "Alice"
\`\`\`
- Parameters: \`$1\`, \`$2\`, etc.
- Number of arguments: \`$#\`.
- All arguments: \`"$@"\`.
- Return status: \`return 0\` (success) or \`return 1\` (error).`,
    eli20: `Variable scoping trap:
Variables assigned inside functions are GLOBAL by default!
They will silently overwrite parent variables unless explicitly declared as \`local\`:
\`local var="value"\`.
Return value limitation: \`return\` can ONLY return an integer status code (0-255). To return data/strings, write to stdout (\`echo "$result"\`) and capture it with command substitution \`$(fn)\`.`,
    eliphd: `Functions execute in the execution context of the calling shell process, sharing file descriptor tables, trap vectors, and process ID.
Call stack introspection is exposed via \`FUNCNAME\` (array of function names), \`BASH_SOURCE\`, and \`BASH_LINENO\`.
Error traps: by default, \`trap ... ERR\` is NOT inherited inside functions unless \`set -o errtrace\` (\`set -E\`) is configured.`,
  },

  'c7-procsub': {
    eli5: `Pretending that a live stream of talk is a real printed book, so another helper can read from it like a file!`,
    eli10: `Feeding the live output of a command to tools that usually require file names on your hard drive (like \`diff\`).`,
    eli15: `Process substitution runs a command asynchronously and passes its output as a file path:
- Syntax: \`<(command)\` or \`>(command)\`.
- Example: \`diff <(sort file1.txt) <(sort file2.txt)\`.
- Avoids creating temporary files on disk.`,
    eli20: `Solving the pipeline subshell variable loss bug:
Instead of \`cat data.txt | while read line; do ...; done\` (which loses variables), use process substitution:
\`\`\`bash
while read -r line; do
  ((count++))
done < <(grep "pattern" data.txt)
echo "Count: $count" # Count is preserved!
\`\`\``,
    eliphd: `Implemented via anonymous named pipes (FIFOs) or Linux \`/dev/fd/N\` file descriptors.
The shell creates an asynchronous child process connected to a pipe, formats the pseudo-path (e.g. \`/dev/fd/63\`), and passes that path as an argument to the target command.
Limitation: commands that require random access seeks (\`lseek(2)\`) will fail because pipes are non-seekable sequential streams.`,
  },

  'c8-case': {
    eli5: `Sorting mail into different cubby holes depending on what picture is stamped on the envelope!`,
    eli10: `A neat menu that matches options like "start", "stop", "restart", or "help" without writing dozens of if-statements.`,
    eli15: `The \`case\` statement matches a string against glob patterns:
\`\`\`bash
case "$action" in
  start) echo "Starting..." ;;
  stop) echo "Stopping..." ;;
  status|info) echo "Checking..." ;;
  *) echo "Unknown action" ;;
esac
\`\`\`
- \`;;\`: terminates the clause.
- \`*\`: default fallback pattern.`,
    eli20: `Significantly faster and more readable than deeply nested \`if-elif-else\` chains when testing command-line arguments.
Supports pattern lists with pipe \`|\`: \`yes|y|YES|Y)\`.
Bash extensions:
- \`;&\`: executes the next clause unconditionally (fall-through).
- \`;;&\`: tests the next clause's pattern against the value.`,
    eliphd: `Parsed into a specialized pattern matching jump table in the Bash AST.
Pattern matching uses the shell globbing engine (\`fnmatch\`), supporting character classes (\`[[:alpha:]]\`) and extglobs (\`@(a|b)\`).
Defensive practice in CLI tool entrypoints: always anchor with an explicit \`*)\` branch that emits a usage error and exits non-zero (\`exit 2\`).`,
  },

  'c9-brace': {
    eli5: `A magic multiplier word that expands \`{apple,banana}\` into both an apple and a banana at the exact same time!`,
    eli10: `A shortcut to generate lists without typing them all out, like creating \`photo1.jpg\` through \`photo10.jpg\` with \`photo{1..10}.jpg\`.`,
    eli15: `Brace expansion generates arbitrary string lists:
- Comma lists: \`echo {a,b,c}.txt\` -> \`a.txt b.txt c.txt\`.
- Range lists: \`echo {1..5}\` -> \`1 2 3 4 5\`.
- Zero-padded ranges: \`echo {01..05}\` -> \`01 02 03 04 05\`.
- Common idiom for backups: \`cp config.json{,.bak}\` expands to \`cp config.json config.json.bak\`.`,
    eli20: `Crucial difference from globbing:
Brace expansion is pure text generation. It does NOT check whether files exist on the filesystem!
Evaluation order: brace expansion happens BEFORE variable expansion.
Therefore, \`{1..$N}\` does NOT work in standard Bash (it prints literal \`{1..5}\`)!
Use \`seq 1 "$N"\` or C-style \`for ((i=1; i<=N; i++))\` when bounds are dynamic.`,
    eliphd: `Cartesian product expansion: nesting braces multiplies combinations:
\`echo {A,B}{1,2}\` expands to \`A1 A2 B1 B2\`.
Memory warning: large ranges like \`{1..10000000}\` expand entirely in shell memory before execution, triggering multi-gigabyte memory allocations and potential OOM kernel termination.`,
  },

  'c10-read': {
    eli5: `Sitting quietly with your ears open, waiting for someone to whisper a sentence to you, then remembering it!`,
    eli10: `Asking the user to type an answer and storing what they typed inside a variable.`,
    eli15: `\`read\` reads a single line from standard input:
\`\`\`bash
read -r name
echo "Hello, $name"
\`\`\`
- \`-r\`: raw mode (prevents backslashes from escaping characters).
- \`-p "Prompt: "\`: displays a prompt message before reading.
- \`-s\`: silent mode (hides input for passwords/secrets).`,
    eli20: `The Universal Rule of Reading Files in Bash:
\`\`\`bash
while IFS= read -r line; do
  echo "Line: $line"
done < file.txt
\`\`\`
Why \`IFS=\`? By default, \`read\` trims leading and trailing whitespace. Setting \`IFS=\` disables trimming.
Why \`-r\`? Without \`-r\`, backslashes in file paths (like Windows paths \`C:\\Users\`) are stripped or treated as escape sequences!`,
    eliphd: `Interacts with the terminal line discipline in the Linux tty driver:
By default, the tty runs in canonical mode (cooked mode), buffering input until the user presses Enter (\`\\n\`).
When reading single keystrokes (\`read -n 1 -s\`), Bash puts the tty into non-canonical raw mode via \`tcgetattr\` and \`tcsetattr\` with \`c_cc[VMIN]=1\` and \`c_cc[VTIME]=0\`, then restores original settings upon return.`,
  },

  'c11-jobs': {
    eli5: `Starting your electric toy train so it circles the tracks on the floor, while you sit at your desk drawing pictures!`,
    eli10: `Running a slow task in the background so you can keep typing without waiting for it to finish.`,
    eli15: `Job control manages background and foreground tasks:
- \`&\`: append to a command to run it in the background (\`sleep 10 &\`).
- \`$!\`: stores the Process ID (PID) of the most recently launched background job.
- \`jobs\`: lists active background jobs.
- \`fg %1\`: brings job 1 back to the foreground.
- \`wait\`: waits for background jobs to finish.`,
    eli20: `Parallel task orchestration:
\`\`\`bash
task1 & pid1=$!
task2 & pid2=$!
wait "$pid1" "$pid2"
echo "All tasks finished"
\`\`\`
Terminal I/O trap: background jobs that attempt to read from stdin are suspended by the kernel with signal \`SIGTTIN\`.
To prevent background jobs from terminating on shell logout, use \`nohup\` or \`disown\`.`,
    eliphd: `Operating system job control requires dedicated process sessions (\`setsid(2)\`) and process groups (\`setpgid(2)\`).
The controlling terminal driver routes keyboard signals (\`Ctrl+C\` -> \`SIGINT\`, \`Ctrl+Z\` -> \`SIGTSTP\`) strictly to the foreground process group.
When background jobs finish, the kernel sends \`SIGCHLD\` to the parent shell, which invokes \`waitpid(WNOHANG)\` in its signal handler to prevent zombie process accumulation.`,
  },

  'c12-arrays': {
    eli5: `A tackle box with numbered slots: slot 0 holds your red car, slot 1 holds your blue car, and slot 2 holds your yellow car!`,
    eli10: `A numbered list of items stored inside one variable name, like \`items[0]\`, \`items[1]\`, \`items[2]\`.`,
    eli15: `Indexed arrays store ordered lists of values:
- Creation: \`fruits=("apple" "banana" "cherry")\`.
- Access by index: \`echo "\${fruits[0]}"\`.
- All elements: \`echo "\${fruits[@]}"\`.
- Array length: \`echo "\${#fruits[@]}"\`.
- Appending: \`fruits+=("orange")\`.`,
    eli20: `The vital distinction between \`"\${arr[@]}"\` and \`"\${arr[*]}"\`:
- \`"\${arr[@]}"\`: expands each element as a distinct, separate quoted word (preserves elements with spaces). Essential!
- \`"\${arr[*]}"\`: joins all elements into a single scalar string separated by the first character of \`$IFS\`.
Associative arrays (hash maps / dictionaries):
\`\`\`bash
declare -A user
user["name"]="Ada"
user["role"]="Admin"
\`\`\``,
    eliphd: `In the Bash C source (\`array.c\`), indexed arrays are implemented as doubly linked lists of bucket structures, allowing sparse indexing (\`arr[1000]="x"\` consumes minimal memory).
Associative arrays (\`assoc.c\`) utilize internal hash tables with bucket chaining for collision resolution.
Array passing: Bash functions cannot receive array variables directly by value; pass by reference using nameref attributes: \`declare -n ref="$1"\`.`,
  },

  'x1-report': {
    eli5: `Gathering your toys, putting them neatly into your backpack, and zipping it up so you're ready for show-and-tell!`,
    eli10: `Writing a multi-step script that collects computer info and saves it into a clean summary report file.`,
    eli15: `Putting basics into practice: combining commands and output redirection to build a consolidated report file on disk.`,
    eli20: `Idempotent report generation:
Ensure automated reporting jobs can run repeatedly without corrupting data.
Atomic file writes in production: write report to a temporary file first, then atomically swap:
\`generate_report > report.tmp && mv report.tmp report.txt\`.`,
    eliphd: `High-reliability telemetry: scripts gathering node diagnostics must handle filesystem full (\`ENOSPC\`), permission denials (\`EACCES\`), and partial write failures.
File locking using \`flock(1)\` prevents concurrent report writers from interleaving byte streams into shared log destinations.`,
  },

  'x2-pipeline-report': {
    eli5: `Pouring sand through a strainer so all the shiny gems slide into your treasure chest!`,
    eli10: `Filtering and sorting text through a pipeline, then saving the clean filtered results to a file.`,
    eli15: `Combining filtering (\`grep\`), sorting (\`sort\`), and redirection (\`>\`) into an end-to-end processing pipeline.`,
    eli20: `Stream processing pipeline design:
Connecting commands via pipes streams data incrementally, using minimal memory even on massive input files.
Always specify \`set -o pipefail\` so failures in upstream filters are not masked by downstream writes.`,
    eliphd: `Pipeline throughput optimization:
Balancing CPU-bound filters with I/O-bound disk writers.
Kernel page cache readahead, pipe buffer sizing, and avoiding intermediate disk spills maximizes cache locality and minimizes kernel context switches.`,
  },

  'x3-script': {
    eli5: `Writing down your secret recipe on paper so your friend can cook the exact same delicious meal whenever they want!`,
    eli10: `Writing commands into a \`.sh\` file so you can run the entire program anytime with one click.`,
    eli15: `Shell script fundamentals:
- Create file: \`script.sh\`.
- Add shebang: \`#!/usr/bin/env bash\`.
- Grant execution permission: \`chmod +x script.sh\`.
- Execute: \`./script.sh\`.`,
    eli20: `The Standard Production Bash Script Preamble:
\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd -P)"
\`\`\`
- \`set -e\`: exit immediately on unhandled command failure.
- \`set -u\`: treat unset variables as fatal errors.
- \`set -o pipefail\`: return failure if any command in a pipeline fails.
- \`trap 'cleanup' EXIT\`: guaranteed cleanup of temporary files.`,
    eliphd: `Kernel binary execution semantics:
The kernel \`do_execve\` function inspects the executable file header.
Encountering the magic bytes \`#!\` (\`0x23 0x21\`), the kernel invokes \`binfmt_script\`, parsing the interpreter path and passing the script path as an argument.
Environment sanitization: secure scripts clean \`$PATH\` and reset \`$IFS\` to defend against binary preemption and command injection attacks.`,
  },

  'chk-basics': {
    eli5: `The first playground milestone: showing you can walk around the castle, find rooms, and write clean notes!`,
    eli10: `A checkpoint challenge testing navigation, directory management, and output redirection.`,
    eli15: `Comprehensive checkpoint testing core shell fluency: directory inspection, process identity, and file generation.`,
    eli20: `Verification of foundational systems habits: path resolution, process identity checks, and clean redirection hygiene.`,
    eliphd: `Assessment of foundational Unix mental models: treating processes, file paths, and output streams as unified state machines.`,
  },

  'chk-streams': {
    eli5: `The master water slide challenge: guiding streams through filters and sorting them into the right bucket!`,
    eli10: `A checkpoint challenge testing pipelines, stream filtering, sorting, and file redirection.`,
    eli15: `Comprehensive checkpoint testing stream composition: combining standard output, filters, and pipeline destinations.`,
    eli20: `Validation of pipeline engineering: stream filtering, exit status integrity, and avoiding intermediate file overhead.`,
    eliphd: `Synthesis checkpoint on POSIX stream composability: unidirectional IPC, kernel buffer handoffs, and deterministic stream filtering.`,
  },
};

/**
 * Retrieve explanation for a level at a specific ELI tier.
 *
 * Args:
 *     levelOrId: Level object or level ID string
 *     tier: 'eli5' | 'eli10' | 'eli15' | 'eli20' | 'eliphd'
 * Returns:
 *     Explanation markdown string
 */
export function getEli(levelOrId, tier = 'eli15') {
  const id = typeof levelOrId === 'string' ? levelOrId : levelOrId?.id;
  const levelObj = typeof levelOrId === 'object' ? levelOrId : null;
  const normalizedTier = ELI_TIERS.includes(tier) ? tier : 'eli15';

  if (!id) {
    return SANDBOX_ELI[normalizedTier] ?? SANDBOX_ELI.eli15;
  }

  const levelExpl = LEVEL_ELI[id];
  if (levelExpl?.[normalizedTier]) {
    return levelExpl[normalizedTier];
  }

  if (levelObj?.teach) {
    return levelObj.teach;
  }

  return SANDBOX_ELI[normalizedTier] ?? SANDBOX_ELI.eli15;
}

/**
 * Check if a level has custom ELI tiers.
 */
export function hasEli(levelId) {
  return Boolean(LEVEL_ELI[levelId]);
}
