/**
 * Job control and array helpers for the teaching shell.
 *
 * Job control is a simulation: background jobs are tracked as async-style
 * placeholders with exit status. Enough to teach `&`, `jobs`, `wait`, `$$`.
 */

/**
 * @typedef {object} Job
 * @property {number} id
 * @property {string} command
 * @property {'running'|'done'} status
 * @property {number} code
 */

/**
 * Create a job table.
 *
 * Returns:
 *     { jobs: Job[], nextId: number }
 */
export function createJobTable() {
  return { jobs: [], nextId: 1 };
}

/**
 * Register a background job after it has already run (teaching sim).
 *
 * Args:
 *     table: job table
 *     command: command line
 *     code: exit status
 * Returns:
 *     Job
 */
export function addJob(table, command, code = 0) {
  const job = {
    id: table.nextId++,
    command,
    status: 'done',
    code,
  };
  table.jobs.push(job);
  return job;
}

/**
 * Format `jobs` output.
 *
 * Args:
 *     table: job table
 * Returns:
 *     string
 */
export function formatJobs(table) {
  return table.jobs
    .map((j) => `[${j.id}]  ${j.status}  ${j.command}`)
    .join('\n');
}

/**
 * Wait for jobs (already done in this simulator) and return last code.
 *
 * Args:
 *     table: job table
 * Returns:
 *     number last exit code
 */
export function waitJobs(table) {
  for (const j of table.jobs) j.status = 'done';
  return table.jobs.length ? table.jobs[table.jobs.length - 1].code : 0;
}

/**
 * Expand array references: ${name[i]}, ${#name[@]}, ${name[@]}, $name (first).
 *
 * Args:
 *     word: unquoted segment text
 *     arrays: Map<string, string[]>
 *     env: scalar env
 * Returns:
 *     string
 */
export function expandArrayRefs(word, arrays, env) {
  let out = word;
  out = out.replace(/\$\{#([A-Za-z_][A-Za-z0-9_]*)\[@\]\}/g, (_, name) =>
    String(arrays.get(name)?.length ?? 0)
  );
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\[@\]\}/g, (_, name) =>
    (arrays.get(name) ?? []).join(' ')
  );
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\[(\d+)\]\}/g, (_, name, i) =>
    arrays.get(name)?.[Number(i)] ?? ''
  );
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\[(\d+)\]\}/g, (_, name, i) =>
    arrays.get(name)?.[Number(i)] ?? ''
  );
  // ${name[0]} already handled; bare $name of array → first element if no scalar
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, name) => {
    if (env[name] !== undefined) return env[name];
    const arr = arrays.get(name);
    if (arr && arr.length) return arr[0];
    return m;
  });
  return out;
}

/**
 * Parse append assign: name+=(item)
 *
 * Args:
 *     text: source
 * Returns:
 *     { name, items } or null
 */
export function parseArrayAppend(text) {
  const m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\+=\(([^)]*)\)$/);
  if (!m) return null;
  return { name: m[1], items: m[2].split(/\s+/).filter(Boolean) };
}
