# Experiment registry

The experimental engine's ledger. Every week's plan registers its tests
here; every Sunday session must CLOSE the previous week's running
experiments with a result and a decision before planning new ones. An
experiment without a decision rule is not an experiment.

Statuses: `running` → `decided` (or `void` if the data never arrived).
Decisions feed `content/learnings.md` when they generalize.

**EXP-001 to EXP-003 are void for week 01.** All three test videos, and the
videos are held pending environment footage (`docs/roadmap.md`), so no data
will arrive for them. They are kept as records and their questions will be
re-registered for the week video actually ships. Week 01's live tests are
EXP-004 and EXP-005, which run on typography that costs nothing and is
already rendered.

---

## EXP-001 — Which constraint environment wins?

- **Week opened**: 01
- **Status**: void
- **Hypothesis**: hotel, kitchen and office constraint videos will not
  perform equally; one environment is the audience's real life.
- **Variants**: 2026-09-06 hotel / 2026-09-08 kitchen / 2026-09-12 office
- **Metric**: watch %
- **Decision rule**: highest watch % takes week 02's free slot and leads
  the App Store screenshot candidates. A gap under 5 points = no winner,
  keep rotating.
- **Result**: No data. The three constraint videos are held pending environment footage, so no watch % exists to compare.
- **Decision**: Void for week 01 and re-register when video ships. The variants are written and the question is unchanged.

## EXP-002 — Do ladders out-save situations?

- **Week opened**: 01
- **Status**: void
- **Hypothesis**: progression (skill-ladder) content earns more saves per
  1000 than situation (constraint) content, because a ladder is a plan.
- **Variants**: the two ladders (09-05 push, 09-08 doorframe row) vs the
  three constraint videos.
- **Metric**: saves per 1000 views
- **Decision rule**: if either ladder clears 15 saves/1k, week 02 gets a
  second ladder slot and the first animation order prioritizes those
  movements.
- **Result**: No data. Both ladders are video, and video is held.
- **Decision**: Void for week 01. The ladder question moves to the carousels, which do ship: 09-05 and 09-08 carry the same two ladders as lists.

## EXP-003 — Does text-on-screen hold watch % without b-roll?

- **Week opened**: 01
- **Status**: void
- **Hypothesis**: footage-free video (09-09 text-on-screen, 09-07 motion
  typography) will lag environment POV on watch % while the animation
  library is empty. 09-07 was converted from environment POV to motion
  typography on 2026-09-06, which sharpens this test rather than spoiling
  it: it is now footage-free against footage-carrying, which is the
  question worth answering before funding footage.
- **Metric**: watch % gap between the two formats
- **Decision rule**: gap over 10 points → week 02 shifts the mix toward
  environment POV; gap under 10 → keep the mix, the format is fine.
- **Result**: No data. The comparison needs both footage-carrying and footage-free video posted in the same week, and none posted.
- **Decision**: Void for week 01 and re-register the week video ships, when motion typography can be measured against environment POV honestly.

## EXP-004 — Carousel or single: which earns the save?

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: the carousel out-saves the single on the same topic,
  because a list of named movements is a thing to come back to and a hook
  on one frame is a thing to agree with and scroll past.
- **Variants**: seven matched pairs, one carousel and one single per topic
  on the same date, 09-04 to 09-10. Same idea, same day, different format,
  which is as close to a controlled test as a feed allows.
- **Metric**: saves per 1000 views, by format
- **Decision rule**: if the carousel beats the single by 5 saves/1k or
  more, week 02 drops singles to two a week and spends the slots on a
  second carousel. If the single wins by any margin, singles get the hook
  budget and carousels get shorter. A gap under 5 either way means both
  stay and the mix is not the lever.
- **Result**: —
- **Decision**: —

## EXP-005 — Does typography alone earn the right to fund video?

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: the writing and the brand carry the channel without any
  footage, so the typography posts clear the save bar on their own.
- **Variants**: all 15 typography posts of week 01 (7 carousels, 7 singles,
  the 09-03 sore-wrists pilot) against the channel's own targets rather
  than against each other.
- **Metric**: saves per 1000 views, median across the 15
- **Decision rule**: median at or above 15 saves/1k means typography is the
  channel's spine and generated footage is a supplement to be funded
  selectively, at roughly 30 dollars a month rather than 150. Between 8 and
  15 means keep shipping typography and hold footage spend for another
  week. Under 8 means the writing is the problem and no format spend is
  justified until the hooks improve.
- **Result**: —
- **Decision**: —
