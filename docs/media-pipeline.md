# The media pipeline — scripts in, finished videos out

The machine produces the videos itself. Nothing is assembled by hand: a
script's JSON sidecar goes in, a finished 1080x1920 MP4 (or a slideshow's
PNGs) plus a ready-to-paste caption comes out. Human judgment remains at two
quality boundaries: approving exercise footage and reviewing the finished
posting pack before one daily phone upload.

## How a video is built

```
content/scripts/DATE-slug.md      the human-readable script (video-writer)
content/scripts/DATE-slug.json    the render spec sidecar (video-writer)
        │
        ▼
node pipeline/render.mjs content/scripts/DATE-slug.md
        │
        ├─ voiceover   ElevenLabs API, one clip per line, placed at its
        │              timestamp (ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID)
        ├─ demos       exact clips from assets/demo-library.json only. Machine
        │              screening creates candidates; full-motion review verifies
        │              movement truth, form framing and the faceless rule.
        ├─ animations  exact authored exports from animation-library.json;
        │              SHA-256, dimensions, frame rate and duration are verified
        ├─ environment Pexels video API, portrait, per-scene search query,
        │              cropped to 1080x1920 (PEXELS_API_KEY). COCO-SSD rejects
        │              any clip containing a person. No clean match → gradient.
        ├─ overlays    brand text cards rendered by headless Chromium
        │              (bone/sage/ink palette from the app's design tokens)
        ├─ sound       original `quiet-drive` bed, ducked under the voice;
        │              complete mix mastered and verified at delivery
        └─ assembly    ffmpeg: scenes concatenated, overlays faded in and
                       out at their windows, voiceover mixed at timestamps
        │
        ▼
renders/week-NN/DATE-slug.mp4  +  caption, QA and asset-identity records
```

Whole weeks: `node pipeline/produce.mjs 01` renders every video of the week
and writes `renders/week-NN/posting-sheet.md` (file + caption per day). The
posting pack is blocked if `pipeline/shots.mjs` finds a repeated source within
the week or in `data/shot-history.json`; see `docs/shot-history.md`.

## Honest degradation

The pipeline never fakes what it doesn't have; it says so and keeps going:

- No ElevenLabs key → **silent draft**, noted in the output. Re-render after
  adding the key; TTS results are cached per line, so unchanged lines are
  never paid for twice.
- No Pexels key, or no match for a query → **brand gradient background**
  (which is the intended look for text-on-screen anyway).
- Voiceover overlap is impossible by construction: every synthesized line
  is measured, any line that would start before the previous one finishes
  is pushed later (with a breath), and the final scene stretches so the
  close is never cut off. Retimes are reported in the render notes.

## Environment keys

Add these to the Claude environment (claude.ai → environment settings →
environment variables) so scheduled Sunday sessions can render with sound
and real b-roll:

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | voiceover synthesis |
| `ELEVENLABS_VOICE_ID` | the one brand voice, same as the app's coach |
| `ELEVENLABS_MODEL_ID` | optional, defaults to `eleven_multilingual_v2` |
| `PEXELS_API_KEY` | stock b-roll (free key from pexels.com/api) |

## Service posture (decided 2026-09-01)

- **B-roll now**: Pexels stock, free tier, plus approved owned footage. The
  current priority is the 18-clip capture brief in `docs/footage-capture.md`.
- **Premium environment video later**: Runway is the planned budget-capped
  source after a controlled Higgsfield comparison. This integration is
  deliberately deferred until the rest of the engine is complete. Neither
  provider may depict exercise form.
- **Voiceover**: ElevenLabs, shared voice with the app. Non-negotiable
  brand asset.
- **Sound bed**: original deterministic `quiet-drive` profile. It is mixed at
  the sidecar's declared level, ducked beneath speech and mastered to -14 LUFS.
  See `docs/sound-system.md`. Native TikTok sound is experiment-only for video.
- **Posting**: manual daily upload from the posting sheet. TikTok's direct
  Content Posting API needs an audited app; revisit after warm-up. A
  scheduler SaaS (~$20-30/mo) fits the budget if daily uploads become a
  chore.
- **Animated movement demos**: gated by `assets/animation-library.json` —
  generative video is not allowed to depict exercise form (form accuracy is a
  coaching claim). Only checksum-pinned app-authored exports qualify; see
  `docs/animation-ingestion.md`. The ingestion engine is ready, but the library
  remains empty until the app delivers reviewed exports.

## Format notes

- `environment-pov` and `text-on-screen` render as MP4. Text-on-screen
  scenes without a `broll_query` get the slow brand gradient.
- `animated-demo` renders as MP4 and requires at least one `animation: true`
  scene whose exact movement is approved in `animation-library.json`.
  Environment shots may use staggered auto-cuts; physical and animated
  demonstrations preserve the complete movement sequence.
- `slideshow` renders 4-8 scene-per-slide PNGs for TikTok photo posts. Every
  slide has one visible message, a kicker and footer. The template uses the
  same Fraunces/Inter system as video overlays, conservative UI-safe margins,
  progress bars, slide numbering, swipe cues and a distinct sage CTA card.
- Fonts: Inter (bundled via npm, OFL). Palette mirrors
  `app/src/design/tokens.ts` in the app repo; if the app's tokens change,
  update `pipeline/lib/env.mjs` and the two templates.

## QA gates before posting

Every render also writes `renders/week-NN/qa/<slug>.png` — a contact sheet
with one frame every ~5 seconds. `produce.mjs` output is a draft until:
1. Look at every QA sheet: any person or face anywhere means the video does
   not ship — fix the scene's `broll_query` in the sidecar and re-render
   (the automated person gate catches almost everything; the sheet is the
   human backstop for what a detector can miss).
2. Watch each video once at full speed (52 seconds each, it is not a lot).
3. Check the posting sheet's render notes for silent-draft or gradient
   fallbacks you did not intend.
4. Listen once on phone speakers and once on headphones: voice stays forward,
   the bed is present but never competes, and no transition clicks.
5. Spot-check overlay text against `references/forbidden.md` if the sidecar
   was edited by hand.

For slideshows, review every PNG in filename order. Check that the hook works
without a caption, no line is clipped, the progression makes sense, and the
last slide asks the same short question as the caption. CI renders and probes a
four-slide golden carousel alongside the five-second video fixture.
