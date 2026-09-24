/**
 * Study harness tests — SYNTHETIC learners only.
 * These validate instrument behavior, not human learning gains.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newStudyRecord,
  logEvent,
  recordInventory,
  retentionDue,
  exportStudy,
} from '../src/level/study.js';
import { conceptInventory, NOVICE_MODEL, QUIZ, scoreModel } from '../src/level/assess.js';

test('study record logs events and inventories', () => {
  const rec = newStudyRecord('P01');
  logEvent(rec, 'level_clear', { id: 'b1-pwd' });
  const items = conceptInventory('pre');
  const answers = Object.fromEntries(items.map((q) => [q.id, q.answer]));
  const scored = recordInventory(rec, 'pre', items, answers);
  assert.equal(scored.score, scored.total);
  assert.equal(rec.events.length, 1);
  assert.ok(rec.pre);
});

test('retention window is seven days', () => {
  const rec = newStudyRecord('P02');
  assert.equal(retentionDue(rec, Date.parse(rec.startedAt) + 1000), false);
  assert.equal(
    retentionDue(rec, Date.parse(rec.startedAt) + 8 * 24 * 3600 * 1000),
    true
  );
});

test('export summarizes paired gains without PII', () => {
  const a = newStudyRecord('P01');
  const b = newStudyRecord('P02');
  const items = conceptInventory('pre');
  // Expert: all correct on post, mostly correct on pre
  const expertPre = Object.fromEntries(items.map((q) => [q.id, q.answer]));
  const expertPost = Object.fromEntries(
    conceptInventory('post').map((q) => [q.id, q.answer])
  );
  // Novice: wrong on pre, right on post (realistic gain)
  const novicePre = Object.fromEntries(
    items.map((q) => [q.id, (q.answer + 1) % q.choices.length])
  );

  recordInventory(a, 'pre', items, expertPre);
  recordInventory(a, 'post', conceptInventory('post'), expertPost);
  recordInventory(b, 'pre', items, novicePre);
  recordInventory(b, 'post', conceptInventory('post'), expertPost);

  const pkg = exportStudy([a, b]);
  assert.equal(pkg.n, 2);
  assert.equal(pkg.summary.nPre, 2);
  assert.equal(pkg.summary.nPost, 2);
  assert.equal(pkg.records[0].pid, 'P01');
  // novice must improve from near-zero pre to full post
  assert.ok(b.pre.score < b.post.score);
  assert.ok(pkg.summary.meanNormalizedGain !== null);
  assert.ok(
    (b.post.score - b.pre.score) / Math.max(1, b.pre.total) > 0.5
  );
});

test('novice vs expert discrimination remains strong', () => {
  const expert = Object.fromEntries(QUIZ.map((q) => [q.id, q.answer]));
  const exp = scoreModel(expert);
  const nov = scoreModel(NOVICE_MODEL);
  assert.ok(exp.rate === 1);
  assert.ok(nov.rate < 0.5);
  assert.ok(exp.score - nov.score >= QUIZ.length * 0.5);
});
