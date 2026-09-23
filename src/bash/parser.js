/**
 * Bash tokenizer and pipeline parser.
 *
 * Supports: whitespace splitting, single/double quotes, escapes, |
 * pipelines, >, >>, < redirections, and ; / && / || sequencing.
 */

/**
 * Tokenize a command line into words and operators.
 *
 * Args:
 *     line: raw user input
 * Returns:
 *     array of tokens: { type: 'word'|'op', value }
 * Raises:
 *     SyntaxError on unbalanced quotes
 *
 * Example:
 *     tokenize("echo 'a b' | wc -l")
 *     // [{word echo}, {word a b}, {op |}, {word wc}, {word -l}]
 */
export function tokenize(line) {
  const tokens = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    const ch = line[i];

    if (ch === ' ' || ch === '\t') {
      i += 1;
      continue;
    }

    if (ch === '|' && line[i + 1] === '|') {
      tokens.push({ type: 'op', value: '||' });
      i += 2;
      continue;
    }
    if (ch === '&' && line[i + 1] === '&') {
      tokens.push({ type: 'op', value: '&&' });
      i += 2;
      continue;
    }
    if (ch === '>' && line[i + 1] === '>') {
      tokens.push({ type: 'op', value: '>>' });
      i += 2;
      continue;
    }
    if (ch === '|' || ch === '>' || ch === '<' || ch === ';') {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    let word = '';
    while (i < n) {
      const c = line[i];
      if (c === ' ' || c === '\t' || c === '|' || c === '<' || c === '>' || c === ';' || c === '&') {
        break;
      }
      if (c === '\\' && i + 1 < n) {
        word += line[i + 1];
        i += 2;
        continue;
      }
      if (c === "'") {
        i += 1;
        let closed = false;
        // Mark single-quoted runs so expansion skips $ and ~.
        word += '\uE000';
        while (i < n) {
          if (line[i] === "'") {
            closed = true;
            i += 1;
            break;
          }
          word += line[i];
          i += 1;
        }
        word += '\uE001';
        if (!closed) throw new SyntaxError("unmatched '");
        continue;
      }
      if (c === '"') {
        i += 1;
        let closed = false;
        while (i < n) {
          if (line[i] === '\\' && i + 1 < n && '"\\$`'.includes(line[i + 1])) {
            word += line[i + 1];
            i += 2;
            continue;
          }
          if (line[i] === '"') {
            closed = true;
            i += 1;
            break;
          }
          word += line[i];
          i += 1;
        }
        if (!closed) throw new SyntaxError('unmatched "');
        continue;
      }
      // Keep $( ... ) and $(( ... )) as one word even with spaces.
      if (c === '$' && line[i + 1] === '(') {
        const start = i;
        i += 1;
        let depth = 0;
        while (i < n) {
          if (line[i] === '(') depth += 1;
          else if (line[i] === ')') {
            depth -= 1;
            if (depth === 0) {
              i += 1;
              break;
            }
          } else if (line[i] === "'" || line[i] === '"') {
            const q = line[i];
            i += 1;
            while (i < n && line[i] !== q) {
              if (line[i] === '\\') i += 1;
              i += 1;
            }
            i += 1;
            continue;
          }
          i += 1;
        }
        word += line.slice(start, i);
        continue;
      }
      if (c === '`') {
        const end = line.indexOf('`', i + 1);
        if (end === -1) throw new SyntaxError('unmatched `');
        word += line.slice(i, end + 1);
        i = end + 1;
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
 * Parse a line into a sequence of pipeline stages and connectors.
 *
 * Args:
 *     line: raw input
 * Returns:
 *     { stages: [ { args, stdinFile, stdoutFile, stdoutAppend } ],
 *       connectors: ['|' | '&&' | '||' | ';'] }
 * Raises:
 *     SyntaxError on bad structure
 */
export function parseLine(line) {
  const tokens = tokenize(line.trim());
  if (tokens.length === 0) {
    return { stages: [], connectors: [] };
  }

  const stages = [];
  const connectors = [];
  let current = newStage();
  let expectWord = true;

  const pushStage = () => {
    if (current.args.length === 0 && !current.stdinFile && !current.stdoutFile) {
      throw new SyntaxError('syntax error near unexpected token');
    }
    stages.push(current);
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];

    if (tok.type === 'op') {
      if (tok.value === '|') {
        if (current.args.length === 0) throw new SyntaxError('syntax error near `|\'');
        pushStage();
        current = newStage();
        connectors.push('|');
        expectWord = true;
        continue;
      }
      if (tok.value === ';') {
        if (current.args.length === 0) throw new SyntaxError('syntax error near `\';\'');
        pushStage();
        current = newStage();
        connectors.push(';');
        expectWord = true;
        continue;
      }
      if (tok.value === '&&' || tok.value === '||') {
        if (current.args.length === 0) throw new SyntaxError(`syntax error near \`${tok.value}'`);
        pushStage();
        current = newStage();
        connectors.push(tok.value);
        expectWord = true;
        continue;
      }
      if (tok.value === '>' || tok.value === '>>') {
        const next = tokens[i + 1];
        if (!next || next.type !== 'word') throw new SyntaxError('syntax error near redirection');
        // fd-aware: previous word may be a bare fd number like 2
        if (
          current.args.length &&
          /^\d+$/.test(current.args[current.args.length - 1]) &&
          current.args.length >= 1
        ) {
          const fd = current.args.pop();
          if (fd !== '1') {
            current.stderrFile = next.value;
            current.stderrAppend = tok.value === '>>';
            current.stdoutFile = current.stdoutFile; // keep
            if (fd === '2') {
              current.stderrFile = next.value;
              current.stderrAppend = tok.value === '>>';
            } else if (fd === '1') {
              current.stdoutFile = next.value;
              current.stdoutAppend = tok.value === '>>';
            }
          } else {
            current.stdoutFile = next.value;
            current.stdoutAppend = tok.value === '>>';
          }
        } else {
          current.stdoutFile = next.value;
          current.stdoutAppend = tok.value === '>>';
        }
        i += 1;
        expectWord = true;
        continue;
      }
      if (tok.value === '<') {
        const next = tokens[i + 1];
        if (!next || next.type !== 'word') throw new SyntaxError('syntax error near redirection');
        current.stdinFile = next.value;
        i += 1;
        expectWord = true;
        continue;
      }
      continue;
    }

    current.args.push(tok.value);
    expectWord = false;
  }

  if (current.args.length === 0 && (current.stdinFile || current.stdoutFile)) {
    throw new SyntaxError('syntax error: redirection without command');
  }
  if (current.args.length === 0) {
    throw new SyntaxError('syntax error near end of input');
  }
  pushStage();

  return { stages, connectors };
}

/**
 * Expand $VARS and ~ in a word (double-quote aware already applied at tokenize
 * for quotes; this does remaining $ expansion).
 *
 * Args:
 *     word: token text
 *     env: environment map-like object
 *     home: home directory string
 * Returns:
 *     expanded string
 */
export function expandWord(word, env, home = '/home/learner') {
  let out = '';
  for (let i = 0; i < word.length; i += 1) {
    const ch = word[i];
    if (ch === '$') {
      if (word[i + 1] === '?' || word[i + 1] === '$') {
        out += env[word[i + 1]] ?? '';
        i += 1;
        continue;
      }
      if (word[i + 1] === '{') {
        const end = word.indexOf('}', i + 2);
        if (end === -1) {
          out += ch;
          continue;
        }
        const name = word.slice(i + 2, end);
        out += env[name] ?? '';
        i = end;
        continue;
      }
      let j = i + 1;
      while (j < word.length && /[A-Za-z0-9_]/.test(word[j])) j += 1;
      if (j === i + 1) {
        out += ch;
        continue;
      }
      const name = word.slice(i + 1, j);
      out += env[name] ?? '';
      i = j - 1;
      continue;
    }
    if (ch === '~' && i === 0) {
      out += home;
      continue;
    }
    out += ch;
  }
  return out;
}

function newStage() {
  return {
    args: [],
    stdinFile: null,
    stdoutFile: null,
    stdoutAppend: false,
    stderrFile: null,
    stderrAppend: false,
  };
}
