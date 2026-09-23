/**
 * Shell control flow: if/then/elif/else/fi, for/do/done, while/do/done.
 *
 * Statements are parsed from a raw line/script and executed sequentially
 * with shared shell state.
 */

/**
 * @typedef {object} Statement
 * @property {'simple'|'if'|'for'|'while'} type
 */

/**
 * Parse a script body into statements.
 *
 * Args:
 *     text: one or more shell lines
 * Returns:
 *     Statement[]
 * Raises:
 *     SyntaxError on unbalanced keywords
 */
export function parseScript(text) {
  const tokens = tokenizeKeywords(text);
  let i = 0;

  /**
   * Parse a sequence until a stop keyword (or EOF).
   */
  function parseUntil(stops) {
    const list = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'word' && stops.includes(t.value)) break;
      if (t.type === 'word' && t.value === 'then') break;
      if (t.type === 'word' && t.value === 'do') break;
      if (t.type === 'word' && t.value === 'else') break;
      if (t.type === 'word' && t.value === 'elif') break;
      if (t.type === 'word' && t.value === 'fi') break;
      if (t.type === 'word' && t.value === 'done') break;
      list.push(parseStatement(stops));
    }
    return list;
  }

  function parseStatement(stops) {
    const t = tokens[i];
    if (!t) throw new SyntaxError('syntax error: unexpected end of input');

    if (t.type === 'op' && t.value === ';') {
      i += 1;
      return parseStatement(stops);
    }

    if (t.type === 'word' && t.value === 'if') {
      i += 1;
      return parseIf(stops);
    }
    if (t.type === 'word' && t.value === 'for') {
      i += 1;
      return parseFor(stops);
    }
    if (t.type === 'word' && t.value === 'while') {
      i += 1;
      return parseWhile(stops);
    }

    // simple command: consume words/ops until ; or keyword
    const parts = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.type === 'op' && tok.value === ';') {
        i += 1;
        break;
      }
      if (tok.type === 'word' && ['fi', 'done', 'then', 'else', 'elif', 'do', 'esac'].includes(tok.value)) {
        break;
      }
      if (tok.type === 'word' && ['if', 'for', 'while'].includes(tok.value) && parts.length) {
        break;
      }
      parts.push(tok);
      i += 1;
    }
    return { type: 'simple', tokens: parts };
  }

  function parseIf(stops) {
    const branches = [];
    // if <cond> then <body>
    const condTokens = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'word' && t.value === 'then') break;
      condTokens.push(t);
      i += 1;
    }
    expectWord('then');
    const body = parseUntil(['else', 'elif', 'fi']);
    branches.push({ cond: condTokens, body });

    while (i < tokens.length && tokens[i].type === 'word') {
      const kw = tokens[i].value;
      if (kw === 'elif') {
        i += 1;
        const elifCond = [];
        while (i < tokens.length) {
          const t = tokens[i];
          if (t.type === 'word' && t.value === 'then') break;
          elifCond.push(t);
          i += 1;
        }
        expectWord('then');
        const elifBody = parseUntil(['else', 'elif', 'fi']);
        branches.push({ cond: elifCond, body: elifBody });
        continue;
      }
      if (kw === 'else') {
        i += 1;
        const elseBody = parseUntil(['fi']);
        branches.push({ cond: null, body: elseBody });
        continue;
      }
      if (kw === 'fi') {
        i += 1;
        break;
      }
      break;
    }
    return { type: 'if', branches };
  }

  function parseFor(stops) {
    // for name in words; do body; done
    let name = null;
    if (i < tokens.length && tokens[i].type === 'word') {
      name = tokens[i].value;
      i += 1;
    }
    if (i < tokens.length && tokens[i].type === 'word' && tokens[i].value === 'in') {
      i += 1;
    }
    const words = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'word' && t.value === 'do') break;
      if (t.type === 'op' && t.value === ';') {
        i += 1;
        continue;
      }
      if (t.type === 'word') words.push(t.value);
      i += 1;
    }
    expectWord('do');
    const body = parseUntil(['done']);
    expectWord('done');
    return { type: 'for', name, words, body };
  }

  function parseWhile(stops) {
    const condTokens = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'word' && t.value === 'do') break;
      condTokens.push(t);
      i += 1;
    }
    expectWord('do');
    const body = parseUntil(['done']);
    expectWord('done');
    return { type: 'while', cond: condTokens, body };
  }

  function expectWord(word) {
    const t = tokens[i];
    if (!t || t.type !== 'word' || t.value !== word) {
      throw new SyntaxError(`syntax error: expected \`${word}'`);
    }
    i += 1;
  }

  const statements = [];
  while (i < tokens.length) {
    if (tokens[i].type === 'op' && tokens[i].value === ';') {
      i += 1;
      continue;
    }
    statements.push(parseStatement([]));
  }
  return statements;
}

/**
 * Tokenize while keeping keywords as words (reuse simple scan).
 */
function tokenizeKeywords(text) {
  // Reuse main tokenizer via dynamic import would cycle — local lightweight scan.
  // We only need words/ops with quotes already processed the same way.
  const tokens = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      tokens.push({ type: 'op', value: ';' });
      i += 1;
      continue;
    }
    if (ch === '|' && text[i + 1] === '|') {
      tokens.push({ type: 'op', value: '||' });
      i += 2;
      continue;
    }
    if (ch === '&' && text[i + 1] === '&') {
      tokens.push({ type: 'op', value: '&&' });
      i += 2;
      continue;
    }
    if (ch === '>' && text[i + 1] === '>') {
      tokens.push({ type: 'op', value: '>>' });
      i += 2;
      continue;
    }
    if (ch === ';' || ch === '|' || ch === '>' || ch === '<' || ch === '&' || ch === '\n') {
      tokens.push({ type: 'op', value: ch === '\n' ? ';' : ch });
      i += 1;
      continue;
    }
    let word = '';
    while (i < n) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === ';' || c === '|' || c === '&' || c === '<' || c === '>') break;
      if (c === '\\' && i + 1 < n) {
        word += text[i + 1];
        i += 2;
        continue;
      }
      if (c === '$' && text[i + 1] === '(') {
        const start = i;
        i += 1;
        let depth = 0;
        while (i < n) {
          if (text[i] === '(') depth += 1;
          else if (text[i] === ')') {
            depth -= 1;
            if (depth === 0) {
              i += 1;
              break;
            }
          } else if (text[i] === "'" || text[i] === '"') {
            const q = text[i];
            i += 1;
            while (i < n && text[i] !== q) i += 1;
            i += 1;
            continue;
          }
          i += 1;
        }
        word += text.slice(start, i);
        continue;
      }
      if (c === "'") {
        i += 1;
        while (i < n && text[i] !== "'") {
          word += text[i];
          i += 1;
        }
        i += 1;
        continue;
      }
      if (c === '"') {
        i += 1;
        while (i < n && text[i] !== '"') {
          if (text[i] === '\\' && i + 1 < n) {
            word += text[i + 1];
            i += 2;
            continue;
          }
          word += text[i];
          i += 1;
        }
        i += 1;
        continue;
      }
      word += c;
      i += 1;
    }
    tokens.push({ type: 'word', value: word });
  }
  return tokens;
}

/**
 * Convert simple statement tokens back to a command line for the pipeline engine.
 *
 * Args:
 *     stmt: simple Statement
 * Returns:
 *     string
 */
export function simpleToLine(stmt) {
  const parts = [];
  for (const t of stmt.tokens) {
    if (t.type === 'op') {
      if (t.value === ';') continue;
      if (t.value === '&&' || t.value === '||') {
        parts.push({ kind: 'op', text: t.value });
        continue;
      }
      parts.push({ kind: 'op', text: t.value });
      continue;
    }
    parts.push({ kind: 'word', text: t.value });
  }

  let out = '';
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (i > 0) {
      const prev = parts[i - 1];
      if (p.kind === 'op' && (p.text === '&&' || p.text === '||')) {
        out += ` ${p.text} `;
        continue;
      }
      if (p.kind === 'word' && prev.kind === 'word') out += ' ';
      else if (p.kind === 'word' && prev.kind === 'op') {
        if (prev.text === '>' || prev.text === '>>' || prev.text === '<') out += '';
        else out += ' ';
      }
    }
    if (p.kind === 'op' && (p.text === '&&' || p.text === '||')) continue;
    if (p.kind === 'word' && /\s/.test(p.text)) {
      // Double quotes keep one field but still allow $ expansion.
      out += `"${p.text.replace(/["\\$`]/g, '\\$&')}"`;
    } else out += p.text;
  }
  return out.trim().replace(/\s+/g, ' ');
}

/**
 * Evaluate a condition token list as `test` / `cmd` exit status.
 *
 * Args:
 *     condTokens: tokens
 *     shell: Shell
 * Returns:
 *     Promise<number> exit code (0 true)
 */
export async function evalCondition(condTokens, shell) {
  const line = simpleToLine({ tokens: condTokens.filter((t) => !(t.type === 'op' && t.value === ';')) });
  if (!line) return 1;
  const trace = shell.execute(line, { nested: true, captureHistory: false });
  return trace.code ?? 0;
}

/**
 * Execute parsed statements with control flow.
 *
 * Args:
 *     statements: Statement[]
 *     shell: Shell
 *     options: { nested, captureHistory }
 * Returns:
 *     Promise<{ stdout, stderr, code, clear }>
 */
export async function runStatements(statements, shell, options = {}) {
  let stdout = '';
  let stderr = '';
  let code = 0;
  let clear = false;

  for (const stmt of statements) {
    const r = await runStatement(stmt, shell, options);
    stdout += r.stdout;
    stderr += r.stderr;
    if (r.code !== 0 && code === 0) code = r.code;
    if (r.code !== 0) code = r.code;
    if (r.clear) clear = true;
  }
  return { stdout, stderr, code, clear };
}

/**
 * Execute one statement.
 */
async function runStatement(stmt, shell, options) {
  if (stmt.type === 'simple') {
    const line = simpleToLine(stmt);
    if (!line) return { stdout: '', stderr: '', code: 0, clear: false };
    const t = shell.execute(line, options);
    return t;
  }

  if (stmt.type === 'if') {
    for (const branch of stmt.branches) {
      if (branch.cond === null) {
        return runStatements(branch.body, shell, options);
      }
      const c = await evalCondition(branch.cond, shell, options);
      if (c === 0) return runStatements(branch.body, shell, options);
    }
    return { stdout: '', stderr: '', code: 0, clear: false };
  }

  if (stmt.type === 'for') {
    let stdout = '';
    let stderr = '';
    let code = 0;
    const items = [];
    for (const w of stmt.words) {
      const fields = shell.expandForControl(w);
      items.push(...fields);
    }
    for (const item of items) {
      shell.env[stmt.name] = item;
      const r = await runStatements(stmt.body, shell, options);
      stdout += r.stdout;
      stderr += r.stderr;
      code = r.code;
      if (r.clear) return { stdout, stderr, code, clear: true };
    }
    return { stdout, stderr, code, clear: false };
  }

  if (stmt.type === 'while') {
    let stdout = '';
    let stderr = '';
    let code = 0;
    for (let guard = 0; guard < 1000; guard += 1) {
      const c = await evalCondition(stmt.cond, shell, options);
      if (c !== 0) break;
      const r = await runStatements(stmt.body, shell, options);
      stdout += r.stdout;
      stderr += r.stderr;
      code = r.code;
      if (r.clear) return { stdout, stderr, code, clear: true };
    }
    return { stdout, stderr, code, clear: false };
  }

  return { stdout: '', stderr: '', code: 0, clear: false };
}

/**
 * Detect whether a line needs control-flow parsing.
 *
 * Args:
 *     line: raw input
 * Returns:
 *     boolean
 */
export function needsControlFlow(line) {
  // Match structural keywords only (start or after ; | &), never args like `echo done`.
  return (
    /(^|[;&|]\s*)(if|for|while)\b/.test(line) ||
    /;\s*then\b/.test(line) ||
    /;\s*do\b/.test(line) ||
    /(^|[;&|]\s*)fi\s*($|[;&|])/.test(line) ||
    /(^|[;&|]\s*)done\s*($|[;&|])/.test(line)
  );
}
