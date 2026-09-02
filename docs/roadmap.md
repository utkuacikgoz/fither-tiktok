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
| Footage | C+ | THE weak layer: 6 demo clips total, 1 per movement, no pull demos |
| Edit rhythm | C | Scenes hold 5-15s single-shot; AAA short-form cuts every 2-3s |
| Sound design | D | Voice over silence; native content carries a low music bed |
| Accessibility | C | No word-level captions; muted viewers (most of TikTok) get sparse overlays |
| Reliability | B+ | Gates + guardrails after a day of hardening; QA still needs eyes |
| Learning engine | A- | Registry, insights, kill rules built; unexercised until first data |
| Channel ops | D | No profile kit, no comment workflow, no cross-posting, handles unverified |

## What is missing, concretely

1. **Footage depth.** One approved clip per movement means the channel
   visibly repeats itself by week 2. Pull movements have zero demos, and
   the differentiator video (doorframe rows) shows doors instead of rows.
2. **Cut rhythm.** Single-clip scenes hold too long. Retention dies in
   held shots, not in bad hooks.
3. **Sound.** No music bed. Silence under voice reads as automated.
   Licensing-safe route: add a low-volume in-app sound at post time
   (zero rights risk, native to the platform); note it on every posting
   sheet. A rendered bed needs a cleared license first.
4. **Captions.** The pipeline knows every line and its measured timing —
   word-level or line-level burned captions are nearly free and serve the
   majority who watch muted. Also emit a .srt per video.
5. **Final-output face check.** The gate screens source clips; the
   rendered video should be screened too (belt and braces on the one
   unforgivable failure).
6. **End card.** No consistent branded close. The CTA deserves a
   signature look (question + sage/gold card) viewers learn to recognize.
7. **Channel ops.** No avatar/bio/pinned plan, no comment-reply
   workflow (brand promise: answer every comment for 90 days), no
   Shorts/Reels cross-post from the same MP4s, handle reservations
   unconfirmed.
8. **Retention diagnostics.** performance.csv lacks a drop-off timestamp
   column; TikTok's retention graph says whether the hook or the body
   loses people — capture it.
9. **Render concurrency.** Two overlapping runs can race the renders
   branch; the workflow needs a concurrency group.
10. **Golden test.** Pipeline changes ship unexercised; a 5-second
    fixture render in CI would catch template and mix regressions.

## The plan

### P0 — this week (raises what every video looks like)

- [ ] Burned line-level captions from measured VO timing + .srt sidecar
- [ ] Scene auto-cutting: split scenes >4s across 2-3 clips from the same
      query/demo pool; cut on beat boundaries
- [ ] Branded end-card template for the CTA close
- [ ] Face check on rendered QA frames (post-render gate)
- [ ] Curation round 2: target 3+ clips per movement; re-query the
      misses (Incline Push-Up, Wall Sit, Sit-to-Stand, Knee/Side Plank)
- [ ] Workflow concurrency group (cancel superseded runs)
- [ ] Posting sheet: add the in-app low-volume sound instruction

### P1 — next two weeks (channel becomes an operation)

- [ ] Profile kit: avatar (wordmark on sage), bio, pinned-video plan;
      confirm @fither on TikTok/IG/YouTube/X
- [ ] Comment workflow: paste comments/screenshots into any session →
      buckets + on-voice reply drafts
- [ ] Cross-post plan: same MP4s to Shorts and Reels, captions adapted
- [ ] performance.csv: add retention drop-off column; analyze.mjs reads it
- [ ] Golden-fixture render in CI for pipeline changes

### P2 — this month (the moat)

- [ ] Owner-shot b-roll bank (30 clips), including real hands-on-frame
      pull shots that fix the rows video permanently
- [ ] App Rive animations land → assets/animations.md flow takes over
      demo scenes (already built and gated)
- [ ] Voice delivery tuning: test stability/style variants on one video
- [ ] Music bed decision: licensed calm bed vs in-app sounds, from data
- [ ] Scheduler or TikTok API decision, from posting-friction data

AAA definition for this channel: a cold viewer cannot tell it is
automated; a warm viewer comes back on purpose; the machine proves both
with numbers.
