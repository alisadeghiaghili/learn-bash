/**
 * Progress persistence (localStorage + cookie) and curriculum summary.
 */

import { LEVELS } from '../level/levels.js';

export const STORAGE_KEY = 'learn-bash-progress-v1';
export const COOKIE_KEY = 'learn_bash_progress';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * @typedef {object} LevelProgress
 * @property {boolean} solved
 * @property {number} [bestCommands]
 * @property {number} [at]
 */

/**
 * @typedef {object} CurriculumItem
 * @property {string} id
 * @property {string} name
 * @property {string} seriesTitle
 * @property {string[]} commands
 * @property {number} [bestCommands]
 * @property {string[]} learning
 */

/**
 * @typedef {object} CurriculumSummary
 * @property {number} solvedCount
 * @property {number} total
 * @property {CurriculumItem[]} learned
 * @property {CurriculumItem[]} remaining
 * @property {CurriculumItem | null} next
 * @property {number} percent
 */

/**
 * Read the progress cookie.
 *
 * Returns:
 *     raw payload string or null
 */
function readCookie() {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey !== COOKIE_KEY) continue;
    try {
      return decodeURIComponent(rest.join('='));
    } catch {
      return rest.join('=');
    }
  }
  return null;
}

/**
 * Write the progress cookie (~400 days).
 *
 * Args:
 *     payload: JSON string
 */
function writeCookie(payload) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(payload);
  document.cookie = `${COOKIE_KEY}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Parse a persist blob (wrapped or bare map).
 *
 * Args:
 *     raw: serialized progress
 * Returns:
 *     map or null
 */
function parseBlob(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'progress' in parsed) {
      return parsed.progress ?? {};
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Merge localStorage + cookie so a later session still resumes.
 *
 * Returns:
 *     Record<string, LevelProgress>
 */
export function loadProgress() {
  let fromLocal = null;
  let fromCookie = null;
  try {
    fromLocal = parseBlob(localStorage.getItem(STORAGE_KEY));
  } catch {
    fromLocal = null;
  }
  try {
    fromCookie = parseBlob(readCookie());
  } catch {
    fromCookie = null;
  }

  const merged = {};
  for (const src of [fromCookie ?? {}, fromLocal ?? {}]) {
    for (const [id, prog] of Object.entries(src)) {
      if (!prog) continue;
      const prev = merged[id];
      merged[id] = {
        solved: Boolean(prog.solved || prev?.solved),
        bestCommands:
          prev?.bestCommands === undefined
            ? prog.bestCommands
            : prog.bestCommands === undefined
              ? prev.bestCommands
              : Math.min(prev.bestCommands, prog.bestCommands),
        at: prog.at ?? prev?.at,
      };
    }
  }
  return merged;
}

/**
 * Persist progress to localStorage and cookie.
 *
 * Args:
 *     progress: map of level id → LevelProgress
 */
export function saveProgress(progress) {
  const blob = {
    progress,
    savedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(blob);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // private mode / quota — cookie still helps
  }
  writeCookie(payload);
}

/**
 * Build the learned/remaining curriculum from progress.
 *
 * Args:
 *     progress: map of level id → LevelProgress
 * Returns:
 *     CurriculumSummary
 */
export function summarizeCurriculum(progress) {
  const learned = [];
  const remaining = [];
  let next = null;

  for (const level of LEVELS) {
    const item = {
      id: level.id,
      name: level.title,
      seriesTitle: level.series,
      commands: (level.solution ?? []).map((s) => s.command),
      bestCommands: progress[level.id]?.bestCommands,
      learning: level.learning ?? [],
    };
    if (progress[level.id]?.solved) {
      learned.push(item);
    } else {
      remaining.push(item);
      if (!next) next = item;
    }
  }

  const lastSolvedIdx = LEVELS.reduce(
    (acc, l, i) => (progress[l.id]?.solved ? i : acc),
    -1
  );
  const officialNext =
    lastSolvedIdx >= 0 ? LEVELS[lastSolvedIdx + 1] : LEVELS[0];
  if (officialNext && progress[officialNext.id]?.solved) {
    next = remaining[0] ?? null;
  } else if (officialNext) {
    const found = remaining.find((r) => r.id === officialNext.id);
    next = found ?? remaining[0] ?? null;
  }

  return {
    solvedCount: learned.length,
    total: LEVELS.length,
    learned,
    remaining,
    next,
    percent: LEVELS.length
      ? Math.round((learned.length / LEVELS.length) * 100)
      : 0,
  };
}

/**
 * One-line resume banner for returning users.
 *
 * Args:
 *     summary: CurriculumSummary
 * Returns:
 *     string
 */
export function resumeLine(summary) {
  if (!summary.solvedCount) {
    return `No saved progress yet (${summary.total} levels waiting). Start with \`levels\`.`;
  }
  const learnedTitles = summary.learned
    .map((l) => `${l.name} (${l.id})`)
    .join(' · ');
  const nextText = summary.next
    ? `Next up: ${summary.next.name} — \`${summary.next.commands[0] ?? 'continue'}\``
    : 'All levels cleared.';
  return [
    `Welcome back — progress saved: ${summary.solvedCount}/${summary.total} levels (${summary.percent}%).`,
    `Learned so far: ${learnedTitles}`,
    nextText,
    `Open Levels to resume. Type \`goal\` after starting a level.`,
  ].join('\n');
}
