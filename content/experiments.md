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
- **Variants**: 2026-09-09 hotel / 2026-09-11 kitchen / 2026-09-15 office
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
  typography) will lag environment POV on watch % while the approved
  animation library is empty. 09-07 was converted from environment POV to motion
  typography on 2026-09-09, which sharpens this test rather than spoiling
  it: it is now footage-free against footage-carrying, which is the
  question worth answering before funding footage.
- **Metric**: watch % gap between the two formats
- **Decision rule**: gap over 10 points → week 02 shifts the mix toward
  environment POV; gap under 10 → keep the mix, the format is fine.
- **Result**: No data. The comparison needs both footage-carrying and footage-free video posted in the same week, and none posted.
- **Decision**: Void for week 01 and re-register the week video ships, when motion typography can be measured against environment POV honestly.

## EXP-004 — Carousel or single: which earns the save?

- **Week opened**: 01
- **Status**: void
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
- **Result**: No data. 2026-09-12's first real TikTok Studio pull gave
  views for 4 posts, none of them a single, and only one account-wide
  save total. Views alone cannot decide a saves-per-1k question.
- **Decision**: Void for week 01, same as EXP-001 to EXP-003: the
  question was never actually tested with visible data. Re-register for
  week 02 once a single's own saves/1k is visible in a data pull.

## EXP-005 — Does typography alone earn the right to fund video?

- **Week opened**: 01
- **Status**: decided
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
- **Result**: Account-wide (not yet per-post): roughly 0.4 saves/1000 views
  this week (1 save, 2.3K views), well under 8. Small sample and not the
  exact median-of-15 the experiment specifies, but every post that shipped
  this week was typography, so it is the best reading available.
- **Decision**: Under 8. No footage spend this cycle regardless of the
  Runway credit question; the writing is the limiting factor, not the
  format. This is why the 09-13/09-14/09-15 on-screen hooks were rewritten
  on 2026-09-12 (they were the generic half of the problem: audience skews
  55% male on a channel for women, and the only tracked search term was
  the generic "incline push ups", not anything specific to her). Week 02
  keeps funding zero-cost typography and keeps pushing hook specificity
  before revisiting footage spend.

## EXP-006 — Carousel or single: which earns the save?

- **Week opened**: 02
- **Status**: void
- **Hypothesis**: the carousel out-saves the single on the same topic, because
  a list of named movements is a thing to come back to and a hook on one frame
  is a thing to agree with and scroll past. Re-registered from the voided
  EXP-004, which never got data; week 02 ships a clean matched pair on all
  seven dates.
- **Variants**: seven matched pairs, one slideshow carousel and one single per
  topic on the same date, 2026-09-17 to 2026-09-23. The motion-type video on
  each date is excluded from the comparison, so format is the only variable
  inside a pair.
- **Metric**: saves per 1000 views by format, median across the 7 pairs. If
  TikTok Studio still hides per-post saves, likes per 1000 views is the
  declared substitute and the substitution is recorded in the result.
- **Decision rule**: carousel median beats single by 5 saves/1k or more → the
  next plan written after this data arrives drops singles to 2 a week and
  spends the freed slots on second carousels. Single wins by any margin →
  singles take the hook budget and carousels shorten to 4 slides. Gap under 5
  either way → both stay and the mix is not the lever. If fewer than 5 of the 7
  pairs report per-post saves and fewer than 5 report per-post likes, void and
  stop re-registering this question until TikTok Studio exposes per-post
  engagement.
- **Result**: void 2026-09-17. The owner moved the week to carousels only
  (three a day, singles paused) before any matched pair had data, so the
  seven pairs will never exist.
- **Decision**: no format comparison is registered until singles return.
  The carousel is the format by decision, not by test.

## EXP-007 — Does a named-constraint hook out-save a number-led hook?

- **Week opened**: 02
- **Status**: void
- **Hypothesis**: EXP-005 decided the writing is the limiting factor. A hook
  that names a scene she is standing in ("She climbs on your back at rep four")
  earns the save, while a hook that states a number and a claim ("Five moves,
  no floor") reads as any fitness account and pulls a general audience. This
  tests whether cinematic specificity is what earns the save or only what reads
  well to us.
- **Variants**: the 7 week-02 carousels, same format and same slot, split 4/3
  on the shape of the opening card only. Named-constraint: 09-17 (Gate 42),
  09-20 (toddler at rep four), 09-21 (the stairs at 8:40), 09-23 (quarter end).
  Number-led control: 09-18, 09-19, 09-22. Both groups keep female-addressed
  body copy and constraint-shaped captions, so the variable is scene
  specificity in the hook, not who the post is written for.
- **Metric**: saves per 1000 views (same likes/1k fallback as EXP-006), median
  per variant group. Secondary, acknowledged as confounded by all 21 posts:
  account-wide female viewer share at the next pull, baseline 42%.
- **Decision rule**: named-constraint median at least 3 saves/1k above
  number-led, or account-wide female share up 5 points to 47% or higher →
  named-constraint hooks become mandatory on every slot from the next plan and
  number-led openings retire. Number-led wins by 3 saves/1k or more, or female
  share falls below 42% → hook shape is not the lever and the next test moves
  to caption and search phrasing. Gap under 3 with female share between 42 and
  47 → hold the mix and re-run once per-post watch % exists.
- **Result**: void 2026-10-08. The four named-constraint and three number-led
  covers it compared were rewritten onto the owner's hook formats before
  posting, and two were replaced, so the groups never existed as registered.
- **Decision**: no hook-shape test until a week ships unchanged and gets measured.

## EXP-008 — Do constraint-shaped search phrases change which searches deliver traffic?

- **Week opened**: 02
- **Status**: void
- **Hypothesis**: week 01's only tracked search term was "incline push ups", a
  bare movement name that belongs to any fitness account. Target phrases shaped
  like her situation ("layover workout without changing clothes", "workout with
  toddler climbing on you", "what to train when your shoulders are sore") will
  pull constraint-shaped queries instead of movement-name queries.
- **Variants**: all 21 week-02 posts carry a constraint-shaped target phrase in
  the caption and no bare-movement-name title, measured against the week 01
  baseline of exactly 1 tracked term, generic.
- **Metric**: the search terms TikTok Studio lists as driving traffic, counted
  by shape: constraint-shaped (names a place, a person or a situation) versus
  bare movement name.
- **Decision rule**: 2 or more constraint-shaped tracked terms → constraint
  captions stay mandatory and go into the writer's brief. 0 or 1
  constraint-shaped terms while at least 2 terms are tracked → the caption is
  not the lever and the next test moves to hashtags. Fewer than 2 tracked terms
  in total → not enough data, re-register unchanged.
- **Result**: void 2026-10-08. Search-term data was never collected.
- **Decision**: re-register only when an intake includes the Search tab.

## EXP-009 — Does the "Do these" series out-save the one-off carousels?

- **Week opened**: 03
- **Status**: running
- **Hypothesis**: the quarter-end "Do these 3" deck drew 14.4 saves per 1000
  in its first hours, the best result on the account. A fixed shape with a
  promise she can repeat all week ("every day this week") is a thing to save;
  a one-off topic is a thing to read once.
- **Variants**: the seven series decks dated 2026-09-24 to 2026-09-30 against
  the ten one-off carousels dated 2026-09-26 to 2026-09-30. Same cover style,
  same body style, same posting cadence.
- **Metric**: saves per 1000 views, median per group. If TikTok Studio hides
  per-post saves, likes per 1000 views is the declared substitute and the
  substitution is recorded in the result.
- **Decision rule**: series median at least 3 saves/1k above the one-off
  median → the series takes two of the three daily slots from week 05.
  One-off median at least 3 saves/1k above the series → the series drops to
  three decks a week. Gap under 3 either way → the one-a-day cadence stays.
  Fewer than 4 series and 4 one-off posts with per-post saves or likes → void.
- **Result**: —
- **Decision**: —

## EXP-010 — Does "the test" out-save "Do these"?

- **Week opened**: 04
- **Status**: running
- **Hypothesis**: a cover that asks her to try something in the next ten
  seconds, then tells her what her result means, is more saveable than a
  week-long promise, because it hands her a level and a next step.
- **Variants**: the seven test-series decks dated 2026-10-03 to 2026-10-09
  against the seven Do these decks dated 2026-10-03 to 2026-10-09. Same
  cover style, same body style, same cadence.
- **Metric**: saves per 1000 views, median per group; likes per 1000 if
  per-post saves are hidden, recorded in the result. Comments per 1000 as a
  second read, because the test's CTA asks for her result.
- **Decision rule**: test median at least 3 saves/1k above Do these → the test
  takes the second daily slot permanently. Do these at least 3 above the
  test → the test drops to two decks a week. Gap under 3 → both stay daily.
  Fewer than 4 posts per group with per-post saves or likes → void.
- **Result**: —
- **Decision**: —
