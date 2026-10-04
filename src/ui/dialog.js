/**
 * Accessible modal dialog controller and markdown subset renderer.
 * Modeled after LearnDVC dialog system.
 */

export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(raw) {
  const slots = [];
  const parts = raw.split(/(<a\b[\s\S]*?<\/a>)/gi);
  const mapped = parts
    .map((part, i) => {
      if (i % 2 === 1) {
        slots.push(part);
        return '@@HTML' + (slots.length - 1) + '@@';
      }
      let t = escapeHtml(part);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        (_m, label, href) =>
          `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
      );
      return t;
    })
    .join('');
  return mapped.replace(/@@HTML(\d+)@@/g, (_m, i) => slots[Number(i)] ?? '');
}

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isTableRow(line) {
  const s = line.trim();
  if (!s.includes('|')) return false;
  return s.startsWith('|')
    ? s.endsWith('|') && splitTableRow(s).length >= 1
    : s.split('|').length >= 2;
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return (
    cells.length >= 1 &&
    cells.every((c) => /^:?-+:?$/.test(c.trim()) && c.includes('-'))
  );
}

function renderTable(rows) {
  if (rows.length < 2) return '';
  const header = splitTableRow(rows[0]);
  const body = rows.slice(2);
  const headHtml = header.map((h) => `<th>${renderInline(h)}</th>`).join('');
  const bodyHtml = body
    .map(
      (r) =>
        `<tr>${splitTableRow(r)
          .map((c) => `<td>${renderInline(c)}</td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function isListItem(line) {
  return /^\s*[-*+]\s+\S/.test(line) || /^\s*\d+\.\s+\S/.test(line);
}

function renderListItem(line) {
  const s = line.trim().replace(/^([-*+]|\d+\.)\s+/, '');
  return `<li>${renderInline(s)}</li>`;
}

function renderProse(text) {
  const lines = text.split('\n');
  const out = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${para.map(renderInline).join('<br/>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul>${list.join('')}</ul>`);
    list = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushAll();
      const rows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }
    if (!line.trim()) {
      flushAll();
      i += 1;
      continue;
    }
    if (isListItem(line)) {
      flushPara();
      list.push(renderListItem(line));
      i += 1;
      continue;
    }
    flushList();
    para.push(line);
    i += 1;
  }
  flushAll();
  return out.join('');
}

/**
 * Render Markdown subset: fences, tables, lists, bold, code, links.
 */
export function renderMarkdown(md) {
  if (!md) return '';
  const blocks = md.split(/```/);
  let html = '';
  blocks.forEach((block, i) => {
    if (i % 2 === 1) {
      html += `<pre>${escapeHtml(block.replace(/^\w*\n/, ''))}</pre>`;
      return;
    }
    html += renderProse(block);
  });
  return html;
}

/**
 * Display an accessible modal dialog.
 *
 * Args:
 *     opts: {
 *       title: string,
 *       titleHtml?: string,
 *       bodyHtml: string,
 *       actions?: [{ label, className, onClick }],
 *       onClose?: () => void,
 *       variant?: 'default' | 'celebrate'
 *     }
 * Returns:
 *     { close: () => void, el: HTMLElement }
 */
export function showModal(opts) {
  const overlay = document.createElement('div');
  overlay.className = `overlay${opts.variant === 'celebrate' ? ' overlay-celebrate' : ''}`;
  const titleClass = opts.variant === 'celebrate' ? ' class="visually-hidden"' : '';
  const titleContent = opts.titleHtml ?? escapeHtml(opts.title);
  overlay.innerHTML = `
    <div class="modal${opts.variant === 'celebrate' ? ' modal-celebrate' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(opts.title)}">
      <h2${titleClass}>${titleContent}</h2>
      <div class="markdown">${opts.bodyHtml}</div>
      <div class="modal-actions"></div>
    </div>
  `;
  const actionsEl = overlay.querySelector('.modal-actions');
  const close = () => {
    overlay.remove();
    opts.onClose?.();
  };

  const actions = opts.actions?.length
    ? opts.actions
    : [{ label: 'Close', onClick: () => close() }];

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${action.className ?? ''}`.trim();
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      if (document.body.contains(overlay)) overlay.remove();
    });
    actionsEl.appendChild(btn);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  const modalEl = overlay.querySelector('.modal');
  if (modalEl) {
    modalEl.tabIndex = -1;
    requestAnimationFrame(() => modalEl.focus());
  }
  return { close, el: overlay };
}
