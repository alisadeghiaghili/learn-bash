/**
 * Parser unit tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, parseLine, expandWord } from '../src/bash/parser.js';

test('tokenize splits words and operators', () => {
  const tokens = tokenize('echo hello | wc -l');
  assert.deepEqual(tokens, [
    { type: 'word', value: 'echo' },
    { type: 'word', value: 'hello' },
    { type: 'op', value: '|' },
    { type: 'word', value: 'wc' },
    { type: 'word', value: '-l' },
  ]);
});

test('tokenize keeps quoted spaces and strips quotes', () => {
  const tokens = tokenize("echo 'a b' \"c d\"");
  assert.deepEqual(tokens.map((t) => t.value), ['echo', 'a b', 'c d']);
});

test('tokenize rejects unmatched quotes', () => {
  assert.throws(() => tokenize("echo 'oops"), /unmatched/);
  assert.throws(() => tokenize('echo "oops'), /unmatched/);
});

test('parseLine builds a pipeline', () => {
  const { stages, connectors } = parseLine('cat a.txt | grep x | wc -l');
  assert.equal(stages.length, 3);
  assert.deepEqual(connectors, ['|', '|']);
  assert.deepEqual(stages[0].args, ['cat', 'a.txt']);
  assert.deepEqual(stages[2].args, ['wc', '-l']);
});

test('parseLine handles redirection', () => {
  const { stages } = parseLine('echo hi > out.txt');
  assert.equal(stages.length, 1);
  assert.equal(stages[0].stdoutFile, 'out.txt');
  assert.equal(stages[0].stdoutAppend, false);
  assert.deepEqual(stages[0].args, ['echo', 'hi']);
});

test('parseLine handles append and stdin redirect', () => {
  const { stages } = parseLine('cat < in.txt >> out.txt');
  assert.equal(stages[0].stdinFile, 'in.txt');
  assert.equal(stages[0].stdoutFile, 'out.txt');
  assert.equal(stages[0].stdoutAppend, true);
});

test('parseLine sequences with ; && ||', () => {
  const { stages, connectors } = parseLine('true && echo a; false || echo b');
  // true | echo a | false | echo b  →  4 simple commands, 3 sequencers
  assert.equal(stages.length, 4);
  assert.deepEqual(connectors, ['&&', ';', '||']);
});

test('expandWord expands variables and home', () => {
  assert.equal(expandWord('hello $USER', { USER: 'ali' }), 'hello ali');
  assert.equal(expandWord('${HOME}/x', { HOME: '/h' }), '/h/x');
  assert.equal(expandWord('$?', { '?': '0' }), '0');
  assert.equal(expandWord('~', {}, '/home/learner'), '/home/learner');
});
