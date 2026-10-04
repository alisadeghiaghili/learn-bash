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
- **Levels** — 38 goal-driven lessons in 8 series (Basics → Checkpoints) with
  deep teach panels, production field notes, command golf, concept quizzes, and spaced review

## Curriculum

| Series | Focus |
|--------|--------|
| Basics | pwd, ls, cd, echo, variables |
| Files | touch, mkdir, mv, cp, rm |
| Text | cat, redirects, wc, sort, cut, tr |
| Streams | pipes, grep, stderr, tee, chains |
| Quoting | globs, quotes, `$(...)`, arithmetic |
| Control | exit codes, `test`/`if`, `for`, `while`, scripts |
| Transfer | multi-step projects, strict mode, and pipelines |
| Checkpoints | comprehensive assessments and review challenges |

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
