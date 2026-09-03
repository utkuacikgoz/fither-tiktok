# Generated footage: Runway and Higgsfield

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

## Providers

| | Runway | Higgsfield |
|---|---|---|
| Secrets | `RUNWAY_API_SECRET` | `HIGGSFIELD_API_KEY_ID`, `HIGGSFIELD_API_KEY_SECRET` |
| Path | `text_to_image` (Gen-4 Image) → `image_to_video` (Gen-4 Turbo) | text-to-video (DoP) |
| Auth | `Authorization: Bearer <secret>` + dated `X-Runway-Version` | `Authorization: Key <id>:<secret>` |
| Async | task id → `GET /v1/tasks/{id}`, poll at most every 5s | request id → status url |

Runway generates a still first because Gen-4 Turbo animates a starting
frame; that still is where body-only framing is won or lost, which is why
the prompt book describes the crop and not just the movement.

Both providers are optional. The generator runs with whichever keys are
present and says which ones it used.

### Configuration

Defaults are set for the shapes above and every one is env-overridable, so a
provider moving its surface is a config change and not a code change:
`RUNWAY_BASE_URL`, `RUNWAY_API_VERSION`, `RUNWAY_VIDEO_MODEL`,
`RUNWAY_IMAGE_MODEL`, `RUNWAY_VIDEO_RATIO`, `RUNWAY_IMAGE_RATIO`,
`HIGGSFIELD_BASE_URL`, `HIGGSFIELD_T2V_PATH`, `HIGGSFIELD_MODEL`.

A shape mismatch fails loudly with the provider's own response body rather
than silently producing nothing — the first run against a changed API tells
you exactly what changed.

## Running it

Generation needs the API keys, which live as GitHub repository secrets, so it
runs in CI:

- **Actions → Generate demo candidates → Run workflow.** Optional inputs:
  `movements` (comma-separated; default is every prompt-book movement with no
  approved clip), `providers` (`runway`, `higgsfield`, or both), `takes`
  (clips per movement per provider, default 2).
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
