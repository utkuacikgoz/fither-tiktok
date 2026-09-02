---
name: fither-voice
description: >-
  FITHER brand voice, audience, channel rules and forbidden territory for all
  short form content. Load before writing any FITHER script, caption, hook,
  comment reply, or store copy. Upstream: the app repo's fither-voice skill —
  the same filter applies to app copy and TikTok scripts; this file adds the
  channel-specific rules on top.
---

# FITHER voice — channel edition

Taglines (decided in the app repo, ADR-0006): **"Strength that fits your
life"** (brand) and **"A workout that fits today"** (product/daily). Use
these; don't coin rivals ad hoc.

The register to hit, every surface: she feels understood, capable, calm,
in control — and proud after even ten minutes. **Ten minutes is complete**:
never frame a short session as a lesser one ("just a quick one", "mini
workout" — both forbidden; a 10-minute session is a workout, full stop).

## Who we talk to

Women aged 28 to 45 with more responsibility than time. Busy professionals,
frequent travellers, mothers of young children. They are competent adults
who are tired, not beginners who need cheering up. Many train while someone
sleeps in the next room, or in an office or hotel room — quiet, small-space,
no-equipment constraints are real life, not a gimmick.

## What we sell

Capability. Getting stronger. Feeling better. Never shrinking.

## Tone (owner-retuned, 2026-09-02)

Magnetic, propulsive, quietly intense. Still adult, still competent, still
a coach who respects your time — but every line pulls to the next line,
and she should finish a video feeling "I could do that RIGHT NOW."
Inspiring means cinematic specificity ("the wall by the window is your
gym now"), not volume. The comeback urge is built with craft: open a loop
in the hook, escalate through the beats, land a payoff line that clicks,
seed tomorrow's capability in the close. Never with shame, streaks, FOMO
or countdown pressure — the forbidden list stands.
Not perky. Not a drill sergeant. Not a girlboss meme account.
No "queen", "girlie", "slay", "you got this", "crush it", "beast mode",
"no excuses". No unexplained acronyms (AMRAP, HIIT).

## Sentence rules

- Short. Mostly under 12 words. Second person, present tense, active voice.
- No em dashes. No hyphens as punctuation. No emoji in scripts.
- British-neutral English. Plain international English, no region-locked slang.
- Honest, specific claims. "Ten minutes, no equipment, measurable strength" —
  never "transform your body in 30 days".
- No guilt, ever. Never reference absence, missed days, or lost progress.

## Empowerment (owner feedback, 2026-09-02)

Calm must never read as flat. Every script carries at least two
capability-ownership lines: strength as something SHE builds and owns
("Your strength travels with you." / "You built this between meetings.").
Second person, active verbs, her as the agent — never the workout as the
hero. This is empowerment the FITHER way; the forbidden list still bans
cheerleading ("you got this", "queen", "crush it").

## Always

- Name the constraint in the first line. Hotel. Kitchen. Office. Quiet.
- Give a number. 10 minutes. 5 moves. 3 steps.
- End on a question a viewer can answer in four words.
- On-screen text is clear complete sentences; the spoken voiceover keeps
  the short punchy rhythm.

## Channel rules (TikTok-specific)

- **Faceless.** No face ever appears, in any scene. The voiceover is the
  persona: the same ElevenLabs voice as the app's in-session guidance.
- **Warm-up period**: never mention the app, a waitlist, or a launch.
- Optimise for saves, not follows. A saved workout is intent.
- Answer every comment in the first 90 days, in this voice.
- Movements named in content must exist in
  `references/movement-library.md`. Unsure → name the pattern instead.

## Never

See `references/forbidden.md`. It is a hard list, not a guideline.

## Keeping in sync

The app repo's `.claude/skills/fither-voice/SKILL.md` is the upstream
filter (it declares itself "shared verbatim with the content repo"). When
it changes, fold the change into this file. Divergence between what the
channel says and what the app says breaks the one-voice brand asset.
