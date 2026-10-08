import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSandboxShell } from '../src/bash/shell.js';

test('cmdSort supports numeric sorting -n', () => {
  const sh = createSandboxShell();
  const res = sh.execute('printf "10\\n2\\n1\\n" | sort -n');
  assert.equal(res.stdout, '1\n2\n10\n');
});

test('cmdUniq deduplicates lines and supports -c', () => {
  const sh = createSandboxShell();
  const res1 = sh.execute('printf "apple\\napple\\nbanana\\n" | uniq');
  assert.equal(res1.stdout, 'apple\nbanana\n');

  const res2 = sh.execute('printf "apple\\napple\\nbanana\\n" | uniq -c');
  assert.ok(res2.stdout.includes('2 apple'));
  assert.ok(res2.stdout.includes('1 banana'));
});

test('cmdAwk extracts columns and supports delimiter', () => {
  const sh = createSandboxShell();
  const res1 = sh.execute('printf "first second third\\n" | awk \'{print $2}\'');
  assert.equal(res1.stdout, 'second\n');

  const res2 = sh.execute('printf "a,b,c\\n1,2,3\\n" | awk -F, \'{print $1, $3}\'');
  assert.equal(res2.stdout, 'a c\n1 3\n');
});

test('cmdLn creates symlink and links correctly', () => {
  const sh = createSandboxShell();
  sh.execute('echo "source data" > real.txt');
  sh.execute('ln -s real.txt link.txt');
  const node = sh.fs.getNode(sh.home + '/link.txt');
  assert.ok(node);
  assert.equal(node.content.trim(), 'source data');
  assert.ok(node.isSymlink);
});

test('cmdMktemp creates file in /tmp', () => {
  const sh = createSandboxShell();
  const res = sh.execute('mktemp');
  assert.ok(res.stdout.startsWith('/tmp/tmp.'));
  const path = res.stdout.trim();
  assert.ok(sh.fs.getNode(path));
});

test('cmdChmod supports symbolic mode +x', () => {
  const sh = createSandboxShell();
  sh.execute('touch test.sh');
  sh.execute('chmod +x test.sh');
  const node = sh.fs.getNode(sh.home + '/test.sh');
  assert.equal(node.mode, '755');
});

test('parameter expansion supports defaults and prefix/suffix stripping', () => {
  const sh = createSandboxShell();
  sh.execute('FOO="hello_world"');
  sh.execute('BAR=""');
  const r1 = sh.execute('echo "${BAR:-fallback}"');
  assert.equal(r1.stdout, 'fallback\n');

  const r2 = sh.execute('echo "${FOO#hello_}"');
  assert.equal(r2.stdout, 'world\n');

  const r3 = sh.execute('echo "${FOO%_world}"');
  assert.equal(r3.stdout, 'hello\n');

  const r4 = sh.execute('echo "${#FOO}"');
  assert.equal(r4.stdout, '11\n');
});

test('cmdSet supports strict mode flags', () => {
  const sh = createSandboxShell();
  sh.execute('set -euo pipefail');
  assert.ok(sh.optE);
  assert.ok(sh.optU);
  assert.ok(sh.optPipefail);
});

test('cmdPs and cmdKill manage processes', () => {
  const sh = createSandboxShell();
  sh.execute('sleep 100 &');
  const psRes = sh.execute('ps');
  assert.ok(psRes.stdout.includes('bash'));
  assert.ok(psRes.stdout.includes('sleep 100'));

  const killRes = sh.execute('kill %1');
  assert.equal(killRes.code, 0);
  const psRes2 = sh.execute('ps');
  assert.ok(!psRes2.stdout.includes('sleep 100'));
});

test('cmdStat and cmdChown inspect and modify file attributes', () => {
  const sh = createSandboxShell();
  sh.execute('touch file.txt');
  sh.execute('chown root:staff file.txt');
  const node = sh.fs.getNode(sh.home + '/file.txt');
  assert.equal(node.owner, 'root');

  const statRes = sh.execute('stat file.txt');
  assert.ok(statRes.stdout.includes('File: file.txt'));
  assert.ok(statRes.stdout.includes('Uid: (1000/root)'));
  assert.ok(statRes.stdout.includes('Inode:'));
});

test('cmdSort supports -k column and -t delimiter', () => {
  const sh = createSandboxShell();
  const res = sh.execute('printf "b:20\\na:10\\nc:30\\n" | sort -t: -k2 -n');
  assert.equal(res.stdout, 'a:10\nb:20\nc:30\n');
});

test('cmdAwk supports conditional filters', () => {
  const sh = createSandboxShell();
  const res = sh.execute('printf "alice 30\\nbob 15\\ncarol 45\\n" | awk \'$2 > 20 {print $1}\'');
  assert.equal(res.stdout, 'alice\ncarol\n');
});

test('shell functions isolate local variables', () => {
  const sh = createSandboxShell();
  sh.execute('VAL=global');
  sh.execute('f() { local VAL=scoped; echo $VAL; }');
  const res = sh.execute('f');
  assert.equal(res.stdout, 'scoped\n');
  const res2 = sh.execute('echo $VAL');
  assert.equal(res2.stdout, 'global\n');
});

