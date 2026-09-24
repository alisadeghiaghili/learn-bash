/**
 * Study instrumentation: pre/post inventory, retention window, anonymized export.
 *
 * This module does NOT invent empirical results. It stores real learner
 * interactions so a study lead can export evidence. Synthetic checks live
 * in tests/study-harness.test.js and are labeled as such.
 */

import { conceptInventory, scoreInventory, newLeitner } from './assess.js';

export const STUDY_KEY = 'learnbash.study.v1';
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} StudyRecord
 * @property {string} pid           // anonymous participant id
 * @property {string} startedAt
 * @property {any} pre
 * @property {any} post
 * @property {any} retention
 * @property {any[]} events
 * @property {any} leitner
 */

/**
 * Create a new anonymous study record.
 *
 * Args:
 *     pid: participant code (no PII)
 * Returns:
 *     StudyRecord
 */
export function newStudyRecord(pid) {
  return {
    pid,
    startedAt: new Date().toISOString(),
    pre: null,
    post: null,
    retention: null,
    events: [],
    leitner: newLeitner(),
  };
}

/**
 * Log an interaction event (command, quiz, level clear).
 *
 * Args:
 *     record: StudyRecord (mutated)
 *     type: event type
 *     payload: serializable detail
 */
export function logEvent(record, type, payload = {}) {
  record.events.push({
    at: new Date().toISOString(),
    type,
    payload,
  });
}

/**
 * Record an inventory result on the study record.
 *
 * Args:
 *     record: StudyRecord
 *     stage: 'pre' | 'post' | 'retention'
 *     items: inventory items
 *     answers: map itemId → choice
 * Returns:
 *     score summary
 */
export function recordInventory(record, stage, items, answers) {
  const scored = scoreInventory(items, answers);
  record[stage] = {
    at: new Date().toISOString(),
    ...scored,
  };
  return scored;
}

/**
 * Whether a retention probe is due (≥ 7 days after pre).
 *
 * Args:
 *     record: StudyRecord
 *     now: ms timestamp (default Date.now())
 * Returns:
 *     boolean
 */
export function retentionDue(record, now = Date.now()) {
  if (!record.startedAt) return false;
  return now - Date.parse(record.startedAt) >= RETENTION_MS;
}

/**
 * Build a de-identified export package for analysis.
 *
 * Args:
 *     records: StudyRecord[]
 * Returns:
 *     { exportedAt, n, summary, records }
 */
export function exportStudy(records) {
  const preScores = records.map((r) => r.pre?.score ?? null);
  const postScores = records.map((r) => r.post?.score ?? null);
  const retScores = records.map((r) => r.retention?.score ?? null);
  const paired = records.filter((r) => r.pre && r.post);
  const gains = paired.map((r) => (r.post.score - r.pre.score) / Math.max(1, r.pre.total));
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return {
    exportedAt: new Date().toISOString(),
    n: records.length,
    summary: {
      nPre: records.filter((r) => r.pre).length,
      nPost: records.filter((r) => r.post).length,
      nRetention: records.filter((r) => r.retention).length,
      meanPre: mean(preScores.filter((x) => x !== null)),
      meanPost: mean(postScores.filter((x) => x !== null)),
      meanRetention: mean(retScores.filter((x) => x !== null)),
      meanNormalizedGain: mean(gains),
    },
    records: records.map((r) => ({
      pid: r.pid,
      startedAt: r.startedAt,
      pre: r.pre,
      post: r.post,
      retention: r.retention,
      eventCount: r.events.length,
      leitner: r.leitner,
    })),
  };
}

/**
 * Build pre inventory answers from a response map of raw choice indexes.
 *
 * Args:
 *     answers: Record<itemId, index>
 * Returns:
 *     { items, answers }
 */
export function inventorySet(variant, answers) {
  const items = conceptInventory(variant);
  return { items, answers };
}

/**
 * Load/save study records in localStorage.
 *
 * Returns:
 *     StudyRecord[]
 */
export function loadStudy() {
  try {
    return JSON.parse(localStorage.getItem(STUDY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveStudy(records) {
  try {
    localStorage.setItem(STUDY_KEY, JSON.stringify(records));
  } catch {
    /* quota */
  }
}
