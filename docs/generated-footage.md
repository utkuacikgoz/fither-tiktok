# Generated footage: Runway

Stock libraries ran out. Two curation rounds screened 88 candidate clips and
approved six, of which the truth audit later quarantined five — the Pexels
pool simply does not contain enough body-only, face-free movement footage.
Generation widens the pool without waiting on a shoot.

Generated clips are footage like any other, so the demo-truth rule holds
without exception: **machine screening never approves footage.** A generated
clip enters `assets/demo-library.json` only after a human watches it end to
end and confirms the exact movement, usable form, and that the person is the
approved character.

**Faces are allowed here** (owner override, 2026-09-03). The person is
synthetic, so no real person is depicted and the faceless rule does not
apply. Stock and owned footage is unchanged: it never shows a face, and the
render still scans every second of the finished video that is not covered by
a generated clip.

Two conditions come with that. The character is **one recurring woman**,
pinned by a reference portrait, because a different synthetic face per clip
reads as uncanny. And any video carrying her is posted with **TikTok's
AI-generated-content label** — the posting sheet carries the instruction.

## The flow

```
assets/generation-prompts.json     the shot book: one prompt per movement
        ↓  node pipeline/generate.mjs   (CI: Generate demo candidates)
generated-demos branch             clips + frames + review.html + candidates.json
        ↓  human watches every clip
assets/demo-library.json           approved entries, source: "generated"
        ↓  node pipeline/produce.mjs
renders/week-NN/*.mp4              checksum-pinned at fetch time
```

Nothing is auto-approved and nothing is committed to `main` by the workflow.

## Provider

Runway only (owner decision, 2026-09-03). Gen-4 Turbo animates a starting
frame, so generation runs in two steps: `text_to_image` produces the still,
then `image_to_video` animates it. **The still is where framing is won or
lost**, which is why the prompt book composes the whole frame — subject,
crop, wardrobe, room, light, lens and grade — and leaves the motion prompt
to describe only what moves.

| | Runway |
|---|---|
| Secret | `RUNWAY_API_SECRET` |
| Path | `text_to_image` (Gen-4 Image) then `image_to_video` (Gen-4 Turbo) |
| Auth | `Authorization: Bearer <secret>` plus a dated `X-Runway-Version` |
| Async | task id then `GET /v1/tasks/{id}`, polled at most every 5s |

### Configuration

Every default is env-overridable, so Runway moving its surface is a config
change and not a code change: `RUNWAY_BASE_URL`, `RUNWAY_API_VERSION`,
`RUNWAY_VIDEO_MODEL`, `RUNWAY_IMAGE_MODEL`, `RUNWAY_VIDEO_RATIO`,
`RUNWAY_IMAGE_RATIO`.

A shape mismatch fails loudly with the provider's own response body rather
than silently producing nothing — the first run against a changed API tells
you exactly what changed.

## Running it

Generation needs the API keys, which live as GitHub repository secrets, so it
runs in CI:

- **Actions → Generate demo candidates → Run workflow.** Optional inputs:
  `movements` (comma-separated; default is every prompt-book movement with no
  approved clip) and `takes` (clips per movement, default 2).
- Or push a `.github/generate-request` change to trigger the same run.

Results land on the force-pushed `generated-demos` branch:

```
git fetch origin generated-demos && git checkout origin/generated-demos -- generation
open generation/review.html
```

Cost control: seeds are derived from movement, provider and take number, so
a rerun reproduces the same shot rather than re-rolling and re-billing. Clips
default to 5 seconds — long enough for one full repetition, which is all a
demo scene uses.

## The prompt book

`assets/generation-prompts.json` is a shot book, not a list of search terms.
It carries a house look (`look`, `camera`, `light`, `room`, `wardrobe`) that
every prompt inherits, so generated footage is consistent enough to sit in
one feed, plus per-movement `prompt` and `motion`. A movement may override
`framing` where the default reads wrong: every floor movement does, because
"collarbone down at chest height" is the wrong instruction for a camera
resting on the floor beside a mat.

The house look also encodes the brand defensively. It forbids gyms, mirrors,
dumbbells, kettlebells, bands and machines; it forbids text, logos and
watermarks; and it asks for true skin texture rather than a beauty-filter
finish. Those lines exist because the week 01 stock QA failed on exactly
those things.

## Casting the character

Generation refuses to run until `assets/character.json` names an approved
portrait, because without one every clip invents a new stranger.

1. **Actions → Cast recurring character → Run workflow** (input: how many
   candidate portraits, default 4).
2. Results land on the `character-candidates` branch; open
   `character/review.html`.
3. Commit the chosen portrait into this repo as
   `assets/character/portrait.jpg`, set `approved_file` to that path and
   `approved_at` to the date.

The portrait is kept as **bytes, not a link**. Runway's own asset URLs expire
within a day or two, and the `character-candidates` branch is force-pushed by
the next casting run, so either would quietly unpin the character: the
reference would 404 and every later clip would invent a new woman. The file is
sent inline as a data URI on each generation, and Runway pins her from it, so
the same woman performs every movement. `approved_url` still works if you
would rather host the portrait somewhere durable yourself.

## Environment scenes

A week's sidecars carry roughly one demo scene and thirty-five environment
scenes, and it was the environment footage that failed week 01: a stock
watermark, third-party gym branding, a kettlebell, a car steering wheel
standing in for an incline push-up. Query-based stock sourcing is retired for
these (owner decision, 2026-09-03).

Run it with `GENERATION_TARGET=environments`. Prompts are composed rather than
authored per query, because the sidecar query is already a shot description:

```
"hands opening oven door"
  + environments.framing        close on hands/feet/back, shallow focus
  + environments.settings.kitchen   selected by keyword from the query
  + wardrobe + light + camera + look
```

Only queries that appear in the current sidecars are generated: footage no
script asks for is money spent on nothing. A query matching no setting keyword
falls back to `default_setting` and the run **prints which queries fell back**,
so a wrong room is caught before review rather than during it.

Approved clips live in `assets/environment-library.json`, keyed by query, and
`node pipeline/assets.mjs` reports coverage per query. At render time an
approved clip wins; Pexels search is the fallback, which is the inverse of
week 01.

## The machine gate (before you review)

Each clip is sampled at nine points across its length and checked for a
person. A clip with nobody in frame is rejected: the model produced a room
instead of a demo. Faces are no longer a rejection here, since the person is
synthetic. Survivors go into `candidates.json` with
`movement_verified: false` — the honest starting state.

What the machine cannot judge is what actually matters now: whether the
movement is the named movement, whether the form is usable, and whether the
limbs are anatomically right. Generated exercise video fails on all three
regularly. That is what your review is for.

## Approving a clip

Watch the clip end to end, then copy its entry from `generation/candidates.json`
into `assets/demo-library.json` under its movement, adding the review fields:

```json
{
  "source": "generated",
  "provider": "runway",
  "model": "gen4_turbo",
  "prompt": "A woman doing wall push-ups ...",
  "url": "https://raw.githubusercontent.com/utkuacikgoz/fither-tiktok/generated-demos/generation/clips/Wall_Push-Up--runway--0.mp4",
  "sha256": "…",
  "duration": 5,
  "movement_verified": true,
  "reviewed_at": "2026-09-03"
}
```

`node pipeline/assets.mjs --check` enforces the schema: a generated entry
without a known provider, its prompt, an HTTPS url and a SHA-256 fails
preflight. At render time the clip is fetched and its checksum verified, so
a swapped file fails the render instead of shipping.

The `generated-demos` branch is force-pushed by each run. Approving a clip
pins its bytes by checksum, but the branch is not an archive — move footage
you intend to keep for the long run into owned storage and switch the entry
to `source: "owned"`.

## Honesty note for the channel

Generated demos are illustrations of a movement, not documentary footage of
a real person's workout. They never carry a claim about a real body, a real
result, or a real person, and the voice never implies otherwise.
