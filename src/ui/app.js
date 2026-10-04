/**
 * Application shell: shell engine + viz + levels + celebrate/share.
 */

import { createSandboxShell, Shell } from '../bash/shell.js';
import { buildFS } from '../bash/fs.js';
import {
  LEVELS,
  levelSeries,
  checkLevel,
  golfScore,
  solutionProgress,
} from '../level/levels.js';
import { renderTree } from '../viz/tree.js';
import { renderPipeline } from '../viz/pipeline.js';
import { createTerminal } from './terminal.js';
import {
  loadProgress,
  saveProgress,
  summarizeCurriculum,
  resumeLine,
} from './progress.js';
import {
  buildShareTargets,
  shareWithClipboard,
  COPY,
  REPO_URL,
} from './share.js';
import { launchConfetti, playFanfare } from './confetti.js';
import {
  quizForSeries,
  sampleLeitner,
  gradeQuizDetailed,
  newLeitner,
  conceptInventory,
  scoreInventory,
  PREDICTS,
  gradePredict,
} from '../level/assess.js';
import {
  newStudyRecord,
  logEvent,
  recordInventory,
  exportStudy,
  loadStudy,
  saveStudy,
  retentionDue,
} from '../level/study.js';
import { renderMarkdown, showModal, escapeHtml } from './dialog.js';
import {
  ui as t,
  LOCALES,
  getLocale,
  setLocale,
  initLocale,
  localizeLevel,
  getDir,
} from '../i18n/index.js';

const state = {
  mode: /** @type {'sandbox' | 'level'} */ ('sandbox'),
  level: /** @type {any} */ (null),
  shell: /** @type {any} */ (null),
  seed: /** @type {any} */ (null),
  traces: /** @type {any[]} */ ([]),
  solved: loadProgress(),
  /** @type {Set<number>} */
  doneSteps: new Set(),
  offered: false,
  hintIdx: 0,
  idleCommands: 0,
  _lastMet: 0,
  leitner: loadLeitner(),
  study: loadStudy(),
  studyPid:
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('learnbash.studyPid') ?? null
      : null,
};

/** @type {any} */
let termRef = null;

function getTerm() {
  return termRef;
}

/**
 * Boot the app once DOM is ready.
 */
export function init() {
  initLocale();
  const app = document.getElementById('app');
  if (!app) throw new Error('#app missing');

  app.innerHTML = layoutHTML();

  const term = createTerminal(document.getElementById('terminal-host'), {
    onSubmit: (line) => handleLine(line, term),
  });
  termRef = term;
  wireToolbar(term);

  enterSandbox(term, true);
  const u = t();
  const summary = summarizeCurriculum(state.solved);
  term.printHtml(
    `Welcome to Learn<b style="color:var(--accent);font-weight:700">Bash</b> — ${escapeHtml(u.appWelcome || 'type help for commands, levels to learn.')}`
  );
  if (summary.solvedCount > 0) {
    term.print(resumeLine(summary));
  }
  term.focus();
}

/**
 * Bind toolbar / nav / language controls.
 *
 * Args:
 *     term: terminal API
 */
function wireToolbar(term) {
  const root = document.getElementById('app');
  root.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'nav-toggle') {
        toggleNav();
        return;
      }
      if (action === 'lang-toggle') {
        toggleLang();
        return;
      }
      closeNav();
      closeLang();
      if (action === 'levels') openLevels();
      if (action === 'lesson') replayLesson(term);
      if (action === 'goal') focusGuide();
      if (action === 'hint') showHint(term);
      if (action === 'solution') showSolution(term);
      if (action === 'undo') handleLine('undo', term);
      if (action === 'reset') handleLine('reset', term);
      if (action === 'sandbox') enterSandbox(term);
      if (action === 'help') showHelp(term);
      term.focus();
    });
  });
  root.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const loc = btn.getAttribute('data-lang');
      if (!loc || loc === getLocale()) {
        closeLang();
        return;
      }
      setLocale(loc);
      remountAfterLocale(term);
    });
  });
}

function toggleNav() {
  const drawer = document.getElementById('nav-drawer');
  const btn = document.querySelector('[data-action="nav-toggle"]');
  if (!drawer || !btn) return;
  const open = drawer.classList.toggle('is-open');
  drawer.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) closeLang();
}

function closeNav() {
  const drawer = document.getElementById('nav-drawer');
  const btn = document.querySelector('[data-action="nav-toggle"]');
  if (!drawer || !btn) return;
  drawer.classList.remove('is-open');
  drawer.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

function toggleLang() {
  const menu = document.getElementById('lang-dropdown');
  const btn = document.querySelector('[data-action="lang-toggle"]');
  if (!menu || !btn) return;
  const open = menu.classList.toggle('is-open');
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) closeNav();
}

function closeLang() {
  const menu = document.getElementById('lang-dropdown');
  const btn = document.querySelector('[data-action="lang-toggle"]');
  if (!menu || !btn) return;
  menu.classList.remove('is-open');
  menu.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

/**
 * Rebuild chrome after a language switch; keep mode/level.
 */
function remountAfterLocale(term) {
  const levelId = state.level?.id ?? null;
  const wasLevel = state.mode === 'level';
  const traces = state.traces;
  const doneSteps = state.doneSteps;
  const app = document.getElementById('app');
  app.innerHTML = layoutHTML();
  const newTerm = createTerminal(document.getElementById('terminal-host'), {
    onSubmit: (line) => handleLine(line, newTerm),
  });
  termRef = newTerm;
  wireToolbar(newTerm);
  if (wasLevel && levelId) {
    const raw = LEVELS.find((l) => l.id === levelId);
    if (raw) {
      state.level = localizeLevel(raw);
      state.mode = 'level';
      state.traces = traces;
      state.doneSteps = doneSteps;
      renderAll();
      newTerm.setPrompt(state.shell.prompt());
      newTerm.print(state.level.brief);
    }
  } else {
    enterSandbox(newTerm, true);
    newTerm.print(t().sandboxReady);
  }
  newTerm.focus();
}

function layoutHTML() {
  const u = t();
  const current = getLocale();
  const langItems = LOCALES.map(
    (loc) =>
      `<button type="button" class="lang-option${current === loc ? ' on' : ''}" data-lang="${loc}" role="menuitem" aria-checked="${current === loc}">${loc.toUpperCase()}</button>`
  ).join('');
  return `
    <div class="app-main">
      <header class="toolbar">
        <div class="brand" data-help-id="brand">
          <img class="brand-logo" src="./assets/logo.svg" width="28" height="28" alt="" />
          <span>Learn<b>Bash</b></span>
        </div>
        <div class="level-title" id="level-title" data-help-id="level-title"></div>
        <div class="toolbar-actions" data-help-id="toolbar">
          <div class="lang-menu">
            <button type="button" class="lang-btn" data-action="lang-toggle" aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(u.language)}">
              <span data-lang-label>${current.toUpperCase()}</span>
              <span class="lang-caret" aria-hidden="true"></span>
            </button>
            <div class="lang-dropdown" id="lang-dropdown" role="menu" hidden>
              ${langItems}
            </div>
          </div>
          <button type="button" class="nav-toggle" data-action="nav-toggle" aria-label="${escapeHtml(u.menuLabel)}" aria-expanded="false" aria-controls="nav-drawer">
            <span class="nav-bars" aria-hidden="true"></span>
          </button>
          <div class="nav-drawer" id="nav-drawer" hidden>
            <button type="button" data-action="levels">${escapeHtml(u.levels)}</button>
            <button type="button" data-action="lesson" title="${escapeHtml(u.lessonTitle)}">${escapeHtml(u.lesson)}</button>
            <button type="button" data-action="goal">${escapeHtml(u.guide)}</button>
            <button type="button" data-action="hint">${escapeHtml(u.hint)}</button>
            <button type="button" data-action="solution">${escapeHtml(u.solution)}</button>
            <button type="button" data-action="undo">${escapeHtml(u.undo)}</button>
            <button type="button" data-action="reset">${escapeHtml(u.reset)}</button>
            <button type="button" data-action="sandbox" class="ghost">${escapeHtml(u.sandboxBtn)}</button>
            <button type="button" class="help-btn" data-action="help" title="${escapeHtml(u.uiGuideTitle)}" aria-label="${escapeHtml(u.help)}">?</button>
          </div>
          <a class="tb-link gh" data-help-id="links" href="https://github.com/alisadeghiaghili/learn-bash" target="_blank" rel="noopener noreferrer" title="${escapeHtml(u.githubTitle)}" aria-label="GitHub repository"><svg class="gh-mark" viewBox="0 0 16 16" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
          <a class="tb-link support" data-help-id="links" href="https://www.buymeacoffee.com/alisadeghil" target="_blank" rel="noopener noreferrer" title="${escapeHtml(u.supportTitle)}">${escapeHtml(u.support)}</a>
        </div>
      </header>
      <div class="board-wrap" id="board-wrap">
        <div class="viz-pane">
          <div class="pane-label">${escapeHtml(u.filesystem)}</div>
          <svg id="tree-svg" class="viz-svg" role="img" aria-label="${escapeHtml(u.filesystem)}"></svg>
          <div class="pane-label">${escapeHtml(u.pipeline)}</div>
          <svg id="pipe-svg" class="viz-svg pipe-svg" role="img" aria-label="${escapeHtml(u.pipeline)}"></svg>
        </div>
      </div>
      <div class="terminal" id="terminal-host" data-help-id="term-log"></div>
    </div>
    <aside class="dock" id="dock" data-help-id="dock" aria-label="${escapeHtml(u.guidePanel)}"></aside>
  `;
}

/**
 * Enter free sandbox mode.
 *
 * Args:
 *     term: terminal API
 *     silent: skip banner
 */
function enterSandbox(term, silent = false) {
  state.mode = 'sandbox';
  state.level = null;
  state.shell = createSandboxShell();
  state.seed = state.shell.capture();
  state.traces = [];
  state.doneSteps = new Set();
  state.offered = false;
  renderAll();
  term.setPrompt(state.shell.prompt());
  term.setExtraCompletions([]);
  if (!silent) term.print(t().sandboxReady);
  term.focus();
}

/**
 * Guide panel is always visible — this only scrolls/flashes it.
 */
function focusGuide() {
  const dock = document.getElementById('dock');
  if (!dock) return;
  dock.classList.remove('dock-pulse');
  void dock.offsetWidth;
  dock.classList.add('dock-pulse');
  dock.scrollTop = 0;
}

/**
 * Start a level by id.
 *
 * Args:
 *     id: level id
 *     term: terminal API
 */
function startLevel(id, term) {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) return;
  state.mode = 'level';
  state.level = localizeLevel(level);
  state.shell = new Shell(buildFS(level.seed.tree), {
    cwd: level.seed.cwd,
    home: level.seed.home,
  });
  state.seed = state.shell.capture();
  state.traces = [];
  state.doneSteps = new Set();
  state.offered = false;
  state.hintIdx = 0;
  state.idleCommands = 0;

  renderAll();
  term.setPrompt(state.shell.prompt());
  term.clear();
  term.print(`Level: ${level.title}`);
  term.print(level.objective);
  term.print(level.brief);
  if (level.transfer) term.print(`Transfer: ${level.transfer}`);
  term.print(`Hint: ${level.hint}`);
  showLevelDialog(state.level);
}

/**
 * Handle one submitted line.
 *
 * Args:
 *     line: user input
 *     term: terminal API
 */
function handleLine(line, term) {
  const raw = line.trim();
  const prompt = state.shell.prompt();
  const lower = raw.toLowerCase();

  // Meta commands
  if (lower === 'levels' || lower === 'level') {
    if (raw) term.pushHistory(raw);
    openLevels();
    return;
  }
  if (lower === 'lesson' || lower === 'intro') {
    if (raw) term.pushHistory(raw);
    replayLesson(term);
    return;
  }
  if (lower === 'goal' || lower === 'guide') {
    if (raw) term.pushHistory(raw);
    focusGuide();
    term.focus();
    return;
  }
  if (lower === 'hint') {
    if (raw) term.pushHistory(raw);
    showHint(term);
    return;
  }
  if (lower === 'solution') {
    if (raw) term.pushHistory(raw);
    showSolution(term);
    return;
  }
  if (lower === 'sandbox' || lower === 'exit') {
    if (raw) term.pushHistory(raw);
    enterSandbox(term);
    return;
  }
  if (lower === 'help' || lower === '?') {
    if (raw) term.pushHistory(raw);
    showHelp(term);
    return;
  }
  if (lower === 'quiz') {
    if (raw) term.pushHistory(raw);
    openQuiz(term, 'current');
    return;
  }
  if (lower === 'review') {
    if (raw) term.pushHistory(raw);
    openQuiz(term, 'review');
    return;
  }
  if (lower === 'predict' || lower === 'inventory') {
    if (raw) term.pushHistory(raw);
    if (lower === 'predict') openQuiz(term, 'predict');
    else openInventory(term, summarizeCurriculum(state.solved).solvedCount > 0 ? 'post' : 'pre');
    return;
  }
  if (lower === 'reset') {
    if (raw) term.pushHistory(raw);
    doReset(term);
    return;
  }

  const trace = state.shell.execute(line);

  if (trace.clear) {
    term.clear();
    if (raw) term.pushHistory(raw);
  } else if (raw) {
    term.printTrace(prompt, line, trace);
    if (raw !== 'undo') {
      state.traces.push(trace);
    }
  }

  term.setPrompt(state.shell.prompt());
  renderAll(trace);

  if (state.mode === 'level' && state.level) {
    const checks = state.level.checks.map((c) => ({
      ...c,
      ok: runCheckQuick(c),
    }));

    // Progressive hints: reveal after commands without new progress
    const met = checks.filter((c) => c.ok).length;
    if (raw && raw !== 'undo') {
      if (met === state._lastMet) state.idleCommands += 1;
      else state.idleCommands = 0;
      state._lastMet = met;
      maybeRevealHint(term);
    }

    if (raw !== 'undo' && !state.level._solved) {
      const { ok } = checkLevel(state.level, state.shell, state.traces);
      if (ok) onLevelSolved(term);
    }
  }

  // Cursor stays in the input after every command unless modal took focus
  if (!document.querySelector('.overlay .modal')) {
    term.focus();
  }
}

function runCheckQuick(check) {
  const fake = { checks: [check] };
  return checkLevel(fake, state.shell, state.traces).ok;
}

/**
 * Reveal the next structured hint after idle thrashing.
 *
 * Args:
 *     term: terminal API
 */
function maybeRevealHint(term) {
  const hints = state.level?.hints ?? [];
  if (!hints.length) return;
  if (state.idleCommands < 2) return;
  if (state.hintIdx >= hints.length) return;
  const hint = hints[state.hintIdx];
  state.hintIdx += 1;
  state.idleCommands = 0;
  term.print(`Hint ${state.hintIdx}/${hints.length}: ${hint}`, 'warn');
}

function showHint(term) {
  if (!state.level) {
    term.print(t().noHintSandbox, 'warn');
    return;
  }
  term.print(`Hint: ${state.level.hint}`, 'warn');
  const hints = state.level.hints ?? [];
  if (hints.length && state.hintIdx < hints.length) {
    const deeper = hints[state.hintIdx];
    state.hintIdx += 1;
    term.print(`Deep hint (${state.hintIdx}/${hints.length}): ${deeper}`, 'warn');
  }
}

function doReset(term) {
  state.shell.resetTo(state.seed);
  state.traces = [];
  state.doneSteps = new Set();
  state.offered = false;
  term.clear();
  term.print(t().resetDone || 'Reset.');
  term.setPrompt(state.shell.prompt());
  renderAll();
  term.focus();
}

function onLevelSolved(term) {
  const id = state.level.id;
  const score = golfScore(state.traces);
  const par = state.level.par;
  const prev = state.solved[id];
  state.solved[id] = {
    solved: true,
    bestCommands: prev?.bestCommands === undefined ? score : Math.min(prev.bestCommands, score),
    at: Date.now(),
  };
  saveProgress(state.solved);
  const u = t();
  term.print('');
  term.print(`${u.levelSolvedBanner || 'Level complete:'} ${state.level.title}`, 'ok');
  term.print(
    score > 0
      ? u.commandsUsed(score, par)
      : u.idealCommands(par),
    'ok'
  );
  state.level = { ...state.level, _solved: true };
  renderDock();
  maybeOfferNext();
}

function maybeOfferNext() {
  if (!state.level || state.offered) return;
  state.offered = true;

  const level = state.level;
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[idx + 1];
  const cmds = golfScore(state.traces) || null;
  const curriculum = summarizeCurriculum(state.solved);
  const share = buildShareTargets({
    levelName: level.title,
    levelId: level.id,
    commands: cmds,
    par: level.par,
    curriculum,
  });
  const total = LEVELS.length;
  const solvedCount = curriculum.solvedCount;
  const underPar = cmds !== null && cmds <= level.par;
  const u = t();
  const golfLine =
    cmds === null
      ? u.idealForLevel(level.par)
      : underPar
        ? `**${cmds}** ${u.idealForLevelShort(level.par)}`
        : `**${cmds}** command${cmds === 1 ? '' : 's'}. Ideal is ${level.par}. Still counts — you got there.`;

  const cheers = u.cheers || [
    'Clean run. The model in your head just got sharper.',
    'That is not memorization — that is the shell making sense.',
    'Level cleared. You can explain this now, not just type it.',
  ];
  const cheer = cheers[Math.floor(Math.random() * cheers.length)];

  const learnedPreview = curriculum.learned
    .map((l) => `<li>${escapeHtml(l.seriesTitle)}: ${escapeHtml(l.name)}</li>`)
    .join('');

  const bodyHtml = `
    <div class="celebrate" aria-live="polite">
      <div class="celebrate-visual" aria-hidden="true">
        <div class="celebrate-ring"></div>
        <div class="celebrate-star">★</div>
      </div>
      <div class="celebrate-badge">${escapeHtml(u.levelCleared || 'LEVEL CLEARED')}</div>
      <h3 class="celebrate-title">${escapeHtml(level.title)}</h3>
      <p class="celebrate-sub">${escapeHtml(level.series)} · <code>${escapeHtml(level.id)}</code></p>
      <p class="celebrate-cheer">${escapeHtml(cheer)}</p>
      <div class="celebrate-stats">${renderMarkdown(golfLine)}</div>
      <div class="celebrate-progress">
        <div class="prog-track"><div class="prog-fill" style="width:${curriculum.percent}%"></div></div>
        <div class="par-note">${solvedCount} / ${total} ${escapeHtml(u.progressLevels ? u.progressLevels(solvedCount, total) : 'levels solved · progress saved in this browser')}</div>
      </div>
      <div class="share-block">
        <div class="next-title">${escapeHtml(u.shareTitle)}</div>
        <div class="learned-preview">
          <div class="par-note">${escapeHtml(u.styleList || 'Skills unlocked:')}</div>
          <ul>${learnedPreview || `<li>${escapeHtml(u.solveMoreLevels || 'Solve more levels to unlock')}</li>`}</ul>
        </div>
        <div class="share-row" role="group" aria-label="${escapeHtml(u.shareGroupLabel || 'Share progress')}">
          <button type="button" class="share-btn linkedin" data-share="linkedin">${escapeHtml(u.linkedin)}</button>
          <button type="button" class="share-btn x" data-share="x">${escapeHtml(u.xTwitter)}</button>
          <button type="button" class="share-btn facebook" data-share="facebook">${escapeHtml(u.facebook)}</button>
          <button type="button" class="share-btn copy" data-share="copy">${escapeHtml(u.copyPost)}</button>
        </div>
        <div class="share-status" data-share-status hidden></div>
      </div>
      ${
        next
          ? `<div class="celebrate-next">${renderMarkdown(u.nextCelebration(next.id, next.title))}</div>`
          : `<div class="celebrate-next">${renderMarkdown(u.lastInPack)}</div>`
      }
    </div>
  `;

  const actions = [
    {
      label: u.baskInIt,
      className: 'ghost',
      onClick: () => {
        state.offered = false;
        termRef?.focus();
      },
    },
  ];

  if (next) {
    actions.push({
      label: u.celebrateOn(next.id),
      className: 'primary',
      onClick: () => {
        state.offered = false;
        startLevel(next.id, termRef);
      },
    });
  } else {
    actions.push({
      label: u.browseLevels,
      className: 'primary',
      onClick: () => {
        state.offered = false;
        openLevels();
      },
    });
  }

  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  const confetti = launchConfetti(4800);
  playFanfare();

  const modal = showModal({
    title: u.levelComplete,
    bodyHtml,
    variant: 'celebrate',
    actions: actions.map((a) => ({
      ...a,
      onClick: () => {
        confetti?.stop();
        modal.close();
        a.onClick();
      },
    })),
    onClose: () => {
      confetti?.stop();
      state.offered = false;
      termRef?.focus();
    },
  });

  modal.el.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const kind = btn.getAttribute('data-share') ?? 'copy';
      const status = modal.el.querySelector('[data-share-status]');
      const result = await shareWithClipboard(kind, share);
      if (!status) return;
      status.hidden = false;
      if (kind === 'copy') {
        status.textContent = result.copied ? u.copyOk : u.copyFail;
        return;
      }
      status.textContent = result.copied ? u.shareCopied : u.shareOpened;
    });
  });

  modal.el.querySelector('.modal')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
}

function renderAll(lastTrace = null) {
  renderTree(
    document.getElementById('tree-svg'),
    state.shell.home,
    state.shell.fs,
    state.shell.cwd,
    { home: state.shell.home, width: 520 }
  );
  const stages = lastTrace?.stages ?? [];
  renderPipeline(document.getElementById('pipe-svg'), stages, { width: 520 });

  const meta = document.getElementById('level-title');
  if (meta) {
    meta.textContent = state.level
      ? `${state.level.series} · ${state.level.title} · ${t().parShort} ${state.level.par}`
      : t().sandboxTitle;
  }

  renderDock();
  syncTerminalHints();
}

function syncTerminalHints() {
  if (!termRef) return;
  if (!state.level) {
    termRef.setHint('ls -la');
    termRef.setExtraCompletions([]);
    return;
  }
  const steps = solutionProgress(state.level, state.doneSteps, state.traces);
  const next = steps.find((s) => s.isCurrent);
  termRef.setHint(next?.command ?? null);
  termRef.setExtraCompletions([
    ...(state.level.solution ?? []).map((s) => s.command),
    ...(state.level.hint ? state.level.hint.split(';').map((s) => s.trim()).filter(Boolean) : []),
  ]);
}

function renderDock() {
  const dockEl = document.getElementById('dock');
  if (!dockEl) return;
  const u = t();

  if (!state.level) {
    dockEl.innerHTML = `
      <h2>${escapeHtml(u.learningGuide)}</h2>
      <p class="objective">${escapeHtml(u.guideAlwaysOn)}</p>
      <div class="learning-box">
        <div class="next-title">${escapeHtml(u.startHere)}</div>
        <ul>
          ${u.startHereItems.map((item) => `<li>${renderMarkdown(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="learning-box">
        <div class="next-title">${escapeHtml(u.sandboxTip)}</div>
        <ul>
          ${u.sandboxTipItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <ul class="goal-list">
        <li class="met">
          <div class="g-label">${escapeHtml(u.noActiveLevel)}</div>
          <div class="g-detail">${escapeHtml(u.noActiveLevelDetail)}</div>
        </li>
      </ul>
      <div class="par-note">${u.guideFlashNote}</div>
    `;
    return;
  }

  const level = state.level;
  const steps = solutionProgress(level, state.doneSteps, state.traces);
  const currentStep = steps.find((s) => s.isCurrent);
  const solved = Boolean(level._solved);

  const items = steps.map((s) => {
    return `<li class="${s.done ? 'met' : ''}${s.isCurrent ? ' current' : ''}">
      <div class="g-label" dir="ltr">${s.done ? '✓' : s.isCurrent ? '▶' : '○'} <code>${escapeHtml(s.command)}</code>${
        s.isCurrent ? ` <span class="chip current-chip">${escapeHtml(u.nowChip)}</span>` : ''
      }</div>
      <div class="g-detail" dir="ltr">${escapeHtml(s.note)}</div>
    </li>`;
  });

  const nextBlock = solved
    ? `<div class="next-box met">${escapeHtml(u.allSolutionMet)}</div>`
    : `<div class="next-box">
        <div class="next-title">${escapeHtml(u.typeNextTitle)}</div>
        <div class="next-row"><span class="g-label">${escapeHtml(u.remainingLabel)}</span>${
          currentStep ? `<code class="g-cmd">${escapeHtml(currentStep.command)}</code>` : ''
        }</div>
        <div class="par-note">${escapeHtml(u.wrongCommandNote)}</div>
      </div>`;

  const prog = state.solved[level.id];
  const golfNote =
    prog?.bestCommands !== undefined
      ? u.bestSoFar(prog.bestCommands, level.par)
      : u.idealSolution(level.par);

  dockEl.innerHTML = `
    <h2>${escapeHtml(level.title)}</h2>
    <p class="objective">${escapeHtml(level.objective)}</p>
    ${
      level.learning?.length
        ? `<div class="learning-box">
            <div class="next-title">${escapeHtml(u.youAreLearning)}</div>
            <ul>${level.learning.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
          </div>`
        : ''
    }
    ${
      level.fieldNotes?.length
        ? `<div class="field-box">
            <div class="next-title">${escapeHtml(u.fieldNotesTitle)}</div>
            <ul>${level.fieldNotes.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
          </div>`
        : ''
    }
    <div class="par-note">${escapeHtml(golfNote)}</div>
    ${solved ? `<div class="solved-banner">${escapeHtml(u.solvedBanner(golfScore(state.traces) || null))}</div>` : ''}
    ${nextBlock}
    <ul class="goal-list">${items.join('')}</ul>
    ${
      level.transfer
        ? `<div class="par-note"><strong>${escapeHtml(u.transferTitle || 'Transfer')}:</strong> ${escapeHtml(level.transfer)}</div>`
        : ''
    }
  `;
}

function replayLesson(term) {
  if (!state.level) {
    term.print(t().noActiveLevel, 'warn');
    return;
  }
  showLevelDialog(state.level);
}

function showLevelDialog(level) {
  const u = t();
  const md = [
    `### ${level.title}`,
    '',
    level.objective,
    '',
    level.brief,
    '',
    '```',
    level.teach,
    '```',
    '',
    level.transfer ? `**${u.transferTitle || 'Transfer'}:** ${level.transfer}` : '',
    `**${u.hint}:** ${level.hint}`,
    '',
    `*${u.idealSolution(level.par)}*`,
  ].filter(Boolean).join('\n');

  showModal({
    title: level.title,
    bodyHtml: renderMarkdown(md),
    actions: [
      {
        label: u.startLevel || u.close,
        className: 'primary',
        onClick: () => termRef?.focus(),
      },
    ],
    onClose: () => termRef?.focus(),
  });
}

function showSolution(term) {
  if (!state.level) {
    term.print(t().noSolutionSandbox, 'warn');
    return;
  }
  const cmds = (state.level.solution ?? []).map((s) => s.command);
  const u = t();
  showModal({
    title: u.solutionTitle(state.level.id),
    bodyHtml: renderMarkdown(
      [
        u.solutionCommands,
        '',
        '```',
        cmds.join('\n'),
        '```',
        '',
        u.solutionWarn,
      ].join('\n'),
    ),
    actions: [
      { label: u.cancel, className: 'ghost', onClick: () => term.focus() },
      {
        label: u.runSolution,
        className: 'primary',
        onClick: () => {
          doReset(term);
          for (const c of cmds) {
            handleLine(c, term);
          }
          term.focus();
        },
      },
    ],
    onClose: () => term.focus(),
  });
}

function showHelp(term) {
  const u = t();
  const bodyHtml = `
    <div class="ui-help">
      <p>${escapeHtml(u.uiHelpIntro || 'LearnBash is an interactive terminal laboratory with visual filesystem and pipeline representations.')}</p>
      <ul>
        <li><strong>${escapeHtml(u.levels)}:</strong> ${escapeHtml(u.levelsTitle || 'Curriculum browser with 38 levels')}</li>
        <li><strong>${escapeHtml(u.lesson)}:</strong> ${escapeHtml(u.lessonTitle || 'Replay lesson introduction')}</li>
        <li><strong>${escapeHtml(u.guide)}:</strong> ${escapeHtml(u.guideAlwaysOn || 'Always-on guide with field notes & checklist')}</li>
        <li><strong>${escapeHtml(u.hint)}:</strong> ${escapeHtml(u.hint || 'Hints for the current challenge')}</li>
        <li><strong>${escapeHtml(u.solution)}:</strong> ${escapeHtml(u.solution || 'View ideal solution & run automatically')}</li>
        <li><strong>${escapeHtml(u.undo)} / ${escapeHtml(u.reset)}:</strong> ${escapeHtml(u.undo || 'Recover previous state')}</li>
        <li><strong>${escapeHtml(u.sandboxBtn)}:</strong> ${escapeHtml(u.modeSandbox || 'Free exploration sandbox')}</li>
      </ul>
      <p><em>${escapeHtml(u.helpCommands || 'Type help, levels, hint, solution in terminal anytime.')}</em></p>
    </div>
  `;
  showModal({
    title: u.uiGuideTitle || u.help,
    bodyHtml,
    actions: [{ label: u.close, className: 'ghost', onClick: () => term.focus() }],
    onClose: () => term.focus(),
  });
}

function openLevels() {
  const u = t();
  const groups = levelSeries();
  const body = groups
    .map((g) => {
      const rows = g.levels
        .map((l) => {
          const done = state.solved[l.id];
          const isChk = l.series === 'Checkpoints' || l.id.startsWith('chk-');
          let locked = false;
          if (isChk && !done?.solved) {
            const base = l.id.replace(/^chk-/, '');
            const map = { basics: 'Basics', streams: 'Streams' };
            const seriesName = map[base] ?? l.series;
            const peers = LEVELS.filter(
              (x) => x.series === seriesName && !x.id.startsWith('chk-')
            );
            locked = peers.length > 0 && !peers.every((p) => state.solved[p.id]?.solved);
          }
          return `<button type="button" class="level-row ${done?.solved ? 'solved' : ''}" data-level="${l.id}" ${locked ? 'disabled' : ''}>
            <span class="id">${l.id}</span>
            <span class="name">${escapeHtml(l.title)}</span>
            <span class="par-note">ideal ${l.par} cmd${l.par === 1 ? '' : 's'}</span>
            <span class="chip ${done?.solved ? 'ok' : ''}" title="${escapeHtml(u.difficultyOf ? u.difficultyOf(l.difficulty ?? 2) : '')}">
              ${done?.solved ? `${escapeHtml(u.solvedLabel || 'Solved')} ${done.bestCommands ?? ''}` : locked ? '🔒' : `par ${l.par}`}
            </span>
          </button>`;
        })
        .join('');
      return `<div class="series-block"><h3>${escapeHtml(g.series)}</h3><div class="level-list">${rows}</div></div>`;
    })
    .join('');

  const modal = showModal({
    title: u.levelsTitle || u.levels,
    bodyHtml: `<p>${escapeHtml(u.pickChallenge || 'Select a challenge to start learning:')}</p><div class="levels-container">${body}</div>`,
    actions: [{ label: u.close, className: 'ghost', onClick: () => modal.close() }],
    onClose: () => termRef?.focus(),
  });

  modal.el.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-level');
      if (!id) return;
      modal.close();
      startLevel(id, termRef);
    });
  });
}

/**
 * Open a concept quiz (current series) or spaced review.
 *
 * Args:
 *     term: terminal API
 *     mode: 'current' | 'review' | 'predict'
 */
function openQuiz(term, mode) {
  if (mode === 'predict') {
    openPredict(term);
    return;
  }
  const u = t();
  const items =
    mode === 'review'
      ? sampleLeitner(state.leitner, 3, state.level?.series ?? null)
      : quizForSeries(state.level?.series ?? '*').slice(0, 3);

  if (!items.length) {
    term.print(u.noQuizItems || 'No quiz items yet. Finish a level series first.', 'warn');
    term.focus();
    return;
  }

  let idx = 0;
  let score = 0;
  let currentModal = null;

  const renderCurrent = () => {
    const item = items[idx];
    const choicesHtml = item.choices
      .map(
        (c, i) =>
          `<button type="button" class="level-row quiz-choice" data-i="${i}">
            <span class="level-row-title">${escapeHtml(c)}</span>
          </button>`
      )
      .join('');

    const bodyHtml = `
      <p class="brief">${escapeHtml(item.prompt)}</p>
      <div class="quiz-choices">${choicesHtml}</div>
      <p class="par">Confidence: pick how sure you are after choosing</p>
      <div class="share-row" role="group" aria-label="confidence">
        <button type="button" class="btn conf" data-c="1">1 guess</button>
        <button type="button" class="btn conf" data-c="2">2 sure</button>
        <button type="button" class="btn conf" data-c="3">3 certain</button>
      </div>
      <div class="share-status quiz-feedback" data-quiz-feedback hidden></div>
      <p class="par">Question ${idx + 1} / ${items.length} · score ${score}</p>
    `;

    if (currentModal) currentModal.close();
    currentModal = showModal({
      title: mode === 'review' ? (u.reviewTitle || 'Spaced review') : (u.quizTitle || 'Concept quiz'),
      bodyHtml,
      actions: [{ label: u.close, className: 'ghost', onClick: () => currentModal.close() }],
      onClose: () => term.focus(),
    });

    const body = currentModal.el;
    let confidence = 2;
    body.querySelectorAll('.conf').forEach((btn) => {
      btn.addEventListener('click', () => {
        confidence = Number(btn.getAttribute('data-c'));
        body.querySelectorAll('.conf').forEach((b) => {
          b.style.borderColor = b === btn ? 'var(--neon)' : 'var(--line)';
        });
      });
    });

    body.querySelectorAll('.quiz-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pick = Number(btn.getAttribute('data-i'));
        const g = gradeQuizDetailed(state.leitner, item, pick, confidence);
        saveLeitner(state.leitner);
        if (g.ok) score += 1;
        const fb = body.querySelector('[data-quiz-feedback]');
        if (fb) {
          fb.hidden = false;
          fb.textContent = g.ok
            ? `Correct. ${g.why}`
            : `Not quite. ${g.misconception}: ${g.coach}`;
        }
        body.querySelectorAll('.quiz-choice').forEach((b) => {
          b.disabled = true;
          if (Number(b.getAttribute('data-i')) === item.answer) {
            b.style.borderColor = 'var(--accent)';
          }
        });
        setTimeout(() => {
          idx += 1;
          if (idx < items.length) {
            renderCurrent();
          } else {
            if (currentModal) currentModal.close();
            currentModal = showModal({
              title: u.quizDone || 'Quiz complete',
              bodyHtml: `
                <p class="brief">Quiz done — ${score} / ${items.length}.</p>
                <p class="hint">${
                  score === items.length
                    ? 'Solid understanding, not just commands.'
                    : 'Weak items moved to Leitner box 1 — Review will resurface them.'
                }</p>
              `,
              actions: [
                {
                  label: u.backToTerminal || 'Back to terminal',
                  className: 'primary',
                  onClick: () => {
                    currentModal.close();
                    term.focus();
                  },
                },
              ],
              onClose: () => term.focus(),
            });
          }
        }, 1400);
      });
    });
  };

  renderCurrent();
}

/**
 * Prediction tasks: say what will print before running.
 *
 * Args:
 *     term: terminal API
 */
function openPredict(term) {
  const task = PREDICTS[(Math.random() * PREDICTS.length) | 0];
  const u = t();
  const choicesHtml = task.choices
    .map(
      (c, i) =>
        `<button type="button" class="level-row quiz-choice" data-i="${i}">
          <span class="level-row-title">${escapeHtml(c)}</span>
        </button>`
    )
    .join('');

  const bodyHtml = `
    <p class="brief">${escapeHtml(task.prompt)}</p>
    <p class="par"><code>${escapeHtml(task.command)}</code></p>
    <div class="quiz-choices">${choicesHtml}</div>
    <div class="share-status quiz-feedback" data-quiz-feedback hidden></div>
  `;

  const modal = showModal({
    title: u.predictTitle || 'Predict, then run',
    bodyHtml,
    actions: [{ label: u.close, className: 'ghost', onClick: () => modal.close() }],
    onClose: () => term.focus(),
  });

  const body = modal.el;
  body.querySelectorAll('.quiz-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pick = Number(btn.getAttribute('data-i'));
      const g = gradePredict(task, pick);
      const fb = body.querySelector('[data-quiz-feedback]');
      if (fb) {
        fb.hidden = false;
        fb.textContent = g.ok ? `Correct. ${g.why}` : `Not quite. ${g.why}`;
      }
      body.querySelectorAll('.quiz-choice').forEach((b) => {
        b.disabled = true;
        if (Number(b.getAttribute('data-i')) === task.answer) {
          b.style.borderColor = 'var(--accent)';
        }
      });
      setTimeout(() => {
        modal.close();
        term.print(`# verify: ${task.command}`, 'warn');
        term.focus();
      }, 1600);
    });
  });
}

/**
 * Pre/post concept inventory.
 *
 * Args:
 *     term: terminal API
 *     variant: 'pre' | 'post'
 */
export function openInventory(term, variant) {
  const items = conceptInventory(variant);
  const answers = {};
  const u = t();
  let idx = 0;
  let currentModal = null;

  const finish = () => {
    const sc = scoreInventory(items, answers);
    const pct = Math.round((sc.score / sc.total) * 100);
    if (!state.studyPid) {
      state.studyPid = 'P' + Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        localStorage.setItem('learnbash.studyPid', state.studyPid);
      } catch {
        /* ignore */
      }
    }
    let rec = state.study.find((r) => r.pid === state.studyPid);
    if (!rec) {
      rec = newStudyRecord(state.studyPid);
      state.study.push(rec);
    }
    const stage = retentionDue(rec) && rec.post ? 'retention' : variant;
    recordInventory(rec, stage, items, answers);
    saveStudy(state.study);

    if (currentModal) currentModal.close();
    currentModal = showModal({
      title: variant === 'pre' ? 'Pre-test inventory' : 'Post-test inventory',
      bodyHtml: `
        <p class="brief">Inventory score: <strong>${sc.score}/${sc.total}</strong> (${pct}%). Stored as <code>${escapeHtml(state.studyPid)}</code> / ${escapeHtml(stage)}.</p>
        ${
          sc.misses.length
            ? `<div class="learning-box"><div class="next-title">Misconceptions to repair</div><ul>${sc.misses
                .map((m) => `<li><strong>${escapeHtml(m.key)}:</strong> ${escapeHtml(m.misconception)}</li>`)
                .join('')}</ul></div>`
            : '<p class="hint">No misconceptions logged. Strong mental model.</p>'
        }
      `,
      actions: [
        {
          label: u.backToTerminal || 'Back to terminal',
          className: 'primary',
          onClick: () => {
            currentModal.close();
            term.focus();
          },
        },
      ],
      onClose: () => term.focus(),
    });
  };

  const renderCurrent = () => {
    const item = items[idx];
    const choicesHtml = item.choices
      .map(
        (c, i) =>
          `<button type="button" class="level-row quiz-choice" data-i="${i}">
            <span class="level-row-title">${escapeHtml(c)}</span>
          </button>`
      )
      .join('');

    const bodyHtml = `
      <p class="brief">${escapeHtml(item.prompt)}</p>
      <div class="quiz-choices">${choicesHtml}</div>
      <p class="par">Question ${idx + 1} / ${items.length}</p>
    `;

    if (currentModal) currentModal.close();
    currentModal = showModal({
      title: variant === 'pre' ? 'Pre-test inventory' : 'Post-test inventory',
      bodyHtml,
      actions: [{ label: u.close, className: 'ghost', onClick: () => currentModal.close() }],
      onClose: () => term.focus(),
    });

    const body = currentModal.el;
    body.querySelectorAll('.quiz-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[item.id] = Number(btn.getAttribute('data-i'));
        idx += 1;
        if (idx < items.length) renderCurrent();
        else finish();
      });
    });
  };

  renderCurrent();
}

function loadLeitner() {
  try {
    const raw = localStorage.getItem('learnbash.leitner');
    return raw ? JSON.parse(raw) : newLeitner();
  } catch {
    return newLeitner();
  }
}

function saveLeitner(val) {
  try {
    localStorage.setItem('learnbash.leitner', JSON.stringify(val));
  } catch {
    /* ignore */
  }
}
