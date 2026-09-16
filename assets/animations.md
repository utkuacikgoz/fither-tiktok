# Animation manifest

Human-readable animation production status. The machine-readable approval
gate is `assets/animation-library.json`: the planner may only schedule the
**animated demo** format, and the writer may only script it, for movements
with at least one approved export there.

Status: seven deterministic FITHER-owned body-only exports have been authored
and pass checksum, 1080x1920, 30 fps, loop and automated faceless gates. They
remain outside the Ready library until qualified movement review is recorded.

When ordering the first animations, choose them from what the coming weeks'
content plans need, not by pattern order.

## Ready (mirrors animation-library.json)

Owner-approved 2026-09-16 for use as still figures on carousel and single
cards (`figure: true`) and as animated demos:

- Wall Push-Up
- Air Squat
- Reverse Lunge
- Glute Bridge
- Seated Knee Lift
- Full Plank
- Doorframe Row

Do not add a name here by itself. Add and validate its export in
`animation-library.json`, then mirror the status here for humans.

## In production

Keyframes authored in `pipeline/lib/animation-poses.mjs` on 2026-09-16, in
the order of how many week 02 cards each unlocks. Not yet rendered: the
exports, review sheets and candidate hashes appear when
`node pipeline/author-animations.mjs` runs, on the owner's go.

- Sit-to-Stand (chair; seated to standing, the still shows standing by the chair)
- Wall Sit (wall; hold, breathes)
- Standing Hip Hinge (floor; hips back, flat torso forward)
- Wall Slide (wall; forearms on the wall, W to Y)
- Knee Plank (floor; hold, same contact line as Full Plank)
- Doorframe Lean Row (doorframe; feet close, slight lean, pull in)

After the run, each one still needs owner movement review before it moves to
Ready, and only then can a card carry it with `figure: true`.

Exact candidate hashes and export paths live in
`assets/animation-candidates.json`. Do not copy them into the Ready library
until the complete four-second loops pass movement review.
