import test from "node:test";
import assert from "node:assert/strict";
import { CARD_MAX_SECONDS, CARD_MIN_SECONDS, MAX_CARDS, MIN_CARDS, cardZoomFilter } from "../lib/typography.mjs";
import { validateSpec } from "../lib/spec.mjs";

const card = (i, start, end, style = "step") => ({
  start, end, kicker: `K${i}`, footer: "Strength that fits your life.",
  overlays: [{ t: start, text: `Line ${i}.`, style }],
});

function spec(overrides = {}) {
  const scenes = [];
  for (let i = 0; i < 12; i++) {
    scenes.push(card(i, i * 5, i * 5 + 5, i === 0 ? "hook" : i === 11 ? "cta" : "step"));
  }
  scenes.at(-1).overlays[0].text = "What did you carry this week?";
  return {
    slug: "2026-09-07-x", week: "01", post_date: "2026-09-07", format: "motion-type",
    pillar: "Reframe", hook_mechanism: "contradiction",
    sound: { profile: "quiet-drive", bed_gain_db: -16 },
    caption: "A caption.", hashtags: ["#strengthtraining"],
    voiceover: scenes.map((s, i) => ({ t: s.start, text: i === scenes.length - 1 ? "What did you carry this week?" : `Line ${i}.` })),
    scenes,
    ...overrides,
  };
}

test("a valid motion-type video passes", () => {
  assert.deepEqual(validateSpec(spec()).errors, []);
});

// The card is the whole frame. Anything that would put footage behind it is
// a contradiction, not an extra, and silently ignoring it would bill Runway
// for a clip nobody ever sees.
test("motion-type refuses footage of any kind", () => {
  const withBroll = spec();
  withBroll.scenes[2].broll_query = "hands on a wall";
  assert.ok(validateSpec(withBroll).errors.some((e) => /carries no footage/.test(e)));

  const withDemo = spec();
  withDemo.scenes[2].demo = true;
  withDemo.scenes[2].movement = "Wall Push-Up";
  assert.ok(validateSpec(withDemo).errors.some((e) => /carries no demo or animation/.test(e)));
});

test("cards hold the screen for a readable beat and no longer", () => {
  const tooLong = spec();
  tooLong.scenes[3].end = tooLong.scenes[3].start + CARD_MAX_SECONDS + 1;
  tooLong.scenes[4].start = tooLong.scenes[3].end;
  tooLong.scenes[4].overlays[0].t = tooLong.scenes[4].start;
  assert.ok(validateSpec(tooLong).errors.some((e) => /outside the .* card window/.test(e)));

  const tooShort = spec();
  tooShort.scenes[3].end = tooShort.scenes[3].start + CARD_MIN_SECONDS - 0.5;
  tooShort.scenes[4].start = tooShort.scenes[3].end;
  tooShort.scenes[4].overlays[0].t = tooShort.scenes[4].start;
  assert.ok(validateSpec(tooShort).errors.some((e) => /outside the .* card window/.test(e)));
});

test("a motion-type video needs enough cards to keep moving", () => {
  const few = spec();
  few.scenes = few.scenes.slice(0, MIN_CARDS - 1);
  few.voiceover = few.voiceover.slice(0, MIN_CARDS - 1);
  few.scenes.at(-1).overlays[0].style = "cta";
  few.scenes.at(-1).overlays[0].text = "What did you carry this week?";
  assert.ok(validateSpec(few).errors.some((e) => new RegExp(`${MIN_CARDS}-${MAX_CARDS} cards`).test(e)));
});

// Every card is one continuous move, so the zoom must be bounded and must
// reach its ceiling no earlier than the card's last frame.
test("the card zoom is bounded and paced to the card", () => {
  const filter = cardZoomFilter(5);
  assert.match(filter, /^zoompan=/);
  assert.match(filter, /min\(1\+[\d.]+\*on,1\.050\)/);
  assert.match(filter, /s=1080x1920/);
  const step = Number(/min\(1\+([\d.]+)\*on/.exec(filter)[1]);
  assert.ok(Math.abs(step * 150 - 0.05) < 1e-6, "zoom should reach its ceiling at the final frame");
  // A shorter card zooms faster so it travels the same distance.
  const shortStep = Number(/min\(1\+([\d.]+)\*on/.exec(cardZoomFilter(2.5))[1]);
  assert.ok(shortStep > step);
});
