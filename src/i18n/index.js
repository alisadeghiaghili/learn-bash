/** Locale runtime: switch language, document dir, UI copy. */

import { en } from './en.js';
import { fa } from './fa.js';
import { de } from './de.js';

export const LOCALES = ['en', 'fa', 'de'];

const STORAGE_KEY = 'learnbash-locale';
const catalogs = { en, fa, de };

let current = 'en';

function isLocale(v) {
  return !!v && LOCALES.includes(v);
}

export function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* private mode */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (nav.toLowerCase().startsWith('de')) return 'de';
  if (nav.toLowerCase().startsWith('fa') || nav.toLowerCase().startsWith('pe')) return 'fa';
  return 'en';
}

export function getLocale() {
  return current;
}

export function setLocale(locale) {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  applyDocumentLocale();
}

export function ui() {
  return catalogs[current].ui;
}

export function getDir() {
  return catalogs[current].dir;
}

export function applyDocumentLocale() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.documentElement.dir = getDir();
}

export function initLocale() {
  current = detectLocale();
  applyDocumentLocale();
  return current;
}

/**
 * Overlay localized copy onto a level (title/objective/brief/hint).
 * Structural fields (solution, checks, seed) stay English.
 *
 * Args:
 *     level: source level
 * Returns:
 *     level with localized teaching chrome when available
 */
export function localizeLevel(level) {
  const copy = catalogs[current].levels?.[level.id];
  if (!copy || current === 'en') return level;
  return {
    ...level,
    title: copy.title ?? level.title,
    objective: copy.objective ?? level.objective,
    brief: copy.brief ?? level.brief,
    hint: copy.hint ?? level.hint,
    transfer: copy.transfer ?? level.transfer,
  };
}
