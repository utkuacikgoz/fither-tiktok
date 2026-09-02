# Experiment registry

The experimental engine's ledger. Every week's plan registers its tests
here; every Sunday session must CLOSE the previous week's running
experiments with a result and a decision before planning new ones. An
experiment without a decision rule is not an experiment.

Statuses: `running` → `decided` (or `void` if the data never arrived).
Decisions feed `content/learnings.md` when they generalize.

---

## EXP-001 — Which constraint environment wins?

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: hotel, kitchen and office constraint videos will not
  perform equally; one environment is the audience's real life.
- **Variants**: 2026-09-04 hotel / 2026-09-06 kitchen / 2026-09-10 office
- **Metric**: watch %
- **Decision rule**: highest watch % takes week 02's free slot and leads
  the App Store screenshot candidates. A gap under 5 points = no winner,
  keep rotating.
- **Result**: —
- **Decision**: —

## EXP-002 — Do ladders out-save situations?

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: progression (skill-ladder) content earns more saves per
  1000 than situation (constraint) content, because a ladder is a plan.
- **Variants**: the two ladders (09-05 push, 09-08 doorframe row) vs the
  three constraint videos.
- **Metric**: saves per 1000 views
- **Decision rule**: if either ladder clears 15 saves/1k, week 02 gets a
  second ladder slot and the first animation order prioritizes those
  movements.
- **Result**: —
- **Decision**: —

## EXP-003 — Does text-on-screen hold watch % without b-roll?

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: text-on-screen (09-07, 09-09) will lag environment POV
  on watch % while the animation library is empty.
- **Metric**: watch % gap between the two formats
- **Decision rule**: gap over 10 points → week 02 shifts the mix toward
  environment POV; gap under 10 → keep the mix, the format is fine.
- **Result**: —
- **Decision**: —
