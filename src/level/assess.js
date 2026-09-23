/**
 * Concept quizzes and spaced review bank.
 *
 * Each item checks understanding, not command recall.
 */

/**
 * @typedef {object} QuizItem
 * @property {string} id
 * @property {string} series
 * @property {string} prompt
 * @property {string[]} choices
 * @property {number} answer
 * @property {string} why
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
  },
];

/**
 * Filter quiz items for a series.
 *
 * Args:
 *     series: series name or '*' for all
 * Returns:
 *     QuizItem[]
 */
export function quizForSeries(series) {
  if (!series || series === '*') return [...QUIZ];
  return QUIZ.filter((q) => q.series === series);
}

/**
 * Spaced review: mix of old series questions, not the current one.
 *
 * Args:
 *     excludeSeries: series to avoid (current level series)
 *     solvedSeries: series the user has touched
 *     count: how many questions
 * Returns:
 *     QuizItem[]
 */
export function sampleReview(excludeSeries, solvedSeries, count = 3) {
  const pool = QUIZ.filter(
    (q) => q.series !== excludeSeries && (!solvedSeries?.length || solvedSeries.includes(q.series))
  );
  const source = pool.length ? pool : QUIZ.filter((q) => q.series !== excludeSeries);
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Grade one answer.
 *
 * Args:
 *     item: QuizItem
 *     choiceIndex: user pick
 * Returns:
 *     { ok, why }
 */
export function gradeQuiz(item, choiceIndex) {
  return { ok: choiceIndex === item.answer, why: item.why };
}
