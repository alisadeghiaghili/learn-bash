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

## Modes

- **Sandbox** — free exploration with a starter home directory
- **Levels** — goal-driven lessons with command golf and progress

## Engine commands (beyond core bash)

| Command | Effect |
|---------|--------|
| `levels` | open the level list |
| `goal`   | show the current level goal |
| `undo`   | undo the last command |
| `reset`  | restore the level / sandbox seed |
| `help`   | list supported commands |

## Tests

```bash
npm test
```

## License

Apache-2.0. See [LICENSE](./LICENSE).

## Architecture

```
src/bash/    virtual filesystem + command parser + shell
src/viz/     filesystem tree + pipeline dataflow
src/level/   level definitions, win checks, golf, progress
src/ui/      terminal, app shell, dialogs
```

The shell never touches the host filesystem. All state lives in memory and
snapshots cleanly for `undo` / `reset`.
