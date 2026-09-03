import test from "node:test";
import assert from "node:assert/strict";
import { SOURCE_FACE_THRESHOLD, SOURCE_SAMPLE_FPS } from "../lib/broll.mjs";
import { OUTPUT_FACE_THRESHOLD, OUTPUT_SAMPLE_INTERVAL, PROBE_EQ, faceSampleTimes } from "../lib/verify.mjs";

// A face that reaches the finished video costs a six minute render and a
// failed shard. Screening a source clip must therefore never be looser than
// verifying the output, in either sensitivity or sampling density.
test("source screening is strictly harder to pass than output verification", () => {
  // Matching exactly is not enough: the composer offsets scene segments, so
  // the two sample grids sit at an arbitrary phase and a brief face can fall
  // between both. Screening needs margin, not parity.
  assert.ok(
    SOURCE_FACE_THRESHOLD < OUTPUT_FACE_THRESHOLD,
    `source threshold ${SOURCE_FACE_THRESHOLD} needs margin below output ${OUTPUT_FACE_THRESHOLD}`,
  );
});

test("source screening samples at least twice as densely as output verification", () => {
  const sourceInterval = 1 / SOURCE_SAMPLE_FPS;
  assert.ok(
    sourceInterval <= OUTPUT_SAMPLE_INTERVAL / 2,
    `source samples every ${sourceInterval}s, output every ${OUTPUT_SAMPLE_INTERVAL}s`,
  );
});

test("output verification covers the whole video", () => {
  const times = faceSampleTimes(10);
  assert.ok(times[0] <= 0.5);
  assert.ok(times.at(-1) >= 9.4, `last sample ${times.at(-1)} leaves the tail unchecked`);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] - times[i - 1] <= OUTPUT_SAMPLE_INTERVAL + 0.001, "sampling gap too wide");
  }
});

// A cached clip stands in for a screening verdict. If the cache key ignored
// the policy, footage accepted under a looser rule would keep rendering after
// the rule tightened, which is exactly how a face survived three fix attempts.
test("the screening policy is part of the cache identity", async () => {
  const { SCREEN_POLICY } = await import("../lib/broll.mjs");
  assert.match(SCREEN_POLICY, /^[a-f0-9]{8}$/);
});

// Faces are judged at the size viewers see them. Screening a clip at source
// framing missed faces that the render magnified when it upscaled to
// portrait, so screening runs the same geometry the composer does.
test("screening judges clips through the render's own geometry", async () => {
  const { SCREEN_POLICY } = await import("../lib/broll.mjs");
  const { PORTRAIT_GEOMETRY } = await import("../lib/compose.mjs");
  assert.match(PORTRAIT_GEOMETRY, /scale=1080:1920/);
  assert.match(PORTRAIT_GEOMETRY, /crop=1080:1920/);
  // The policy hash covers the geometry, so changing the crop retires every
  // acceptance judged under the old framing.
  const { createHash } = await import("node:crypto");
  const { SOURCE_FACE_THRESHOLD, SOURCE_SAMPLE_FPS } = await import("../lib/broll.mjs");
  const expected = createHash("sha1")
    .update(`face:${SOURCE_FACE_THRESHOLD}|fps:${SOURCE_SAMPLE_FPS}|geom:${PORTRAIT_GEOMETRY}|eq:${PROBE_EQ}`)
    .digest("hex")
    .slice(0, 8);
  assert.equal(SCREEN_POLICY, expected);
});
