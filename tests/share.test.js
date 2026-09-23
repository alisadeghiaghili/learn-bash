/**
 * Share message and progress persistence tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shareMessageLinkedIn,
  shareMessageX,
  buildShareTargets,
  SHARE_URL,
} from '../src/ui/share.js';
import { summarizeCurriculum, resumeLine } from '../src/ui/progress.js';
import { LEVELS, solutionProgress } from '../src/level/levels.js';

/**
 * Build a fake curriculum via summarizeCurriculum.
 *
 * Returns:
 *     { progress, curriculum }
 */
function sample() {
  const progress = {
    'b1-pwd': { solved: true, bestCommands: 1 },
    'b2-ls': { solved: true, bestCommands: 1 },
  };
  return { progress, curriculum: summarizeCurriculum(progress) };
}

test('LinkedIn post lists learned curriculum and links the app', () => {
  const { curriculum } = sample();
  const text = shareMessageLinkedIn({
    levelName: 'What is here?',
    levelId: 'b2-ls',
    commands: 1,
    par: 1,
    curriculum,
  });
  assert.match(text, /LearnBash/);
  assert.match(text, /What I have learned so far:/);
  assert.match(text, /Basics: Where am I\?/);
  assert.match(text, /Progress: 2\/12 levels/);
  assert.ok(text.includes(SHARE_URL));
});

test('X post stays short and includes a win line', () => {
  const { curriculum } = sample();
  const text = shareMessageX({
    levelName: 'What is here?',
    levelId: 'b2-ls',
    commands: 1,
    par: 1,
    curriculum,
  });
  assert.ok(text.length <= 280);
  assert.ok(text.includes(SHARE_URL));
});

test('buildShareTargets emits LinkedIn, X, and Facebook URLs', () => {
  const { curriculum } = sample();
  const t = buildShareTargets({
    levelName: 'X',
    levelId: 'b1-pwd',
    commands: 1,
    par: 1,
    curriculum,
  });
  assert.match(t.linkedin, /^https:\/\/www\.linkedin\.com\/shareArticle/);
  assert.match(t.x, /^https:\/\/twitter\.com\/intent\/tweet/);
  assert.match(t.facebook, /^https:\/\/www\.facebook\.com\/sharer/);
});

test('curriculum marks remaining and next after partial progress', () => {
  const { progress, curriculum } = sample();
  assert.equal(curriculum.solvedCount, 2);
  assert.equal(curriculum.total, LEVELS.length);
  assert.equal(curriculum.learned.length, 2);
  assert.ok(curriculum.next);
  assert.equal(curriculum.next.id, 'b3-cd');
  assert.ok(resumeLine(curriculum).includes('2/12'));
  assert.ok(progress['b1-pwd'].solved);
});

test('solution checklist sticks done and flags current', () => {
  const level = LEVELS.find((l) => l.id === 'f2-mkdir');
  const done = new Set();
  const traces = [
    { line: 'mkdir src', code: 0, stages: [{ args: ['mkdir', 'src'] }] },
  ];
  const steps = solutionProgress(level, done, traces);
  assert.equal(steps[0].done, true);
  assert.equal(steps[1].done, false);
  assert.equal(steps[1].isCurrent, true);
});

test('every level has teach, learning, and solution for the checklist', () => {
  for (const level of LEVELS) {
    assert.ok(level.teach && level.teach.length > 80, level.id);
    assert.ok(level.learning?.length >= 2, level.id);
    assert.ok(level.solution?.length >= 1, level.id);
    assert.ok(level.solution.every((s) => s.command && s.note), level.id);
  }
});
