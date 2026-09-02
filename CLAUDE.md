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
  movements listed in `assets/animations.md`. That manifest starts empty;
  until animations land, plan environment POV and text-on-screen only.
- **Wrist caveat**: the app library has no wrist-neutral push variants yet.
  Never promise "wrist-friendly push-ups"; sore wrists mean pull, squat,
  hinge and core content, and say so honestly.
- **Faceless**: no face ever appears. Voice is the persona — the same
  ElevenLabs voice as the app's in-session guidance.
- **Demo truth**: machine screening never approves footage. A demo enters
  `assets/demo-library.json` only after full-motion review confirms the exact
  movement, usable form framing and no recognizable face in any frame.
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
- `assets/animations.md` — which movement animations exist (the gate for
  the animated-demo format)
- `content/log.md` — every topic ever used, with results
- `content/experiments.md` — the experiment registry (hypothesis → decision)
- `content/learnings.md` — validated findings, append-only
- `data/insights.md` — generated analytics report (`node pipeline/analyze.mjs`)
- `data/assets.md` — generated footage/animation readiness report (`node pipeline/assets.mjs`)
- `docs/footage-capture.md` — the body-only filming and approval contract
- `docs/sound-system.md` — original bed, ducking, loudness and posting contract
- `data/comments.md` — comment theme buckets
- `content/weeks/week-NN.md` — planner output
- `content/scripts/YYYY-MM-DD-slug.md` — writer output, one per video
- `content/scripts/YYYY-MM-DD-slug.json` — render spec sidecar, one per video
- `pipeline/` — the renderer (ElevenLabs + Pexels + original sound + Chromium overlays + ffmpeg)
- `renders/` — finished MP4s and posting sheets (gitignored, delivered per week)
- `data/performance.csv` — views, watch %, completion, first drop-off, follows and saves per video

## The weekly loop

- **Sunday, automated**: the scheduled task plans the week, writes the
  scripts and sidecars, renders all 7 videos, and delivers them with a
  posting sheet.
- **Daily, 2 min**: post one from the posting sheet, at a fixed time.
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

1. **Average watch %** — the only number that matters early. >50% on 60s = good.
2. **Completion % and first retention drop-off second** — show where the
   promise loses viewers, not only how many it loses.
3. **Saves per 1000 views** — primary faceless metric. >15 strong.
4. **Follows per 1000 views** — >3 is good faceless. Never compare to face-led.
5. **Comment themes** — bucket every comment; buckets become product
   decisions and future topics.
6. Views last. Views are noise for the first 60 days.

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
