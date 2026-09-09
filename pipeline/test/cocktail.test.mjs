import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../lib/env.mjs";
import { SLIDE_COUNTS, postSlot, validateSpec } from "../lib/spec.mjs";

const cover = (over = {}) => ({
  start: 0, end: 1,
  shot: "Kitchen. Face hidden behind the open microwave door, mug in hand.",
  photo: null,
  overlays: [{ t: 0, text: "My coffee is on its third reheat and so am I.", style: "hook" }],
  ...over,
});
const card = (i, style = "step") => ({
  start: i, end: i + 1, kicker: `K${i}`, footer: "Ten minutes is complete.",
  overlays: [{ t: i, text: style === "cta" ? "How cold is your coffee?" : `Air Squat. Ten reps.`, style }],
});

function spec(over = {}) {
  const scenes = [cover(), card(1), card(2), card(3), card(4, "cta")];
  return {
    slug: "2026-09-13-x-cocktail", week: "01", post_date: "2026-09-13", format: "cocktail",
    pillar: "Constraint", hook_mechanism: "situation",
    sound: { profile: "platform" },
    caption: "A caption. How cold is your coffee?",
    hashtags: ["#strengthtraining"],
    scenes, ...over,
  };
}

test("a valid cocktail passes and only warns about the uncaptured photo", () => {
  const { errors, warnings } = validateSpec(spec());
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /photo not captured yet/.test(w)));
});

// The cover is a photograph with one line on it. Requiring a kicker and
// footer there would be the typographic card's contract, not this one.
test("the cover needs a shot brief but no kicker or footer", () => {
  const noShot = spec();
  noShot.scenes[0] = cover({ shot: "" });
  assert.ok(validateSpec(noShot).errors.some((e) => /requires a shot brief/.test(e)));

  const bare = spec();
  delete bare.scenes[0].kicker;
  delete bare.scenes[0].footer;
  assert.deepEqual(validateSpec(bare).errors, []);
});

// A photo path that does not resolve is the failure that would ship a
// striped placeholder to TikTok, so it is an error and not a warning.
test("a named cover photo must exist in the repo and live under assets/cocktail", () => {
  const missing = spec();
  missing.scenes[0] = cover({ photo: "assets/cocktail/nope.jpg" });
  assert.ok(validateSpec(missing).errors.some((e) => /is not in the repo/.test(e)));

  const stray = spec();
  stray.scenes[0] = cover({ photo: "renders/week-01/thing.jpg" });
  assert.ok(validateSpec(stray).errors.some((e) => /under assets\/cocktail/.test(e)));

  const wrongType = spec();
  wrongType.scenes[0] = cover({ photo: "assets/cocktail/thing.mp4" });
  assert.ok(validateSpec(wrongType).errors.some((e) => /jpg or png/.test(e)));
});

test("a cocktail is five to nine slides and owns its own posting slot", () => {
  const [min, max] = SLIDE_COUNTS.cocktail;
  assert.deepEqual([min, max], [5, 9]);
  const short = spec({ scenes: [cover(), card(1), card(2, "cta")] });
  assert.ok(validateSpec(short).errors.some((e) => new RegExp(`${min}-${max} slides`).test(e)));
  // Its own slot, so a cocktail never collides with that date's carousel.
  assert.equal(postSlot("cocktail"), "cocktail");
  assert.notEqual(postSlot("cocktail"), postSlot("slideshow"));
});

// The whole point of the lane: the cover sells a life, not a workout. A
// cover line that slips back into fitness is the regression to catch.
test("every shipped cocktail cover stays off fitness", () => {
  const dir = join(repoRoot, "content", "scripts");
  const banned = /\b(workout|exercise|gym|reps?|sets?|training|train|muscles?|squats?|push[- ]?ups?|plank|session)\b/i;
  let seen = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith("-cocktail.json"))) {
    const s = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const line = s.scenes[0].overlays[0].text;
    assert.equal(banned.test(line), false, `${file}: cover mentions fitness: "${line}"`);
    assert.ok(line.length <= 60, `${file}: cover is ${line.length} chars`);
    assert.ok(s.scenes[0].shot?.trim(), `${file}: cover has no shot brief`);
    seen++;
  }
  assert.ok(seen > 0, "expected at least one cocktail sidecar");
});
