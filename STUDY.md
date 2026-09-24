# LearnBash learner study protocol

## Goal

Measure conceptual learning of bash mental models (not just command typing):
pre-test → practice → post-test → 7-day retention.

## What this repo provides

| Piece | Location |
|-------|----------|
| Concept inventory (pre/post/retention) | `src/level/assess.js` `conceptInventory()` |
| Score + misconception flags | `scoreInventory()` |
| Spaced practice (Leitner) | `gradeQuizDetailed()` |
| Predict-before-run tasks | `PREDICTS` |
| Event log + export | `src/level/study.js` |
| Discrimination harness (synthetic) | `tests/engine.test.js` `v-assess-discrimination` |

## What this repo cannot provide

Human participants. Empirical claims require **N ≥ 10 real learners**.
Do not report simulated model scores as learning gains.

## Procedure (per participant, ~45 min + 7-day follow-up)

1. **Consent** — explain voluntary participation, anonymous pid, no PII.
2. **Pre** — `inventory` button (or `inventory` in the terminal). Do not teach first.
3. **Practice** — assign a fixed path: Basics → Files → Text → Streams → Quoting → Control (or a subset). Goal: ≥ 12 levels or 30 minutes.
4. **Post** — same inventory as `post` immediately after practice.
5. **Retention** — after ≥ 7 days, run inventory again (`retention` stage in export).
6. **Export** — download the study JSON from the browser (see below).

## Suggested sample

- N = 12–20
- Mix of beginners (never scripted) and intermediates (used shell, no formal training)
- Record prior shell years only as ordinal: 0 / 1–2 / 3+

## Metrics to report

- Pre/post mean score and **normalized gain** \( (post-pre)/(max-pre) \)
- Retention: post → 7-day drop
- Misconception frequency from wrong items (`misconception` labels)
- Command golf is **not** a learning outcome; keep it secondary

## Export

In the browser console after a session:

```js
// records are stored under localStorage key learnbash.study.v1
copy(localStorage.getItem('learnbash.study.v1'))
```

Or add a future UI "Export study" button calling `exportStudy(loadStudy())`.

## Analysis notes

- Use paired tests (e.g. Wilcoxon signed-rank) on pre/post for small N.
- Discrimination test in CI only proves the *instrument* separates a novice model from an expert model — that is item quality, not effect size.
- Report honestly if N < 10: call it a pilot.

## Ethics

- No account, no server, no tracking pixels.
- Pids must not encode names, emails, or student IDs.
- If used in a course, get institutional consent requirements first.
