/**
 * Virtual filesystem unit tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFS,
  createDir,
  createFile,
  resolvePath,
  splitPath,
  cloneNode,
} from '../src/bash/fs.js';

test('resolvePath handles relative, parent, home, absolute', () => {
  assert.equal(resolvePath('/home/learner', 'notes'), '/home/learner/notes');
  assert.equal(resolvePath('/home/learner/notes', '..'), '/home/learner');
  assert.equal(resolvePath('/home/learner', '~'), '/home/learner');
  assert.equal(resolvePath('/home/learner', '~/x'), '/home/learner/x');
  assert.equal(resolvePath('/home/learner', '/etc'), '/etc');
  assert.equal(resolvePath('/home/learner/notes', './a/./b'), '/home/learner/notes/a/b');
});

test('splitPath separates dir and base', () => {
  assert.deepEqual(splitPath('/home/learner/a.txt'), {
    dir: '/home/learner',
    base: 'a.txt',
  });
  assert.deepEqual(splitPath('/a'), { dir: '/', base: 'a' });
});

test('buildFS creates nested nodes and lookup works', () => {
  const fs = buildFS({
    home: {
      type: 'dir',
      children: {
        learner: {
          type: 'dir',
          children: {
            'a.txt': { type: 'file', content: 'hi' },
            notes: { type: 'dir', children: {} },
          },
        },
      },
    },
  });

  const file = fs.getNode('/home/learner/a.txt');
  assert.equal(file.type, 'file');
  assert.equal(file.content, 'hi');
  assert.equal(fs.getNode('/home/learner/notes').type, 'dir');
  assert.equal(fs.getNode('/home/learner/missing'), null);
});

test('attach and remove mutate the tree', () => {
  const fs = buildFS({ home: { type: 'dir', children: {} } });
  assert.ok(fs.attach('/home', createFile('x.txt', '1')));
  assert.equal(fs.getNode('/home/x.txt').content, '1');
  assert.ok(fs.remove('/home/x.txt'));
  assert.equal(fs.getNode('/home/x.txt'), null);
});

test('cloneNode is a deep copy', () => {
  const dir = createDir('root');
  dir.children.set('f', createFile('f', 'abc'));
  const copy = cloneNode(dir);
  copy.children.get('f').content = 'changed';
  assert.equal(dir.children.get('f').content, 'abc');
});
