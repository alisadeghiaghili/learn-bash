/**
 * Shell and level engine integration tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSandboxShell, Shell } from '../src/bash/shell.js';
import { buildFS } from '../src/bash/fs.js';
import { LEVELS, checkLevel, golfScore } from '../src/level/levels.js';

/**
 * Build the default level home shell.
 *
 * Returns:
 *     Shell
 */
function levelShell(level) {
  return new Shell(buildFS(level.seed.tree), {
    cwd: level.seed.cwd,
    home: level.seed.home,
  });
}

test('sandbox starts in home with seed files', () => {
  const shell = createSandboxShell();
  assert.equal(shell.cwd, '/home/learner');
  const out = shell.execute('ls');
  assert.equal(out.code, 0);
  assert.match(out.stdout, /README\.md/);
  assert.match(out.stdout, /notes/);
});

test('pwd, cd, and prompt update', () => {
  const shell = createSandboxShell();
  assert.equal(shell.execute('pwd').stdout.trim(), '/home/learner');
  shell.execute('cd notes');
  assert.equal(shell.cwd, '/home/learner/notes');
  assert.match(shell.prompt(), /\/notes\$$/);
});

test('touch mkdir rm mv cp behave like a mini bash', () => {
  const shell = createSandboxShell();
  shell.execute('mkdir src');
  shell.execute('touch src/a.txt');
  shell.execute('cp src/a.txt src/b.txt');
  shell.execute('mv src/b.txt src/c.txt');
  assert.ok(shell.fs.getNode('/home/learner/src/c.txt'));
  assert.equal(shell.fs.getNode('/home/learner/src/b.txt'), null);
  shell.execute('rm -r src');
  assert.equal(shell.fs.getNode('/home/learner/src'), null);
});

test('redirect overwrites and append keeps history', () => {
  const shell = createSandboxShell();
  shell.execute('echo first > log.txt');
  shell.execute('echo second >> log.txt');
  const node = shell.fs.getNode('/home/learner/log.txt');
  assert.equal(node.content, 'first\nsecond\n');
});

test('pipe feeds stdout to next stdin', () => {
  const shell = createSandboxShell();
  const trace = shell.execute('cat notes/todo.txt | wc -l');
  assert.equal(trace.code, 0);
  assert.match(trace.stdout.trim(), /^2$/);
  assert.equal(trace.stages.length, 2);
});

test('grep filters lines and sets exit code', () => {
  const shell = createSandboxShell();
  const hit = shell.execute('grep pipes notes/todo.txt');
  assert.equal(hit.code, 0);
  assert.match(hit.stdout, /learn pipes/);
  const miss = shell.execute('grep nope notes/todo.txt');
  assert.equal(miss.code, 1);
});

test('command not found exits 127', () => {
  const shell = createSandboxShell();
  const t = shell.execute('frobnicate');
  assert.equal(t.code, 127);
  assert.match(t.stderr, /command not found/);
});

test('undo restores previous filesystem', () => {
  const shell = createSandboxShell();
  shell.execute('touch gone.txt');
  assert.ok(shell.fs.getNode('/home/learner/gone.txt'));
  shell.execute('undo');
  assert.equal(shell.fs.getNode('/home/learner/gone.txt'), null);
});

test('syntax errors exit 2', () => {
  const shell = createSandboxShell();
  const t = shell.execute('echo "open');
  assert.equal(t.code, 2);
  assert.match(t.stderr, /unmatched/);
});

test('all levels can be solved with their par commands', () => {
  const solutions = {
    'b1-pwd': ['pwd'],
    'b2-ls': ['ls'],
    'b3-cd': ['cd notes'],
    'b4-echo': ['echo hello bash'],
    'f1-touch': ['touch report.txt'],
    'f2-mkdir': ['mkdir src', 'cd src'],
    'f3-mv': ['mv draft.txt final.txt'],
    't1-cat': ['cat notes/todo.txt'],
    't2-redirect': ['echo done > status.txt'],
    't3-append': ['echo second >> log.txt'],
    's1-pipe': ['cat notes/todo.txt | wc -l'],
    's2-grep': ['grep pipes notes/todo.txt'],
  };

  for (const level of LEVELS) {
    const cmds = solutions[level.id];
    assert.ok(cmds, `missing solution for ${level.id}`);
    const shell = levelShell(level);
    const traces = cmds.map((c) => shell.execute(c));
    const { ok, failures } = checkLevel(level, shell, traces);
    assert.equal(ok, true, `${level.id} failed: ${failures.join('; ')}`);
    assert.ok(golfScore(traces) <= level.par, `${level.id} over par`);
  }
});

test('failed checks report a reason', () => {
  const level = LEVELS.find((l) => l.id === 'f1-touch');
  const shell = levelShell(level);
  const { ok, failures } = checkLevel(level, shell, []);
  assert.equal(ok, false);
  assert.ok(failures.length > 0);
});
