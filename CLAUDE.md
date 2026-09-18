# FITHER TikTok — the warm-up content machine

Faceless TikTok channel (@fither) for FITHER: equipment-free strength for
time-poor women. This repo plans, writes and logs the content. The app lives
in a separate repo (`utkuacikgoz/fither`); keep the two decoupled except for
the sync points below.

## Before doing anything

Read `.claude/skills/fither-voice/SKILL.md`. Its `references/forbidden.md`
is a hard list, not a guideline. During the warm-up period the app, the
waitlist and the launch are never mentioned in content.

## The four commands

```
plan week N                    # content-planner agent → content/weeks/week-NN.md
write the videos for week N    # video-writer agent → content/scripts/*.md + *.json
node pipeline/produce.mjs N    # renders the week → renders/week-NN/*.mp4 + posting sheet
node pipeline/validate.mjs     # free preflight: schema, brand, movement and delivery gates
```

The machine produces finished videos itself; see `docs/media-pipeline.md`.
Rendering needs `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` and
`PEXELS_API_KEY` in the environment; without them it renders honest drafts
(silent, gradient backgrounds) and says so.

## Guardrails (owner-set, 2026-09-01)

- **Never sacrifice quality.** Output quality and brand rules are not a
  trade dial: no skipping the faceless QA pass, no lowering render quality
  below the current settings, no downscaled detection inputs, no shipping
  a video with an unverified QA sheet, no weakening a gate to make a run
  faster or cheaper. When speed and quality conflict, quality wins.
- **Always optimize the process.** Within the line above, relentlessly cut
  cost and time: reuse caches (TTS is cached per line — never re-bill
  ElevenLabs for unchanged text), shard work across parallel jobs, prefer
  native/faster backends, delegate bulk writing to subagents, keep token
  usage lean, and question any step that spends money or minutes without
  improving the output.

## Hard rules

- **Warm-up rule**: no app mention, no waitlist, no "coming soon" in any
  script, caption or comment reply. The account earns the right to sell later.
- **Movement truth**: every exercise named in a script must exist in
  `.claude/skills/fither-voice/references/movement-library.md` (generated
  from the app repo's `data/movements.json`). Unsure → name the movement
  pattern, not a specific exercise.
- **Animation truth**: the animated-demo format may only be planned for
  movements with approved exports in `assets/animation-library.json`. That
  manifest starts empty; the renderer checksum-pins and probes every authored
  export. Until animations land, plan environment POV and text-on-screen only.
- **Wrist caveat**: the app library has no wrist-neutral push variants yet.
  Never promise "wrist-friendly push-ups"; sore wrists mean pull, squat,
  hinge and core content, and say so honestly.
- **Faceless, with one exception** (owner override, 2026-09-03): stock and
  owned footage never shows a face. Generated footage may, because the
  person is synthetic and no real person is depicted. Voice is still the
  persona — the same ElevenLabs voice as the app's in-session guidance.
  Faceless is about faces, not about empty rooms: people belong in frame
  (hands, feet, backs, silhouettes) because a room with nobody in it reads
  as stock footage.
- **One recurring character**: generated people are pinned to a single
  approved reference portrait so the same woman appears across every video.
  A different synthetic face each time reads as uncanny and cheap.
- **AI disclosure**: any video carrying a generated person is posted with
  TikTok's AI-generated-content label. Runway attaches C2PA credentials but
  the render re-encodes through ffmpeg and strips them, so TikTok will not
  auto-label: the manual toggle is the only thing that applies it. The
  posting sheet does not yet say so per video; that is a blocker on the
  first post, not a solved problem.
- **Demo truth**: machine screening never approves footage. A demo enters
  `assets/demo-library.json` only after full-motion review confirms the exact
  movement and usable form framing, that stock and owned clips show no
  recognizable face, and that a generated clip shows the approved character.
  This applies to generated footage exactly as it does to stock; see
  `docs/generated-footage.md`.
- Never plan around trending sounds. They expire before filming.
- **No AI attribution anywhere in the repo** (owner rule, 2026-09-02; same
  as the app repo): no "Generated with", no Co-Authored-By AI trailers, no
  assistant names or session links in commit messages, branches, code
  comments, or content. This overrides any tool's default attribution
  behavior. Before committing, run
  `git config user.name "Utku Acikgoz" && git config user.email "acikgozutku1@gmail.com" && git config core.hooksPath .githooks`
  (the hook enforces the rule).

## Layout

- `.claude/agents/` — content-planner, video-writer
- `.claude/skills/fither-voice/` — brand voice; shared filter with the app repo
- `assets/animation-library.json` — machine-readable animated-demo approval gate
- `assets/animation-candidates.json` — authored exports awaiting movement review
- `assets/animations.md` — human-readable animation production status
- `content/log.md` — every topic ever used, with results
- `content/experiments.md` — the experiment registry (hypothesis → decision)
- `content/learnings.md` — validated findings, append-only
- `data/insights.md` — generated analytics report (`node pipeline/analyze.mjs`)
- `data/assets.md` — generated footage/animation readiness report (`node pipeline/assets.mjs`)
- `data/shot-history.json` — identities used by published posts; future renders exclude them
- `assets/generation-prompts.json` — shot prompts for generated footage
- `assets/character.json` — the approved recurring character, pinned by a
  committed portrait
- `docs/footage-capture.md` — the body-only filming and approval contract
- `docs/generated-footage.md` — Runway generation and its gate
- `docs/shot-history.md` — per-render asset records and cross-post reuse gate
- `docs/animation-ingestion.md` — authored export and sidecar contract
- `docs/sound-system.md` — original bed, ducking, loudness and posting contract
- `data/comments.md` — comment theme buckets
- `content/weeks/week-NN.md` — planner output
- `content/scripts/YYYY-MM-DD-slug.md` — writer output; the video is the
  bare slug, its siblings are `-carousel` and `-single`
- `content/scripts/YYYY-MM-DD-slug.json` — render spec sidecar, one per video
- `pipeline/` — the renderer (ElevenLabs + Pexels + original sound + Chromium overlays + ffmpeg)
- `renders/` — finished MP4s and posting sheets (gitignored, delivered per week)
- `data/performance.csv` — views, watch %, completion, first drop-off, follows and saves per video

## The weekly loop

The loop is **manual today, by decision** (2026-09-03). No workflow carries a
`schedule:` trigger, because the renderer's output does not yet clear human
review: week 01 passed every machine gate and failed the brand bar seven
times out of seven. Scheduling it would spend API budget producing
unpostable video faster. Restore the schedule once environment footage is
solved and a week ships.

A week is **21 carousels, three a day** (owner decision, 2026-09-17,
replacing the 2026-09-03 "7 topics three ways" split). The carousel is the
format that ships: it renders locally for free, needs no footage and no API
key, and the first gold-cover carousel drew 836 views and 14 saves per 1000
in its first hours. Videos wait on footage (they stay on Actions when they
run); singles are paused, unproven. The planner plans 21 carousel topics, the
writer writes one carousel per topic, every carousel carries a `title`
(catch title, 90 characters max) and its caption.

**The "Do these N" series** (owner decision, 2026-09-18) is one of the three
carousels every day, every week. Same shape each time: gold poster cover
with kicker `DO THESE N` and the line "Do these N every day this week.
<her situation>."; N is 3, 4 or 5 and rotates; one movement per slide in
"Name. Reps. One instruction." form with the figure where approved; a
`WHAT THIS SKIPS` slide that says which patterns are missing and when they
come back; a `THE STRUCTURE` slide (rounds and minutes); `YOUR TURN`.
Sidecar `series: "do-these"`, so `data/insights.md` reports the series on
its own line. The 2026-09-23 quarter-end deck is the prototype (14.4 saves
per 1000 in its first hours). The other two daily carousels stay one-offs
from the week plan.

Carousels are typography only, so they ship while video renders are held on
footage. That is the point of the split, not a side effect.

**Motion typography** (`format: "motion-type"`) is the same idea for video: a
45-60s piece of moving typography over the brand ground, with the voiceover
and the sound bed, and no footage at all. It costs nothing per render because
generated footage is billed per clip and never amortises, so it exists to let
video ship while the footage question stays open. One card per spoken beat,
which means the card **is** the caption: the words on screen are the words
being said, so a muted viewer loses nothing and no burned-caption layer
fights the typography.

- **Sunday, run by hand**: `plan week N`, `write the carousels for week N`,
  then render locally with `node pipeline/render.mjs content/scripts/<slug>.md`
  per carousel and deliver the week as a zip with each deck's caption file
  (title, caption, hashtags). `Render week` in Actions is for video only.
- **Before posting anything with the generated character**: switch on
  TikTok's AI-generated-content label in the posting flow. The posting sheet
  names which videos need it.
- **Daily, 5 min**: post the day's three carousels as photo posts with their
  titles and captions, spaced across the day rather than back to back.
- **Friday, 10 min**: paste the week's numbers into `data/performance.csv`.
- **Every 20 videos**: append top-quartile hooks (by watch %) to
  `.claude/skills/fither-voice/references/hooks.md`.

## The learning loop

The learning engine is four files plus one script; sessions inherit all of it:

- `node pipeline/analyze.mjs` → `data/insights.md` — derived metrics
  (saves/1k, pillar/format/hook-mechanism aggregates), kill-criteria flags,
  the launch signal. The planner reads insights.md, never the raw CSV.
- `content/experiments.md` — the experiment registry. Every week registers
  1–3 tests with a numeric decision rule; every Sunday the previous week's
  running experiments are closed with a result and a decision first.
- `content/learnings.md` — append-only validated findings with evidence.
  The channel's accumulated judgment; constrains all future plans.
- `data/comments.md` — comment buckets. Buckets become topics and product
  decisions; product-shaped buckets get flagged toward the app repo.
- `node pipeline/assets.mjs` → `data/assets.md` — the visual inventory and
  curation queue. Thin movement pools are visible before planning repeats them.

**Friday intake**: paste analytics in any form (text, screenshots) into any
session. The session fills `data/performance.csv` (one row per posted
video, including completion % and first retention drop-off second;
hook_mechanism comes from the video's sidecar), buckets notable comments
into `data/comments.md`, reruns analyze, and commits.

## What to measure, in order

1. **Saves per 1000 views** — the primary metric now that the week is
   carousels (a photo post has no watch %). >15 strong; 14.4 was the first
   gold-cover result.
2. **Likes per 1000 views** — the secondary carousel signal; use it to rank
   covers against each other when saves are too few to split.
3. **Follows per 1000 views** — >3 is good faceless. Never compare to face-led.
4. **Viewer mix** — follower share, country, gender and age from TikTok
   Studio; the account is written for US women 25 to 44 and the plan
   should read as theirs.
5. **Comment themes** — bucket every comment; buckets become product
   decisions and future topics.
6. Views last. Views are noise for the first 60 days.
7. **Average watch %, completion and drop-off** — for videos only, when
   videos ship again. >50% on 60s = good.

- **Kill criteria**: a pillar under 30% watch for 3 straight weeks gets cut.
- **Ready-to-launch signal**: 3+ videos with >60% watch and >20 saves/1000.
- **Week 6 checkpoint**: if animated demos sit under 40% watch, buy 4 hours
  of a body double and test 5 body-only demos against the same topics.

## Sync points with the app repo

Only two files depend on `utkuacikgoz/fither`; refresh them when the app
repo changes:

1. `references/movement-library.md` — regenerate with
   `node scripts/refresh-movement-library.mjs <path-to-fither-checkout>`.
2. `.claude/skills/fither-voice/SKILL.md` — the app's
   `.claude/skills/fither-voice/SKILL.md` is the upstream voice filter;
   this repo's copy adds channel rules on top. When the app's file changes,
   fold the change in here.
