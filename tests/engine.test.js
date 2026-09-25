import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSandboxShell } from '../src/bash/shell.js';
import { globToRegExp, evalArith } from '../src/bash/expand.js';
import { parseScript, needsControlFlow } from '../src/bash/control.js';
import { parseLine } from '../src/bash/parser.js';
import { QUIZ, gradeQuiz, sampleReview } from '../src/level/assess.js';
import { LEVELS, checkLevel, golfScore } from '../src/level/levels.js';
import { Shell } from '../src/bash/shell.js';
import { buildFS } from '../src/bash/fs.js';

test('a-glob', () => {
  console.log('run a-glob');
  assert.ok(globToRegExp('*.txt').test('a.txt'));
  assert.ok(!globToRegExp('*.txt').test('a.md'));
  assert.ok(globToRegExp('a?c').test('abc'));
  assert.ok(globToRegExp('[ab]x').test('bx'));
});

test('b-arith', () => {
  console.log('run b-arith');
  assert.equal(evalArith('N * 4', { N: 2 }), 8);
  assert.equal(evalArith('1 + 2 * 3', {}), 7);
});

test('c-glob-fs', () => {
  console.log('run c-glob-fs');
  const shell = createSandboxShell();
  const t = shell.execute('ls data/*.txt');
  assert.match(t.stdout, /a\.txt/);
  assert.match(t.stdout, /b\.txt/);
});

test('d-subst', () => {
  console.log('run d-subst');
  const shell = createSandboxShell();
  const arith = shell.execute('echo $((2 + 3))');
  assert.match(arith.stdout, /5/);
  const sub = shell.execute('echo $(pwd)');
  assert.match(sub.stdout, /\/home\/learner/);
});

test('e-vars', () => {
  console.log('run e-vars');
  const shell = createSandboxShell();
  shell.execute('NAME=ada');
  assert.equal(shell.env.NAME, 'ada');
  const t = shell.execute('echo hello $NAME');
  assert.match(t.stdout, /hello ada/);
  const lit = shell.execute("echo '$NAME'");
  assert.match(lit.stdout, /\$NAME/);
});

test('f-stderr', () => {
  console.log('run f-stderr');
  const shell = createSandboxShell();
  shell.execute('cat missing.txt 2> err.txt');
  const node = shell.fs.getNode('/home/learner/err.txt');
  assert.ok(node);
  assert.match(node.content, /No such file/);
});

test('g-parse-2gt', () => {
  console.log('run g-parse-2gt');
  const { stages } = parseLine('cat missing.txt 2> err.txt');
  assert.equal(stages[0].stderrFile, 'err.txt');
  assert.equal(stages[0].stdoutFile, null);
});

test('h-if', () => {
  console.log('run h-if');
  const shell = createSandboxShell();
  shell.execute('if [ -f notes/todo.txt ]; then touch present.txt; fi');
  assert.ok(shell.fs.getNode('/home/learner/present.txt'));
  shell.execute('if [ -f nope.txt ]; then touch ghost.txt; fi');
  assert.equal(shell.fs.getNode('/home/learner/ghost.txt'), null);
});

test('i-for', () => {
  console.log('run i-for');
  const shell = createSandboxShell();
  shell.execute('for x in p q r; do touch $x.txt; done');
  assert.ok(shell.fs.getNode('/home/learner/p.txt'));
  assert.ok(shell.fs.getNode('/home/learner/r.txt'));
});

test('j-while', () => {
  console.log('run j-while');
  const shell = createSandboxShell();
  shell.execute('N=0');
  shell.execute('while [ $N -lt 3 ]; do N=$((N + 1)); done');
  assert.equal(shell.env.N, '3');
});

test('k-script', () => {
  console.log('run k-script');
  const shell = createSandboxShell();
  shell.execute('echo echo building > build.sh');
  shell.execute('echo touch built.txt >> build.sh');
  const t = shell.execute('bash build.sh');
  assert.equal(t.code, 0, t.stderr);
  assert.ok(shell.fs.getNode('/home/learner/built.txt'));
});

test('l-test-builtin', () => {
  console.log('run l-test-builtin');
  const shell = createSandboxShell();
  assert.equal(shell.execute('test -f README.md').code, 0);
  assert.equal(shell.execute('test -f missing').code, 1);
  assert.equal(shell.execute('test -d notes').code, 0);
  assert.equal(shell.execute('test abc = abc').code, 0);
});

test('m-and-or', () => {
  console.log('run m-and-or');
  const shell = createSandboxShell();
  shell.execute('true && touch ok.txt');
  assert.ok(shell.fs.getNode('/home/learner/ok.txt'));
  shell.execute('false && touch no.txt');
  assert.equal(shell.fs.getNode('/home/learner/no.txt'), null);
  shell.execute('false || touch or.txt');
  assert.ok(shell.fs.getNode('/home/learner/or.txt'));
});

test('n-needs-cf', () => {
  console.log('run n-needs-cf');
  assert.ok(needsControlFlow('if [ -f x ]; then echo y; fi'));
  assert.ok(needsControlFlow('for i in 1 2; do echo $i; done'));
  assert.ok(!needsControlFlow('echo hi | wc -l'));
  assert.ok(!needsControlFlow('echo done > status.txt'));
  assert.ok(!needsControlFlow('touch done'));
});

test('o-parse-cf', () => {
  console.log('run o-parse-cf');
  const stmts = parseScript('if [ -f a ]; then touch b; fi');
  assert.equal(stmts[0].type, 'if');
  const forStmts = parseScript('for x in a b; do echo $x; done');
  assert.equal(forStmts[0].type, 'for');
  assert.deepEqual(forStmts[0].words, ['a', 'b']);
});

test('p-quiz', () => {
  console.log('run p-quiz');
  assert.ok(QUIZ.length >= 10);
  const q = QUIZ[0];
  assert.equal(gradeQuiz(q, q.answer).ok, true);
  assert.equal(gradeQuiz(q, (q.answer + 1) % q.choices.length).ok, false);
  const review = sampleReview('Basics', ['Basics', 'Files'], 3);
  assert.ok(review.every((r) => r.series !== 'Basics'));
});

test('r-functions', () => {
  console.log('run r-functions');
  const shell = createSandboxShell();
  shell.execute('greet() { echo hello $1; }');
  assert.ok(shell.functions.has('greet'));
  const t = shell.execute('greet world');
  assert.match(t.stdout, /hello world/);
});

test('s-double-bracket', () => {
  console.log('run s-double-bracket');
  const shell = createSandboxShell();
  shell.execute('NAME=ada');
  assert.equal(shell.execute('[[ $NAME == ada ]]').code, 0);
  assert.equal(shell.execute('[[ $NAME == bob ]]').code, 1);
  shell.execute('[[ $NAME == ada ]] && touch match.txt');
  assert.ok(shell.fs.getNode('/home/learner/match.txt'));
});

test('t-process-sub', () => {
  console.log('run t-process-sub');
  const shell = createSandboxShell();
  const t = shell.execute('cat <(echo hi)');
  assert.match(t.stdout, /hi/);
});

test('u-brace-case-read', () => {
  console.log('run u-brace-case-read');
  const shell = createSandboxShell();
  shell.execute('touch {x,y}.txt');
  assert.ok(shell.fs.getNode('/home/learner/x.txt'));
  assert.ok(shell.fs.getNode('/home/learner/y.txt'));
  shell.execute('X=yes');
  shell.execute('case $X in yes) touch flag.txt ;; esac');
  assert.ok(shell.fs.getNode('/home/learner/flag.txt'));
  shell.execute('read L < notes/todo.txt');
  assert.equal(shell.env.L, 'learn pipes');
});

test('v-assess-discrimination', async () => {
  console.log('run v-assess-discrimination');
  const {
    NOVICE_MODEL,
    scoreModel,
    gradeQuizDetailed,
    newLeitner,
    QUIZ,
    conceptInventory,
    scoreInventory,
  } = await import('../src/level/assess.js');
  const expert = Object.fromEntries(QUIZ.map((q) => [q.id, q.answer]));
  const exp = scoreModel(expert);
  const nov = scoreModel(NOVICE_MODEL);
  assert.equal(exp.rate, 1);
  assert.ok(nov.rate < 0.5, `novice too high: ${nov.rate}`);
  assert.ok(exp.score - nov.score >= QUIZ.length * 0.5);

  const state = newLeitner();
  const item = QUIZ[0];
  gradeQuizDetailed(state, item, (item.answer + 1) % item.choices.length, 1);
  assert.equal(state.box[item.id], 1);
  assert.equal(state.lastMiss[item.id], item.misconception);
  gradeQuizDetailed(state, item, item.answer, 3);
  assert.ok(state.box[item.id] >= 2);

  const inv = conceptInventory('post');
  const answers = Object.fromEntries(inv.map((q) => [q.id, q.answer]));
  const sc = scoreInventory(inv, answers);
  assert.equal(sc.score, sc.total);
});

test('w-jobs-arrays', () => {
  console.log('run w-jobs-arrays');
  const shell = createSandboxShell();
  shell.execute('echo hi &');
  const jobs = shell.execute('jobs');
  assert.match(jobs.stdout, /echo hi/);
  shell.execute('arr=(a b c)');
  assert.deepEqual(shell.arrays.get('arr'), ['a', 'b', 'c']);
  assert.match(shell.execute('echo ${arr[1]}').stdout, /b/);
  assert.match(shell.execute('echo ${#arr[@]}').stdout, /3/);
});

test('q-curriculum', () => {
  console.log('run q-curriculum');
  const solutions = {
    'b1-pwd': ['pwd'],
    'b2-ls': ['ls'],
    'b3-cd': ['cd notes'],
    'b4-echo': ['echo hello bash'],
    'b5-vars': ['NAME=ada', 'echo hello $NAME'],
    'f1-touch': ['touch report.txt'],
    'f2-mkdir': ['mkdir src', 'cd src'],
    'f3-mv': ['mv draft.txt final.txt'],
    'f4-cp-rm': ['cp notes/todo.txt todo.copy', 'rm -r notes'],
    't1-cat': ['cat notes/todo.txt'],
    't2-redirect': ['echo done > status.txt'],
    't3-append': ['echo second >> log.txt'],
    't4-wc': ['wc -l notes/book.txt'],
    't5-sort': ['sort data/nums.txt > sorted.txt'],
    's1-pipe': ['cat notes/todo.txt | wc -l'],
    's2-grep': ['grep pipes notes/todo.txt'],
    's3-stderr': ['cat missing.txt 2> err.txt'],
    's4-chain': ['cat notes/book.txt | grep e | wc -l'],
    'q1-glob': ['ls data/*.txt'],
    'q2-quotes': ["echo '$USER is unknown'"],
    'q3-cmdsub': ['wc -l < notes/todo.txt > count.txt'],
    'c1-exit': ['grep pipes notes/todo.txt && touch ok.txt'],
    'c2-test': ['if [ -f notes/todo.txt ]; then touch present.txt; fi'],
    'c3-for': ['for x in p q r; do touch $x.txt; done'],
    'c4-arith': ['N=2', 'echo $((N * 4))'],
    'c5-bracket': ['NAME=ada', '[[ $NAME == ada ]] && touch match.txt'],
    'c6-fn': ['greet() { echo hello $1; }', 'greet world'],
    'c7-procsub': ['cat <(echo hi)'],
    'c8-case': ['X=yes', 'case $X in yes) touch flag.txt ;; esac'],
    'c9-brace': ['touch {a,b}.txt'],
    'c10-read': ['read L < notes/todo.txt', 'echo $L'],
    'c11-jobs': ['true &', 'jobs'],
    'c12-arrays': ['arr=(a b c)', 'echo ${arr[1]}'],
    'x1-report': ['mkdir -p out', 'echo ok > out/summary.txt'],
    'x2-pipeline-report': ['grep e notes/book.txt > hits.txt'],
    'x3-script': [
      'echo echo building > build.sh',
      'echo touch built.txt >> build.sh',
      'bash build.sh',
    ],
    'chk-basics': ['whoami > who.txt', 'pwd >> who.txt'],
    'chk-streams': ['grep e notes/book.txt | sort > e-lines.txt'],
  };

  for (const level of LEVELS) {
    const cmds = solutions[level.id];
    assert.ok(cmds, `missing solution for ${level.id}`);
    const shell = new Shell(buildFS(level.seed.tree), {
      cwd: level.seed.cwd,
      home: level.seed.home,
    });
    const traces = cmds.map((c) => shell.execute(c));
    const { ok, failures } = checkLevel(level, shell, traces);
    assert.equal(ok, true, `${level.id} failed: ${failures.join('; ')}`);
    assert.ok(golfScore(traces) <= level.par, `${level.id} over par`);
  }
});
