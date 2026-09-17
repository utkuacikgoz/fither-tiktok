# Brief: running a faceless TikTok content machine for several products

Written 2026-09-17 for a fresh Claude Code session that will stand up the
same workflow for more accounts, one per product, in whatever domain each
product lives. It carries what the first account learned in its first
three weeks so the next ones skip the mistakes. Nothing here depends on the
first product's subject; every domain-specific piece is a slot to fill.
Read it top to bottom before writing a line of code or copy.

## 1. What this machine is

A faceless TikTok account planned, written, rendered and measured from one
repo. The owner's job is ten minutes a day: post three carousels from a zip,
paste the numbers on Friday. Everything else is agents and a Node pipeline.

The loop, per account:

1. **Plan** (planner agent): 21 carousel topics a week, three a day, from
   the brand voice file, the product's fact library, the topic log, the
   experiment registry, the learnings file and the generated insights.
2. **Write** (writer agent, one subagent per topic, run in parallel): a
   Markdown script plus a JSON sidecar per post. The sidecar is the render
   contract: slides, kicker, footer, cover line, title, caption, hashtags.
3. **Validate** (`node pipeline/validate.mjs`): schema, forbidden words,
   fact library, experiment rules, staleness of generated reports. Free,
   runs in seconds, blocks everything downstream.
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
an argument. Apply all of them from day one on every account.

1. **The cover is the post.** Week 01 covers were editorial serif on cream
   and drew 235 views in three days with the wrong audience. The first
   bold poster cover, a saturated brand-colour ground with the hook in a
   heavy uppercase sans, drew 836 views in 3.5 hours, 14.4 saves per 1000,
   and the audience the brand was written for. Same body style, same
   account. Bold poster cover, calm body slides.
2. **Hooks come from a proven format list, not from taste.** The owner
   supplied two lists of hook formats that work on the platform (15 proven
   openers, then 60 slideshow patterns in twelve groups). They are the only
   source of cover lines. Every cover names its format in a bracket so the
   next person can see which shape earned what. Number-led and claim-led
   openings lost; a specific person in a specific scene won.
3. **Plain English, one item per slide, "Name. Amount. One instruction."**
   The first rewrite read like an expert talking. The owner asked for
   plainer, more targeted copy, and the plain version is the one that
   performed. Short sentences, no jargon, no cleverness in the body.
4. **Carousels ship; video waits.** Video needs footage that is faceless,
   on-brand and shows the real thing. Stock failed (wrong person, faces),
   generated footage costs per clip, animation needs authoring and review.
   Carousels need none of that. Ship what can ship; do not hold the account
   on the format that cannot.
5. **Truth gates are hard, not advisory.** Every named item must exist in
   the product's fact library, by exact name and real values. Every claim
   must be one the product can keep. The pipeline enforces this on every
   run; agents are told, but the validator is what stops it.
6. **Warm-up rule.** No product mention, no waitlist, no "coming soon" for
   the first 60 days. The account earns the right to sell. Hook formats
   that need a customer, a review, an expert or the product itself are
   held in the bank with the reason, not deleted and not used early.
7. **An owned visual beats an empty frame.** A simple illustrated figure
   authored as data and rendered in canvas (no footage, no faces, owned
   outright) lifts an instruction slide and reads as the brand's own. Author
   it as data, render once, review it, then reuse forever.
8. **Watch % does not exist for photo posts.** Saves per 1000 is the first
   number, likes per 1000 the tiebreak, viewer mix (country, gender, age,
   follower share) the sanity check, views last. Build the analytics report
   around what the platform actually shows for the format you post.
9. **GitHub Actions is the wrong place for cheap renders.** The artifact
   quota blocked delivery for three days and the minutes bill grew. Render
   stills locally or in the session; keep Actions for video only, and push
   video renders to a git branch, not to artifacts.
10. **Never let a machine gate approve.** Machine screening (face detection,
    checksum, schema) can reject; only a human approves a visual, a demo or
    a footage clip. Week 01 passed every machine gate and failed the brand
    bar seven times out of seven.
11. **Audience data changes the copy.** The viewer tab said which country,
    which gender, which age. That set the spelling, the vocabulary and the
    scenes, and the owner then cut a whole class of scenes the audience did
    not live in. Read the viewer tab before the plan, not after.
12. **No AI attribution anywhere.** Commits, branches, comments, content:
    the owner's name, the owner's rule, enforced by a git hook.

## 3. What to fill in per product

Everything below is a slot. The rest of the repo is shared machinery and
should be copied, not rewritten.

| Slot | What it is | What the new product needs |
|---|---|---|
| Voice skill | `.claude/skills/<brand>-voice/SKILL.md` | one file: audience, tone, forbidden words, channel rules |
| Fact library | `references/<domain>-library.md`, generated from the product repo | the product's own fact list (items, names, values), generated by a script, never hand-written |
| Forbidden list | `references/forbidden.md` + regexes in `pipeline/lib/policy.mjs` | the claims and words this product can never make, as regexes the validator runs |
| Hook bank | `content/product-hooks.md` | the shared hook formats translated into this product's lines, held formats marked |
| Pillars | four or five recurring topic shapes | a fixed weekly mix, one free slot awarded on last week's saves |
| Templates | `pipeline/templates/slide.html`, `slide-bold.html` | brand colours and fonts only; keep the layout, swap the tokens |
| Owned visual | an authored, reviewed, brand-owned illustration | whatever honest visual the product can own, gated by human review |
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
  cover line, title and the items it names.
- **Validator** (a shell step, not an agent): `validate.mjs` after every
  batch of writes. Fix the sidecar, never weaken the gate.
- **Renderer** (a shell step): render each carousel locally, build a
  contact sheet per deck, look at every slide before delivery. A layout bug
  shipped in a posted carousel on the first account because one render went
  out without a full-deck look.
- **Deliverer**: zip the decks with their caption files; the owner posts.
- **Intake** (any session, Friday): screenshots in, CSV rows out, analyze,
  close experiments, append learnings, commit.

Across products, a single coordinating session can dispatch "plan week N"
and "write the carousels for week N" to each product session in turn and
collect the zips, but it must never share copy between products. The voice
file and the fact library are per product; the hook formats are shared;
the learnings file is per product and cross-product findings go in a short
shared file the coordinator maintains.

## 5. Setup runbook for a new account

1. Copy the repo. Delete `content/`, the rows in `data/performance.csv`,
   the authored visuals and their manifests, and the shot history entries.
   Keep `pipeline/`, `.claude/`, `docs/`, `.githooks/`.
2. Write the voice skill and the forbidden list for the product. Turn the
   forbidden list into regexes in `pipeline/lib/policy.mjs`.
3. Generate the fact library from the product repo with a refresh script.
   Never hand-write it.
4. Translate the hook formats in `content/product-hooks.md` into the
   product's lines. Mark every format that needs proof the account does not
   have as held, with the reason.
5. Swap brand tokens in the two slide templates. Keep the bold poster cover
   and the calm body; that pairing is the tested one.
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
- Video (when it returns): text-to-speech per line (cached per line, never
  re-billed for unchanged text), generated footage per clip, Actions
  minutes per render. Keep it off until the carousels prove the topic.
- The owner's time: ten minutes a day posting, ten on Friday.

## 7. Open problems the new accounts inherit

- The posting sheet does not yet flag which posts need TikTok's AI-content
  label per post. Carousels with an owned illustration do not need it; any
  generated person does.
- The owned visual covers only part of the fact library on the first
  account; the rest is authored as data and waits on a render and a review.
  A new product will need its own visual and its own review queue.
- Per-post saves and likes have to be read off screenshots. Until TikTok
  Studio exports them, intake is manual and the experiments must be shaped
  around numbers a screenshot shows.
