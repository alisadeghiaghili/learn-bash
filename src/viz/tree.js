/**
 * Filesystem tree visualization (SVG).
 *
 * Renders a nested tree with a mint pulse on the cwd node and a caret.
 */

const PAD = 16;
const ROW = 28;
const INDENT = 22;

/**
 * Render the filesystem tree into an SVG element.
 *
 * Args:
 *     svg: SVGElement to fill
 *     rootPath: absolute root to show (e.g. /home/learner)
 *     fs: VirtualFS
 *     cwd: current working directory absolute path
 *     options: { width, height, home }
 * Returns:
 *     void
 */
export function renderTree(svg, rootPath, fs, cwd, options = {}) {
  const width = options.width ?? 420;
  const home = options.home ?? '/home/learner';
  const root = fs.getNode(rootPath);
  svg.innerHTML = '';

  if (!root) {
    svg.setAttribute('viewBox', `0 0 ${width} 80`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    addText(svg, PAD, 28, '(empty)', 'muted');
    return;
  }

  const rows = [];
  flatten(root, rootPath, 0, cwd, home, rows);

  const height = PAD * 2 + rows.length * ROW;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', 'auto');

  rows.forEach((row, i) => {
    const y = PAD + i * ROW + ROW / 2;
    const x = PAD + row.depth * INDENT;

    if (row.isCwd) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', String(PAD + i * ROW));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(ROW));
      rect.setAttribute('class', 'tree-row-cwd');
      svg.appendChild(rect);
    }

    // connectors
    if (row.depth > 0) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x - INDENT + 8));
      line.setAttribute('x2', String(x - INDENT + 8));
      line.setAttribute('y1', String(y - ROW / 2));
      line.setAttribute('y2', String(y + ROW / 2 - 4));
      line.setAttribute('class', 'tree-guide');
      svg.appendChild(line);
    }

    const label = row.isCwd ? `▸ ${row.name}` : row.name;
    const klass = row.isCwd
      ? 'tree-label cwd'
      : row.type === 'dir'
        ? 'tree-label dir'
        : 'tree-label file';
    addText(svg, x, y, label, klass, row.detail);
  });
}

function flatten(node, path, depth, cwd, home, rows, isRoot = true) {
  const display = displayPath(path, home);
  const isCwd = path === cwd || (path === home && cwd === home);
  rows.push({
    name: isRoot ? display : node.name + (node.type === 'dir' ? '/' : ''),
    type: node.type,
    depth,
    isCwd: path === cwd || cwd.startsWith(path + '/'),
    detail: node.type === 'file' ? node.content.split('\n')[0].slice(0, 24) : null,
  });

  // Prefer marking exact cwd only as caret, but also highlight ancestor band
  if (path === cwd) {
    rows[rows.length - 1].isCwd = true;
    rows[rows.length - 1].name = display;
  }

  if (node.type !== 'dir') return;

  const children = [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const child of children) {
    const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
    flatten(child, childPath, depth + 1, cwd, home, rows, false);
  }
}

function displayPath(path, home) {
  if (path === home) return '~';
  if (path.startsWith(home + '/')) return path.slice(home.length);
  return path;
}

function addText(svg, x, y, text, klass, detail) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('dominant-baseline', 'central');
  t.setAttribute('class', klass);
  t.textContent = text;
  svg.appendChild(t);

  if (detail) {
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    d.setAttribute('x', String(x + text.length * 7.5 + 12));
    d.setAttribute('y', String(y));
    d.setAttribute('dominant-baseline', 'central');
    d.setAttribute('class', 'tree-detail');
    d.textContent = detail;
    svg.appendChild(d);
  }
}
