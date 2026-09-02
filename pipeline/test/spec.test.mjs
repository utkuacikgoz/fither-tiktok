import test from "node:test";
import assert from "node:assert/strict";
import { validateSpec } from "../lib/spec.mjs";
import { policyTextViolations } from "../lib/policy.mjs";

function validSpec() {
  return {
    slug: "2026-09-01-valid-video",
    week: "01",
    post_date: "2026-09-01",
    format: "environment-pov",
    pillar: "Constraint",
    hook_mechanism: "situation",
    sound: { profile: "quiet-drive", bed_gain_db: -16 },
    caption: "A quiet ten minute strength session.",
    hashtags: ["#strengthtraining"],
    scenes: [{
      start: 0,
      end: 50,
      demo: true,
      movement: "Wall Push-Up",
      overlays: [
        { t: 0, text: "Hotel wall. Start here.", style: "hook" },
        { t: 45, text: "Which room are you in?", style: "cta" },
      ],
    }],
    voiceover: [
      { t: 0, text: "Your hotel wall is enough." },
      { t: 45, text: "Which room are you in?" },
    ],
  };
}

const options = {
  jsonPath: "/tmp/2026-09-01-valid-video.json",
  movementNames: new Set(["Wall Push-Up"]),
  approvedDemoMovements: new Set(["Wall Push-Up"]),
};

test("accepts a structurally valid, policy-clean sidecar", () => {
  const result = validateSpec(validSpec(), options);
  assert.deepEqual(result, { errors: [], warnings: [] });
});

test("rejects forbidden brand copy before rendering", () => {
  const spec = validSpec();
  spec.caption = "No excuses. Crush it.";
  const { errors } = validateSpec(spec, options);
  assert.ok(errors.some((message) => message.includes("forbidden copy")));
  assert.ok(errors.some((message) => message.toLowerCase().includes("no excuses")));
});

test("rejects unknown and unapproved demo movements", () => {
  const spec = validSpec();
  spec.scenes[0].movement = "Flying Push-Up";
  const { errors } = validateSpec(spec, options);
  assert.ok(errors.some((message) => message.includes("not in the movement library")));
  assert.ok(errors.some((message) => message.includes("no owner-approved demo")));
});

test("rejects broken chronology and a non-question close", () => {
  const spec = validSpec();
  spec.scenes.push({ start: 51, end: 55, overlays: [] });
  spec.voiceover.at(-1).text = "Save this session.";
  const { errors } = validateSpec(spec, options);
  assert.ok(errors.some((message) => message.includes("scenes must be contiguous")));
  assert.ok(errors.some((message) => message.includes("question CTA")));
});

test("rejects videos over the 60-second quality contract", () => {
  const spec = validSpec();
  spec.scenes[0].end = 60.1;
  const { errors } = validateSpec(spec, options);
  assert.ok(errors.some((message) => message.includes("exceeds the 45-60s brief")));
});

test("accepts a complete slideshow contract without video timing warnings", () => {
  const spec = validSpec();
  spec.slug = "2026-09-01-valid-slideshow";
  spec.format = "slideshow";
  spec.sound = { profile: "platform" };
  delete spec.voiceover;
  spec.scenes = Array.from({ length: 5 }, (_, index) => ({
    start: index,
    end: index + 1,
    kicker: index === 0 ? "THE CONSTRAINT" : index === 4 ? "YOUR TURN" : `STEP ${index}`,
    footer: index === 4 ? "Save the complete session." : "A workout that fits today.",
    overlays: [{
      t: index,
      text: index === 0 ? "Five quiet moves for tonight." : index === 4 ? "Which one starts your session?" : `Movement ${index}`,
      style: index === 0 ? "hook" : index === 4 ? "cta" : "step",
    }],
  }));
  const result = validateSpec(spec, { ...options, jsonPath: "/tmp/2026-09-01-valid-slideshow.json" });
  assert.deepEqual(result, { errors: [], warnings: [] });
});

test("rejects slideshows with hidden copy or weak pagination", () => {
  const spec = validSpec();
  spec.format = "slideshow";
  spec.sound = { profile: "platform" };
  delete spec.voiceover;
  spec.scenes = [{
    start: 0,
    end: 1,
    kicker: "",
    footer: "",
    overlays: [
      { t: 0, text: "Visible", style: "hook" },
      { t: 0, text: "This would never render", style: "cta" },
    ],
  }];
  const { errors } = validateSpec(spec, options);
  assert.ok(errors.some((message) => message.includes("requires 4-8 slides")));
  assert.ok(errors.some((message) => message.includes("exactly one overlay")));
  assert.ok(errors.some((message) => message.includes("requires a kicker")));
  assert.ok(errors.some((message) => message.includes("requires a footer")));
});

test("rejects missing, unknown and overpowering sound contracts", () => {
  const missing = validSpec();
  delete missing.sound;
  assert.ok(validateSpec(missing, options).errors.some((message) => message.includes("require a sound contract")));

  const unknown = validSpec();
  unknown.sound.profile = "generic-stock";
  assert.ok(validateSpec(unknown, options).errors.some((message) => message.includes("sound profile")));

  const loud = validSpec();
  loud.sound.bed_gain_db = -3;
  assert.ok(validateSpec(loud, options).errors.some((message) => message.includes("bed_gain_db")));
});

test("policy catches channel-specific wrist and punctuation violations", () => {
  assert.equal(policyTextViolations("A wrist-friendly push-up.").length, 1);
  assert.equal(policyTextViolations("Strong — in ten minutes.").length, 1);
});
