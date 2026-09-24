/**
 * Terminal view: history, word-level Tab completion, ghost cue, stable focus.
 *
 * Ghost never stacks with placeholder — empty input uses placeholder only.
 * Tab fills one word at a time (or the rest of the current partial word).
 */

const BASE_COMMANDS = [
  'pwd',
  'ls',
  'ls -la',
  'cd',
  'cd ..',
  'cd notes',
  'echo',
  'cat',
  'touch',
  'mkdir',
  'mkdir -p',
  'rm',
  'rm -rf',
  'cp',
  'cp -r',
  'mv',
  'whoami',
  'hostname',
  'head',
  'tail',
  'wc',
  'wc -l',
  'grep',
  'chmod',
  'find',
  'find . -name',
  'clear',
  'help',
  'levels',
  'goal',
  'quiz',
  'review',
  'predict',
  'inventory',
  'undo',
  'reset',
];

/**
 * Split input into finished head words + current token.
 *
 * Args:
 *     value: input string
 * Returns:
 *     { head: string[], current: string, afterSpace: boolean }
 */
function parseLine(value) {
  const endsWithSpace = /\s$/.test(value);
  const trimmed = value.replace(/\s+$/, '');
  if (!trimmed) {
    return { head: [], current: '', afterSpace: endsWithSpace };
  }
  const parts = trimmed.split(/\s+/);
  if (endsWithSpace) {
    return { head: parts, current: '', afterSpace: true };
  }
  return {
    head: parts.slice(0, -1),
    current: parts[parts.length - 1],
    afterSpace: false,
  };
}

/**
 * Create and mount a terminal UI.
 *
 * Args:
 *     root: HTMLElement container
 *     handlers: { onSubmit(line) }
 * Returns:
 *     terminal API
 */
export function createTerminal(root, handlers) {
  root.innerHTML = '';
  root.classList.add('terminal');

  root.innerHTML = `
    <div class="terminal-screen" role="log" aria-live="polite"></div>
    <form class="terminal-form" autocomplete="off">
      <span class="terminal-prompt"></span>
      <div class="term-input-wrap">
        <div class="term-ghost" aria-hidden="true"></div>
        <input class="terminal-input" type="text" spellcheck="false"
          autocapitalize="off" autocomplete="off" dir="ltr"
          aria-label="Command input. Tab completes one word. Arrow up and down browse history." />
      </div>
    </form>
  `;

  const screen = root.querySelector('.terminal-screen');
  const form = root.querySelector('.terminal-form');
  const promptEl = root.querySelector('.terminal-prompt');
  const wrapEl = root.querySelector('.term-input-wrap');
  const ghostEl = root.querySelector('.term-ghost');
  const input = root.querySelector('.terminal-input');

  const history = [];
  let historyIdx = history.length;
  let draft = '';
  let extraCompletions = [];
  let wordCycle = [];
  let wordIdx = 0;
  let wordKey = '';
  let measureCtx = null;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  input.addEventListener('input', () => syncGhost());
  input.addEventListener('keydown', onKey);
  root.addEventListener('mousedown', (event) => {
    if (event.target === root || event.target === screen) {
      event.preventDefault();
      focus();
    }
  });

  function focus() {
    if (document.querySelector('.modal:not(.hidden)')) return;
    input.focus();
    const len = input.value.length;
    try {
      input.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }

  function submit() {
    const line = input.value;
    input.value = '';
    historyIdx = history.length;
    draft = '';
    wordCycle = [];
    wordKey = '';
    handlers.onSubmit(line);
    // Keep the caret in the box after every command.
    focus();
    syncGhost();
  }

  function measureText(text) {
    if (!measureCtx) {
      measureCtx = document.createElement('canvas').getContext('2d');
    }
    const ctx = measureCtx;
    if (!ctx) return text.length * 7.2;
    const font = getComputedStyle(input).font;
    ctx.font = font || '13px monospace';
    return ctx.measureText(text).width;
  }

  function allCompletions() {
    return [
      ...new Set([...extraCompletions, ...BASE_COMMANDS, ...history.slice().reverse()]),
    ];
  }

  /**
   * Full commands that share the same head words + current token prefix.
   */
  function matchingCommands(head, current) {
    const cur = current.toLowerCase();
    return allCompletions().filter((cmd) => {
      const words = cmd.split(/\s+/);
      if (words.length <= head.length) {
        if (head.length && words.length === head.length) {
          return words.every((w, i) => w === head[i]);
        }
        return false;
      }
      for (let i = 0; i < head.length; i += 1) {
        if (words[i] !== head[i]) return false;
      }
      if (!cur) return true;
      return (words[head.length] ?? '').toLowerCase().startsWith(cur);
    });
  }

  /**
   * Distinct next-word options in order.
   */
  function nextWords(head, current) {
    const matches = matchingCommands(head, current);
    const words = [];
    const push = (w) => {
      if (!w) return;
      if (!words.includes(w)) words.push(w);
    };
    for (const cmd of matches) {
      push(cmd.split(/\s+/)[head.length]);
    }
    // Also offer path-ish tokens from a minimal vocab when typing args
    if (head[0] && ['cat', 'cd', 'ls', 'rm', 'cp', 'mv', 'touch', 'head', 'tail', 'wc', 'grep', 'chmod'].includes(head[0])) {
      for (const p of ['notes', 'notes/todo.txt', 'README.md', 'hello.sh', 'src', 'report.txt', '.']) {
        push(p);
      }
    }
    return words.filter((w) => !current || w.toLowerCase().startsWith(current.toLowerCase()));
  }

  /**
   * Ghost shows only the rest of the current word (or next word after space).
   * Empty input relies on placeholder alone so two texts never stack.
   */
  function syncGhost() {
    const value = input.value;
    ghostEl.dataset.visible = '0';
    ghostEl.textContent = '';
    ghostEl.style.left = '0px';
    wrapEl.classList.remove('has-ghost');

    if (!value) return;

    const { head, current, afterSpace } = parseLine(value);
    const words = nextWords(head, afterSpace ? '' : current);
    const first = words[0];
    if (!first) return;

    const left = measureText(value);
    if (afterSpace) {
      ghostEl.textContent = first;
      ghostEl.style.left = `${left}px`;
      ghostEl.dataset.visible = '1';
      wrapEl.classList.add('has-ghost');
      return;
    }

    if (!first.toLowerCase().startsWith(current.toLowerCase()) || first.length <= current.length) {
      return;
    }

    // Suffix of the current word only — never the whole command line.
    ghostEl.textContent = first.slice(current.length);
    ghostEl.style.left = `${left}px`;
    ghostEl.dataset.visible = '1';
    wrapEl.classList.add('has-ghost');
  }

  /**
   * Real-terminal Tab: complete the current word (or offer the next word),
   * cycle candidates on repeat Tab.
   */
  function applyTab(e) {
    e.preventDefault();
    const value = input.value;
    const { head, current, afterSpace } = parseLine(value);
    const cycleKey = `${head.join(' ')}|${afterSpace ? '' : current}`;

    const options = nextWords(head, afterSpace ? '' : current);
    if (!options.length) {
      syncGhost();
      return;
    }

    if (cycleKey !== wordKey || !wordCycle.length) {
      wordKey = cycleKey;
      wordCycle = options;
      wordIdx = 0;
    } else {
      wordIdx = (wordIdx + 1) % wordCycle.length;
    }

    const chosen = wordCycle[wordIdx] ?? options[0];
    const headText = head.length ? `${head.join(' ')} ` : '';
    // Complete ONE word. Caller can Tab again for the next word.
    input.value = `${headText}${chosen}`;
    focus();
    syncGhost();

    if (wordCycle.length > 1) {
      const preview = wordCycle.slice(0, 6).join(' · ');
      const hintEl = root.parentElement?.querySelector('#tab-cycle');
      if (hintEl) {
        hintEl.hidden = false;
        hintEl.innerHTML = `Tab word <strong>${wordIdx + 1}/${wordCycle.length}</strong>: <code>${escapeHtml(preview)}</code>${
          wordCycle.length > 6 ? ' …' : ''
        }`;
      }
    }
  }

  function onKey(e) {
    if (e.key === 'Tab') {
      applyTab(e);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
      wordCycle = [];
      wordKey = '';
      syncGhost();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      if (historyIdx === history.length) draft = input.value;
      historyIdx = Math.max(0, historyIdx - 1);
      input.value = history[historyIdx] ?? '';
      wordCycle = [];
      focus();
      syncGhost();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!history.length) return;
      historyIdx = Math.min(history.length, historyIdx + 1);
      input.value =
        historyIdx >= history.length ? draft : (history[historyIdx] ?? '');
      wordCycle = [];
      focus();
      syncGhost();
    }
  }

  const print = (text, klass = '') => {
    const block = document.createElement('div');
    block.className = `terminal-line ${klass}`.trim();
    block.textContent = text;
    screen.appendChild(block);
    screen.scrollTop = screen.scrollHeight;
  };

  const printTrace = (prompt, line, trace) => {
    const echo = document.createElement('div');
    echo.className = 'terminal-line echo';
    const p = document.createElement('span');
    p.className = 'terminal-prompt-inline';
    p.textContent = `${prompt} `;
    const cmd = document.createElement('span');
    cmd.className = 'terminal-cmd';
    cmd.textContent = line;
    echo.appendChild(p);
    echo.appendChild(cmd);
    screen.appendChild(echo);

    if (trace.stdout) {
      const out = document.createElement('pre');
      out.className = 'terminal-line out';
      out.textContent = trace.stdout.replace(/\n$/, '');
      screen.appendChild(out);
    }
    if (trace.stderr) {
      const err = document.createElement('pre');
      err.className = 'terminal-line err';
      err.textContent = trace.stderr.replace(/\n$/, '');
      screen.appendChild(err);
    }
    if (line.trim()) {
      history.push(line);
      historyIdx = history.length;
    }
    screen.scrollTop = screen.scrollHeight;
  };

  const clear = () => {
    screen.innerHTML = '';
  };

  const setPrompt = (text) => {
    promptEl.textContent = `${text} `;
    syncGhost();
  };

  const setExtraCompletions = (commands) => {
    extraCompletions = commands.filter(Boolean);
    syncGhost();
  };

  return {
    print,
    printTrace,
    clear,
    focus,
    setPrompt,
    setExtraCompletions,
    pushHistory: (l) => {
      if (l.trim()) {
        history.push(l);
        historyIdx = history.length;
      }
    },
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
