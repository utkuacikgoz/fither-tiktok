# Brief: running this content machine for several products at once

Written 2026-09-17 for a fresh Claude Code session that will stand up the
same workflow for more TikTok accounts, one per product. It carries what
this repo learned in its first three weeks so the next accounts skip the
mistakes. Read it top to bottom before writing a line of code or copy.

## 1. What this machine is

A faceless TikTok account planned, written, rendered and measured from one
repo. The owner's job is ten minutes a day: post three carousels from a zip,
paste the numbers on Friday. Everything else is agents and a Node pipeline.

The loop, per account:

1. **Plan** (content-planner agent): 21 carousel topics a week, three a day,
   from the brand voice file, the truth library, the topic log, the
   experiment registry, the learnings file and the generated insights.
2. **Write** (video-writer agent, one subagent per topic, run in parallel):
   a Markdown script plus a JSON sidecar per post. The sidecar is the render
   contract: slides, kicker, footer, cover line, title, caption, hashtags.
3. **Validate** (`node pipeline/validate.mjs`): schema, policy words, truth
   library, experiment rules, staleness of generated reports. Free, runs in
   seconds, blocks everything downstream.
4. **Render** (`node pipeline/render.mjs <script>`): Chromium screenshots of
   HTML templates, one PNG per slide, plus a caption file with the title.
   Carousels need no API key and no footage, so they cost nothing.
5. **Post** (owner, by hand): three photo posts a day, title and caption
   from the caption file.
6. **Measure** (Friday intake): the owner pastes TikTok Studio screenshots
   into a session; the session fills `data/performance.csv`, buckets
   comments, reruns `node pipeline/analyze.mjs`, closes experiments, appends
   learnings, commits.

## 2. What we learned, in the order it mattered

These are the findings with evidence behind them. Each one cost a week or
an argument. Apply all of them from day one on every new account.

1. **The cover is the post.** Week 01 covers were editorial serif on cream
   and drew 235 views in three days with a 55% male audience. The first
   bold gold poster cover with the hook in Inter 900 uppercase drew 836
   views in 3.5 hours, 14.4 saves per 1000, 88% women, 96% US. Same body
   style, same account. Bold poster cover, cream body slides.
2. **Hooks come from a proven format list, not from taste.** The owner's
   two lists (`content/product-hooks.md`, formats 21 to 78) are the only
   source of cover lines. Every cover names one format in a bracket so the
   next person can see which shape earned what. Number-led and claim-led
   openings lost; a person in a scene won.
3. **Plain English, one movement per slide, "Name. Reps. One instruction."**
   The first rewrite of week 02 read like a coach. The owner asked for
   plainer, more targeted copy, and the plain version is the one that
   performed. Short sentences, no jargon, no cleverness in the body.
4. **Carousels ship; video waits.** Video needs footage that is faceless,
   on-brand and shows a real movement. Stock failed (wrong gender, faces),
   generated footage costs per clip, animation needs authoring and review.
   Carousels need none of that. Ship what can ship; do not hold the account
   on the format that cannot.
5. **Truth gates are hard, not advisory.** Every named exercise must exist
   in the product's library, by exact name and real reps. Every claim must
   be one the product can keep. The pipeline enforces this on every run;
   agents are told, but the validator is what stops it.
6. **Warm-up rule.** No product mention, no waitlist, no "coming soon" for
   the first 60 days. The account earns the right to sell. Hook formats
   that need a customer, a review, an expert or the product itself are
   held in the bank with the reason, not deleted and not used early.
7. **A figure beats an empty room.** A stick-figure movement demo authored
   in canvas (no footage, no faces, FITHER-owned) reads as "the little
   animation woman doing the position" and lifts a movement slide. Author
   poses as data, render once, review the loop, then reuse forever.
8. **Watch % does not exist for photo posts.** Saves per 1000 is the first
   number, likes per 1000 the tiebreak, viewer mix (country, gender, age,
   follower share) the sanity check, views last. Build the analytics report
   around what the platform actually shows for the format you post.
9. **GitHub Actions is the wrong place for cheap renders.** The artifact
   quota blocked delivery for three days and the minutes bill grew. Render
   stills locally or in the session; keep Actions for video only, and push
   video renders to a git branch, not to artifacts.
10. **Never reward a machine gate.** Machine screening (face detection,
    checksum, schema) can reject; only a human approves a demo, a figure
    export or a footage clip. Week 01 passed every machine gate and failed
    the brand bar seven times out of seven.
11. **Audience data changes the copy.** 96% US meant "moms", US spellings,
    US scenes. The owner then cut travel scenes (airports, gates, lockers)
    entirely. Read the viewer tab before the plan, not after.
12. **No AI attribution anywhere.** Commits, branches, comments, content:
    the owner's name, the owner's rule, enforced by a git hook.

## 3. What to generalise per product

Everything below is a slot to fill per account. The rest of the repo is
shared machinery and should be copied, not rewritten.

| Slot | FITHER value | What the new product needs |
|---|---|---|
| Voice skill | `.claude/skills/fither-voice/SKILL.md` | one file: audience, tone, forbidden words, channel rules |
| Truth library | `references/movement-library.md` (generated from the app's `movements.json`) | the product's own fact list, generated from the product repo, never hand-written |
| Forbidden list | `references/forbidden.md` + `pipeline/lib/policy.mjs` regexes | the claims and words this product can never make, as regexes the validator runs |
| Hook bank | `content/product-hooks.md` | the owner's proven formats translated into this product's lines, held formats marked |
| Pillars | Constraint, Skill ladder, Reframe, Fast tips | four or five recurring topic shapes with a fixed weekly mix |
| Templates | `pipeline/templates/slide.html`, `slide-bold.html` | brand colours and fonts only; keep the layout, swap the tokens |
| Figure or visual | authored canvas stick figure | whatever honest, ownable visual the product has, gated by human review |
| Experiments | `content/experiments.md`, 1 to 3 live per week | same registry format, product-specific hypotheses |
| Analytics | `data/performance.csv` → `data/insights.md` | same columns; add nothing until the platform shows it |

## 4. Agent architecture for many accounts

Run one orchestrating session per product, not one session for all. Each
product repo is a copy of this one with the slots above filled. Inside a
product session, the work fans out like this:

- **Planner** (one agent): reads insights, learnings, experiments, the log
  and the hook bank; writes `content/weeks/week-NN.md` with 21 topics.
- **Writers** (one subagent per topic, up to seven in parallel): each writes
  one carousel's Markdown and JSON sidecar. Give each one the reference deck
  that last performed best and the exact rules; ask for a short report of
  cover line, title and movements.
- **Validator** (a shell step, not an agent): `validate.mjs` after every
  batch of writes. Fix the sidecar, never weaken the gate.
- **Renderer** (a shell step): render each carousel locally, build a
  contact sheet per deck, look at every slide before delivery. A layout bug
  shipped in a posted carousel here because one render went out without a
  full-deck look.
- **Deliverer**: zip the decks with their caption files; the owner posts.
- **Intake** (any session, Friday): screenshots in, CSV rows out, analyze,
  close experiments, append learnings, commit.

Across products, a single coordinating session can dispatch "plan week N"
and "write the carousels for week N" to each product session in turn and
collect the zips, but it must never share copy between products. The voice
file and the truth library are per product; the hook formats are shared;
the learnings file is per product and the cross-product findings go in a
short shared file the coordinator maintains.

## 5. Setup runbook for a new account

1. Copy this repo. Delete `content/`, `data/performance.csv` rows,
   `assets/animation-*`, `data/shot-history.json` entries. Keep `pipeline/`,
   `.claude/`, `docs/`, `.githooks/`.
2. Write the voice skill and the forbidden list for the product. Turn the
   forbidden list into regexes in `pipeline/lib/policy.mjs`.
3. Generate the truth library from the product repo with a script like
   `scripts/refresh-movement-library.mjs`. Never hand-write it.
4. Translate the hook formats in `content/product-hooks.md` into the
   product's lines. Mark every format that needs proof the account does not
   have as held, with the reason.
5. Swap brand tokens in the two slide templates. Keep the bold poster cover
   and the cream body; that pairing is the tested one.
6. Set the git identity and hook: the owner's name and email,
   `core.hooksPath .githooks`. No AI attribution anywhere.
7. Plan week 01 (21 carousels), write it with parallel writer subagents,
   validate, render locally, look at every slide, zip, deliver with titles
   and captions.
8. Post three a day. Friday: intake, analyze, close experiments, append
   learnings. Every 20 posts, harvest top-quartile covers into
   `references/hooks.md`.
9. Do not mention the product for 60 days. Do not plan trending sounds. Do
   not schedule the machine until a week ships that passes human review.

## 6. Cost and time, so the next session budgets honestly

- Planning and writing a 21-carousel week: one planner run plus seven
  parallel writer subagents, under an hour of session time, no API spend.
- Rendering 21 carousels locally: minutes, no API spend, no Actions minutes.
- Video (when it returns): ElevenLabs per line (cached per line, never
  re-billed for unchanged text), generated footage per clip, Actions
  minutes per render. Keep it off until the carousels prove the topic.
- The owner's time: ten minutes a day posting, ten on Friday.

## 7. Open problems the new accounts inherit

- The posting sheet does not yet flag which posts need TikTok's AI-content
  label per post. Carousels with the authored figure do not need it; any
  generated person does.
- Only seven movements have an authored figure; six more are authored as
  data and wait on a render and a review. A new product will need its own
  visual and its own review queue.
- Per-post saves and likes have to be read off screenshots. Until TikTok
  Studio exports them, intake is manual and the experiments must be shaped
  around numbers a screenshot shows.
