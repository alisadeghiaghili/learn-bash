# LearnBash

An interactive bash visualization and tutorial. Type real shell commands in a
safe sandbox and watch cwd, files, pipes, and exit codes update live.

## Run

Open `index.html` in a browser (ES modules need a local server):

```bash
npx serve -l 5173 .
# or
python -m http.server 5173
```

Then open http://localhost:5173

Live demo: https://alisadeghiaghili.github.io/learn-bash/

## Modes

- **Sandbox** — free exploration with a starter home directory
- **Levels** — 28 goal-driven lessons in 6 series (Basics → Transfer) with
  deep teach panels, command golf, concept quizzes, and spaced review

## Curriculum

| Series | Focus |
|--------|--------|
| Basics | pwd, ls, cd, echo, variables |
| Files | touch, mkdir, mv, cp, rm |
| Text | cat, redirects, wc, sort |
| Streams | pipes, grep, stderr, chains |
| Quoting | globs, quotes, `$(...)` |
| Control | exit codes, `test`/`if`, `for`, arithmetic |
| Transfer | multi-step projects and scripts |

## Engine commands (beyond core bash)

| Command | Effect |
|---------|--------|
| `levels` | open the level list |
| `goal`   | show the current level goal |
| `quiz`   | concept quiz for the current series |
| `review` | spaced review of earlier series |
| `undo`   | undo the last command |
| `reset`  | restore the level / sandbox seed |
| `help`   | list supported commands |

Supported shell features: pipes, `>` `>>` `<` `2>`, `;` `&&` `||`, variables,
`$(...)` / `` `...` ``, `$((...))`, globs (`* ? [ ]`), `if`/`for`/`while`,
`test`/`[`, scripts via `bash file.sh`.

## Tests

```bash
npm test
```

## Architecture

```
src/bash/    virtual filesystem + parser + expansion + control flow + shell
src/viz/     filesystem tree + pipeline dataflow
src/level/   level definitions, win checks, golf, concept quizzes
src/ui/      terminal, app shell, progress, share, confetti
```

The shell never touches the host filesystem. Progress is saved in
localStorage + cookie. License: Apache-2.0.
