/**
 * Application shell: wires shell engine, viz, levels, and terminal.
 */

import { createSandboxShell, Shell } from '../bash/shell.js';
import { buildFS } from '../bash/fs.js';
import { LEVELS, levelSeries, checkLevel, golfScore } from '../level/levels.js';
import { renderTree } from '../viz/tree.js';
import { renderPipeline } from '../viz/pipeline.js';
import { createTerminal } from './terminal.js';

const state = {
  mode: /** @type {'sandbox' | 'level'} */ ('sandbox'),
  level: /** @type {import('../level/levels.js').Level | null} */ (null),
  shell: /** @type {Shell} */ (createSandboxShell()),
  seed: /** @type {any} */ (null),
  traces: /** @type {any[]} */ ([]),
  solved: loadProgress(),
};

/** @type {ReturnType<typeof createTerminal> | null} */
let termRef = null;

/**
 * Boot the app once DOM is ready.
 */
export function init() {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app missing');

  app.innerHTML = layoutHTML();

  const term = createTerminal(document.getElementById('terminal-host'), {
    onSubmit: (line) => handleLine(line, term),
  });
  termRef = term;

  document.getElementById('btn-levels')?.addEventListener('click', () => openLevels());
  document.getElementById('btn-goal')?.addEventListener('click', () => showGoal(term));
  document.getElementById('btn-undo')?.addEventListener('click', () => handleLine('undo', term));
  document.getElementById('btn-reset')?.addEventListener('click', () => handleLine('reset', term));
  document.getElementById('btn-help')?.addEventListener('click', () => handleLine('help', term));
  document.getElementById('btn-sandbox')?.addEventListener('click', () => enterSandbox(term));
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'modal') closeModal();
  });

  enterSandbox(term, true);
  term.print('LearnBash — type `help` for commands, `levels` to learn.');
  term.focus();
}

function layoutHTML() {
  return `
    <header class="topbar">
      <div class="brand">LearnBash</div>
      <div class="level-meta">
        <span id="mode-label" class="mode-label">Sandbox</span>
        <span id="level-title" class="level-title">Free exploration</span>
      </div>
      <div class="actions">
        <span id="golf" class="golf" title="commands used vs par"></span>
        <button type="button" id="btn-sandbox" class="btn">Sandbox</button>
        <button type="button" id="btn-levels" class="btn">Levels</button>
        <button type="button" id="btn-goal" class="btn">Goal</button>
        <button type="button" id="btn-undo" class="btn">Undo</button>
        <button type="button" id="btn-reset" class="btn">Reset</button>
        <button type="button" id="btn-help" class="btn">Help</button>
      </div>
    </header>
    <main class="split">
      <section class="pane terminal-pane">
        <div class="pane-label">Terminal</div>
        <div id="terminal-host"></div>
      </section>
      <section class="pane viz-pane">
        <div class="pane-label">Filesystem</div>
        <svg id="tree-svg" class="viz-svg" role="img" aria-label="Filesystem tree"></svg>
        <div class="pane-label">Pipeline</div>
        <svg id="pipe-svg" class="viz-svg pipe-svg" role="img" aria-label="Pipeline dataflow"></svg>
        <div id="checks" class="checks" aria-live="polite"></div>
      </section>
    </main>
    <footer class="goalbar">
      <span class="goal-label">Goal</span>
      <span id="goal-text">Explore the shell. Type help for the command list.</span>
    </footer>
    <div id="modal" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="modal-title">Levels</h2>
          <button type="button" id="modal-close" class="btn">Close</button>
        </div>
        <div id="modal-body" class="modal-body"></div>
      </div>
    </div>
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
  setHeader('Sandbox', 'Free exploration');
  setGoal('Explore the shell. Type help for the command list.');
  document.getElementById('golf').textContent = '';
  renderAll();
  term.setPrompt(state.shell.prompt());
  if (!silent) term.print('Sandbox ready. `levels` opens lessons.');
  updateChecks([]);
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
  state.level = level;
  state.shell = new Shell(buildFS(level.seed.tree), {
    cwd: level.seed.cwd,
    home: level.seed.home,
  });
  state.seed = state.shell.capture();
  state.traces = [];
  setHeader(level.series, level.title);
  setGoal(level.brief);
  document.getElementById('golf').textContent = `0 / par ${level.par}`;
  renderAll();
  term.setPrompt(state.shell.prompt());
  term.clear();
  term.print(`Level: ${level.title}`);
  term.print(level.brief);
  term.print(`Hint: ${level.hint}`);
  updateChecks(level.checks.map((c) => ({ ...c, ok: false })));
  showLevelDialog(level);
}

/**
 * Handle one submitted line.
 *
 * Args:
 *     line: user input
 *     term: terminal API
 */
function handleLine(line, term) {
  const prompt = state.shell.prompt();
  const trace = state.shell.execute(line);

  if (trace.app === 'levels') {
    if (line.trim()) term.pushHistory(line);
    openLevels();
    return;
  }
  if (trace.app === 'goal') {
    if (line.trim()) term.pushHistory(line);
    showGoal(term);
    return;
  }
  if (trace.app === 'reset') {
    if (line.trim()) term.pushHistory(line);
    doReset(term);
    return;
  }

  if (trace.clear) {
    term.clear();
    if (line.trim()) term.pushHistory(line);
  } else if (line.trim()) {
    term.printTrace(prompt, line, trace);
    if (line.trim() !== 'undo') {
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
    updateChecks(checks);
    const g = document.getElementById('golf');
    if (g) g.textContent = `${golfScore(state.traces)} / par ${state.level.par}`;

    if (line.trim() !== 'undo' && !state.level._solved) {
      const { ok } = checkLevel(state.level, state.shell, state.traces);
      if (ok) onLevelSolved(term);
    }
  }
}

function runCheckQuick(check) {
  const fake = { checks: [check] };
  return checkLevel(fake, state.shell, state.traces).ok;
}

function doReset(term) {
  state.shell.resetTo(state.seed);
  state.traces = [];
  term.clear();
  term.print('Reset.');
  term.setPrompt(state.shell.prompt());
  renderAll();
  updateChecks(state.level ? state.level.checks.map((c) => ({ ...c, ok: false })) : []);
  const g = document.getElementById('golf');
  if (g) {
    g.textContent = state.mode === 'level' && state.level ? `0 / par ${state.level.par}` : '';
  }
}

function onLevelSolved(term) {
  const id = state.level.id;
  const score = golfScore(state.traces);
  const par = state.level.par;
  state.solved[id] = { score, par, at: Date.now() };
  saveProgress();
  term.print('');
  term.print(`Level complete. ${score} command(s) · par ${par}`, 'ok');
  if (score < par) term.print('Under par.', 'ok');
  if (score === par) term.print('Matched par.', 'ok');
  if (score > par) term.print('Over par — try again for a tighter run.', 'warn');
  state.level = { ...state.level, _solved: true };
  showWinDialog(state.level, score, par);
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
}

function setHeader(mode, title) {
  document.getElementById('mode-label').textContent = mode;
  document.getElementById('level-title').textContent = title;
}

function setGoal(text) {
  document.getElementById('goal-text').textContent = text;
}

function showGoal(term) {
  const text =
    state.mode === 'level' && state.level
      ? `${state.level.brief}\nHint: ${state.level.hint}`
      : 'Explore freely. Type `levels` for lessons.';
  if (state.mode === 'level' && state.level) setGoal(state.level.brief);
  term.print(text);
}

function updateChecks(checks) {
  const el = document.getElementById('checks');
  if (!el) return;
  if (!checks.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = checks
    .map(
      (c) =>
        `<div class="check ${c.ok ? 'ok' : 'pending'}">${c.ok ? '✓' : '○'} ${escapeHtml(
          checkLabel(c)
        )}</div>`
    )
    .join('');
}

function checkLabel(c) {
  switch (c.type) {
    case 'cwd_is':
      return `cwd = ${c.value}`;
    case 'file_exists':
      return `file ${c.value}`;
    case 'dir_exists':
      return `dir ${c.value}`;
    case 'file_missing':
      return `no ${c.value}`;
    case 'file_contains':
      return `${c.path} contains "${c.value}"`;
    case 'last_stdout_contains':
      return `output has "${c.value}"`;
    case 'last_stdout_not_contains':
      return `output lacks "${c.value}"`;
    case 'last_stdout_matches':
      return `output matches /${c.value}/`;
    case 'cmd_used':
      return `use ${c.value}`;
    case 'op_used':
      return `use \`${c.value}\``;
    default:
      return c.type;
  }
}

function openLevels() {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = 'Levels';
  const groups = levelSeries();
  body.innerHTML = groups
    .map((g) => {
      const items = g.levels
        .map((l) => {
          const done = state.solved[l.id];
          const mark = done ? `✓ ${done.score}/${done.par}` : '';
          return `<button type="button" class="level-row" data-id="${l.id}">
            <span class="level-row-title">${escapeHtml(l.title)}</span>
            <span class="level-row-meta">${escapeHtml(g.series)} · par ${l.par} ${mark}</span>
          </button>`;
        })
        .join('');
      return `<section class="level-group"><h3>${escapeHtml(g.series)}</h3>${items}</section>`;
    })
    .join('');

  body.querySelectorAll('.level-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal();
      startLevel(btn.getAttribute('data-id'), getTerm());
    });
  });
  modal.classList.remove('hidden');
}

function showLevelDialog(level) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = level.title;
  body.innerHTML = `
    <p class="brief">${escapeHtml(level.brief)}</p>
    <p class="hint">Hint: ${escapeHtml(level.hint)}</p>
    <p class="par">Par: ${level.par} command(s)</p>
  `;
  modal.classList.remove('hidden');
}

function showWinDialog(level, score, par) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = 'Level complete';
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[idx + 1];
  body.innerHTML = `
    <p class="brief">${escapeHtml(level.title)} solved with ${score} command(s). Par ${par}.</p>
    <div class="win-actions">
      <button type="button" class="btn primary" id="win-next">${next ? 'Next level' : 'Back to levels'}</button>
      <button type="button" class="btn" id="win-replay">Replay</button>
      <button type="button" class="btn" id="win-sandbox">Sandbox</button>
    </div>
  `;
  modal.classList.remove('hidden');
  document.getElementById('win-next')?.addEventListener('click', () => {
    closeModal();
    const term = getTerm();
    if (next) startLevel(next.id, term);
    else openLevels();
  });
  document.getElementById('win-replay')?.addEventListener('click', () => {
    closeModal();
    startLevel(level.id, getTerm());
  });
  document.getElementById('win-sandbox')?.addEventListener('click', () => {
    closeModal();
    enterSandbox(getTerm());
  });
}

function closeModal() {
  document.getElementById('modal')?.classList.add('hidden');
}

function getTerm() {
  return termRef;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('learnbash.progress') ?? '{}');
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem('learnbash.progress', JSON.stringify(state.solved));
}
