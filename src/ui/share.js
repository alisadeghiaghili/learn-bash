/**
 * Social share targets built from curriculum progress.
 */

import { ui as t } from '../i18n/index.js';

export const LIVE_URL = 'https://alisadeghiaghili.github.io/learn-bash/';
export const SHARE_URL = 'https://alisadeghiaghili.github.io/learn-bash/';
export const REPO_URL = 'https://github.com/alisadeghiaghili/learn-bash';

/**
 * Locale-aware share copy (mirrors learn-dvc).
 *
 * Returns:
 *     object of share strings
 */
export function copy() {
  const u = t();
  return {
    titleLearnBash: u.titleLearnBash,
    shareTitle: u.shareTitle,
    shareGroupLabel: u.shareGroupLabel,
    linkedin: u.linkedin,
    xTwitter: u.xTwitter,
    facebook: u.facebook,
    copyPost: u.copyPost,
    shareOpened: u.shareOpened,
    shareCopied: u.shareCopied,
    copyOk: u.copyOk,
    copyFail: u.copyFail,
    shareLinkedInHead: u.shareLinkedInHead,
    shareStarting: u.shareStarting,
    shareLatestWin: u.shareLatestWin,
    shareCommands: u.shareCommands,
    shareLearnedSoFar: u.shareLearnedSoFar,
    shareProgress: u.shareProgress,
    shareCta: u.shareCta,
    shareXHead: u.shareXHead,
    shareXFirst: u.shareXFirst,
  };
}

/** Legacy alias */
export const COPY = new Proxy(
  {},
  {
    get: (_target, prop) => copy()[prop],
  }
);

/**
 * @typedef {object} ShareContext
 * @property {string} levelName
 * @property {string} levelId
 * @property {number | null} commands
 * @property {number} par
 * @property {import('./progress.js').CurriculumSummary} curriculum
 */

/**
 * Bullet list of learned curriculum items.
 *
 * Args:
 *     items: curriculum items
 *     limit: optional max lines
 * Returns:
 *     string[]
 */
function bulletList(items, limit) {
  const list = limit ? items.slice(0, limit) : items;
  const lines = list.map((l) => `• ${l.seriesTitle}: ${l.name}`);
  if (limit && items.length > limit) {
    lines.push(`• …and ${items.length - limit} more`);
  }
  return lines;
}

/**
 * Long LinkedIn-style post with full curriculum.
 *
 * Args:
 *     ctx: ShareContext
 * Returns:
 *     string
 */
export function shareMessageLinkedIn(ctx) {
  const u = COPY;
  const c = ctx.curriculum;
  const learned = c.learned.length ? bulletList(c.learned) : [];
  const parts = [
    u.shareLinkedInHead,
    '',
    c.solvedCount > 0
      ? `${u.shareLatestWin(ctx.levelName, ctx.levelId)}${
          ctx.commands !== null ? u.shareCommands(ctx.commands, ctx.par) : ''
        }`
      : u.shareStarting,
    '',
    learned.length ? u.shareLearnedSoFar : '',
    ...learned,
    '',
    u.shareProgress(c.solvedCount, c.total),
    '',
    u.shareCta,
    SHARE_URL,
  ];
  return parts
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Short X/Twitter post under the length limit.
 *
 * Args:
 *     ctx: ShareContext
 * Returns:
 *     string
 */
export function shareMessageX(ctx) {
  const u = COPY;
  const c = ctx.curriculum;
  const head = u.shareXHead(c.solvedCount, c.total);
  const first = c.learned[0] ? `• ${c.learned[0].name}` : u.shareXFirst;
  let text = `${head}\n${first}\n${SHARE_URL}`;
  if (text.length > 275) text = `${head}\n${SHARE_URL}`;
  return text;
}

/**
 * Build open URLs and clipboard payloads.
 *
 * Args:
 *     ctx: ShareContext
 * Returns:
 *     { linkedin, x, facebook, text, shortText, url, learnedLines }
 */
export function buildShareTargets(ctx) {
  const u = COPY;
  const longText = shareMessageLinkedIn(ctx);
  const shortText = shareMessageX(ctx);
  const url = SHARE_URL;
  return {
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
      url
    )}&title=${encodeURIComponent(u.titleLearnBash)}&summary=${encodeURIComponent(
      longText
    )}&source=LearnBash`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      url
    )}&quote=${encodeURIComponent(longText)}`,
    text: longText,
    shortText,
    url,
    learnedLines: bulletList(ctx.curriculum.learned),
  };
}

/**
 * Open a share window.
 *
 * Args:
 *     url: target URL
 */
export function openShareWindow(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
}

/**
 * Copy share payload to the clipboard.
 *
 * Args:
 *     text: post body
 * Returns:
 *     Promise<boolean>
 */
export async function copySharePayload(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Open LinkedIn/X/Facebook with a ready post; clipboard is fallback.
 *
 * Args:
 *     kind: linkedin | facebook | x | copy
 *     targets: ShareTargets
 * Returns:
 *     Promise<{ opened: boolean, copied: boolean }>
 */
export async function shareWithClipboard(kind, targets) {
  if (kind === 'copy') {
    return { opened: false, copied: await copySharePayload(targets.text) };
  }
  const copied = await copySharePayload(
    kind === 'x' ? targets.shortText : targets.text
  );
  const href =
    kind === 'linkedin'
      ? targets.linkedin
      : kind === 'facebook'
        ? targets.facebook
        : targets.x;
  openShareWindow(href);
  return { opened: true, copied };
}
