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
| Footage | D | Truth audit quarantined 5 legacy clips; only Full Plank remains approved |
| Edit rhythm | B | Auto-cut rhythm works; distinct shot history is still missing |
| Sound design | B+ | Original ducked/mastered bed is CI-verified; phone/on-platform response is unproven |
| Accessibility | A- | Burned captions, SRT and legible carousel design; word-level emphasis is untested |
| Reliability | A- | Preflight, fail-closed QA and video/carousel golden fixtures are green in CI |
| Learning engine | A- | Registry, insights, kill rules built; unexercised until first data |
| Channel ops | D | No profile kit, no comment workflow, no cross-posting, handles unverified |

## What is missing, concretely

1. **Footage truth and depth.** Full-motion review quarantined five legacy
   clips with recognizable faces or the wrong movement. Only Full Plank has
   one approved demo. The 18-clip capture brief is the immediate blocker;
   pull movements still have zero demos.
2. **Shot diversity.** Auto-cutting improves pace, but the engine has no
   cross-video shot identity/history to prevent visible reuse.
3. **Sound validation.** The rights-safe `quiet-drive` bed, automatic ducking
   and loudness/peak gates are built. Phone-speaker balance and audience
   response remain unproven until the canary renders and first posted week.
4. **Channel ops.** No avatar/bio/pinned plan, no comment-reply
   workflow (brand promise: answer every comment for 90 days), no
   Shorts/Reels cross-post from the same MP4s, handle reservations
   unconfirmed.
5. **Animation ingestion.** The manifest correctly blocks animated demos,
   but the renderer still needs an ingestion path when authored assets arrive.
6. **Learning data.** The analytics and experiment engine is built but has
   zero posted-video rows, so no editorial decision is evidence-backed yet.
7. **Operations hardening.** Action versions still use moving major tags;
   hook harvesting, a weekly decision report and local bootstrap remain.

## The plan

### P0 — this week (raises what every video looks like)

- [x] Burned line-level captions from measured VO timing + .srt sidecar
- [x] Scene auto-cutting: split scenes >4s across 2-3 clips from the same
      query/demo pool; cut on beat boundaries
- [x] Branded end-card template for the CTA close
- [x] Face check on rendered QA frames (post-render gate)
- [x] Audit the legacy demo library; quarantine clips that fail movement or
      faceless truth instead of counting machine-screened stock as approved
- [ ] Capture and approve the 18 clips in `docs/footage-capture.md`; target
      3+ clips for each movement used in Week 01
- [x] Upgrade slideshows with a strict 4-8 slide contract, safe-zone design,
      progress/cues, CTA treatment and a visual golden fixture
- [x] Workflow concurrency group (cancel superseded runs)
- [x] Original sound bed, voice ducking, -14 LUFS master, true-peak gate and
      corrected posting instructions

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
- [ ] App Rive animations land → assets/animations.md flow takes over
      demo scenes (already built and gated)
- [ ] Voice delivery tuning: test stability/style variants on one video
- [ ] Compare the original bed against a low-volume native sound only after
      enough posts exist for a named experiment
- [ ] Scheduler or TikTok API decision, from posting-friction data

AAA definition for this channel: a cold viewer cannot tell it is
automated; a warm viewer comes back on purpose; the machine proves both
with numbers.
