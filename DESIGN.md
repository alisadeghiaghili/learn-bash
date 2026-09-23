# LearnBash Design Spec

## Product

Interactive bash visualization and tutorial, modeled on LearnGitBranching.
Make invisible shell state (cwd, filesystem, pipes, exit codes) visible while
the learner types real bash commands in a sandbox.

Audience: developers who can open a terminal but have not internalized the
shell model. Primary job: learn by doing, with immediate visual feedback.

## Scope (MVP, mirrors LGB core loop)

- Sandbox mode with a prebuilt virtual home directory
- Levels with goals, win conditions, command golf, progress
- Live filesystem tree visualization (cwd pulse)
- Pipeline / redirection dataflow visualization
- `undo`, `reset`, `levels`, `help`, `goal`
- Safe virtual bash — never executes on the host

Out of scope for MVP: level builder UI, gist import, i18n, remote simulation,
full POSIX, job control.

## Style anchor

Laboratory instrument panel / modern dark terminal — not retro CRT, not SaaS
dashboard. Shell state is measured and drawn like signals on an instrument.

## Palette

| Token        | Hex       | Role                          |
|--------------|-----------|-------------------------------|
| bg           | `#0C1218` | deep petrol black background  |
| surface      | `#141C24` | panels, terminal chrome       |
| surface-2    | `#1A2430` | elevated cards, level list    |
| ink          | `#E8EEF2` | primary text                  |
| muted        | `#7E92A0` | secondary text, meta          |
| accent       | `#5EE0A0` | mint phosphor — cwd, success  |
| pipe         | `#7AA2FF` | cobalt — pipes, dataflow      |
| warn         | `#F0B429` | warnings, golf over par       |
| error        | `#F07178` | errors, failed checks         |
| line         | `#24303C` | hairline borders              |

## Typography

- Mono: `JetBrains Mono` (terminal, paths, commands, display)
- Sans: `IBM Plex Sans` (lesson prose, UI chrome)
- Scale: 11 / 13 / 15 / 18 / 24 / 32
- Weights: 400 body, 500 UI, 600 display
- Line length: lesson prose ≤ 68ch

## Layout

```
┌──────────────────────────────────────────────────────────┐
│  LearnBash    Level 03 · Make a file     4/par 3   ?  ⌘   │
├────────────────────────┬─────────────────────────────────┤
│  TERMINAL              │  VIZ                            │
│  learner@box:~$ ls     │  /home/learner                  │
│  notes.txt             │  ├── notes.txt                  │
│  learner@box:~$ _      │  ├── labs/                      │
│                        │  └── todo.md                    │
│                        │                                 │
│                        │  ┌─ pipeline (when used) ─────┐ │
│                        │  │ cat → grep → wc -l         │ │
│                        │  └───────────────────────────┘ │
├────────────────────────┴─────────────────────────────────┤
│  GOAL  Create `report.txt` containing the word `done`.   │
└──────────────────────────────────────────────────────────┘
```

- Desktop: terminal 42% / viz 58%
- Mobile: stacked, viz above terminal
- Dense but breathable; 8px rhythm

## Signature moments

1. **cwd pulse** — the tree node for the current directory glows mint and a
   caret marks position; `cd` animates the highlight along the path.
2. **pipeline flow** — `cmd | cmd | cmd` draws a chain of process boxes with
   tokens that stream left to right through the pipes.

## Motion

- Action-driven only (cd highlight, pipeline stream, win check flash)
- 120–220ms transitions, respect `prefers-reduced-motion`
- No load choreography

## Principles

1. The visualization is the product; chrome stays quiet.
2. Errors teach — name the mistake and the fix, never apologize.
3. Golf is optional pressure, never the grade.
4. Fake bash must feel honest: correct exit codes, honest error strings.
