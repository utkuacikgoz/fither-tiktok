# System audit and build waves — 2026-09-02

This is the engine-level follow-up to `docs/roadmap.md`. The earlier audit
correctly identified the visible quality gaps. This pass checks whether the
machine can reliably enforce its own promises, learn from results and scale
without expensive false-success runs.

## Current verdict

The concept and editorial system are unusually strong for a first week. The
render engine is a capable prototype, not yet a closed-loop production system.
Its strongest assets are the precise brand rules, sidecar-driven composition,
cached voice generation, approved-demo library and explicit learning criteria.

The limiting layer remains footage. The most urgent engineering issue was
trust: malformed or off-brand work could reach paid APIs, and several final QA
checks failed open. Wave 1 closes that gap.

## Gap register

| Severity | System | Finding | Status / wave |
|---|---|---|---|
| P0 | Preflight | No schema, brand-policy, movement, approved-demo or delivery validation before paid work | Fixed in Wave 1 |
| P0 | Faceless QA | Output scan sampled every four seconds and swallowed extraction/model failures | Fixed in Wave 1; 0.5s scan, fail closed |
| P0 | Audio QA | An unmeasurable line passed as success | Fixed in Wave 1 |
| P0 | Human QA | Contact sheet held only six frames, omitting the final 10+ seconds on long videos; generation failure was a note | Fixed in Wave 1; 5s, 4x4, fail closed |
| P0 | Delivery | Slideshow render returned before writing caption/notes and the posting-sheet collector required an MP4 | Fixed in Wave 1 |
| P1 | Duration | Six of seven Week 01 sidecars exceeded the writer's 45–60 second brief | Fixed in Wave 2; all seven pass strict preflight |
| P1 | Footage truth | Six movements have one approved clip each; pull has none; repeated footage is visible by Week 2 | Wave 2 |
| P1 | Asset visibility | Planning had no generated inventory showing thin movement pools and reuse pressure | Fixed in Wave 2 via `data/assets.md` |
| P1 | Animation contract | Planning understands authored animated scenes, but the renderer has no animation ingestion path yet | Wave 2, gated by the empty animation manifest |
| P1 | Regression safety | No five-second golden render exercises browser, fonts, ffmpeg, caption mix and output probes in CI | Fixed in Wave 2 |
| P1 | Metrics | No retention drop-off field; rates were averaged per video; missing weeks counted as consecutive kill weeks | Fixed in Wave 3 |
| P1 | Experiment loop | Experiments and learnings are prose, so closure/decision rules cannot be verified automatically | Wave 3 |
| P1 | Operations | Profile kit, comment intake/replies, cross-post variants and handle verification are manual/unimplemented | Wave 4 |
| P2 | Supply chain | GitHub Actions use moving major tags rather than immutable SHAs | Wave 4 |
| P2 | Portability | Local Chromium discovery assumes CI-style Linux paths; there is no supported local bootstrap command | Wave 4 |

Dependency audit on 2026-09-02: 89 installed packages, zero known npm
advisories. CI now uses the lockfile deterministically with `npm ci`.

## Build waves

### Wave 1 — Trust the machine (implemented)

Acceptance criteria:

- Every sidecar is validated before a paid API, browser, detector or ffmpeg run.
- Hard brand language and warm-up product mentions fail preflight.
- Movement demo declarations must exist in both the movement library and the
  owner-approved demo library.
- Audio, final face scan and QA sheet generation fail closed.
- Slideshow assets pass through the same delivery-sheet contract as video.
- Pull requests and render jobs run the preflight; reliability rules have tests.

### Wave 2 — Make every frame competitive

1. Cut Week 01 to 45–60 seconds without losing the story loop or CTA.
2. Add a golden five-second fixture render in CI, including output dimensions,
   duration, audio stream, captions and QA artifact assertions.
3. Resolve the format contract: implement authored animation ingestion and a
   body-only mode, or remove those choices from planning until they exist.
4. Finish demo curation to at least three approved clips per used movement and
   create an owner-shot pull bank for the doorframe ladder.
5. Add shot identity/history so adjacent scenes and recent videos cannot reuse
   the same clip invisibly.

The generated `data/assets.md` report now makes clip depth and movement reuse a
planning input. The remaining footage work is acquisition and owner approval,
not an undetected engine condition.

Provider decision: ElevenLabs remains the voice asset. Pexels remains the free
fallback. Runway becomes a budget-capped, curation-time premium source after a
controlled comparison with Higgsfield. Generative providers never depict
exercise form, and they never run nondeterministically inside the weekly render.
The default premium-video ceiling is $30/month, three attempts per shot and one
five-second premium clip per video; every accepted asset is cached and approved.

Exit metric: all seven videos pass strict preflight, the golden render passes in
CI, every named movement is visually demonstrated or explicitly designed as an
environment-only beat, and no clip repeats inside a week unless editorially
intentional.

### Wave 3 — Close the learning loop

1. [x] Add retention drop-off seconds and completion rate to intake.
2. [x] Correct view-weighted channel metrics and calendar-consecutive kill logic.
3. [x] Parse the experiment registry into machine-checkable records and verify
   that due tests are closed before the next plan is accepted.
4. Automate top-quartile hook harvesting every 20 posted videos.
5. Generate a weekly decision report that links each change to evidence.

Exit metric: a new weekly plan cannot be accepted until last week's due
experiments and metrics are accounted for, with no manual arithmetic.

### Wave 4 — Operate and distribute

1. Profile kit and pinned-video plan.
2. Comment intake, theme bucketing and on-voice reply drafts.
3. Reels and Shorts caption/export variants from one master render.
4. Handle verification and posting-friction measurement before any scheduler
   decision.
5. Pin third-party Actions by commit and add a supported local bootstrap/check
   command.

Exit metric: one weekly run produces verified masters, platform-specific posting
packs, a comment queue and a decision report, while the human retains final QA
and publishing control.
