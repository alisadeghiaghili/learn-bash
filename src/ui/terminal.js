/**
 * Terminal view: input history, prompt rendering, scrollback.
 */

/**
 * @typedef {object} TerminalHandlers
 * @property {(line: string) => void} onSubmit
 */

/**
 * Create and mount a terminal UI.
 *
 * Args:
 *     root: HTMLElement container
 *     handlers: TerminalHandlers
 * Returns:
 *     { print, printTrace, clear, focus, setPrompt, setBusy }
 */
export function createTerminal(root, handlers) {
  root.innerHTML = '';
  root.classList.add('terminal');

  const screen = document.createElement('div');
  screen.className = 'terminal-screen';
  screen.setAttribute('aria-live', 'polite');

  const form = document.createElement('form');
  form.className = 'terminal-form';
  form.autocomplete = 'off';

  const promptEl = document.createElement('span');
  promptEl.className = 'terminal-prompt';

  const input = document.createElement('input');
  input.className = 'terminal-input';
  input.type = 'text';
  input.spellcheck = false;
  input.autocapitalize = 'off';
  input.setAttribute('aria-label', 'Command input');

  form.appendChild(promptEl);
  form.appendChild(input);
  root.appendChild(screen);
  root.appendChild(form);

  const history = [];
  let historyIndex = -1;
  let draft = '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const line = input.value;
    input.value = '';
    historyIndex = -1;
    draft = '';
    handlers.onSubmit(line);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === -1) {
        draft = input.value;
        historyIndex = history.length - 1;
      } else if (historyIndex > 0) {
        historyIndex -= 1;
      }
      input.value = history[historyIndex];
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        input.value = history[historyIndex];
      } else {
        historyIndex = -1;
        input.value = draft;
      }
    }
  });

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
    echo.innerHTML = '';
    const p = document.createElement('span');
    p.className = 'terminal-prompt-inline';
    p.textContent = prompt + ' ';
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
    if (line.trim()) history.push(line);
    screen.scrollTop = screen.scrollHeight;
  };

  const clear = () => {
    screen.innerHTML = '';
  };

  const focus = () => input.focus();

  const setPrompt = (text) => {
    promptEl.textContent = text + ' ';
  };

  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === screen) focus();
  });

  return { print, printTrace, clear, focus, setPrompt, pushHistory: (l) => history.push(l) };
}
