# Cocktail content

The third daily post, alongside the video and the carousel (owner direction,
2026-09-08). A carousel that opens with a real person, face covered, doing
something ordinary and slightly silly that has nothing to do with training,
then turns into the movements. Livelier than our typographic carousels, which
are calm by design and will stay that way.

The name is the point: a mix. Lifestyle opener, then the work.

## Where it comes from

The reference is the TikTok account **Stretch AI**. Its numbers are not
marginal: one carousel shows 188.8K likes against **96.1K saves**, another
51.5K against 33.8K. A save rate near half of likes is the strongest possible
signal for the metric this channel optimises for.

What is worth taking:

- **A real person on slide one, face hidden.** By a phone, by hair, by the
  angle. Presence without a face.
- **An opener that is not a workout.** A mirror, a coffee, a doorway, an
  ordinary room. The fitness content starts on slide two.
- **Loud cover typography.** Heavy, outlined, high contrast, readable at
  thumbnail size. This is the opposite of our editorial serif and that is
  deliberate: it is a different lane, not a redesign of the existing one.
- **Numbered movement slides**, eight to ten.
- **A search-shaped title.** "The Ultimate 5-Minute Glute Workout" is written
  for the search bar, not for a headline.
- **A save instruction in the caption.** "Save this for your next X."

## What is not taken, and why

Stretch AI's engagement is driven substantially by framing this brand
forbids outright. Observed on its covers and captions: "toned belly", "No
excuses no GYM", "dream body", "me 60kg", and a bare midriff close-up used as
a cover image. Against `references/forbidden.md` that is four separate
violations: tone/tone up, no excuses, weight, and comparison to other women.

So the honest position is that we are copying the **container**, not the
contents, and we should expect the container alone to underperform the
original. A cocktail carousel that says "six moves your wrists never feel"
where theirs says "toned belly" is a different offer to a different woman.
That is the trade the brand has already chosen; this document exists so
nobody re-litigates it by accident when the numbers come in lower.

The reference account also appears to use generated bodies despite the
"real human" reading, so its lifestyle openers are not evidence that a real
person is required.

## The open question: who is on camera

Three options, none of them free:

1. **The owner, face covered.** `docs/footage-capture.md` already specifies
   exactly this: framed below the chin or from behind, face fully obscured
   for the entire take. Costs nothing but time, and the person is genuinely
   real, which is the thing the format trades on.
2. **The recurring generated character.** Zero filming, but every post then
   carries TikTok's AI-generated-content label, and the format's appeal is
   partly that a real person is holding the phone.
3. **A hired body double.** The roadmap already contemplates this at the
   week 6 checkpoint. Costs money and scheduling.

**Decided, 2026-09-08: option 1.** The owner films, face covered, under the
existing `docs/footage-capture.md` contract. So the cocktail pipeline
captures footage rather than generating it, no Runway spend, no AI label, and
the person on slide one is genuinely real, which is what the format trades
on.

## Hooks

`content/cocktail-hooks.md` holds the cover-hook bank, five lanes with the
shot each line sits on. Every line passes the policy checker. None of it is
proven: it is a hypothesis bank, and winners graduate to
`references/hooks.md` with their numbers once posted.

## The format

`format: "cocktail"`, five to nine slides, its own posting slot so it never
collides with the day's carousel.

- **Slide one is a photograph**, not a card: the owner, face hidden, with one
  loud uppercase line over it in Inter 900, outlined, bottom-weighted over a
  scrim. Deliberately not the editorial serif. This lane has to read at
  thumbnail size in a grid; the calm carousels do not.
- **Slide two is the turn**, the first typographic card, reusing the cover's
  own image so the pivot is earned.
- **Slides three onward are the movements**, at their library doses.
- **The last slide is the question.**

The cover sidecar scene carries `shot` (the brief) and `photo` (the file,
once captured). Until the photo exists the render draws a striped placeholder
with the shot brief printed on it, so a deck can be reviewed before the
camera comes out. A `photo` path that does not resolve, or sits outside
`assets/cocktail/`, is an error rather than a warning: the failure that
matters is a placeholder reaching TikTok.

A test asserts every shipped cover line is free of fitness vocabulary. That
is the regression worth guarding, because the first draft of this lane put
the workout on slide one and the whole idea died there.

## The no-photo fallback

A cocktail's slide one only enters photo-cover mode when it declares a
`shot`. Drop that key and it renders as a plain typographic card, same
kicker/footer contract as every other carousel slide (owner decision,
2026-09-09, after a first attempt to substitute a stock photo of a stranger
was correctly refused: it breaks the format's premise that the person is
real, and using an identifiable stranger's likeness in commercial content
without consent is its own problem regardless of the format).

This is the honest way to ship a cocktail's writing on a day the photo will
not be shot in time: reuse the hook, the turn and the movements, drop the
cover photo requirement, post it as a second carousel instead of a
placeholder. `2026-09-09-group-chat-floor-cocktail.json` is the first one
built this way.

## Status

09-09 shipped as the no-photo fallback. Four still waiting on their
photograph: 09-10 the car, 09-11 the printer, 09-12 the hotel kettle, 09-13
the third reheat. `assets/cocktail/README.md` carries the naming and the
capture contract.
