# The media pipeline — scripts in, finished videos out

The machine produces the videos itself. Nothing is assembled by hand: a
script's JSON sidecar goes in, a finished 1080x1920 MP4 (or a slideshow's
PNGs) plus a ready-to-paste caption comes out. The only human step left in
the loop is posting: one upload a day from a phone.

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
        ├─ b-roll      Pexels video API, portrait, per-scene search query,
        │              cropped to 1080x1920 (PEXELS_API_KEY)
        ├─ overlays    brand text cards rendered by headless Chromium
        │              (bone/sage/ink palette from the app's design tokens)
        └─ assembly    ffmpeg: scenes concatenated, overlays faded in and
                       out at their windows, voiceover mixed at timestamps
        │
        ▼
renders/week-NN/DATE-slug.mp4  +  DATE-slug.caption.txt
```

Whole weeks: `node pipeline/produce.mjs 01` renders every video of the week
and writes `renders/week-NN/posting-sheet.md` (file + caption per day).

## Honest degradation

The pipeline never fakes what it doesn't have; it says so and keeps going:

- No ElevenLabs key → **silent draft**, noted in the output. Re-render after
  adding the key; TTS results are cached per line, so unchanged lines are
  never paid for twice.
- No Pexels key, or no match for a query → **brand gradient background**
  (which is the intended look for text-on-screen anyway).
- A voiceover line that would run into the next one is reported with the
  exact timestamps to fix in the sidecar.

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

- **B-roll**: Pexels stock, free tier. Within the ~$50/month budget there is
  headroom to add AI-generated stills for reframe/slideshow posts later; AI
  video generation stays off until stock demonstrably caps watch %.
- **Voiceover**: ElevenLabs, shared voice with the app. Non-negotiable
  brand asset.
- **Posting**: manual daily upload from the posting sheet. TikTok's direct
  Content Posting API needs an audited app; revisit after warm-up. A
  scheduler SaaS (~$20-30/mo) fits the budget if daily uploads become a
  chore.
- **Animated movement demos**: still gated by `assets/animations.md` —
  generative video is not allowed to depict exercise form (form accuracy
  is a coaching claim). Only the app's authored animations qualify.

## Format notes

- `environment-pov` and `text-on-screen` render as MP4. Text-on-screen
  scenes without a `broll_query` get the slow brand gradient.
- `slideshow` renders scene-per-slide PNGs for TikTok photo posts.
- Fonts: Inter (bundled via npm, OFL). Palette mirrors
  `app/src/design/tokens.ts` in the app repo; if the app's tokens change,
  update `pipeline/lib/env.mjs` and the two templates.

## QA gates before posting

`produce.mjs` output is a draft until:
1. Watch each video once at full speed (52 seconds each, it is not a lot).
2. Check the posting sheet's render notes for silent-draft or gradient
   fallbacks you did not intend.
3. Spot-check overlay text against `references/forbidden.md` if the sidecar
   was edited by hand.
