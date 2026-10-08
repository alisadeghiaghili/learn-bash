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
