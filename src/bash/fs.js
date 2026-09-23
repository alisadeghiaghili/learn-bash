/**
 * Virtual in-memory filesystem for LearnBash.
 *
 * Nodes are plain objects: { type: 'dir'|'file', name, children?|content,
 * mode?, owner?, mtime }. Paths are POSIX-like absolute or resolved via cwd.
 */

/**
 * Create a directory node.
 *
 * Args:
 *     name: basename
 *     mode: optional octal mode string (default '755')
 * Returns:
 *     dir node
 */
export function createDir(name, mode = '755') {
  return {
    type: 'dir',
    name,
    children: new Map(),
    mode,
    owner: 'learner',
    mtime: Date.now(),
  };
}

/**
 * Create a file node.
 *
 * Args:
 *     name: basename
 *     content: file text (default '')
 *     mode: optional octal mode string (default '644')
 * Returns:
 *     file node
 */
export function createFile(name, content = '', mode = '644') {
  return {
    type: 'file',
    name,
    content,
    mode,
    owner: 'learner',
    mtime: Date.now(),
  };
}

/**
 * Deep-clone a node (Maps preserved).
 *
 * Args:
 *     node: filesystem node
 * Returns:
 *     detached copy
 */
export function cloneNode(node) {
  if (node.type === 'file') {
    return { ...node };
  }
  const copy = {
    ...node,
    children: new Map(),
  };
  for (const [key, child] of node.children) {
    copy.children.set(key, cloneNode(child));
  }
  return copy;
}

/**
 * Resolve a path against cwd to a normalized absolute path.
 *
 * Args:
 *     cwd: current working directory absolute path
 *     path: user-supplied path
 *     home: home directory absolute path (for ~ expansion)
 * Returns:
 *     absolute normalized path string
 */
export function resolvePath(cwd, path, home = '/home/learner') {
  if (!path || path === '.') return normalize(cwd);
  if (path === '~') path = home;
  if (path.startsWith('~/')) path = home + path.slice(1);

  const base = path.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  const parts = path.split('/');

  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      base.pop();
      continue;
    }
    base.push(part);
  }
  return '/' + base.join('/');
}

/**
 * Normalize an absolute path (collapse duplicate slashes).
 *
 * Args:
 *     path: absolute path
 * Returns:
 *     normalized path
 */
export function normalize(path) {
  const parts = path.split('/').filter(Boolean);
  return '/' + parts.join('/');
}

/**
 * Split path into dirname and basename.
 *
 * Args:
 *     path: absolute path
 * Returns:
 *     { dir, base }
 */
export function splitPath(path) {
  const normalized = normalize(path);
  const idx = normalized.lastIndexOf('/');
  if (idx <= 0) return { dir: '/', base: normalized.slice(1) };
  return { dir: normalized.slice(0, idx) || '/', base: normalized.slice(idx + 1) };
}

/**
 * Filesystem wrapper with lookup and mutation helpers.
 */
export class VirtualFS {
  /**
   * Args:
   *     root: root directory node
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * Get a node at an absolute path.
   *
   * Args:
   *     absPath: absolute normalized path
   * Returns:
   *     node or null
   * Raises:
   *     never — missing paths return null
   */
  getNode(absPath) {
    if (absPath === '/') return this.root;
    const parts = normalize(absPath).split('/').filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (!node || node.type !== 'dir' || !node.children.has(part)) return null;
      node = node.children.get(part);
    }
    return node;
  }

  /**
   * Get parent directory node of a path.
   *
   * Args:
   *     absPath: absolute path
   * Returns:
   *     parent node or null
   */
  getParent(absPath) {
    const { dir } = splitPath(absPath);
    const node = this.getNode(dir);
    return node && node.type === 'dir' ? node : null;
  }

  /**
   * Attach a child node under a parent path.
   *
   * Args:
   *     parentPath: absolute directory path
   *     node: child node to insert
   * Returns:
   *     true on success, false if parent missing
   */
  attach(parentPath, node) {
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'dir') return false;
    parent.children.set(node.name, node);
    parent.mtime = Date.now();
    return true;
  }

  /**
   * Remove a node at an absolute path.
   *
   * Args:
   *     absPath: absolute path
   * Returns:
   *     true if removed
   */
  remove(absPath) {
    const { dir, base } = splitPath(absPath);
    const parent = this.getNode(dir);
    if (!parent || parent.type !== 'dir' || !parent.children.has(base)) return false;
    parent.children.delete(base);
    parent.mtime = Date.now();
    return true;
  }

  /**
   * List a directory's children sorted by name.
   *
   * Args:
   *     absPath: absolute directory path
   * Returns:
   *     array of nodes or empty array
   */
  list(absPath) {
    const node = this.getNode(absPath);
    if (!node || node.type !== 'dir') return [];
    return [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Snapshot the tree for undo/reset.
   *
   * Returns:
   *     detached root clone
   */
  snapshot() {
    return cloneNode(this.root);
  }

  /**
   * Restore a previous snapshot.
   *
   * Args:
   *     root: previously snapshotted root
   */
  restore(root) {
    this.root = root;
  }

  /**
   * Flatten the tree into a nested plain object (debug / level seed).
   *
   * Returns:
   *     serializable tree
   */
  toJSON() {
    return nodeToJSON(this.root);
  }
}

/**
 * Serialize a node without Map.
 *
 * Args:
 *     node: fs node
 * Returns:
 *     plain object
 */
function nodeToJSON(node) {
  if (node.type === 'file') {
    return { type: 'file', content: node.content, mode: node.mode };
  }
  const children = {};
  for (const [key, child] of node.children) {
    children[key] = nodeToJSON(child);
  }
  return { type: 'dir', mode: node.mode, children };
}

/**
 * Build a VirtualFS from a nested plain object seed.
 *
 * Args:
 *     seed: nested { name: node-spec }
 *     rootName: root display name (default '')
 * Returns:
 *     VirtualFS
 *
 * Example:
 *     buildFS({ 'home': { type: 'dir', children: { 'a.txt': { type: 'file', content: 'hi' } } } })
 */
export function buildFS(seed, rootName = '') {
  const root = createDir(rootName);
  const walk = (parent, entries) => {
    for (const [name, spec] of Object.entries(entries)) {
      if (spec.type === 'file') {
        parent.children.set(
          name,
          createFile(name, spec.content ?? '', spec.mode ?? '644')
        );
      } else {
        const dir = createDir(name, spec.mode ?? '755');
        parent.children.set(name, dir);
        if (spec.children) walk(dir, spec.children);
      }
    }
  };
  if (seed.children) walk(root, seed.children);
  else walk(root, seed);
  return new VirtualFS(root);
}
