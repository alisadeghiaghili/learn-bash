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
import { quizForSeries, sampleReview, gradeQuiz } from '../level/assess.js';

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
};

/** @type {any} */
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
  document.getElementById('btn-quiz')?.addEventListener('click', () => openQuiz(term, 'current'));
  document.getElementById('btn-review')?.addEventListener('click', () => openQuiz(term, 'review'));
  document.getElementById('btn-undo')?.addEventListener('click', () => handleLine('undo', term));
  document.getElementById('btn-reset')?.addEventListener('click', () => handleLine('reset', term));
  document.getElementById('btn-help')?.addEventListener('click', () => handleLine('help', term));
  document.getElementById('btn-sandbox')?.addEventListener('click', () => enterSandbox(term));
  document.getElementById('modal-close')?.addEventListener('click', () => {
    closeModal();
    term.focus();
  });
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'modal') {
      closeModal();
      term.focus();
    }
  });

  enterSandbox(term, true);
  const summary = summarizeCurriculum(state.solved);
  term.print('LearnBash — type `help` for commands, `levels` to learn.');
  if (summary.solvedCount > 0) {
    term.print(resumeLine(summary));
  }
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
        <button type="button" id="btn-quiz" class="btn">Quiz</button>
        <button type="button" id="btn-review" class="btn">Review</button>
        <button type="button" id="btn-undo" class="btn">Undo</button>
        <button type="button" id="btn-reset" class="btn">Reset</button>
        <button type="button" id="btn-help" class="btn">Help</button>
      </div>
    </header>
    <main class="split">
      <section class="pane terminal-pane">
        <div class="pane-label">Terminal</div>
        <div id="terminal-host"></div>
        <div id="tab-cycle" class="tab-cycle" hidden></div>
      </section>
      <section class="pane viz-pane">
        <div id="lesson-panel" class="lesson-panel"></div>
        <div class="pane-label">Checklist</div>
        <div id="checklist" class="checklist"></div>
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
  state.doneSteps = new Set();
  state.offered = false;
  setHeader('Sandbox', 'Free exploration');
  setGoal('Explore the shell. Type help for the command list.');
  document.getElementById('golf').textContent = '';
  renderLesson(null);
  renderChecklist([]);
  renderAll();
  term.setPrompt(state.shell.prompt());
  term.setExtraCompletions([]);
  if (!silent) term.print('Sandbox ready. `levels` opens lessons.');
  updateChecks([]);
  term.focus();
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
  state.doneSteps = new Set();
  state.offered = false;
  setHeader(level.series, level.title);
  setGoal(level.brief);
  document.getElementById('golf').textContent = `0 / par ${level.par}`;
  renderLesson(level);
  renderChecklist(
    solutionProgress(level, state.doneSteps, state.traces)
  );
  renderAll();
  term.setPrompt(state.shell.prompt());
  term.setExtraCompletions((level.solution ?? []).map((s) => s.command));
  term.clear();
  term.print(`Level: ${level.title}`);
  term.print(level.objective);
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
    term.focus();
    return;
  }
  if (trace.app === 'quiz') {
    if (line.trim()) term.pushHistory(line);
    openQuiz(term, 'current');
    return;
  }
  if (trace.app === 'review') {
    if (line.trim()) term.pushHistory(line);
    openQuiz(term, 'review');
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
    renderChecklist(solutionProgress(state.level, state.doneSteps, state.traces));
    const g = document.getElementById('golf');
    if (g) g.textContent = `${golfScore(state.traces)} / par ${state.level.par}`;

    if (line.trim() !== 'undo' && !state.level._solved) {
      const { ok } = checkLevel(state.level, state.shell, state.traces);
      if (ok) onLevelSolved(term);
    }
  }

  // Cursor stays in the input after every command.
  term.focus();
}

function runCheckQuick(check) {
  const fake = { checks: [check] };
  return checkLevel(fake, state.shell, state.traces).ok;
}

function doReset(term) {
  state.shell.resetTo(state.seed);
  state.traces = [];
  state.doneSteps = new Set();
  state.offered = false;
  term.clear();
  term.print('Reset.');
  term.setPrompt(state.shell.prompt());
  renderAll();
  renderChecklist(
    state.level ? solutionProgress(state.level, state.doneSteps, state.traces) : []
  );
  updateChecks(state.level ? state.level.checks.map((c) => ({ ...c, ok: false })) : []);
  const g = document.getElementById('golf');
  if (g) {
    g.textContent =
      state.mode === 'level' && state.level ? `0 / par ${state.level.par}` : '';
  }
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
  term.print('');
  term.print(`Level complete. ${score} command(s) · par ${par}`, 'ok');
  if (score < par) term.print('Under par.', 'ok');
  if (score === par) term.print('Matched par.', 'ok');
  if (score > par) term.print('Over par — try again for a tighter run.', 'warn');
  state.level = { ...state.level, _solved: true };
  renderChecklist(solutionProgress(state.level, state.doneSteps, state.traces));
  maybeOfferNext();
}

function maybeOfferNext() {
  if (!state.level || state.offered) return;
  state.offered = true;

  const level = state.level;
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[idx + 1];
  const cmds = golfScore(state.traces);
  const curriculum = summarizeCurriculum(state.solved);
  const share = buildShareTargets({
    levelName: level.title,
    levelId: level.id,
    commands: cmds,
    par: level.par,
    curriculum,
  });

  const cheers = [
    'Clean run. The model in your head just got sharper.',
    'That is not memorization — that is the shell making sense.',
    'Level cleared. You can explain this now, not just type it.',
  ];
  const cheer = cheers[(Math.random() * cheers.length) | 0];

  const learnedPreview = curriculum.learned
    .map((l) => `<li>${escapeHtml(l.seriesTitle)}: ${escapeHtml(l.name)}</li>`)
    .join('');

  const golfLine =
    cmds <= level.par
      ? `**${cmds}** command(s). Ideal is ${level.par}.`
      : `**${cmds}** command(s). Ideal is ${level.par}. Still counts — you got there.`;

  document.getElementById('modal-title').textContent = 'Level complete';
  document.getElementById('modal-body').innerHTML = `
    <div class="celebrate" aria-live="polite">
      <div class="celebrate-visual" aria-hidden="true">
        <div class="celebrate-ring"></div>
        <div class="celebrate-star">★</div>
      </div>
      <div class="celebrate-badge">LEVEL CLEARED</div>
      <h3 class="celebrate-title">${escapeHtml(level.title)}</h3>
      <p class="celebrate-sub">${escapeHtml(level.series)} · <code>${escapeHtml(level.id)}</code></p>
      <p class="celebrate-cheer">${escapeHtml(cheer)}</p>
      <div class="celebrate-stats">${golfLine}</div>
      <div class="celebrate-progress">
        <div class="prog-track"><div class="prog-fill" style="width:${curriculum.percent}%"></div></div>
        <div class="par-note">${curriculum.solvedCount} / ${curriculum.total} levels solved · progress saved in this browser</div>
      </div>
      <div class="share-block">
        <div class="next-title">${escapeHtml(COPY.shareTitle)}</div>
        <div class="learned-preview">
          <ul>${learnedPreview || '<li>Solve more levels to build your curriculum list.</li>'}</ul>
        </div>
        <div class="share-row" role="group" aria-label="${escapeHtml(COPY.shareGroupLabel)}">
          <button type="button" class="share-btn linkedin" data-share="linkedin">${escapeHtml(COPY.linkedin)}</button>
          <button type="button" class="share-btn x" data-share="x">${escapeHtml(COPY.xTwitter)}</button>
          <button type="button" class="share-btn facebook" data-share="facebook">${escapeHtml(COPY.facebook)}</button>
          <button type="button" class="share-btn copy" data-share="copy">${escapeHtml(COPY.copyPost)}</button>
        </div>
        <div class="share-status" data-share-status hidden></div>
      </div>
      <div class="celebrate-next">${
        next
          ? `Next: <strong>${escapeHtml(next.title)}</strong> — <code>${escapeHtml(
              (next.solution ?? [])[0]?.command ?? ''
            )}</code>`
          : 'You cleared every level in the pack.'
      }</div>
    </div>
  `;

  const actions = [];
  actions.push({
    label: 'Bask in it',
    className: 'ghost',
    onClick: () => {
      state.offered = false;
      term.focus();
    },
  });
  if (next) {
    actions.push({
      label: `On to ${next.id}`,
      className: 'primary',
      onClick: () => {
        state.offered = false;
        startLevel(next.id, term);
      },
    });
  } else {
    actions.push({
      label: 'Browse levels',
      className: 'primary',
      onClick: () => {
        state.offered = false;
        openLevels();
      },
    });
  }

  const confetti = launchConfetti(4800);
  playFanfare();

  const body = document.getElementById('modal-body');
  const foot = document.createElement('div');
  foot.className = 'win-actions';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${a.className === 'primary' ? 'primary' : ''}`.trim();
    btn.textContent = a.label;
    btn.addEventListener('click', () => {
      confetti.stop();
      closeModal();
      a.onClick();
    });
    foot.appendChild(btn);
  }
  body.appendChild(foot);

  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');

  body.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const kind = btn.getAttribute('data-share');
      const status = body.querySelector('[data-share-status]');
      const result = await shareWithClipboard(kind, share);
      if (!status) return;
      status.hidden = false;
      if (kind === 'copy') {
        status.textContent = result.copied ? COPY.copyOk : COPY.copyFail;
        return;
      }
      status.textContent = result.copied ? COPY.shareCopied : COPY.shareOpened;
    });
  });

  modal.addEventListener('keydown', (ev) => {
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

function renderLesson(level) {
  const el = document.getElementById('lesson-panel');
  if (!level) {
    el.innerHTML = `
      <div class="pane-label">Learning guide</div>
      <p class="objective">Free sandbox. Explore cwd, files, and pipes — the tree and pipeline diagrams update live.</p>
      <div class="learning-box">
        <div class="next-title">Start here</div>
        <ul>
          <li>Type <code>levels</code> to open the curriculum</li>
          <li>Tab completes one word · ↑/↓ browses history</li>
          <li><code>undo</code> / <code>reset</code> recover state</li>
        </ul>
      </div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="pane-label">What is happening</div>
    <h2 class="lesson-title">${escapeHtml(level.title)}</h2>
    <p class="objective">${escapeHtml(level.objective)}</p>
    <div class="teach-box">${level.teach}</div>
    ${
      level.learning?.length
        ? `<div class="learning-box">
            <div class="next-title">You are learning</div>
            <ul>${level.learning.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
          </div>`
        : ''
    }
  `;
  // teach contains intentional **bold** and `code` — light markdown
  const teach = el.querySelector('.teach-box');
  if (teach) {
    teach.innerHTML = String(level.teach)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}

function renderChecklist(steps) {
  const el = document.getElementById('checklist');
  if (!steps.length) {
    el.innerHTML = `<div class="par-note">No active level — open <code>levels</code> for guided steps.</div>`;
    return;
  }
  const current = steps.find((s) => s.isCurrent);
  el.innerHTML = `
    ${
      current
        ? `<div class="next-box">
            <div class="next-title">Type next — highlighted in orange</div>
            <div class="next-row"><code class="g-cmd">${escapeHtml(current.command)}</code></div>
            <div class="par-note">Tab fills one word at a time.</div>
          </div>`
        : `<div class="next-box met">All solution steps done.</div>`
    }
    <ul class="goal-list">
      ${steps
        .map(
          (s) => `<li class="${s.done ? 'met' : ''}${s.isCurrent ? ' current' : ''}">
          <div class="g-label" dir="ltr">${s.done ? '✓' : s.isCurrent ? '▶' : '○'} <code>${escapeHtml(
            s.command
          )}</code>${s.isCurrent ? ' <span class="chip current-chip">now</span>' : ''}</div>
          <div class="g-detail" dir="ltr">${escapeHtml(s.note)}</div>
        </li>`
        )
        .join('')}
    </ul>
  `;
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
          const mark = done?.solved ? `✓ ${done.bestCommands}/${l.par}` : '';
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
    <p class="brief">${escapeHtml(level.objective)}</p>
    <p class="brief">${escapeHtml(level.brief)}</p>
    <div class="teach-box">${escapeHtml(level.teach)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
    <p class="hint">Hint: ${escapeHtml(level.hint)}</p>
    <p class="par">Par: ${level.par} command(s)</p>
  `;
  modal.classList.remove('hidden');
  getTerm()?.focus?.();
}

function closeModal() {
  document.getElementById('modal')?.classList.add('hidden');
}

/**
 * Open a concept quiz (current series) or spaced review.
 *
 * Args:
 *     term: terminal API
 *     mode: 'current' | 'review'
 */
function openQuiz(term, mode) {
  const items =
    mode === 'review'
      ? sampleReview(state.level?.series ?? null, solvedSeriesList(), 3)
      : quizForSeries(state.level?.series ?? '*').slice(0, 3);

  if (!items.length) {
    term.print('No quiz items yet. Finish a level series first.');
    term.focus();
    return;
  }

  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent =
    mode === 'review' ? 'Spaced review' : 'Concept quiz';

  let idx = 0;
  let score = 0;

  const render = () => {
    const item = items[idx];
    body.innerHTML = `
      <p class="brief">${escapeHtml(item.prompt)}</p>
      <div class="quiz-choices">
        ${item.choices
          .map(
            (c, i) =>
              `<button type="button" class="level-row quiz-choice" data-i="${i}">
                <span class="level-row-title">${escapeHtml(c)}</span>
              </button>`
          )
          .join('')}
      </div>
      <div class="share-status quiz-feedback" data-quiz-feedback hidden></div>
      <p class="par">Question ${idx + 1} / ${items.length} · score ${score}</p>
    `;
    body.querySelectorAll('.quiz-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pick = Number(btn.getAttribute('data-i'));
        const g = gradeQuiz(item, pick);
        if (g.ok) score += 1;
        const fb = body.querySelector('[data-quiz-feedback]');
        fb.hidden = false;
        fb.textContent = g.ok ? `Correct. ${g.why}` : `Not quite. ${g.why}`;
        body.querySelectorAll('.quiz-choice').forEach((b) => {
          b.disabled = true;
          if (Number(b.getAttribute('data-i')) === item.answer) {
            b.style.borderColor = 'var(--accent)';
          }
        });
        setTimeout(() => {
          idx += 1;
          if (idx < items.length) render();
          else {
            body.innerHTML = `
              <p class="brief">Quiz done — ${score} / ${items.length}.</p>
              <p class="hint">${
                score === items.length
                  ? 'Solid understanding, not just commands.'
                  : 'Re-read the teach panels, then try Review later.'
              }</p>
            `;
            const foot = document.createElement('div');
            foot.className = 'win-actions';
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'btn primary';
            close.textContent = 'Back to terminal';
            close.addEventListener('click', () => {
              closeModal();
              term.focus();
            });
            foot.appendChild(close);
            body.appendChild(foot);
          }
        }, 1200);
      });
    });
  };

  render();
  modal.classList.remove('hidden');
}

function solvedSeriesList() {
  const series = new Set();
  for (const level of LEVELS) {
    if (state.solved[level.id]?.solved) series.add(level.series);
  }
  return [...series];
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
