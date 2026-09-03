# Generated footage: Runway

Stock libraries ran out. Two curation rounds screened 88 candidate clips and
approved six, of which the truth audit later quarantined five — the Pexels
pool simply does not contain enough body-only, face-free movement footage.
Generation widens the pool without waiting on a shoot.

Generated clips are footage like any other, so the demo-truth rule holds
without exception: **machine screening never approves footage.** A generated
clip enters `assets/demo-library.json` only after a human watches it end to
end and confirms the exact movement, usable form and no recognizable face in
any frame.

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

## The machine gate (before you review)

Each clip is sampled at nine points across its length, brightened, and
checked. Any frame with a detected face at a strict 0.35 threshold rejects
the clip; a clip with no person detected anywhere is also rejected. Survivors
go into `candidates.json` with `movement_verified: false` and
`faceless_verified: false` — the honest starting state.

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
  "faceless_verified": true,
  "reviewed_at": "2026-09-02"
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
