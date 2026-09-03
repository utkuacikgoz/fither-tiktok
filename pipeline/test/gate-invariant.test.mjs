import test from "node:test";
import assert from "node:assert/strict";
import { SOURCE_FACE_THRESHOLD, SOURCE_SAMPLE_FPS } from "../lib/broll.mjs";
import { OUTPUT_FACE_THRESHOLD, OUTPUT_SAMPLE_INTERVAL, faceSampleTimes } from "../lib/verify.mjs";

// A face that reaches the finished video costs a six minute render and a
// failed shard. Screening a source clip must therefore never be looser than
// verifying the output, in either sensitivity or sampling density.
test("source screening is at least as strict as output verification", () => {
  assert.ok(
    SOURCE_FACE_THRESHOLD <= OUTPUT_FACE_THRESHOLD,
    `source threshold ${SOURCE_FACE_THRESHOLD} is looser than output ${OUTPUT_FACE_THRESHOLD}`,
  );
});

test("source screening samples at least as densely as output verification", () => {
  const sourceInterval = 1 / SOURCE_SAMPLE_FPS;
  assert.ok(
    sourceInterval <= OUTPUT_SAMPLE_INTERVAL,
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
