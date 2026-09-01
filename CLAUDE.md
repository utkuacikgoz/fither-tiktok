# FITHER TikTok — the warm-up content machine

Faceless TikTok channel (@fither) for FITHER: equipment-free strength for
time-poor women. This repo plans, writes and logs the content. The app lives
in a separate repo (`utkuacikgoz/fither`); keep the two decoupled except for
the sync points below.

## Before doing anything

Read `.claude/skills/fither-voice/SKILL.md`. Its `references/forbidden.md`
is a hard list, not a guideline. During the warm-up period the app, the
waitlist and the launch are never mentioned in content.

## The three commands

```
plan week N                    # content-planner agent → content/weeks/week-NN.md
write the videos for week N    # video-writer agent → content/scripts/*.md + *.json
node pipeline/produce.mjs N    # renders the week → renders/week-NN/*.mp4 + posting sheet
```

The machine produces finished videos itself; see `docs/media-pipeline.md`.
Rendering needs `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` and
`PEXELS_API_KEY` in the environment; without them it renders honest drafts
(silent, gradient backgrounds) and says so.

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
- Never plan around trending sounds. They expire before filming.

## Layout

- `.claude/agents/` — content-planner, video-writer
- `.claude/skills/fither-voice/` — brand voice; shared filter with the app repo
- `assets/animations.md` — which movement animations exist (the gate for
  the animated-demo format)
- `content/log.md` — every topic ever used, with results
- `content/weeks/week-NN.md` — planner output
- `content/scripts/YYYY-MM-DD-slug.md` — writer output, one per video
- `content/scripts/YYYY-MM-DD-slug.json` — render spec sidecar, one per video
- `pipeline/` — the renderer (ElevenLabs + Pexels + Chromium overlays + ffmpeg)
- `renders/` — finished MP4s and posting sheets (gitignored, delivered per week)
- `data/performance.csv` — views, watch %, follows, saves, per video

## The weekly loop

- **Sunday, automated**: the scheduled task plans the week, writes the
  scripts and sidecars, renders all 7 videos, and delivers them with a
  posting sheet.
- **Daily, 2 min**: post one from the posting sheet, at a fixed time.
- **Friday, 10 min**: paste the week's numbers into `data/performance.csv`.
- **Every 20 videos**: append top-quartile hooks (by watch %) to
  `.claude/skills/fither-voice/references/hooks.md`.

## What to measure, in order

1. **Average watch %** — the only number that matters early. >50% on 60s = good.
2. **Saves per 1000 views** — primary faceless metric. >15 strong.
3. **Follows per 1000 views** — >3 is good faceless. Never compare to face-led.
4. **Comment themes** — bucket every comment; buckets become product
   decisions and future topics.
5. Views last. Views are noise for the first 60 days.

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
