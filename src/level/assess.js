/**
 * Assessment instruments: concept inventory, Leitner spaced repetition,
 * prediction tasks, and misconception coaching.
 *
 * Design notes (content validity):
 * - Inventory items map 1:1 onto bash mental models taught in levels
 *   (cwd, names-vs-bytes, truncation, pipes/fd, quoting, globs, exit codes,
 *   expansion order). Face validity: each item is a "what happens if" a
 *   practitioner actually hits.
 * - Discrimination: a "novice model" (common misconceptions) must score
 *   significantly lower than a "proficient model" on the same items.
 * - Spacing: Leitner boxes re-serve failed items at expanding intervals.
 * - Prediction before run (generation effect) is stored per level command.
 */

/**
 * @typedef {object} QuizItem
 * @property {string} id
 * @property {string} series
 * @property {string} prompt
 * @property {string[]} choices
 * @property {number} answer
 * @property {string} why
 * @property {string} misconception  // label if answered wrong
 * @property {string} coach         // remediation line
 */

/** @type {QuizItem[]} */
export const QUIZ = [
  {
    id: 'q-cwd',
    series: 'Basics',
    prompt: 'You run `cd notes` successfully. What changed?',
    choices: [
      'The notes folder moved into your home',
      'This shell process now treats notes/ as "here" for relative paths',
      'Every terminal on the machine changed directory',
      'pwd will now print `notes` as a relative path only',
    ],
    answer: 1,
    why: 'cwd is process state. Relative paths re-resolve against it; absolute paths do not care.',
    misconception: 'global-or-object confusion',
    coach: 'cd mutates only this shell process. The directory object itself does not move.',
  },
  {
    id: 'q-ls-cat',
    series: 'Basics',
    prompt: 'What does `ls` print that `cat` does not?',
    choices: [
      'File contents',
      'Directory entry names (and with -l, metadata)',
      'The working directory path',
      'Exit codes',
    ],
    answer: 1,
    why: 'Directories map names to files. ls lists names; cat streams file bytes.',
    misconception: 'names-vs-bytes',
    coach: 'A directory is a name map. ls reads the map; cat reads file contents.',
  },
  {
    id: 'q-touch',
    series: 'Files',
    prompt: 'If `report.txt` already has content, what does `touch report.txt` do?',
    choices: [
      'Erases the file',
      'Creates a second copy',
      'Updates mtime only — content stays',
      'Fails with an error',
    ],
    answer: 2,
    why: 'touch creates an empty file only when the name is missing. Otherwise it refreshes timestamps.',
    misconception: 'touch-erases',
    coach: 'touch never writes file bytes. It creates an empty name or updates timestamps.',
  },
  {
    id: 'q-mv',
    series: 'Files',
    prompt: 'Why is renaming a 10GB file with `mv` instant?',
    choices: [
      'bash copies then deletes quickly',
      'The directory entry is rewritten; bytes are not moved',
      'It is not instant — bash lies',
      'mv only changes the extension',
    ],
    answer: 1,
    why: 'Rename rewrites the name pointer in the parent directory. File data stays on the same disk blocks.',
    misconception: 'mv-copies-bytes',
    coach: 'Rename rewrites a directory entry. Only copy rewrites file bytes.',
  },
  {
    id: 'q-rmdir',
    series: 'Files',
    prompt: 'Why does `rm mydir` fail while `rm -r mydir` works?',
    choices: [
      'Directories cannot be deleted',
      '-r means "force delete files first", and directories need recursive walk',
      '-r is only needed on Windows',
      'rm only works on empty names',
    ],
    answer: 1,
    why: 'A directory is a tree. Without -r, rm refuses to delete a non-empty tree (and often any directory).',
    misconception: 'rm-flat',
    coach: 'Directories are trees. rm -r walks and unlinks every entry.',
  },
  {
    id: 'q-truncate',
    series: 'Text',
    prompt: '`echo done > log.txt` when log.txt already has lines. What remains?',
    choices: [
      'old lines + done',
      'only `done`',
      'nothing — the file is deleted',
      'a backup log.txt~',
    ],
    answer: 1,
    why: '`>` truncates. `>>` appends. Logs almost always want `>>`.',
    misconception: 'redirect-appends',
    coach: '`>` truncates. Use `>>` when you must keep history.',
  },
  {
    id: 'q-pipe',
    series: 'Streams',
    prompt: 'In `cmd1 | cmd2`, what flows through the pipe?',
    choices: [
      'cmd1 stdout → cmd2 stdin as a byte stream',
      'The filename only',
      'cmd1 stderr → cmd2 stdout',
      'Both processes merge into one PID',
    ],
    answer: 0,
    why: 'A pipe wires fd 1 of the left process to fd 0 of the right. stderr is not included unless you redirect.',
    misconception: 'pipe-merges-fds',
    coach: 'A pipe carries only stdout by default. stderr needs `2>&1` to join.',
  },
  {
    id: 'q-stderr',
    series: 'Streams',
    prompt: 'How do you capture errors into a file but keep normal output on screen?',
    choices: [
      'cmd > out.txt 2> err.txt and only look at the terminal for stdout',
      'cmd 2> err.txt',
      'cmd | err.txt',
      'cmd 1> err.txt',
    ],
    answer: 1,
    why: '`2>` binds stderr to a file. stdout stays on the terminal unless you also redirect fd 1.',
    misconception: 'fd-confusion',
    coach: 'fd 1 is stdout, fd 2 is stderr. `2>` moves only errors.',
  },
  {
    id: 'q-quotes',
    series: 'Quoting',
    prompt: 'What is the difference between `echo "$USER"` and `echo \'$USER\'`?',
    choices: [
      'None — both print the value',
      'Double quotes expand $USER; single quotes print the literal text $USER',
      'Single quotes are faster',
      'Double quotes always print nothing',
    ],
    answer: 1,
    why: 'Single quotes are literal. Double quotes expand parameters but keep spaces as one word.',
    misconception: 'quotes-identical',
    coach: 'Single quotes: zero expansion. Double quotes: expand $ but keep one field.',
  },
  {
    id: 'q-glob',
    series: 'Quoting',
    prompt: 'Why is `rm *.txt` dangerous in scripts?',
    choices: [
      'It is always safe',
      'If the glob matches nothing (nullglob off) or matches too much, you can delete the wrong names',
      'Because * is deprecated',
      'Globs cannot be used with rm',
    ],
    answer: 1,
    why: 'Globs expand before rm runs. An unexpected match list becomes your argv — that is blast radius.',
    misconception: 'glob-invisible',
    coach: 'Globs expand in the shell before the command runs. Know the match list.',
  },
  {
    id: 'q-exit',
    series: 'Control',
    prompt: 'What does exit status 1 from `grep pattern file` mean in scripts?',
    choices: [
      'Success with a warning',
      'No lines matched',
      'The file was deleted',
      'grep crashed',
    ],
    answer: 1,
    why: 'grep contract: 0 = match, 1 = no match, 2 = error. Scripts branch on that.',
    misconception: 'nonzero-is-crash',
    coach: 'Non-zero means failure/not-found by contract — not necessarily a crash.',
  },
  {
    id: 'q-and',
    series: 'Control',
    prompt: 'In `a && b`, when does `b` run?',
    choices: [
      'Always',
      'Only when `a` exits 0',
      'Only when `a` fails',
      'In parallel with `a`',
    ],
    answer: 1,
    why: '&& is "then, if success". || is "or else, if failure".',
    misconception: 'and-means-both-always',
    coach: '&& short-circuits: the right side runs only if the left exits 0.',
  },
  {
    id: 'q-expand-order',
    series: 'Quoting',
    prompt: 'What is the order of expansions in bash for `echo $HOME/*.txt`?',
    choices: [
      'glob then parameter',
      'parameter then glob',
      'they happen at the same time',
      'neither — the shell does not expand',
    ],
    answer: 1,
    why: 'Brace → parameter/command/arith → word split → pathname glob (after quote removal).',
    misconception: 'expand-order',
    coach: 'Parameters expand first; globs see the result and then match names.',
  },
  {
    id: 'q-subshell',
    series: 'Control',
    prompt: 'What does a subshell `( cd notes; pwd )` do to your current shell?',
    choices: [
      'Moves the main shell into notes',
      'Runs in a child; the main shell cwd is unchanged',
      'Deletes notes',
      'Is a syntax error',
    ],
    answer: 1,
    why: '( ) runs a child copy. cd inside does not affect the parent shell.',
    misconception: 'subshell-leaks',
    coach: 'Parentheses fork state. Curly braces { } group without forking (syntax differs).',
  },
];

/** Distractor → misconception map for novice model simulation. */
export const NOVICE_MODEL = {
  'q-cwd': 0,
  'q-ls-cat': 0,
  'q-touch': 0,
  'q-mv': 0,
  'q-rmdir': 2,
  'q-truncate': 0,
  'q-pipe': 1,
  'q-stderr': 0,
  'q-quotes': 0,
  'q-glob': 0,
  'q-exit': 0,
  'q-and': 0,
  'q-expand-order': 0,
  'q-subshell': 0,
};

/**
 * @typedef {object} LeitnerState
 * @property {Record<string, number>} box  // item id → box 1..5
 * @property {Record<string, number>} wrongCount
 * @property {Record<string, string>} lastMiss
 */

/**
 * Create empty Leitner state.
 *
 * Returns:
 *     LeitnerState
 */
export function newLeitner() {
  return { box: {}, wrongCount: {}, lastMiss: {} };
}

/**
 * Record a quiz answer into Leitner boxes.
 *
 * Args:
 *     state: LeitnerState (mutated)
 *     item: QuizItem
 *     choiceIndex: user pick
 *     confidence: 1 low .. 3 high
 * Returns:
 *     { ok, why, coach, box }
 */
export function gradeQuizDetailed(state, item, choiceIndex, confidence = 2) {
  const ok = choiceIndex === item.answer;
  const prev = state.box[item.id] ?? 1;
  if (ok) {
    // High confidence graduates faster (simple SM-2-ish)
    const bump = confidence >= 3 ? 2 : 1;
    state.box[item.id] = Math.min(5, prev + bump);
  } else {
    state.box[item.id] = 1;
    state.wrongCount[item.id] = (state.wrongCount[item.id] ?? 0) + 1;
    state.lastMiss[item.id] = item.misconception;
  }
  return {
    ok,
    why: item.why,
    coach: ok ? item.why : item.coach,
    misconception: ok ? null : item.misconception,
    box: state.box[item.id],
  };
}

/**
 * Pick review items weighted by low Leitner box (and due-ish).
 *
 * Args:
 *     state: LeitnerState
 *     count: how many
 *     excludeSeries: optional series to skip
 * Returns:
 *     QuizItem[]
 */
export function sampleLeitner(state, count = 3, excludeSeries = null) {
  const pool = QUIZ.filter((q) => q.series !== excludeSeries);
  const scored = pool.map((q) => {
    const box = state.box[q.id] ?? 1;
    const misses = state.wrongCount[q.id] ?? 0;
    // lower box + more misses → higher priority
    return { q, score: (6 - box) * 2 + misses * 3 + Math.random() };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(count, scored.length)).map((s) => s.q);
}

/**
 * Concept inventory — same domain as QUIZ, used pre/post.
 *
 * Args:
 *     variant: 'pre' | 'post' (shuffles order only)
 * Returns:
 *     QuizItem[]
 */
export function conceptInventory(variant = 'pre') {
  const items = [...QUIZ];
  if (variant === 'post') items.reverse();
  return items.map((it, i) => ({ ...it, id: `${it.id}-${variant}` }));
}

/**
 * Score an inventory response map.
 *
 * Args:
 *     items: QuizItem[]
 *     answers: Record<itemId, choiceIndex>
 * Returns:
 *     { score, total, misses: [{ id, misconception, coach }] }
 */
export function scoreInventory(items, answers) {
  let score = 0;
  const misses = [];
  for (const it of items) {
    const pick = answers[it.id];
    if (pick === it.answer) score += 1;
    else {
      misses.push({ id: it.id, misconception: it.misconception, coach: it.coach });
    }
  }
  return { score, total: items.length, misses };
}

/**
 * Simulate a learner model to check item discrimination.
 *
 * Args:
 *     model: Record<itemId, choiceIndex> (without pre/post suffix)
 * Returns:
 *     { score, total, rate }
 */
export function scoreModel(model) {
  let score = 0;
  for (const it of QUIZ) {
    if (model[it.id] === it.answer) score += 1;
  }
  return { score, total: QUIZ.length, rate: score / QUIZ.length };
}

/**
 * A prediction task: command + expected stdout fragment.
 *
 * @typedef {object} PredictTask
 * @property {string} id
 * @property {string} prompt
 * @property {string} command
 * @property {string[]} choices
 * @property {number} answer
 * @property {string} why
 */

/** @type {PredictTask[]} */
export const PREDICTS = [
  {
    id: 'p-trunc',
    prompt: 'log.txt is `first\\n`. What is in log.txt after `echo second > log.txt`?',
    command: 'echo second > log.txt',
    choices: ['first\\nsecond\\n', 'second\\n', 'first\\n', ''],
    answer: 1,
    why: 'Single > truncates before write.',
  },
  {
    id: 'p-pipe',
    prompt: 'What is printed by `echo hi | wc -l`?',
    command: 'echo hi | wc -l',
    choices: ['hi', '1', '2', '0'],
    answer: 1,
    why: 'One line went through the pipe into wc -l.',
  },
  {
    id: 'p-sub',
    prompt: 'N=2. What is printed by `echo $((N * 4))`?',
    command: 'echo $((N * 4))',
    choices: ['$((N * 4))', 'N * 4', '8', '24'],
    answer: 2,
    why: 'Arithmetic expansion runs during word expansion.',
  },
  {
    id: 'p-quote',
    prompt: 'USER=ada. What is printed by `echo \'$USER\'`?',
    command: "echo '$USER'",
    choices: ['ada', '$USER', '', 'USER'],
    answer: 1,
    why: 'Single quotes are literal — no parameter expansion.',
  },
];

/**
 * Grade a prediction.
 *
 * Args:
 *     task: PredictTask
 *     choiceIndex: pick
 * Returns:
 *     { ok, why }
 */
export function gradePredict(task, choiceIndex) {
  return { ok: choiceIndex === task.answer, why: task.why };
}

// legacy alias used by app.js
export function quizForSeries(series) {
  if (!series || series === '*') return [...QUIZ];
  return QUIZ.filter((q) => q.series === series);
}

export function sampleReview(excludeSeries, solvedSeries, count = 3) {
  return sampleLeitner(newLeitner(), count, excludeSeries);
}

export function gradeQuiz(item, choiceIndex) {
  return gradeQuizDetailed(newLeitner(), item, choiceIndex);
}
