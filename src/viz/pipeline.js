/**
 * Pipeline dataflow visualization (SVG).
 *
 * Draws process boxes connected by pipes with streaming tokens when a
 * pipeline is present in the last command.
 */

const BOX_W = 118;
const BOX_H = 44;
const GAP = 36;
const PAD_Y = 18;

/**
 * Render a pipeline diagram from stage traces.
 *
 * Args:
 *     svg: SVGElement
 *     stages: array of { args, stdout, code }
 *     options: { width }
 * Returns:
 *     void
 */
export function renderPipeline(svg, stages, options = {}) {
  const width = svg.clientWidth || svg.parentElement?.clientWidth || options.width || 520;
  svg.innerHTML = '';

  if (!stages || stages.length === 0) {
    svg.setAttribute('viewBox', `0 0 ${width} 64`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', '64');
    const t = text(PAD_Y, 32, 'Run a pipeline (cmd | cmd) to see data flow', 'pipe-flow');
    svg.appendChild(t);
    return;
  }

  const n = stages.length;
  const diagramW = Math.max(width, PAD_Y * 2 + n * BOX_W + (n - 1) * GAP);
  const height = BOX_H + PAD_Y * 2 + 36;
  svg.setAttribute('viewBox', `0 0 ${diagramW} ${height}`);
  svg.setAttribute('width', String(diagramW));
  svg.setAttribute('height', String(height));

  stages.forEach((stage, i) => {
    const x = PAD_Y + i * (BOX_W + GAP);
    const y = PAD_Y;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `pipe-box ${stage.code === 0 ? 'ok' : 'err'}`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(BOX_W));
    rect.setAttribute('height', String(BOX_H));
    rect.setAttribute('rx', '8');
    rect.setAttribute('class', 'pipe-rect');
    g.appendChild(rect);

    const title = text(x + BOX_W / 2, y + 16, stage.args.join(' ').slice(0, 18), 'pipe-cmd', true);
    g.appendChild(title);

    const codeLabel = stage.code === 0 ? 'ok' : `code ${stage.code}`;
    const meta = text(x + BOX_W / 2, y + 32, codeLabel, 'pipe-meta', true);
    g.appendChild(meta);
    svg.appendChild(g);

    if (i < n - 1) {
      const x1 = x + BOX_W;
      const x2 = x + BOX_W + GAP;
      const yMid = y + BOX_H / 2;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y1', String(yMid));
      line.setAttribute('y2', String(yMid));
      line.setAttribute('class', 'pipe-link');
      svg.appendChild(line);

      // chevron
      const ch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x1 + GAP / 2;
      ch.setAttribute('d', `M ${cx - 4} ${yMid - 5} L ${cx + 5} ${yMid} L ${cx - 4} ${yMid + 5}`);
      ch.setAttribute('class', 'pipe-chev');
      svg.appendChild(ch);

      // streaming token
      const token = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      token.setAttribute('r', '3.5');
      token.setAttribute('cy', String(yMid));
      token.setAttribute('cx', String(x1));
      token.setAttribute('class', 'pipe-token');
      const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      anim.setAttribute('attributeName', 'cx');
      anim.setAttribute('from', String(x1));
      anim.setAttribute('to', String(x2));
      anim.setAttribute('dur', '0.7s');
      anim.setAttribute('repeatCount', '1');
      anim.setAttribute('fill', 'freeze');
      token.appendChild(anim);
      svg.appendChild(token);
    }
  });

  const flowLabel = text(PAD_Y, height - 12, 'stdout → stdin', 'pipe-flow');
  svg.appendChild(flowLabel);
}

function text(x, y, content, klass, middle = false) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('dominant-baseline', 'central');
  if (middle) t.setAttribute('text-anchor', 'middle');
  t.setAttribute('class', klass);
  t.textContent = content;
  return t;
}
