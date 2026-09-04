# AAA audit and roadmap — 2026-09-02

Honest scorecard of the warm-up system against a AAA bar: could this
channel sit next to the best faceless fitness accounts and not look
automated? Grades per area, then the plan. Sessions treat P0 items as
standing work orders.

## Scorecard

| Area | Grade | One-line verdict |
|---|---|---|
| Copy & storytelling | A- | Story-driven hooks, payoffs, day-chaining; needs data to prove it |
| Overlay design | A- | Editorial serif over scrim; new, unproven on-platform |
| Voice | B+ | Right voice, one delivery setting; no emphasis tuning |
| Footage | D | Truth audit quarantined 6 legacy/candidate clips; only Full Plank remains approved |
| Edit rhythm | A- | Auto-cut rhythm plus fail-closed cross-post identity history; creative variety is reviewed manually |
| Sound design | B+ | Original ducked/mastered bed is CI-verified; phone/on-platform response is unproven |
| Accessibility | A- | Burned captions, SRT and legible carousel design; word-level emphasis is untested |
| Reliability | A- | Preflight, fail-closed QA and video/carousel golden fixtures are green in CI |
| Learning engine | A- | Registry, insights, kill rules built; unexercised until first data |
| Channel ops | D | No profile kit, no comment workflow, no cross-posting, handles unverified |

## What is missing, concretely

1. **Footage truth and depth.** Full-motion review quarantined six legacy or candidate
   clips with recognizable faces or the wrong movement. Only Full Plank has
   one approved demo. The 18-clip capture brief is the immediate blocker;
   pull movements still have zero demos.
2. **Creative shot diversity.** Stable asset identities now block exact reuse
   within a pack and across recorded posts. Human QA still judges whether two
   technically different clips feel visually repetitive.
3. **Sound validation.** The rights-safe `quiet-drive` bed, automatic ducking
   and loudness/peak gates are built. Phone-speaker balance and audience
   response remain unproven until the canary renders and first posted week.
4. **Channel ops.** No avatar/bio/pinned plan, no comment-reply
   workflow (brand promise: answer every comment for 90 days), no
   Shorts/Reels cross-post from the same MP4s, handle reservations
   unconfirmed.
5. **Animation supply.** The fail-closed ingestion path is implemented: exact
   authored exports are checksum-pinned, media-probed, identity-tracked and
   required by schema. The remaining blocker is delivery of reviewed exports.
6. **Learning data.** The analytics and experiment engine is built but has
   zero posted-video rows, so no editorial decision is evidence-backed yet.
7. **Operations hardening.** Action versions still use moving major tags;
   hook harvesting, a weekly decision report and local bootstrap remain.

## The plan

### P0 — this week (raises what every video looks like)

**Ship/hold decision, 2026-09-03: hold.** Nothing goes out under the bar,
which means the kill criteria, the experiment registry and the launch signal
all stay unexercised and footage decisions keep being made on taste rather
than watch %. That cost is accepted deliberately.

**Owner QA verdict, 2026-09-03: week 01 renders are NOT postable.** Every
machine gate passed (faceless, loudness, audible voice, 60s contract) and
the footage still fails the brand bar on human review. Found across the
seven QA sheets: a visible stock watermark over the closing scene of the
push-up ladder; a body-focused underwear shot opening train-to-carry, which
is forbidden territory; third-party gym branding (a fighting academy) in the
same video; a kettlebell in the zero-noise session, which breaks the
equipment-free promise; irrelevant visuals standing in for movements (a car
steering wheel for incline push-ups, eggs in a bowl for sit-to-stands, an
office computer for doorframe rows); and several scenes falling back to the
brand gradient because nothing acceptable was found.

This is the demo-truth rule applied to environment footage: machine
screening never approves footage. Query-based stock sourcing cannot reach
this bar, because the queries describe a subject while the brand cares about
framing, context and props the search cannot express. The route forward is
generated footage (docs/generated-footage.md, awaiting provider keys) and
the owner capture brief, not further query tuning.


- [x] Burned line-level captions from measured VO timing + .srt sidecar
- [x] Scene auto-cutting: split scenes >4s across 2-3 clips from the same
      query/demo pool; cut on beat boundaries
- [x] Branded end-card template for the CTA close
- [x] Face check on rendered QA frames (post-render gate)
- [x] Curation round 2: reviewed all 36 new stock candidates frame by
      frame; zero met the bar (faces visible, gym settings, or wrong
      movements). Every rejected ID now lives in demo-library.json's
      rejected list and curate.mjs skips them; the stock pool is thin,
      so footage depth rides on the capture brief and the Week 6
      body-double checkpoint, not a third stock sweep.
- [x] Audit the legacy demo library; quarantine clips that fail movement or
      faceless truth instead of counting machine-screened stock as approved
- [ ] Capture and approve the 18 clips in `docs/footage-capture.md`; target
      3+ clips for each movement used in Week 01
- [ ] **Environment footage, generated** (owner decision, 2026-09-03). Week
      01's sidecars carry 1 demo scene and 35 environment scenes, and the
      environment footage is what failed review. Query-based stock sourcing
      is retired for these: the shot book gains an environment section and
      the recurring character appears in them, rather than a room standing
      empty. Approval is unchanged, full-motion review per clip.
- [x] Emit the AI-disclosure line in the posting sheet, per video, driven by
      the render's asset record. A video with no record reads "unknown"
      rather than silently reading as safe, because Runway's C2PA credentials
      do not survive the ffmpeg re-encode and nothing auto-labels the upload.
- [x] Upgrade slideshows with a strict 4-8 slide contract, safe-zone design,
      progress/cues, CTA treatment and a visual golden fixture
- [x] Workflow concurrency group (cancel superseded runs)
- [x] Per-render asset records and cross-video shot-history gate
- [x] Original sound bed, voice ducking, -14 LUFS master, true-peak gate and
      corrected posting instructions
- [x] Authored-animation ingestion: approval manifest, checksum/media probes,
      explicit sidecar schema and shot-history identity

- [x] Motion typography video format: 45-60s of moving typographic cards with
      voiceover and sound bed, no footage and no Runway spend. Generated
      footage costs roughly $0.33 a clip and never amortises, because the
      shot-history gate retires every asset once a post publishes, so a week
      of footage video is a recurring $75-150 a month for a format the
      channel has no data on yet. `2026-09-07-train-to-carry` is the first,
      converted from environment POV because a reframe has no movement to
      show and the footage was never earning its cost there.

### P1 — next two weeks (channel becomes an operation)

- [ ] Profile kit: avatar (wordmark on sage), bio, pinned-video plan;
      confirm @fither on TikTok/IG/YouTube/X
- [ ] Comment workflow: paste comments/screenshots into any session →
      buckets + on-voice reply drafts
- [ ] Cross-post plan: same MP4s to Shorts and Reels, captions adapted
- [x] performance.csv: add retention drop-off and completion columns;
      analyze.mjs reads them with view-weighted metrics
- [x] Golden-fixture render in CI for pipeline changes

### P2 — this month (the moat)

- [ ] Owner-shot b-roll bank (30 clips), including real hands-on-frame
      pull shots that fix the rows video permanently
- [ ] App Rive animations land → approve their exports in
      assets/animation-library.json and schedule animated-demo scenes
- [ ] Voice delivery tuning: test stability/style variants on one video
- [ ] Compare the original bed against a low-volume native sound only after
      enough posts exist for a named experiment
- [ ] Scheduler or TikTok API decision, from posting-friction data

AAA definition for this channel: a cold viewer cannot tell it is
automated; a warm viewer comes back on purpose; the machine proves both
with numbers.
